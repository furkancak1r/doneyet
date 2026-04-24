package com.furkancakir.doneyet

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.net.Uri
import androidx.core.app.NotificationManagerCompat
import expo.modules.notifications.notifications.model.NotificationContent
import expo.modules.notifications.notifications.model.NotificationRequest
import expo.modules.notifications.notifications.triggers.DateTrigger
import expo.modules.notifications.service.NotificationsService
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import kotlin.math.min

private const val WIDGET_PREFS = "doneyet_widget"
private const val SNAPSHOT_KEY = "widgetSnapshot"
private const val DATABASE_NAME = "doneyet.db"
private const val MAX_PENDING_NOTIFICATIONS = 64
private const val TASK_REMINDER_CATEGORY = "doneyet-task-reminder"
private const val TASK_RECURRING_REMINDER_CATEGORY = "doneyet-task-reminder-recurring"
private const val TASK_REMINDER_CHANNEL = "doneyet-reminders"

internal const val ACTION_COMPLETE = "com.furkancakir.doneyet.widget.COMPLETE"
internal const val ACTION_SNOOZE_10 = "com.furkancakir.doneyet.widget.SNOOZE_10"
internal const val EXTRA_TASK_ID = "taskId"

internal data class DoneYetWidgetAction(
  val type: String,
  val label: String,
  val url: String
)

internal data class DoneYetWidgetTask(
  val id: String,
  val title: String,
  val listName: String,
  val listColor: String,
  val dueAt: String?,
  val taskMode: String,
  val state: String,
  val detailUrl: String,
  val actions: List<DoneYetWidgetAction>
)

internal data class DoneYetWidgetSnapshot(
  val locale: String,
  val title: String,
  val subtitle: String,
  val emptyTitle: String,
  val emptyDescription: String,
  val tasks: List<DoneYetWidgetTask>
)

private data class TaskRow(
  val id: String,
  val title: String,
  val description: String,
  val listId: String,
  val listName: String,
  val listColor: String,
  val sortOrder: Int,
  val createdAt: String,
  val updatedAt: String,
  val startReminderType: String,
  val startDateTime: String,
  val startReminderWeekday: Int?,
  val startReminderDayOfMonth: Int?,
  val startReminderTime: String,
  val startReminderUsesLastDay: Int,
  val taskMode: String,
  val repeatIntervalValue: Int,
  val repeatIntervalUnit: String,
  val status: String,
  val lastNotificationAt: String?,
  val nextNotificationAt: String?,
  val snoozedUntil: String?,
  val notificationIdsJson: String,
  val completedAt: String?
)

private data class ScheduleDraft(
  var notificationIds: MutableList<String> = mutableListOf(),
  var lastNotificationAt: String?,
  var nextNotificationAt: String?,
  var snoozedUntil: String?,
  var rows: MutableList<NotificationRowDraft> = mutableListOf()
)

private data class NotificationRowDraft(
  val id: String,
  val taskId: String,
  val notificationId: String,
  val scheduledFor: String,
  val createdAt: String
)

private data class OccurrenceCandidate(
  val task: TaskRow,
  val scheduledFor: Date
)

