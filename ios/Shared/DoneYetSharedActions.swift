import Foundation
import AppIntents
import SQLite3
import UserNotifications
import WidgetKit

private let doneYetAppGroupIdentifier = "group.com.doneyet.appios"
private let doneYetDatabaseName = "doneyet.db"
private let doneYetSnapshotFileName = "widget-snapshot.json"
private let doneYetMaxPendingNotifications = 64
private let doneYetTaskReminderCategory = "doneyet-task-reminder"
private let doneYetTaskRecurringReminderCategory = "doneyet-task-reminder-recurring"

enum DoneYetActionKind: String {
  case markDone = "mark_done"
  case markDoneForever = "mark_done_forever"
  case snooze10 = "snooze_10_min"
  case snooze1h = "snooze_1_hour"
  case snoozeEvening = "snooze_evening"
  case snoozeTomorrow = "snooze_tomorrow"

  init?(notificationActionIdentifier: String) {
    self.init(rawValue: notificationActionIdentifier)
  }
}

@available(iOS 16.0, *)
struct CompleteDoneYetTaskIntent: AppIntent {
  static var title: LocalizedStringResource = "Complete DoneYet Task"
  static var description = IntentDescription("Marks a DoneYet task as complete.")
  static var isDiscoverable = false
  static var openAppWhenRun = false

  @Parameter(title: "Task ID")
  var taskId: String

  init() {
    self.taskId = ""
  }

  init(taskId: String) {
    self.taskId = taskId
  }

  func perform() async throws -> some IntentResult {
    DoneYetActionEngine.perform(action: .markDone, taskId: taskId)
    return .result()
  }
}

@available(iOS 16.0, *)
struct FinishDoneYetTaskIntent: AppIntent {
  static var title: LocalizedStringResource = "Finish DoneYet Task"
  static var description = IntentDescription("Completes and finishes a DoneYet task.")
  static var isDiscoverable = false
  static var openAppWhenRun = false

  @Parameter(title: "Task ID")
  var taskId: String

  init() {
    self.taskId = ""
  }

  init(taskId: String) {
    self.taskId = taskId
  }

  func perform() async throws -> some IntentResult {
    DoneYetActionEngine.perform(action: .markDoneForever, taskId: taskId)
    return .result()
  }
}

enum DoneYetSharedStore {
  static func readSnapshotData() -> Data? {
    if let data = try? Data(contentsOf: snapshotURL()) {
      return data
    }
    return UserDefaults(suiteName: doneYetAppGroupIdentifier)?
      .string(forKey: "widgetSnapshot")?
      .data(using: .utf8)
  }

  static func databaseURL() -> URL? {
    FileManager.default
      .containerURL(forSecurityApplicationGroupIdentifier: doneYetAppGroupIdentifier)?
      .appendingPathComponent("SQLite", isDirectory: true)
      .appendingPathComponent(doneYetDatabaseName)
  }

  static func snapshotURL() -> URL {
    FileManager.default
      .containerURL(forSecurityApplicationGroupIdentifier: doneYetAppGroupIdentifier)?
      .appendingPathComponent("Widget", isDirectory: true)
      .appendingPathComponent(doneYetSnapshotFileName)
      ?? FileManager.default.temporaryDirectory.appendingPathComponent(doneYetSnapshotFileName)
  }

  static func writeSnapshot(_ json: String) {
    guard let data = json.data(using: .utf8) else {
      return
    }
    try? FileManager.default.createDirectory(at: snapshotURL().deletingLastPathComponent(), withIntermediateDirectories: true)
    try? data.write(to: snapshotURL(), options: .atomic)
    UserDefaults(suiteName: doneYetAppGroupIdentifier)?.set(json, forKey: "widgetSnapshot")
  }
}

enum DoneYetActionEngine {
  @discardableResult
  static func perform(action: DoneYetActionKind, taskId: String, scheduledFor: Date? = nil) -> Bool {
    guard !taskId.isEmpty,
      let databaseURL = DoneYetSharedStore.databaseURL(),
      FileManager.default.fileExists(atPath: databaseURL.path),
      let db = SQLiteConnection(path: databaseURL.path) else {
      return false
    }

    do {
      try db.transaction {
        if let scheduledFor {
          try recordTaskReminderDelivery(db: db, taskId: taskId, deliveredAt: scheduledFor)
        }

        switch action {
        case .markDone:
          try completeTask(db: db, taskId: taskId, permanently: false)
        case .markDoneForever:
          try completeTask(db: db, taskId: taskId, permanently: true)
        case .snooze10, .snooze1h, .snoozeEvening, .snoozeTomorrow:
          try snoozeTask(db: db, taskId: taskId, action: action, scheduledFor: scheduledFor)
        }
      }

      rebuildSchedules(db: db)
      try? DoneYetSnapshotBuilder.writeSnapshot(db: db)
      WidgetCenter.shared.reloadAllTimelines()
      return true
    } catch {
      return false
    }
  }

