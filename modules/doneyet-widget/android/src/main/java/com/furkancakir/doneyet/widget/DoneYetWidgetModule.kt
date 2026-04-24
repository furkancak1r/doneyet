package com.furkancakir.doneyet.widget

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.appwidget.AppWidgetManager
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

private const val WIDGET_PREFS = "doneyet_widget"
private const val SNAPSHOT_KEY = "widgetSnapshot"

class DoneYetWidgetModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("DoneYetWidget")

    AsyncFunction("prepareWidgetStorage") {
      val databaseDirectory = File(context.filesDir, "SQLite")
      databaseDirectory.mkdirs()
      mapOf("databaseDirectory" to databaseDirectory.canonicalPath)
    }

    AsyncFunction("writeWidgetSnapshot") { snapshotJson: String ->
      context
        .getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(SNAPSHOT_KEY, snapshotJson)
        .apply()
    }

    AsyncFunction("reloadWidgets") {
      requestWidgetRefresh(context)
    }
  }
}

internal fun requestWidgetRefresh(context: Context) {
  val manager = AppWidgetManager.getInstance(context)
  val componentName = ComponentName(context.packageName, "${context.packageName}.DoneYetWidgetProvider")
  val widgetIds = manager.getAppWidgetIds(componentName)
  if (widgetIds.isNotEmpty()) {
    val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
      component = componentName
      putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
    }
    context.sendBroadcast(intent)
  }
}
