package com.furkancakir.doneyet

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Locale

class DoneYetWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    updateWidgets(context, appWidgetManager, appWidgetIds)
  }

  override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
    updateWidgets(context, appWidgetManager, intArrayOf(appWidgetId))
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    val taskId = intent.getStringExtra(EXTRA_TASK_ID) ?: return
    when (intent.action) {
      ACTION_COMPLETE,
      ACTION_SNOOZE_10 -> DoneYetWidgetData.performAction(context, intent.action.orEmpty(), taskId)
    }
  }

  companion object {
    private val rows = listOf(
      WidgetRowIds(R.id.widget_row_1, R.id.widget_row_color_1, R.id.widget_row_title_1, R.id.widget_row_meta_1, R.id.widget_row_done_1, R.id.widget_row_snooze_1),
      WidgetRowIds(R.id.widget_row_2, R.id.widget_row_color_2, R.id.widget_row_title_2, R.id.widget_row_meta_2, R.id.widget_row_done_2, R.id.widget_row_snooze_2),
      WidgetRowIds(R.id.widget_row_3, R.id.widget_row_color_3, R.id.widget_row_title_3, R.id.widget_row_meta_3, R.id.widget_row_done_3, R.id.widget_row_snooze_3),
      WidgetRowIds(R.id.widget_row_4, R.id.widget_row_color_4, R.id.widget_row_title_4, R.id.widget_row_meta_4, R.id.widget_row_done_4, R.id.widget_row_snooze_4),
      WidgetRowIds(R.id.widget_row_5, R.id.widget_row_color_5, R.id.widget_row_title_5, R.id.widget_row_meta_5, R.id.widget_row_done_5, R.id.widget_row_snooze_5),
      WidgetRowIds(R.id.widget_row_6, R.id.widget_row_color_6, R.id.widget_row_title_6, R.id.widget_row_meta_6, R.id.widget_row_done_6, R.id.widget_row_snooze_6),
      WidgetRowIds(R.id.widget_row_7, R.id.widget_row_color_7, R.id.widget_row_title_7, R.id.widget_row_meta_7, R.id.widget_row_done_7, R.id.widget_row_snooze_7),
      WidgetRowIds(R.id.widget_row_8, R.id.widget_row_color_8, R.id.widget_row_title_8, R.id.widget_row_meta_8, R.id.widget_row_done_8, R.id.widget_row_snooze_8)
    )

    fun updateWidgets(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
      val snapshot = DoneYetWidgetData.loadSnapshot(context)
      for (widgetId in appWidgetIds) {
        val options = appWidgetManager.getAppWidgetOptions(widgetId)
        val limit = taskLimitForOptions(options)
        val views = RemoteViews(context.packageName, R.layout.doneyet_widget)
        bindHeader(context, views, snapshot)
        bindRows(context, views, widgetId, snapshot, limit)
        appWidgetManager.updateAppWidget(widgetId, views)
      }
    }

    private fun bindHeader(context: Context, views: RemoteViews, snapshot: DoneYetWidgetSnapshot) {
      views.setTextViewText(R.id.widget_title, snapshot.title)
      views.setTextViewText(R.id.widget_subtitle, snapshot.subtitle)
      views.setOnClickPendingIntent(R.id.widget_header, openUrlIntent(context, "doneyet://", 10_000))
    }

    private fun bindRows(context: Context, views: RemoteViews, widgetId: Int, snapshot: DoneYetWidgetSnapshot, limit: Int) {
      val visibleTasks = snapshot.tasks.take(limit)
      views.setViewVisibility(R.id.widget_empty, if (visibleTasks.isEmpty()) View.VISIBLE else View.GONE)
      views.setTextViewText(R.id.widget_empty_title, snapshot.emptyTitle)
      views.setTextViewText(R.id.widget_empty_description, snapshot.emptyDescription)

      rows.forEachIndexed { index, ids ->
        val task = visibleTasks.getOrNull(index)
        if (task == null) {
          views.setViewVisibility(ids.root, View.GONE)
          return@forEachIndexed
        }

        views.setViewVisibility(ids.root, View.VISIBLE)
        views.setTextViewText(ids.title, task.title)
        views.setTextViewText(ids.meta, taskMeta(snapshot, task))
        views.setInt(ids.color, "setBackgroundColor", parseColor(task.listColor))
        views.setOnClickPendingIntent(ids.root, openUrlIntent(context, task.detailUrl, widgetId * 100 + index))

        val completeAction = task.actions.firstOrNull { it.type == "complete" }
        val snoozeAction = task.actions.firstOrNull { it.type == "snooze_10" }

        if (completeAction != null) {
          views.setViewVisibility(ids.done, View.VISIBLE)
          views.setTextViewText(ids.done, completeAction.label)
          views.setOnClickPendingIntent(ids.done, actionIntent(context, ACTION_COMPLETE, task.id, widgetId * 1_000 + index))
        } else {
          views.setViewVisibility(ids.done, View.GONE)
        }

        if (snoozeAction != null) {
          views.setViewVisibility(ids.snooze, View.VISIBLE)
          views.setTextViewText(ids.snooze, snoozeAction.label)
          views.setOnClickPendingIntent(ids.snooze, actionIntent(context, ACTION_SNOOZE_10, task.id, widgetId * 2_000 + index))
        } else {
          views.setViewVisibility(ids.snooze, View.GONE)
        }
      }
    }

    private fun taskLimitForOptions(options: Bundle): Int {
      val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
      return when {
        minWidth >= 420 -> 8
        minWidth >= 300 -> 6
        minWidth >= 180 -> 3
        else -> 1
      }
    }

    private fun taskMeta(snapshot: DoneYetWidgetSnapshot, task: DoneYetWidgetTask): String {
      val stateLabel = if (snapshot.locale == "tr") {
        when (task.state) {
          "overdue" -> "Gecikti"
          "todo" -> "To-Do"
          else -> "Bugün"
        }
      } else {
        when (task.state) {
          "overdue" -> "Overdue"
          "todo" -> "To-Do"
          else -> "Today"
        }
      }
      val time = task.dueAt?.let(::formatWidgetTime)
      return listOfNotNull(task.listName.takeIf { it.isNotBlank() }, stateLabel, time).joinToString(" • ")
    }

    private fun formatWidgetTime(value: String): String? {
      return runCatching {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        parser.timeZone = java.util.TimeZone.getTimeZone("UTC")
        val date = parser.parse(value) ?: return null
        SimpleDateFormat("HH:mm", Locale.getDefault()).format(date)
      }.getOrNull()
    }

    private fun parseColor(value: String): Int {
      return runCatching { Color.parseColor(value) }.getOrDefault(Color.parseColor("#116466"))
    }

    private fun openUrlIntent(context: Context, url: String, requestCode: Int): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
        setPackage(context.packageName)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun actionIntent(context: Context, action: String, taskId: String, requestCode: Int): PendingIntent {
      val intent = Intent(context, DoneYetWidgetProvider::class.java).apply {
        this.action = action
        putExtra(EXTRA_TASK_ID, taskId)
        data = Uri.parse("doneyet://widget/$action/$taskId")
      }
      return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
  }
}

private data class WidgetRowIds(
  val root: Int,
  val color: Int,
  val title: Int,
  val meta: Int,
  val done: Int,
  val snooze: Int
)