internal object DoneYetWidgetData {
  fun loadSnapshot(context: Context): DoneYetWidgetSnapshot {
    return runCatching {
      val snapshotJson = buildAndStoreSnapshot(context)
      parseSnapshot(snapshotJson)
    }.getOrElse {
      val storedJson = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE).getString(SNAPSHOT_KEY, null)
      parseSnapshot(storedJson ?: emptySnapshotJson(resolveLanguage(null)))
    }
  }

  fun performAction(context: Context, action: String, taskId: String) {
    val dbFile = databaseFile(context)
    if (!dbFile.exists()) {
      return
    }

    SQLiteDatabase.openDatabase(dbFile.path, null, SQLiteDatabase.OPEN_READWRITE).use { db ->
      db.beginTransaction()
      try {
        when (action) {
          ACTION_COMPLETE -> completeTask(context, db, taskId)
          ACTION_SNOOZE_10 -> snoozeTask(context, db, taskId)
        }
        rebuildSchedules(context, db)
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
    }

    runCatching { buildAndStoreSnapshot(context) }
    refreshWidgets(context)
  }

  fun refreshWidgets(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val componentName = ComponentName(context, DoneYetWidgetProvider::class.java)
    val ids = manager.getAppWidgetIds(componentName)
    if (ids.isNotEmpty()) {
      DoneYetWidgetProvider.updateWidgets(context, manager, ids)
    }
  }

  private fun buildAndStoreSnapshot(context: Context): String {
    val dbFile = databaseFile(context)
    if (!dbFile.exists()) {
      val empty = emptySnapshotJson(resolveLanguage(null))
      storeSnapshot(context, empty)
      return empty
    }

    val snapshotJson = SQLiteDatabase.openDatabase(dbFile.path, null, SQLiteDatabase.OPEN_READONLY).use { db ->
      val settings = readSettings(db)
      buildSnapshotJson(readTasks(db), resolveLanguage(settings))
    }

    storeSnapshot(context, snapshotJson)
    return snapshotJson
  }

  private fun storeSnapshot(context: Context, snapshotJson: String) {
    context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE).edit().putString(SNAPSHOT_KEY, snapshotJson).apply()
  }

  private fun databaseFile(context: Context): File {
    return File(File(context.filesDir, "SQLite"), DATABASE_NAME)
  }

  private fun readSettings(db: SQLiteDatabase): JSONObject? {
    return db.rawQuery("SELECT value FROM settings WHERE id = ?", arrayOf("singleton")).use { cursor ->
      if (cursor.moveToFirst()) {
        runCatching { JSONObject(cursor.getString(0)) }.getOrNull()
      } else {
        null
      }
    }
  }

  private fun resolveLanguage(settings: JSONObject?): String {
    return when (settings?.optString("language")) {
      "tr" -> "tr"
      "en" -> "en"
      else -> if (Locale.getDefault().language.lowercase(Locale.US).startsWith("tr")) "tr" else "en"
    }
  }

  private fun resolveSoundEnabled(settings: JSONObject?): Boolean {
    return when (val value = settings?.opt("soundEnabled")) {
      is Boolean -> value
      is Number -> value.toInt() != 0
      is String -> value != "0" && !value.equals("false", ignoreCase = true)
      else -> true
    }
  }

  private fun readTasks(db: SQLiteDatabase): List<TaskRow> {
    return db.rawQuery(
      """
      SELECT t.*, COALESCE(l.name, '') AS listName, COALESCE(l.color, '#116466') AS listColor
      FROM tasks t
      LEFT JOIN lists l ON l.id = t.listId
      ORDER BY t.sortOrder ASC, t.createdAt DESC, t.id ASC
      """.trimIndent(),
      emptyArray()
    ).use { cursor ->
      buildList {
        while (cursor.moveToNext()) {
          add(cursor.toTaskRow())
        }
      }
    }
  }

  private fun buildSnapshotJson(tasks: List<TaskRow>, language: String): String {
    val now = Date()
    val overdue = tasks
      .filter { it.isActiveReminder() && it.visibleState(now) == "overdue" }
      .sortedWith(compareBy<TaskRow> { it.dueTime() }.thenBy { it.id })
    val today = tasks
      .filter { it.isTodayReminder(now) && it.visibleState(now) != "overdue" }
      .sortedWith(compareBy<TaskRow> { it.dueTime() }.thenBy { it.id })
    val todos = tasks
      .filter { it.status == "active" && it.taskMode == "todo" }
      .sortedWith(compareByDescending<TaskRow> { it.updatedAt }.thenByDescending { it.createdAt }.thenByDescending { it.id })
    val visibleTasks = (overdue + today + todos).take(8)
    val strings = widgetStrings(language)
    val snapshot = JSONObject()
      .put("schemaVersion", 1)
      .put("generatedAt", formatIso(now))
      .put("locale", language)
      .put("title", strings.title)
      .put("subtitle", strings.subtitle(overdue.size, today.size, todos.size))
      .put("emptyTitle", strings.emptyTitle)
      .put("emptyDescription", strings.emptyDescription)
      .put("counts", JSONObject().put("overdue", overdue.size).put("today", today.size).put("todo", todos.size))
      .put(
        "tasks",
        JSONArray(
          visibleTasks.map { task ->
            val actions = JSONArray()
            if (task.taskMode != "recurring" || task.isRecurringCycleDue(now)) {
              actions.put(JSONObject().put("type", "complete").put("label", strings.done).put("url", "doneyet://widget/complete?taskId=${task.id}"))
            }
            if (task.taskMode != "todo") {
              actions.put(JSONObject().put("type", "snooze_10").put("label", strings.snooze).put("url", "doneyet://widget/snooze_10?taskId=${task.id}"))
            }

            JSONObject()
              .put("id", task.id)
              .put("title", task.title)
              .put("listName", task.listName)
              .put("listColor", task.listColor)
              .put("dueAt", if (task.taskMode == "todo") JSONObject.NULL else task.nextNotificationAt ?: task.startDateTime)
              .put("taskMode", task.taskMode)
              .put("state", if (task.taskMode == "todo") "todo" else if (task.visibleState(now) == "overdue") "overdue" else "today")
              .put("detailUrl", "doneyet://tasks/${task.id}")
              .put("actions", actions)
          }
        )
      )

    return snapshot.toString()
  }

  private fun emptySnapshotJson(language: String): String {
    val strings = widgetStrings(language)
    return JSONObject()
      .put("schemaVersion", 1)
      .put("generatedAt", formatIso(Date()))
      .put("locale", language)
      .put("title", strings.title)
      .put("subtitle", strings.subtitle(0, 0, 0))
      .put("emptyTitle", strings.emptyTitle)
      .put("emptyDescription", strings.emptyDescription)
      .put("counts", JSONObject().put("overdue", 0).put("today", 0).put("todo", 0))
      .put("tasks", JSONArray())
      .toString()
  }

  private fun parseSnapshot(snapshotJson: String): DoneYetWidgetSnapshot {
    val json = JSONObject(snapshotJson)
    val tasksJson = json.optJSONArray("tasks") ?: JSONArray()
    val tasks = (0 until tasksJson.length()).mapNotNull { index ->
      val taskJson = tasksJson.optJSONObject(index) ?: return@mapNotNull null
      val actionsJson = taskJson.optJSONArray("actions") ?: JSONArray()
      val actions = (0 until actionsJson.length()).mapNotNull { actionIndex ->
        val actionJson = actionsJson.optJSONObject(actionIndex) ?: return@mapNotNull null
        DoneYetWidgetAction(
          type = actionJson.optString("type"),
          label = actionJson.optString("label"),
          url = actionJson.optString("url")
        )
      }
      DoneYetWidgetTask(
        id = taskJson.optString("id"),
        title = taskJson.optString("title"),
        listName = taskJson.optString("listName"),
        listColor = taskJson.optString("listColor", "#116466"),
        dueAt = taskJson.optString("dueAt").takeIf { it.isNotBlank() && it != "null" },
        taskMode = taskJson.optString("taskMode"),
        state = taskJson.optString("state"),
        detailUrl = taskJson.optString("detailUrl"),
        actions = actions
      )
    }

    return DoneYetWidgetSnapshot(
      locale = json.optString("locale", resolveLanguage(null)),
      title = json.optString("title", "DoneYet?"),
      subtitle = json.optString("subtitle", ""),
      emptyTitle = json.optString("emptyTitle", "Nothing to track"),
      emptyDescription = json.optString("emptyDescription", ""),
      tasks = tasks
    )
  }

  private fun completeTask(context: Context, db: SQLiteDatabase, taskId: String) {
    val task = getTask(db, taskId) ?: return
    val now = Date()
    val completedAt = formatIso(now)

    if (task.taskMode == "recurring") {
      if (!task.isRecurringCycleDue(now)) {
        return
      }

      clearTaskSchedule(context, db, task)
      saveCompletionHistory(db, task, completedAt)
      val nextCycleStart = getNextStartDateTime(task, now)
      db.execSQL(
        """
        UPDATE tasks
        SET status = 'active',
            completedAt = ?,
            lastNotificationAt = NULL,
            startDateTime = ?,
            nextNotificationAt = ?,
            snoozedUntil = NULL,
            notificationIdsJson = '[]',
            updatedAt = ?
        WHERE id = ?
        """.trimIndent(),
        arrayOf(completedAt, formatIso(nextCycleStart), formatIso(nextCycleStart), formatIso(now), task.id)
      )
      return
    }

    clearTaskSchedule(context, db, task)
    db.execSQL(
      """
      UPDATE tasks
      SET status = 'completed',
          completedAt = ?,
          lastNotificationAt = NULL,
          nextNotificationAt = NULL,
          snoozedUntil = NULL,
          notificationIdsJson = '[]',
          updatedAt = ?
      WHERE id = ?
      """.trimIndent(),
      arrayOf(completedAt, completedAt, task.id)
    )
  }

  private fun snoozeTask(context: Context, db: SQLiteDatabase, taskId: String) {
    val task = getTask(db, taskId) ?: return
    if (task.taskMode == "todo") {
      return
    }

    clearTaskSchedule(context, db, task)
    val now = Date()
    val snoozedUntil = Date(now.time + 10 * 60_000)
    db.execSQL(
      """
      UPDATE tasks
      SET status = 'active',
          snoozedUntil = ?,
          nextNotificationAt = ?,
          lastNotificationAt = ?,
          notificationIdsJson = '[]',
          updatedAt = ?
      WHERE id = ?
      """.trimIndent(),
      arrayOf(formatIso(snoozedUntil), formatIso(snoozedUntil), formatIso(now), formatIso(now), task.id)
    )
  }

  private fun getTask(db: SQLiteDatabase, taskId: String): TaskRow? {
    return db.rawQuery(
      """
      SELECT t.*, COALESCE(l.name, '') AS listName, COALESCE(l.color, '#116466') AS listColor
      FROM tasks t
      LEFT JOIN lists l ON l.id = t.listId
      WHERE t.id = ?
      """.trimIndent(),
      arrayOf(taskId)
    ).use { cursor ->
      if (cursor.moveToFirst()) cursor.toTaskRow() else null
    }
  }

  private fun saveCompletionHistory(db: SQLiteDatabase, task: TaskRow, completedAt: String) {
    db.execSQL(
      """
      INSERT INTO task_completion_history (
        id, taskId, taskTitleSnapshot, taskDescriptionSnapshot, taskModeSnapshot, listId, listNameSnapshot, completedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      """.trimIndent(),
      arrayOf(createId("completion"), task.id, task.title, task.description, task.taskMode, task.listId, task.listName, completedAt)
    )
  }

  private fun clearTaskSchedule(context: Context, db: SQLiteDatabase, task: TaskRow) {
    val ids = mutableSetOf<String>()
    ids.addAll(parseStringArray(task.notificationIdsJson))
    db.rawQuery("SELECT notificationId FROM task_notifications WHERE taskId = ?", arrayOf(task.id)).use { cursor ->
      while (cursor.moveToNext()) {
        cursor.getString(0)?.let(ids::add)
      }
    }
    cancelNotifications(context, ids)
    db.execSQL("DELETE FROM task_notifications WHERE taskId = ?", arrayOf(task.id))
  }

  private fun rebuildSchedules(context: Context, db: SQLiteDatabase) {
    val settings = readSettings(db)
    val soundEnabled = resolveSoundEnabled(settings)
    val language = resolveLanguage(settings)
    val tasks = readTasks(db)
    val existingIds = mutableSetOf<String>()
    db.rawQuery("SELECT notificationId FROM task_notifications", emptyArray()).use { cursor ->
      while (cursor.moveToNext()) {
        cursor.getString(0)?.let(existingIds::add)
      }
    }
    tasks.forEach { existingIds.addAll(parseStringArray(it.notificationIdsJson)) }
    cancelNotifications(context, existingIds)

    db.execSQL("DELETE FROM task_notifications")

    val now = Date()
    val drafts = tasks.associate { it.id to buildInitialScheduleDraft(it, now) }.toMutableMap()
    val candidates = drafts.mapNotNull { (taskId, draft) ->
      val task = tasks.first { it.id == taskId }
      draft.nextNotificationAt?.let(::parseIso)?.takeIf { it.after(now) }?.let { OccurrenceCandidate(task, it) }
    }.toMutableList()

    if (NotificationManagerCompat.from(context).areNotificationsEnabled()) {
      repeat(min(MAX_PENDING_NOTIFICATIONS, candidates.size.coerceAtLeast(MAX_PENDING_NOTIFICATIONS))) {
        if (candidates.isEmpty()) {
          return@repeat
        }
        candidates.sortWith(compareBy<OccurrenceCandidate> { it.scheduledFor.time }.thenBy { it.task.id })
        val candidate = candidates.removeAt(0)
        val notificationId = scheduleNotification(context, candidate.task, candidate.scheduledFor, soundEnabled, language)
        val draft = drafts[candidate.task.id] ?: return@repeat
        draft.notificationIds.add(notificationId)
        draft.rows.add(
          NotificationRowDraft(
            id = createId("task_notif"),
            taskId = candidate.task.id,
            notificationId = notificationId,
            scheduledFor = formatIso(candidate.scheduledFor),
            createdAt = formatIso(Date())
          )
        )
        if (candidate.task.taskMode == "recurring") {
          candidates.add(OccurrenceCandidate(candidate.task, addRepeatInterval(candidate.scheduledFor, candidate.task)))
        }
      }
    }

    for (task in tasks) {
      val draft = drafts[task.id] ?: ScheduleDraft(lastNotificationAt = task.lastNotificationAt, nextNotificationAt = null, snoozedUntil = null)
      for (row in draft.rows) {
        db.execSQL(
          """
          INSERT INTO task_notifications (id, taskId, notificationId, scheduledFor, status, createdAt)
          VALUES (?, ?, ?, ?, 'scheduled', ?)
          """.trimIndent(),
          arrayOf(row.id, row.taskId, row.notificationId, row.scheduledFor, row.createdAt)
        )
      }
      if (taskNeedsScheduleUpdate(task, draft)) {
        db.execSQL(
          """
          UPDATE tasks
          SET lastNotificationAt = ?,
              nextNotificationAt = ?,
              snoozedUntil = ?,
              notificationIdsJson = ?,
              updatedAt = ?
          WHERE id = ?
          """.trimIndent(),
          arrayOf(
            draft.lastNotificationAt,
            draft.nextNotificationAt,
            draft.snoozedUntil,
            JSONArray(draft.notificationIds).toString(),
            formatIso(Date()),
            task.id
          )
        )
      }
    }
  }

  private fun taskNeedsScheduleUpdate(task: TaskRow, draft: ScheduleDraft): Boolean {
    return task.lastNotificationAt != draft.lastNotificationAt ||
      task.nextNotificationAt != draft.nextNotificationAt ||
      task.snoozedUntil != draft.snoozedUntil ||
      parseStringArray(task.notificationIdsJson) != draft.notificationIds
  }

  private fun buildInitialScheduleDraft(task: TaskRow, now: Date): ScheduleDraft {
    if (task.taskMode == "todo" || task.status != "active") {
      return ScheduleDraft(lastNotificationAt = task.lastNotificationAt, nextNotificationAt = null, snoozedUntil = null)
    }

    val snoozedUntil = task.snoozedUntil?.let(::parseIso)?.takeIf { it.after(now) }
    if (snoozedUntil != null) {
      return ScheduleDraft(lastNotificationAt = task.lastNotificationAt, nextNotificationAt = formatIso(snoozedUntil), snoozedUntil = formatIso(snoozedUntil))
    }

    if (task.taskMode == "recurring") {
      val parsedCandidate = task.nextNotificationAt?.let(::parseIso)
      var lastNotificationAt = task.lastNotificationAt
      if (parsedCandidate != null) {
        var candidate: Date = parsedCandidate
        while (!candidate.after(now)) {
          lastNotificationAt = laterReminderAnchor(lastNotificationAt, candidate)
          candidate = addRepeatInterval(candidate, task)
        }
        return ScheduleDraft(lastNotificationAt = lastNotificationAt, nextNotificationAt = formatIso(candidate), snoozedUntil = null)
      }
    }

    val next = getNextTaskOccurrence(task, now)
    return ScheduleDraft(lastNotificationAt = task.lastNotificationAt, nextNotificationAt = formatIso(next), snoozedUntil = null)
  }

  private fun scheduleNotification(context: Context, task: TaskRow, fireAt: Date, soundEnabled: Boolean, language: String): String {
    val notificationId = UUID.randomUUID().toString()
    val body = if (language == "tr") "${task.title.trim()} yapıldı mı?" else "Did you complete ${task.title.trim()}?"
    val builder = NotificationContent.Builder()
      .setTitle(if (language == "tr") "Hatırlatma" else "Reminder")
      .setText(body)
      .setBody(JSONObject().put("taskId", task.id).put("taskTitle", task.title).put("scheduledFor", formatIso(fireAt)))
      .setCategoryId(if (task.taskMode == "recurring") TASK_RECURRING_REMINDER_CATEGORY else TASK_REMINDER_CATEGORY)

    if (soundEnabled) {
      builder.useDefaultSound()
    } else {
      builder.setSound(null as Uri?)
    }

    val content = builder.build()
    val request = NotificationRequest(notificationId, content, DateTrigger(TASK_REMINDER_CHANNEL, fireAt.time))
    NotificationsService.schedule(context, request)
    return notificationId
  }

  private fun cancelNotifications(context: Context, ids: Collection<String>) {
    if (ids.isNotEmpty()) {
      NotificationsService.removeScheduledNotifications(context, ids)
    }
  }
}