  private static func recordTaskReminderDelivery(db: SQLiteConnection, taskId: String, deliveredAt: Date) throws {
    guard let task = try TaskRow.fetch(db: db, taskId: taskId),
      task.taskMode == "recurring",
      task.status == "active" else {
      return
    }
    guard task.reminderBelongsToCurrentCycle(deliveredAt) else {
      return
    }

    let nextLastNotificationAt = laterReminderAnchor(existingValue: task.lastNotificationAt, candidate: deliveredAt)
    if nextLastNotificationAt == task.lastNotificationAt {
      return
    }

    try db.exec(
      """
      UPDATE tasks
      SET lastNotificationAt = ?,
          updatedAt = ?
      WHERE id = ?
      """,
      [nextLastNotificationAt, DateFormatter.doneYetISO.string(from: Date()), task.id]
    )
  }

  private static func completeTask(db: SQLiteConnection, taskId: String, permanently: Bool) throws {
    guard let task = try TaskRow.fetch(db: db, taskId: taskId) else {
      return
    }

    let now = Date()
    let completedAt = DateFormatter.doneYetISO.string(from: now)

    if task.taskMode == "recurring", !permanently {
      guard task.isRecurringCycleDue(reference: now) else {
        return
      }

      try clearTaskSchedule(db: db, task: task)
      try saveCompletionHistory(db: db, task: task, completedAt: completedAt)
      let nextCycleStart = task.nextStartDate(reference: now)
      let nextCycleStartText = DateFormatter.doneYetISO.string(from: nextCycleStart)
      try db.exec(
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
        """,
        [completedAt, nextCycleStartText, nextCycleStartText, DateFormatter.doneYetISO.string(from: now), task.id]
      )
      return
    }

    if task.taskMode == "recurring" {
      guard task.status != "completed" else {
        return
      }

      guard task.isRecurringCycleDue(reference: now) else {
        return
      }

      try saveCompletionHistory(db: db, task: task, completedAt: completedAt)
    }

    try clearTaskSchedule(db: db, task: task)
    try db.exec(
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
      """,
      [completedAt, completedAt, task.id]
    )
  }

  private static func snoozeTask(db: SQLiteConnection, taskId: String, action: DoneYetActionKind, scheduledFor: Date?) throws {
    guard let task = try TaskRow.fetch(db: db, taskId: taskId), task.taskMode != "todo" else {
      return
    }

    try clearTaskSchedule(db: db, task: task)
    let now = Date()
    let snoozedUntil = task.snoozeDate(action: action, reference: now, scheduledFor: scheduledFor)
    try db.exec(
      """
      UPDATE tasks
      SET status = 'active',
          snoozedUntil = ?,
          nextNotificationAt = ?,
          lastNotificationAt = ?,
          notificationIdsJson = '[]',
          updatedAt = ?
      WHERE id = ?
      """,
      [
        DateFormatter.doneYetISO.string(from: snoozedUntil),
        DateFormatter.doneYetISO.string(from: snoozedUntil),
        DateFormatter.doneYetISO.string(from: now),
        DateFormatter.doneYetISO.string(from: now),
        task.id
      ]
    )
  }

  private static func clearTaskSchedule(db: SQLiteConnection, task: TaskRow) throws {
    var ids = Set(task.notificationIds)
    let rows = try db.query("SELECT notificationId FROM task_notifications WHERE taskId = ?", [task.id])
    for row in rows {
      if let id = row["notificationId"] ?? nil {
        ids.insert(id)
      }
    }
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: Array(ids))
    try db.exec("DELETE FROM task_notifications WHERE taskId = ?", [task.id])
  }

  private static func saveCompletionHistory(db: SQLiteConnection, task: TaskRow, completedAt: String) throws {
    try db.exec(
      """
      INSERT INTO task_completion_history (
        id, taskId, taskTitleSnapshot, taskDescriptionSnapshot, taskModeSnapshot, listId, listNameSnapshot, completedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      """,
      [createId(prefix: "completion"), task.id, task.title, task.description, task.taskMode, task.listId, task.listName, completedAt]
    )
  }

