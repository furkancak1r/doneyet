import ExpoModulesCore
import Foundation
import WidgetKit

private let appGroupIdentifier = "group.com.doneyet.appios"
private let databaseName = "doneyet.db"
private let snapshotFileName = "widget-snapshot.json"

public final class DoneYetWidgetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DoneYetWidget")

    AsyncFunction("prepareWidgetStorage") { () -> [String: String] in
      guard let databaseDirectory = try? Self.prepareSharedDatabaseDirectory() else {
        return [:]
      }

      return ["databaseDirectory": databaseDirectory.path]
    }

    AsyncFunction("writeWidgetSnapshot") { (snapshotJson: String) in
      guard let snapshotUrl = Self.snapshotUrl() else {
        return
      }

      try FileManager.default.createDirectory(at: snapshotUrl.deletingLastPathComponent(), withIntermediateDirectories: true)
      try snapshotJson.write(to: snapshotUrl, atomically: true, encoding: .utf8)
      UserDefaults(suiteName: appGroupIdentifier)?.set(snapshotJson, forKey: "widgetSnapshot")
    }

    AsyncFunction("reloadWidgets") {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  private static func appGroupUrl() -> URL? {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier)
  }

  private static func snapshotUrl() -> URL? {
    appGroupUrl()?.appendingPathComponent("Widget", isDirectory: true).appendingPathComponent(snapshotFileName)
  }

  private static func legacyDatabaseDirectory() -> URL? {
    FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first?.appendingPathComponent("SQLite", isDirectory: true)
  }

  private static func prepareSharedDatabaseDirectory() throws -> URL {
    guard let groupUrl = appGroupUrl() else {
      throw NSError(domain: "DoneYetWidget", code: 1, userInfo: [NSLocalizedDescriptionKey: "App Group container is unavailable."])
    }

    let sharedDirectory = groupUrl.appendingPathComponent("SQLite", isDirectory: true)
    try FileManager.default.createDirectory(at: sharedDirectory, withIntermediateDirectories: true)
    try migrateLegacyDatabaseIfNeeded(to: sharedDirectory)
    return sharedDirectory
  }

  private static func migrateLegacyDatabaseIfNeeded(to sharedDirectory: URL) throws {
    let fileManager = FileManager.default
    let sharedDatabase = sharedDirectory.appendingPathComponent(databaseName)

    if fileManager.fileExists(atPath: sharedDatabase.path) {
      return
    }

    guard let legacyDirectory = legacyDatabaseDirectory() else {
      return
    }

    let legacyDatabase = legacyDirectory.appendingPathComponent(databaseName)
    guard fileManager.fileExists(atPath: legacyDatabase.path) else {
      return
    }

    for suffix in ["", "-wal", "-shm"] {
      let source = legacyDirectory.appendingPathComponent(databaseName + suffix)
      let destination = sharedDirectory.appendingPathComponent(databaseName + suffix)
      if fileManager.fileExists(atPath: source.path), !fileManager.fileExists(atPath: destination.path) {
        try fileManager.copyItem(at: source, to: destination)
      }
    }
  }
}