private data class WidgetStrings(
  val title: String,
  val emptyTitle: String,
  val emptyDescription: String,
  val done: String,
  val snooze: String,
  val subtitle: (overdue: Int, today: Int, todo: Int) -> String
)

private fun widgetStrings(language: String): WidgetStrings {
  return if (language == "tr") {
    WidgetStrings(
      title = "DoneYet?",
      emptyTitle = "Takip edilecek görev yok",
      emptyDescription = "Bugün ve geciken görevler burada görünür.",
      done = "Yapıldı",
      snooze = "10 dk",
      subtitle = { overdue, today, todo -> "$overdue geciken • $today bugün • $todo To-Do" }
    )
  } else {
    WidgetStrings(
      title = "DoneYet?",
      emptyTitle = "Nothing to track",
      emptyDescription = "Today and overdue tasks show up here.",
      done = "Done",
      snooze = "10 min",
      subtitle = { overdue, today, todo -> "$overdue overdue • $today today • $todo To-Do" }
    )
  }
}

private fun Cursor.toTaskRow(): TaskRow {
  fun text(name: String): String = getString(getColumnIndexOrThrow(name))
  fun nullableText(name: String): String? = getString(getColumnIndexOrThrow(name))
  fun int(name: String): Int = getInt(getColumnIndexOrThrow(name))

  return TaskRow(
    id = text("id"),
    title = text("title"),
    description = text("description"),
    listId = text("listId"),
    listName = text("listName"),
    listColor = text("listColor"),
    sortOrder = int("sortOrder"),
    createdAt = text("createdAt"),
    updatedAt = text("updatedAt"),
    startReminderType = text("startReminderType"),
    startDateTime = text("startDateTime"),
    startReminderWeekday = nullableText("startReminderWeekday")?.toIntOrNull(),
    startReminderDayOfMonth = nullableText("startReminderDayOfMonth")?.toIntOrNull(),
    startReminderTime = text("startReminderTime"),
    startReminderUsesLastDay = int("startReminderUsesLastDay"),
    taskMode = text("taskMode"),
    repeatIntervalValue = int("repeatIntervalValue"),
    repeatIntervalUnit = text("repeatIntervalUnit"),
    status = text("status"),
    lastNotificationAt = nullableText("lastNotificationAt"),
    nextNotificationAt = nullableText("nextNotificationAt"),
    snoozedUntil = nullableText("snoozedUntil"),
    notificationIdsJson = text("notificationIdsJson"),
    completedAt = nullableText("completedAt")
  )
}