  private static func rebuildSchedules(db: SQLiteConnection) {
    do {
      let tasks = try TaskRow.fetchAll(db: db)
      let existingRows = try db.query("SELECT notificationId FROM task_notifications", [])
      var existingIds = Set<String>()
      for row in existingRows {
        if let id = row["notificationId"] ?? nil {
          existingIds.insert(id)
        }
      }
      for task in tasks {
        task.notificationIds.forEach { existingIds.insert($0) }
      }
      UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: Array(existingIds))
      try db.exec("DELETE FROM task_notifications", [])

      let now = Date()
      let settingsJson = try? db.query("SELECT value FROM settings WHERE id = ?", ["singleton"]).first.flatMap { $0["value"] ?? nil }
      let language = resolveLanguage(settingsJson: settingsJson)
      let notificationsSoundEnabled = resolveSoundEnabled(settingsJson: settingsJson)
      var drafts = Dictionary(uniqueKeysWithValues: tasks.map { ($0.id, ScheduleDraft(task: $0, reference: now)) })
      var candidates = drafts.compactMap { key, draft -> OccurrenceCandidate? in
        guard let task = tasks.first(where: { $0.id == key }),
          let next = draft.nextNotificationAt.flatMap(DateFormatter.doneYetISO.date(from:)),
          next > now else {
          return nil
        }
        return OccurrenceCandidate(task: task, scheduledFor: next)
      }

      if notificationSchedulingEnabled() {
        configureNotificationCategories(language: language)
        var scheduledCount = 0
        while scheduledCount < doneYetMaxPendingNotifications, !candidates.isEmpty {
          candidates.sort { left, right in
            if left.scheduledFor == right.scheduledFor {
              return left.task.id < right.task.id
            }
            return left.scheduledFor < right.scheduledFor
          }
          let candidate = candidates.removeFirst()
          let notificationId = scheduleNotification(task: candidate.task, fireAt: candidate.scheduledFor, soundEnabled: notificationsSoundEnabled, language: language)
          drafts[candidate.task.id]?.notificationIds.append(notificationId)
          drafts[candidate.task.id]?.rows.append(
            NotificationRowDraft(
              id: createId(prefix: "task_notif"),
              taskId: candidate.task.id,
              notificationId: notificationId,
              scheduledFor: DateFormatter.doneYetISO.string(from: candidate.scheduledFor),
              createdAt: DateFormatter.doneYetISO.string(from: Date())
            )
          )
          if candidate.task.taskMode == "recurring" {
            candidates.append(OccurrenceCandidate(task: candidate.task, scheduledFor: candidate.task.addRepeatInterval(to: candidate.scheduledFor)))
          }
          scheduledCount += 1
        }
      }

      for task in tasks {
        let draft = drafts[task.id] ?? ScheduleDraft(lastNotificationAt: task.lastNotificationAt, nextNotificationAt: nil, snoozedUntil: nil)
        for row in draft.rows {
          try db.exec(
            """
            INSERT INTO task_notifications (id, taskId, notificationId, scheduledFor, status, createdAt)
            VALUES (?, ?, ?, ?, 'scheduled', ?)
            """,
            [row.id, row.taskId, row.notificationId, row.scheduledFor, row.createdAt]
          )
        }
        if taskNeedsScheduleUpdate(task: task, draft: draft) {
          try db.exec(
            """
            UPDATE tasks
            SET lastNotificationAt = ?,
                nextNotificationAt = ?,
                snoozedUntil = ?,
                notificationIdsJson = ?,
                updatedAt = ?
            WHERE id = ?
            """,
            [
              draft.lastNotificationAt,
              draft.nextNotificationAt,
              draft.snoozedUntil,
              jsonString(draft.notificationIds),
              DateFormatter.doneYetISO.string(from: Date()),
              task.id
            ]
          )
        }
      }
    } catch {
      return
    }
  }

  private static func taskNeedsScheduleUpdate(task: TaskRow, draft: ScheduleDraft) -> Bool {
    task.lastNotificationAt != draft.lastNotificationAt ||
      task.nextNotificationAt != draft.nextNotificationAt ||
      task.snoozedUntil != draft.snoozedUntil ||
      task.notificationIds != draft.notificationIds
  }

  private static func notificationSchedulingEnabled() -> Bool {
    let semaphore = DispatchSemaphore(value: 0)
    var enabled = false
    UNUserNotificationCenter.current().getNotificationSettings { settings in
      enabled = settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional || settings.authorizationStatus == .ephemeral
      semaphore.signal()
    }
    _ = semaphore.wait(timeout: .now() + 2)
    return enabled
  }

  private static func configureNotificationCategories(language: String) {
    let strings = notificationStrings(language: language)
    let done = UNNotificationAction(identifier: DoneYetActionKind.markDone.rawValue, title: strings.done, options: [])
    let doneForever = UNNotificationAction(identifier: DoneYetActionKind.markDoneForever.rawValue, title: strings.doneForever, options: [])
    let snooze10 = UNNotificationAction(identifier: DoneYetActionKind.snooze10.rawValue, title: strings.snooze10, options: [])
    let snooze1h = UNNotificationAction(identifier: DoneYetActionKind.snooze1h.rawValue, title: strings.snooze1h, options: [])
    let snoozeEvening = UNNotificationAction(identifier: DoneYetActionKind.snoozeEvening.rawValue, title: strings.snoozeEvening, options: [])
    let snoozeTomorrow = UNNotificationAction(identifier: DoneYetActionKind.snoozeTomorrow.rawValue, title: strings.snoozeTomorrow, options: [])
    let reminder = UNNotificationCategory(
      identifier: doneYetTaskReminderCategory,
      actions: [done, snooze10, snooze1h, snoozeEvening, snoozeTomorrow],
      intentIdentifiers: []
    )
    let recurring = UNNotificationCategory(
      identifier: doneYetTaskRecurringReminderCategory,
      actions: [done, doneForever, snooze10, snoozeTomorrow],
      intentIdentifiers: []
    )

    let semaphore = DispatchSemaphore(value: 0)
    UNUserNotificationCenter.current().getNotificationCategories { existingCategories in
      let retainedCategories = existingCategories.filter {
        $0.identifier != doneYetTaskReminderCategory && $0.identifier != doneYetTaskRecurringReminderCategory
      }
      UNUserNotificationCenter.current().setNotificationCategories(retainedCategories.union([reminder, recurring]))
      semaphore.signal()
    }
    _ = semaphore.wait(timeout: .now() + 2)
  }

  private static func scheduleNotification(task: TaskRow, fireAt: Date, soundEnabled: Bool, language: String) -> String {
    let id = UUID().uuidString
    let strings = notificationStrings(language: language)
    let content = UNMutableNotificationContent()
    content.title = strings.title
    content.body = strings.body(task.title.trimmingCharacters(in: .whitespacesAndNewlines))
    content.categoryIdentifier = task.taskMode == "recurring" ? doneYetTaskRecurringReminderCategory : doneYetTaskReminderCategory
    content.sound = soundEnabled ? .default : nil
    content.userInfo = [
      "taskId": task.id,
      "taskTitle": task.title,
      "scheduledFor": DateFormatter.doneYetISO.string(from: fireAt)
    ]
    let trigger = UNCalendarNotificationTrigger(
      dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: fireAt),
      repeats: false
    )
    let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
    let semaphore = DispatchSemaphore(value: 0)
    UNUserNotificationCenter.current().add(request) { _ in
      semaphore.signal()
    }
    _ = semaphore.wait(timeout: .now() + 2)
    return id
  }
}