private fun TaskRow.isActiveReminder(): Boolean = status == "active" && taskMode != "todo"

private fun TaskRow.isTodayReminder(reference: Date): Boolean {
  val next = nextNotificationAt?.let(::parseIso) ?: return false
  return isActiveReminder() && !next.before(startOfDay(reference)) && next.before(addDays(startOfDay(reference), 1))
}

private fun TaskRow.visibleState(reference: Date): String {
  if (status == "completed") return "completed"
  if (status == "paused") return "paused"
  val snoozed = snoozedUntil?.let(::parseIso)
  if (snoozed != null && snoozed.after(reference)) return "snoozed"
  val next = nextNotificationAt?.let(::parseIso)
  if (next != null && !next.after(reference)) return "overdue"
  return if (startDateTime.isNotBlank()) "upcoming" else "active"
}

private fun TaskRow.isRecurringCycleDue(reference: Date): Boolean {
  if (taskMode != "recurring" || status != "active") return false
  val snoozed = snoozedUntil?.let(::parseIso)
  if (snoozed != null && snoozed.after(reference)) return false
  val last = lastNotificationAt?.let(::parseIso)
  if (last != null && reminderBelongsToCurrentCycle(last)) return !last.after(reference)
  val due = (nextNotificationAt ?: startDateTime).let(::parseIso)
  return due != null && !due.after(reference)
}