private enum DoneYetSnapshotBuilder {
  static func writeSnapshot(db: SQLiteConnection) throws {
    let settings = try db.query("SELECT value FROM settings WHERE id = ?", ["singleton"]).first.flatMap { $0["value"] ?? nil }
    let language = resolveLanguage(settingsJson: settings)
    let strings = widgetStrings(language: language)
    let now = Date()
    let tasks = try TaskRow.fetchAll(db: db)
    let overdue = tasks.filter { $0.isActiveReminder && $0.visibleState(reference: now) == "overdue" }.sorted(by: taskDueSort)
    let today = tasks.filter { $0.isTodayReminder(reference: now) && $0.visibleState(reference: now) != "overdue" }.sorted(by: taskDueSort)
    let todos = tasks.filter { $0.status == "active" && $0.taskMode == "todo" }.sorted {
      $0.updatedAt == $1.updatedAt ? $0.id > $1.id : $0.updatedAt > $1.updatedAt
    }
    let visible = Array((overdue + today + todos).prefix(8))
    let taskJson = visible.map { task -> [String: Any] in
      var actions: [[String: String]] = []
      if task.taskMode == "todo" {
        actions.append(["type": "complete", "label": strings.done, "url": ""])
      } else if task.taskMode == "recurring" {
        if task.isRecurringCycleDue(reference: now) {
          actions.append(["type": "complete_cycle", "label": strings.completeCycle, "url": ""])
        }
      } else {
        actions.append(["type": "complete_finish", "label": strings.completeFinish, "url": ""])
      }
      let dueAt: Any = task.taskMode == "todo" ? NSNull() : (task.nextNotificationAt ?? task.startDateTime)
      return [
        "id": task.id,
        "title": task.title,
        "listName": task.listName,
        "listColor": task.listColor,
        "dueAt": dueAt,
        "taskMode": task.taskMode,
        "state": task.taskMode == "todo" ? "todo" : (task.visibleState(reference: now) == "overdue" ? "overdue" : "today"),
        "detailUrl": "doneyet://tasks/\(task.id)",
        "actions": actions
      ]
    }
    let json: [String: Any] = [
      "schemaVersion": 1,
      "generatedAt": DateFormatter.doneYetISO.string(from: now),
      "locale": language,
      "title": strings.title,
      "subtitle": strings.subtitle(overdue.count, today.count, todos.count),
      "emptyTitle": strings.emptyTitle,
      "emptyDescription": strings.emptyDescription,
      "counts": ["overdue": overdue.count, "today": today.count, "todo": todos.count],
      "tasks": taskJson
    ]
    let data = try JSONSerialization.data(withJSONObject: json)
    DoneYetSharedStore.writeSnapshot(String(data: data, encoding: .utf8) ?? "{}")
  }