private fun TaskRow.reminderBelongsToCurrentCycle(reminder: Date): Boolean {
  if (taskMode != "recurring" || status != "active") return false
  val start = startDateTime.let(::parseIso)
  return start == null || !reminder.before(start)
}

private fun TaskRow.dueTime(): Long = (nextNotificationAt ?: startDateTime).let(::parseIso)?.time ?: Long.MAX_VALUE

private fun parseStringArray(value: String): List<String> {
  return runCatching {
    val json = JSONArray(value)
    (0 until json.length()).mapNotNull { json.optString(it).takeIf(String::isNotBlank) }
  }.getOrDefault(emptyList())
}

private fun createId(prefix: String): String = "${prefix}_${System.currentTimeMillis().toString(36)}_${UUID.randomUUID().toString().take(8)}"

private fun parseIso(value: String): Date? {
  return runCatching {
    val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    formatter.timeZone = TimeZone.getTimeZone("UTC")
    formatter.parse(value)
  }.getOrNull()
}

private fun formatIso(date: Date): String {
  val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
  formatter.timeZone = TimeZone.getTimeZone("UTC")
  return formatter.format(date)
}

private fun startOfDay(date: Date): Date {
  val calendar = Calendar.getInstance()
  calendar.time = date
  calendar.set(Calendar.HOUR_OF_DAY, 0)
  calendar.set(Calendar.MINUTE, 0)
  calendar.set(Calendar.SECOND, 0)
  calendar.set(Calendar.MILLISECOND, 0)
  return calendar.time
}