  private static func taskDueSort(left: TaskRow, right: TaskRow) -> Bool {
    if left.dueTime == right.dueTime {
      return left.id < right.id
    }
    return left.dueTime < right.dueTime
  }
}

private final class SQLiteConnection {
  private var db: OpaquePointer?

  init?(path: String) {
    guard sqlite3_open_v2(path, &db, SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK else {
      return nil
    }
  }

  deinit {
    sqlite3_close(db)
  }

  func query(_ sql: String, _ args: [String?] = []) throws -> [[String: String?]] {
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
      throw SQLiteError.prepare
    }
    defer { sqlite3_finalize(statement) }
    bind(args, to: statement)
    var rows: [[String: String?]] = []
    while sqlite3_step(statement) == SQLITE_ROW {
      var row: [String: String?] = [:]
      for index in 0..<sqlite3_column_count(statement) {
        let name = String(cString: sqlite3_column_name(statement, index))
        if sqlite3_column_type(statement, index) == SQLITE_NULL {
          row[name] = nil
        } else if let text = sqlite3_column_text(statement, index) {
          row[name] = String(cString: text)
        } else {
          row[name] = nil
        }
      }
      rows.append(row)
    }
    return rows
  }

  func exec(_ sql: String, _ args: [String?] = []) throws {
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
      throw SQLiteError.prepare
    }
    defer { sqlite3_finalize(statement) }
    bind(args, to: statement)
    guard sqlite3_step(statement) == SQLITE_DONE else {
      throw SQLiteError.step
    }
  }

  func transaction(_ body: () throws -> Void) throws {
    try exec("BEGIN IMMEDIATE TRANSACTION")
    do {
      try body()
      try exec("COMMIT")
    } catch {
      try? exec("ROLLBACK")
      throw error
    }
  }

  private func bind(_ args: [String?], to statement: OpaquePointer?) {
    for (index, arg) in args.enumerated() {
      let position = Int32(index + 1)
      if let arg {
        sqlite3_bind_text(statement, position, arg, -1, SQLITE_TRANSIENT)
      } else {
        sqlite3_bind_null(statement, position)
      }
    }
  }
}

private enum SQLiteError: Error {
  case prepare
  case step
}

private struct TaskRow {
  let id: String
  let title: String
  let description: String
  let listId: String
  let listName: String
  let listColor: String
  let createdAt: String
  let updatedAt: String
  let startReminderType: String
  let startDateTime: String
  let startReminderWeekday: Int?
  let startReminderDayOfMonth: Int?
  let startReminderTime: String
  let startReminderUsesLastDay: Bool
  let taskMode: String
  let repeatIntervalValue: Int
  let repeatIntervalUnit: String
  let status: String
  let lastNotificationAt: String?
  let nextNotificationAt: String?
  let snoozedUntil: String?
  let notificationIdsJson: String
  let completedAt: String?

  var notificationIds: [String] {
    guard let data = notificationIdsJson.data(using: .utf8),
      let values = try? JSONDecoder().decode([String].self, from: data) else {
      return []
    }
    return values
  }

  var isActiveReminder: Bool {
    status == "active" && taskMode != "todo"
  }

  var dueTime: Date {
    DateFormatter.doneYetISO.date(from: nextNotificationAt ?? startDateTime) ?? .distantFuture
  }

  static func fetch(db: SQLiteConnection, taskId: String) throws -> TaskRow? {
    try db.query(taskQuery(whereClause: "WHERE t.id = ?"), [taskId]).first.flatMap(TaskRow.init)
  }

  static func fetchAll(db: SQLiteConnection) throws -> [TaskRow] {
    try db.query(taskQuery(whereClause: "ORDER BY t.sortOrder ASC, t.createdAt DESC, t.id ASC")).compactMap(TaskRow.init)
  }

  private static func taskQuery(whereClause: String) -> String {
    """
    SELECT t.*, COALESCE(l.name, '') AS listName, COALESCE(l.color, '#116466') AS listColor
    FROM tasks t
    LEFT JOIN lists l ON l.id = t.listId
    \(whereClause)
    """
  }

  init?(row: [String: String?]) {
    func value(_ key: String) -> String? {
      row[key] ?? nil
    }

    guard let id = value("id"),
      let title = value("title"),
      let description = value("description"),
      let listId = value("listId"),
      let createdAt = value("createdAt"),
      let updatedAt = value("updatedAt"),
      let startReminderType = value("startReminderType"),
      let startDateTime = value("startDateTime"),
      let startReminderTime = value("startReminderTime"),
      let taskMode = value("taskMode"),
      let repeatIntervalValue = Int(value("repeatIntervalValue") ?? "1"),
      let repeatIntervalUnit = value("repeatIntervalUnit"),
      let status = value("status"),
      let notificationIdsJson = value("notificationIdsJson") else {
      return nil
    }

    self.id = id
    self.title = title
    self.description = description
    self.listId = listId
    self.listName = value("listName") ?? ""
    self.listColor = value("listColor") ?? "#116466"
    self.createdAt = createdAt
    self.updatedAt = updatedAt
    self.startReminderType = startReminderType
    self.startDateTime = startDateTime
    self.startReminderWeekday = Int(value("startReminderWeekday") ?? "")
    self.startReminderDayOfMonth = Int(value("startReminderDayOfMonth") ?? "")
    self.startReminderTime = startReminderTime
    self.startReminderUsesLastDay = value("startReminderUsesLastDay") == "1"
    self.taskMode = taskMode
    self.repeatIntervalValue = repeatIntervalValue
    self.repeatIntervalUnit = repeatIntervalUnit
    self.status = status
    self.lastNotificationAt = value("lastNotificationAt")
    self.nextNotificationAt = value("nextNotificationAt")
    self.snoozedUntil = value("snoozedUntil")
    self.notificationIdsJson = notificationIdsJson
    self.completedAt = value("completedAt")
  }

  func isTodayReminder(reference: Date) -> Bool {
    guard isActiveReminder, let next = nextNotificationAt.flatMap(DateFormatter.doneYetISO.date(from:)) else {
      return false
    }
    let start = Calendar.current.startOfDay(for: reference)
    let end = Calendar.current.date(byAdding: .day, value: 1, to: start) ?? start
    return next >= start && next < end
  }

  func visibleState(reference: Date) -> String {
    if status == "completed" {
      return "completed"
    }
    if status == "paused" {
      return "paused"
    }
    if let snoozed = snoozedUntil.flatMap(DateFormatter.doneYetISO.date(from:)), snoozed > reference {
      return "snoozed"
    }
    if let next = nextNotificationAt.flatMap(DateFormatter.doneYetISO.date(from:)), next <= reference {
      return "overdue"
    }
    return startDateTime.isEmpty ? "active" : "upcoming"
  }

  func isRecurringCycleDue(reference: Date) -> Bool {
    guard taskMode == "recurring", status == "active" else {
      return false
    }
    if let snoozed = snoozedUntil.flatMap(DateFormatter.doneYetISO.date(from:)), snoozed > reference {
      return false
    }
    if let last = lastNotificationAt.flatMap(DateFormatter.doneYetISO.date(from:)), reminderBelongsToCurrentCycle(last) {
      return last <= reference
    }
    guard let due = DateFormatter.doneYetISO.date(from: nextNotificationAt ?? startDateTime) else {
      return false
    }
    return due <= reference
  }

  func reminderBelongsToCurrentCycle(_ reminder: Date) -> Bool {
    guard taskMode == "recurring", status == "active" else {
      return false
    }
    if let start = DateFormatter.doneYetISO.date(from: startDateTime), reminder < start {
      return false
    }
    return true
  }

  func addRepeatInterval(to date: Date) -> Date {
    Calendar.current.date(byAdding: repeatIntervalUnit == "minutes" ? .minute : .hour, value: repeatIntervalValue, to: date) ?? date
  }

  func nextOccurrence(reference: Date) -> Date {
    if let snoozed = snoozedUntil.flatMap(DateFormatter.doneYetISO.date(from:)), snoozed > reference {
      return snoozed
    }
    if let next = nextNotificationAt.flatMap(DateFormatter.doneYetISO.date(from:)) {
      if taskMode != "recurring" {
        return next
      }
      var candidate = next
      while candidate <= reference {
        candidate = addRepeatInterval(to: candidate)
      }
      return candidate
    }
    return nextStartDate(reference: reference)
  }

  func nextStartDate(reference: Date) -> Date {
    let start = DateFormatter.doneYetISO.date(from: startDateTime) ?? reference
    switch startReminderType {
    case "exact_date_time":
      return start > reference ? start : reference.addingTimeInterval(60)
    case "today_at_time":
      let candidate = setTime(on: reference)
      return candidate > reference ? candidate : setTime(on: Calendar.current.date(byAdding: .day, value: 1, to: reference) ?? reference)
    case "tomorrow_at_time":
      return setTime(on: Calendar.current.date(byAdding: .day, value: 1, to: reference) ?? reference)
    case "weekly_on_weekday":
      let weekday = startReminderWeekday ?? 1
      let current = Calendar.current.component(.weekday, from: reference) - 1
      let delta = (weekday - current + 7) % 7
      let base = Calendar.current.date(byAdding: .day, value: delta, to: reference) ?? reference
      let candidate = setTime(on: base)
      return candidate > reference ? candidate : Calendar.current.date(byAdding: .day, value: 7, to: candidate) ?? candidate
    case "monthly_on_day", "monthly_on_last_day":
      let candidate = monthlyCandidate(base: reference)
      if candidate > reference {
        return candidate
      }
      let nextMonth = Calendar.current.date(byAdding: .month, value: 1, to: reference) ?? reference
      return monthlyCandidate(base: nextMonth)
    default:
      return start
    }
  }