private fun addDays(date: Date, amount: Int): Date {
  val calendar = Calendar.getInstance()
  calendar.time = date
  calendar.add(Calendar.DATE, amount)
  return calendar.time
}

private fun addRepeatInterval(date: Date, task: TaskRow): Date {
  val calendar = Calendar.getInstance()
  calendar.time = date
  if (task.repeatIntervalUnit == "minutes") {
    calendar.add(Calendar.MINUTE, task.repeatIntervalValue)
  } else {
    calendar.add(Calendar.HOUR_OF_DAY, task.repeatIntervalValue)
  }
  return calendar.time
}

private fun laterReminderAnchor(existingValue: String?, candidate: Date): String {
  val existing = existingValue?.let(::parseIso)
  return if (existing == null || existing.before(candidate)) formatIso(candidate) else existingValue
}

private fun getNextTaskOccurrence(task: TaskRow, reference: Date): Date {
  val snoozed = task.snoozedUntil?.let(::parseIso)
  if (snoozed != null && snoozed.after(reference)) return snoozed
  val next = task.nextNotificationAt?.let(::parseIso)
  if (next != null) {
    if (task.taskMode != "recurring") return next
    var candidate: Date = next
    while (!candidate.after(reference)) {
      candidate = addRepeatInterval(candidate, task)
    }
    return candidate
  }
  return getNextStartDateTime(task, reference)
}