  func snoozeDate(action: DoneYetActionKind, reference: Date, scheduledFor: Date? = nil) -> Date {
    switch action {
    case .snooze10:
      return relativeSnoozeDate(reference: reference, scheduledFor: scheduledFor, interval: 10 * 60)
    case .snooze1h:
      return relativeSnoozeDate(reference: reference, scheduledFor: scheduledFor, interval: 60 * 60)
    case .snoozeEvening:
      var components = Calendar.current.dateComponents([.year, .month, .day], from: reference)
      components.hour = 19
      components.minute = 0
      components.second = 0
      let candidate = Calendar.current.date(from: components) ?? reference
      return candidate > reference ? candidate : Calendar.current.date(byAdding: .day, value: 1, to: candidate) ?? candidate
    case .snoozeTomorrow:
      return setTime(on: Calendar.current.date(byAdding: .day, value: 1, to: reference) ?? reference)
    case .markDone, .markDoneForever:
      return reference
    }
  }

  private func relativeSnoozeDate(reference: Date, scheduledFor: Date?, interval: TimeInterval) -> Date {
    let base = scheduledFor
      ?? snoozedUntil.flatMap(DateFormatter.doneYetISO.date(from:))
      ?? nextNotificationAt.flatMap(DateFormatter.doneYetISO.date(from:))
      ?? DateFormatter.doneYetISO.date(from: startDateTime)
      ?? reference
    let candidate = base.addingTimeInterval(interval)
    return candidate > reference ? candidate : reference.addingTimeInterval(interval)
  }

  private func setTime(on date: Date) -> Date {
    let parts = startReminderTime.split(separator: ":").map(String.init)
    let hour = Int(parts.first ?? "0") ?? 0
    let minute = Int(parts.dropFirst().first ?? "0") ?? 0
    var components = Calendar.current.dateComponents([.year, .month, .day], from: date)
    components.hour = hour
    components.minute = minute
    components.second = 0
    return Calendar.current.date(from: components) ?? date
  }

  private func monthlyCandidate(base: Date) -> Date {
    var components = Calendar.current.dateComponents([.year, .month], from: base)
    let range = Calendar.current.range(of: .day, in: .month, for: base)
    let maxDay = range?.count ?? 28
    components.day = startReminderUsesLastDay ? maxDay : min(startReminderDayOfMonth ?? maxDay, maxDay)
    components.hour = 0
    components.minute = 0
    let day = Calendar.current.date(from: components) ?? base
    return setTime(on: day)
  }
}

private struct ScheduleDraft {
  var notificationIds: [String] = []
  var lastNotificationAt: String?
  var nextNotificationAt: String?
  var snoozedUntil: String?
  var rows: [NotificationRowDraft] = []

  init(lastNotificationAt: String?, nextNotificationAt: String?, snoozedUntil: String?) {
    self.lastNotificationAt = lastNotificationAt
    self.nextNotificationAt = nextNotificationAt
    self.snoozedUntil = snoozedUntil
  }

  init(task: TaskRow, reference: Date) {
    if task.taskMode == "todo" || task.status != "active" {
      self.init(lastNotificationAt: task.lastNotificationAt, nextNotificationAt: nil, snoozedUntil: nil)
      return
    }
    if let snoozed = task.snoozedUntil.flatMap(DateFormatter.doneYetISO.date(from:)), snoozed > reference {
      self.init(lastNotificationAt: task.lastNotificationAt, nextNotificationAt: DateFormatter.doneYetISO.string(from: snoozed), snoozedUntil: DateFormatter.doneYetISO.string(from: snoozed))
      return
    }
    if task.taskMode == "recurring", let next = task.nextNotificationAt.flatMap(DateFormatter.doneYetISO.date(from:)) {
      var candidate = next
      var last = task.lastNotificationAt
      while candidate <= reference {
        last = laterReminderAnchor(existingValue: last, candidate: candidate)
        candidate = task.addRepeatInterval(to: candidate)
      }
      self.init(lastNotificationAt: last, nextNotificationAt: DateFormatter.doneYetISO.string(from: candidate), snoozedUntil: nil)
      return
    }
    let next = task.nextOccurrence(reference: reference)
    self.init(lastNotificationAt: task.lastNotificationAt, nextNotificationAt: DateFormatter.doneYetISO.string(from: next), snoozedUntil: nil)
  }
}

private struct NotificationRowDraft {
  let id: String
  let taskId: String
  let notificationId: String
  let scheduledFor: String
  let createdAt: String
}

private struct OccurrenceCandidate {
  let task: TaskRow
  let scheduledFor: Date
}

struct SnapshotStrings {
  let title: String
  let emptyTitle: String
  let emptyDescription: String
  let done: String
  let completeCycle: String
  let completeFinish: String
  let subtitle: (Int, Int, Int) -> String
}

private struct NotificationStrings {
  let title: String
  let done: String
  let doneForever: String
  let snooze10: String
  let snooze1h: String
  let snoozeEvening: String
  let snoozeTomorrow: String
  let body: (String) -> String
}

func widgetStrings(language: String) -> SnapshotStrings {
  if language == "tr" {
    return SnapshotStrings(
      title: "DoneYet?",
      emptyTitle: "Takip edilecek görev yok",
      emptyDescription: "Bugün ve geciken görevler burada görünür.",
      done: "Yapıldı",
      completeCycle: "Bu döngüyü tamamla",
      completeFinish: "Tamamla ve bitir",
      subtitle: { "\($0) geciken • \($1) bugün • \($2) To-Do" }
    )
  }

  return SnapshotStrings(
    title: "DoneYet?",
    emptyTitle: "Nothing to track",
    emptyDescription: "Today and overdue tasks show up here.",
    done: "Done",
    completeCycle: "Complete this cycle",
    completeFinish: "Complete and finish",
    subtitle: { "\($0) overdue • \($1) today • \($2) To-Do" }
  )
}

private func notificationStrings(language: String) -> NotificationStrings {
  if language == "tr" {
    return NotificationStrings(
      title: "Hatırlatma",
      done: "Yapıldı",
      doneForever: "Tamamla ve bitir",
      snooze10: "10 dk ertele",
      snooze1h: "1 saat ertele",
      snoozeEvening: "Akşama ertele",
      snoozeTomorrow: "Yarın hatırlat",
      body: { "\($0) yapıldı mı?" }
    )
  }

  return NotificationStrings(
    title: "Reminder",
    done: "Done",
    doneForever: "Complete and finish",
    snooze10: "Snooze 10 min",
    snooze1h: "Snooze 1 hour",
    snoozeEvening: "Snooze until evening",
    snoozeTomorrow: "Remind tomorrow",
    body: { "Did you complete \($0)?" }
  )
}

private func resolveLanguage(settingsJson: String?) -> String {
  if let language = explicitSettingsLanguage(settingsJson: settingsJson) {
    return language
  }

  if let language = snapshotLanguage(data: DoneYetSharedStore.readSnapshotData()) {
    return language
  }

  return preferredSystemLanguage()
}

private func explicitSettingsLanguage(settingsJson: String?) -> String? {
  guard let settingsJson,
    let data = settingsJson.data(using: .utf8),
    let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
    let language = object["language"] as? String else {
    return nil
  }

  return normalizedSupportedLanguage(language)
}

private func snapshotLanguage(data: Data?) -> String? {
  guard let data,
    let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
    let language = object["locale"] as? String else {
    return nil
  }

  return normalizedSupportedLanguage(language)
}

private func normalizedSupportedLanguage(_ value: String?) -> String? {
  let language = (value ?? "").lowercased()
  if language == "tr" || language.hasPrefix("tr-") || language.hasPrefix("tr_") {
    return "tr"
  }
  if language == "en" || language.hasPrefix("en-") || language.hasPrefix("en_") {
    return "en"
  }
  return nil
}

func preferredSystemLanguage() -> String {
  let candidates = Locale.preferredLanguages + [
    Locale.autoupdatingCurrent.identifier,
    Locale.current.identifier,
    Locale.current.languageCode ?? "",
    Bundle.main.preferredLocalizations.first ?? ""
  ]

  return candidates.contains { normalizedSupportedLanguage($0) == "tr" } ? "tr" : "en"
}

private func resolveSoundEnabled(settingsJson: String?) -> Bool {
  guard let settingsJson,
    let data = settingsJson.data(using: .utf8),
    let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
    let value = object["soundEnabled"] else {
    return true
  }

  if let number = value as? NSNumber {
    return number.intValue != 0
  }
  if let string = value as? String {
    return string != "0" && string.lowercased() != "false"
  }
  return true
}

private func laterReminderAnchor(existingValue: String?, candidate: Date) -> String {
  guard let existingValue, let existing = DateFormatter.doneYetISO.date(from: existingValue), existing >= candidate else {
    return DateFormatter.doneYetISO.string(from: candidate)
  }
  return existingValue
}

private func createId(prefix: String) -> String {
  "\(prefix)_\(String(Int(Date().timeIntervalSince1970 * 1000), radix: 36))_\(UUID().uuidString.prefix(8))"
}

private func jsonString(_ values: [String]) -> String {
  guard let data = try? JSONSerialization.data(withJSONObject: values),
    let value = String(data: data, encoding: .utf8) else {
    return "[]"
  }
  return value
}

extension DateFormatter {
  static let doneYetISO: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
    return formatter
  }()
}

private let SQLITE_TRANSIENT = unsafeBitCast(OpaquePointer(bitPattern: -1), to: sqlite3_destructor_type.self)