private fun getNextStartDateTime(task: TaskRow, reference: Date): Date {
  val safeReference = Date(reference.time)
  val startDateTime = task.startDateTime.let(::parseIso) ?: safeReference

  return when (task.startReminderType) {
    "exact_date_time" -> if (startDateTime.after(safeReference)) startDateTime else Date(safeReference.time + 60_000)
    "today_at_time" -> {
      val candidate = setTimeOnDate(safeReference, task.startReminderTime)
      if (candidate.after(safeReference)) candidate else setTimeOnDate(addDays(safeReference, 1), task.startReminderTime)
    }
    "tomorrow_at_time" -> setTimeOnDate(addDays(safeReference, 1), task.startReminderTime)
    "weekly_on_weekday" -> {
      val weekday = task.startReminderWeekday ?: 1
      val calendar = Calendar.getInstance()
      calendar.time = safeReference
      val current = calendar.get(Calendar.DAY_OF_WEEK) - 1
      val delta = (weekday - current + 7) % 7
      calendar.add(Calendar.DATE, delta)
      val withTime = setTimeOnDate(calendar.time, task.startReminderTime)
      if (!withTime.after(safeReference)) addDays(withTime, 7) else withTime
    }
    "monthly_on_day", "monthly_on_last_day" -> {
      val candidate = monthlyCandidate(safeReference, task)
      if (candidate.after(safeReference)) {
        candidate
      } else {
        val calendar = Calendar.getInstance()
        calendar.time = safeReference
        calendar.set(Calendar.DAY_OF_MONTH, 1)
        calendar.add(Calendar.MONTH, 1)
        monthlyCandidate(calendar.time, task)
      }
    }
    else -> startDateTime
  }
}

private fun setTimeOnDate(date: Date, clockTime: String): Date {
  val parts = clockTime.split(":")
  val hour = parts.getOrNull(0)?.toIntOrNull() ?: 0
  val minute = parts.getOrNull(1)?.toIntOrNull() ?: 0
  val calendar = Calendar.getInstance()
  calendar.time = date
  calendar.set(Calendar.HOUR_OF_DAY, hour)
  calendar.set(Calendar.MINUTE, minute)
  calendar.set(Calendar.SECOND, 0)
  calendar.set(Calendar.MILLISECOND, 0)
  return calendar.time
}

private fun monthlyCandidate(base: Date, task: TaskRow): Date {
  val calendar = Calendar.getInstance()
  calendar.time = base
  val maxDay = calendar.getActualMaximum(Calendar.DAY_OF_MONTH)
  val day = if (task.startReminderUsesLastDay == 1) maxDay else min(task.startReminderDayOfMonth ?: maxDay, maxDay)
  calendar.set(Calendar.DAY_OF_MONTH, day)
  return setTimeOnDate(calendar.time, task.startReminderTime)
}
