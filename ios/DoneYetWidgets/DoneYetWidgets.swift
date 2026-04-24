import Foundation
import AppIntents
import SwiftUI
import UIKit
import WidgetKit

private struct WidgetSnapshot: Decodable {
  let locale: String
  let title: String
  let subtitle: String
  let emptyTitle: String
  let emptyDescription: String
  let counts: WidgetCounts?
  let tasks: [WidgetTask]

  static var empty: WidgetSnapshot {
    empty(language: preferredSystemLanguage())
  }

  static func empty(language: String) -> WidgetSnapshot {
    let strings = widgetStrings(language: language)
    return WidgetSnapshot(
      locale: language,
      title: strings.title,
      subtitle: strings.subtitle(0, 0, 0),
      emptyTitle: strings.emptyTitle,
      emptyDescription: strings.emptyDescription,
      counts: WidgetCounts(overdue: 0, today: 0, todo: 0),
      tasks: []
    )
  }
}

private struct WidgetCounts: Decodable {
  let overdue: Int
  let today: Int
  let todo: Int
}

private struct WidgetTask: Decodable, Identifiable {
  let id: String
  let title: String
  let listName: String
  let listColor: String
  let dueAt: String?
  let taskMode: String
  let state: String
  let detailUrl: String
  let actions: [WidgetTaskAction]

  var detailURL: URL {
    URL(string: detailUrl) ?? URL(string: "doneyet://")!
  }

  var completionAction: WidgetTaskAction? {
    actions.first { action in
      action.type == "complete" || action.type == "complete_cycle" || action.type == "complete_finish"
    }
  }

  func actionURL(type: String) -> URL? {
    actions.first { $0.type == type }?.actionURL
  }

  func stateLabel(locale: String) -> String {
    if locale == "tr" {
      switch state {
      case "overdue":
        return "Gecikti"
      case "todo":
        return "To-Do"
      default:
        return "Bugün"
      }
    }

    switch state {
    case "overdue":
      return "Overdue"
    case "todo":
      return "To-Do"
    default:
      return "Today"
    }
  }

  func compactMeta(locale: String) -> String {
    let stateLabel = stateLabel(locale: locale)
    guard !formattedDueAt.isEmpty else {
      return stateLabel
    }
    return "\(stateLabel) • \(formattedDueAt)"
  }

  func fullMeta(locale: String) -> String {
    let parts: [String] = [listName, stateLabel(locale: locale), formattedDueAt].compactMap { value -> String? in
      value.isEmpty ? nil : value
    }
    return parts.joined(separator: " • ")
  }

  private var formattedDueAt: String {
    guard let dueAt = dueAt, let date = DateFormatter.doneYetISO.date(from: dueAt) else {
      return ""
    }
    return DateFormatter.widgetTime.string(from: date)
  }
}

private struct WidgetTaskAction: Decodable {
  let type: String
  let label: String
  let url: String

  var actionURL: URL? {
    URL(string: url)
  }
}

private struct DoneYetWidgetEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot
}

private struct DoneYetWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> DoneYetWidgetEntry {
    DoneYetWidgetEntry(date: Date(), snapshot: .empty)
  }

  func getSnapshot(in context: Context, completion: @escaping (DoneYetWidgetEntry) -> Void) {
    completion(DoneYetWidgetEntry(date: Date(), snapshot: DoneYetWidgetStore.loadSnapshot()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<DoneYetWidgetEntry>) -> Void) {
    let entry = DoneYetWidgetEntry(date: Date(), snapshot: DoneYetWidgetStore.loadSnapshot())
    completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60))))
  }
}

@main
struct DoneYetWidgetsBundle: WidgetBundle {
  var body: some Widget {
    DoneYetTasksWidget()
  }
}

private struct DoneYetTasksWidget: Widget {
  let kind = "DoneYetTasksWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: DoneYetWidgetProvider()) { entry in
      DoneYetWidgetView(entry: entry)
    }
    .configurationDisplayName("DoneYet?")
    .description("DoneYet? tasks and reminders")
    .supportedFamilies(supportedFamilies)
    .contentMarginsDisabled()
  }

  private var supportedFamilies: [WidgetFamily] {
    var families: [WidgetFamily] = [.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge]
    if #available(iOS 16.0, *) {
      families.append(contentsOf: [.accessoryInline, .accessoryCircular, .accessoryRectangular])
    }
    return families
  }
}

private struct DoneYetWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: DoneYetWidgetEntry

  var body: some View {
    switch family {
    case .accessoryInline:
      accessoryInline
    case .accessoryCircular:
      accessoryCircular
    case .accessoryRectangular:
      accessoryRectangular
    default:
      systemWidget
    }
  }

  @ViewBuilder
  private var systemWidget: some View {
    if #available(iOS 16.0, *) {
      RenderingAwareSystemWidget(entry: entry, family: family)
    } else {
      DoneYetSystemWidgetContent(entry: entry, family: family, usesAccentedRendering: false)
    }
  }

  private var accessoryInline: some View {
    Text(entry.snapshot.tasks.first?.title ?? entry.snapshot.emptyTitle)
      .widgetURL(entry.snapshot.tasks.first?.detailURL ?? URL(string: "doneyet://"))
  }

  private var accessoryCircular: some View {
    VStack(spacing: 2) {
      Text("\(entry.snapshot.tasks.count)")
        .font(.headline.weight(.bold))
      Image(systemName: "checklist")
        .font(.caption2)
    }
    .widgetURL(entry.snapshot.tasks.first?.detailURL ?? URL(string: "doneyet://"))
  }

  private var accessoryRectangular: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(entry.snapshot.title)
        .font(.caption.weight(.semibold))
      Text(entry.snapshot.tasks.first?.title ?? entry.snapshot.emptyTitle)
        .font(.caption2)
        .lineLimit(2)
    }
    .widgetURL(entry.snapshot.tasks.first?.detailURL ?? URL(string: "doneyet://"))
  }
}

@available(iOS 16.0, *)
private struct RenderingAwareSystemWidget: View {
  @Environment(\.widgetRenderingMode) private var widgetRenderingMode
  let entry: DoneYetWidgetEntry
  let family: WidgetFamily

  var body: some View {
    DoneYetSystemWidgetContent(entry: entry, family: family, usesAccentedRendering: widgetRenderingMode != .fullColor)
  }
}

private struct DoneYetSystemWidgetContent: View {
  let entry: DoneYetWidgetEntry
  let family: WidgetFamily
  let usesAccentedRendering: Bool

  var body: some View {
    Group {
      if isSmall {
        SmallDoneYetWidgetContent(snapshot: entry.snapshot, usesAccentedRendering: usesAccentedRendering)
      } else {
        regularContent
      }
    }
    .containerBackgroundIfAvailable(Color(uiColor: .secondarySystemBackground))
  }

  private var regularContent: some View {
    VStack(alignment: .leading, spacing: 8) {
      header

      if entry.snapshot.tasks.isEmpty {
        Spacer(minLength: 0)
        emptyState
        Spacer(minLength: 0)
      } else {
        VStack(alignment: .leading, spacing: rowSpacing) {
          ForEach(entry.snapshot.tasks.prefix(systemLimit)) { task in
            WidgetTaskRow(
              task: task,
              locale: entry.snapshot.locale,
              usesAccentedRendering: usesAccentedRendering
            )
          }
        }
      }
    }
    .padding(contentPadding)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .foregroundStyle(.primary)
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: isSmall ? 3 : 4) {
      Text(entry.snapshot.title)
        .font(titleFont)
        .lineLimit(1)
        .minimumScaleFactor(0.82)

      Text(entry.snapshot.subtitle)
        .font(subtitleFont)
        .foregroundStyle(.secondary)
        .lineLimit(isSmall ? 2 : 1)
        .minimumScaleFactor(0.86)
        .fixedSize(horizontal: false, vertical: true)
    }
  }

  private var emptyState: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(entry.snapshot.emptyTitle)
        .font(emptyTitleFont)
        .lineLimit(2)
        .minimumScaleFactor(0.86)
      Text(entry.snapshot.emptyDescription)
        .font(emptyDescriptionFont)
        .foregroundStyle(.secondary)
        .lineLimit(isSmall ? 3 : 2)
        .minimumScaleFactor(0.88)
    }
  }

  private var systemLimit: Int {
    switch family {
    case .systemSmall:
      return 1
    case .systemMedium:
      return 3
    case .systemLarge:
      return 6
    case .systemExtraLarge:
      return 8
    default:
      return 3
    }
  }

  private var isSmall: Bool {
    family == .systemSmall
  }

  private var rowSpacing: CGFloat {
    family == .systemMedium ? 10 : 8
  }

  private var contentPadding: EdgeInsets {
    return EdgeInsets(top: 16, leading: 16, bottom: 16, trailing: 16)
  }

  private var titleFont: Font {
    .headline.weight(.bold)
  }

  private var subtitleFont: Font {
    .system(size: 12, weight: .medium)
  }

  private var emptyTitleFont: Font {
    .subheadline.weight(.semibold)
  }

  private var emptyDescriptionFont: Font {
    .system(size: 12, weight: .regular)
  }
}

private struct SmallDoneYetWidgetContent: View {
  let snapshot: WidgetSnapshot
  let usesAccentedRendering: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      header

      Spacer(minLength: 4)

      if let task = snapshot.tasks.first {
        taskContent(task)
      } else {
        emptyContent
      }
    }
    .padding(EdgeInsets(top: 9, leading: 9, bottom: 9, trailing: 9))
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .foregroundStyle(primaryText)
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 1) {
      Text(snapshot.title)
        .font(.system(size: 18, weight: .bold, design: .rounded))
        .foregroundStyle(primaryText)
        .lineLimit(1)
        .minimumScaleFactor(0.82)

      Text(compactSubtitle)
        .font(.system(size: 10.5, weight: .semibold))
        .foregroundStyle(secondaryText)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
    }
  }

  private func taskContent(_ task: WidgetTask) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      Link(destination: task.detailURL) {
        Text(task.title)
          .font(taskTitleFont(for: task.title))
          .foregroundStyle(primaryText)
          .lineLimit(2)
          .minimumScaleFactor(0.72)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .buttonStyle(.plain)

      Spacer(minLength: 4)

      HStack(alignment: .bottom, spacing: 4) {
        Text(task.compactMeta(locale: snapshot.locale))
          .font(.system(size: 10.8, weight: .semibold))
          .foregroundStyle(secondaryText)
          .lineLimit(1)
          .minimumScaleFactor(0.82)
          .layoutPriority(1)

        Spacer(minLength: 2)

        completeButton(for: task)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private var emptyContent: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(snapshot.emptyTitle)
        .font(.system(size: 15.5, weight: .semibold))
        .foregroundStyle(primaryText)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
      Text(snapshot.emptyDescription)
        .font(.system(size: 10.8, weight: .medium))
        .foregroundStyle(secondaryText)
        .lineLimit(3)
        .minimumScaleFactor(0.82)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }

  @ViewBuilder
  private func completeButton(for task: WidgetTask) -> some View {
    if let action = task.completionAction {
      if #available(iOSApplicationExtension 17.0, *) {
        if action.type == "complete_finish" {
          Button(intent: FinishDoneYetTaskIntent(taskId: task.id)) {
            smallCompleteButtonLabel
          }
          .buttonStyle(.plain)
          .accessibilityLabel(action.label)
        } else {
          Button(intent: CompleteDoneYetTaskIntent(taskId: task.id)) {
            smallCompleteButtonLabel
          }
          .buttonStyle(.plain)
          .accessibilityLabel(action.label)
        }
      }
    }
  }

  private var smallCompleteButtonLabel: some View {
    Image(systemName: "checkmark")
      .font(.system(size: 16, weight: .bold))
      .foregroundStyle(Color(uiColor: .systemBackground))
      .frame(width: 34, height: 34)
      .background(
        Circle()
          .fill(usesAccentedRendering ? Color.primary : Color.accentColor)
      )
  }

  private func taskTitleFont(for title: String) -> Font {
    title.count <= 8
      ? .system(size: 18, weight: .bold, design: .rounded)
      : .system(size: 16.5, weight: .bold, design: .rounded)
  }

  private var compactSubtitle: String {
    guard let counts = snapshot.counts else {
      return snapshot.subtitle
    }

    if snapshot.locale == "tr" {
      return "\(counts.overdue) geç • \(counts.today) bugün • \(counts.todo) td"
    }

    return "\(counts.overdue) due • \(counts.today) today • \(counts.todo) td"
  }

  private var primaryText: Color {
    usesAccentedRendering ? .primary : Color(uiColor: .label)
  }

  private var secondaryText: Color {
    usesAccentedRendering ? .secondary : Color(uiColor: .secondaryLabel)
  }
}

private struct WidgetTaskRow: View {
  let task: WidgetTask
  let locale: String
  let usesAccentedRendering: Bool

  var body: some View {
    HStack(spacing: 8) {
      RoundedRectangle(cornerRadius: 3)
        .fill(listIndicatorColor)
        .frame(width: 7)

      Link(destination: task.detailURL) {
        VStack(alignment: .leading, spacing: 2) {
          Text(task.title)
            .font(titleFont)
            .foregroundStyle(.primary)
            .lineLimit(1)
            .minimumScaleFactor(0.86)
          Text(meta)
            .font(metaFont)
            .foregroundStyle(.secondary)
            .lineLimit(1)
            .minimumScaleFactor(0.86)
        }
      }
      .buttonStyle(.plain)
      .layoutPriority(1)

      Spacer(minLength: 4)

      actionButtons
    }
    .frame(minHeight: 34)
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  @ViewBuilder
  private var actionButtons: some View {
    completionButton
    .fixedSize(horizontal: true, vertical: true)
  }

  @ViewBuilder
  private var completionButton: some View {
    if let action = task.completionAction {
      if #available(iOSApplicationExtension 17.0, *) {
        if action.type == "complete_finish" {
          actionButton(intent: FinishDoneYetTaskIntent(taskId: task.id), systemName: "checkmark", isPrimary: true, accessibilityLabel: action.label)
        } else {
          actionButton(intent: CompleteDoneYetTaskIntent(taskId: task.id), systemName: "checkmark", isPrimary: true, accessibilityLabel: action.label)
        }
      }
    }
  }

  @available(iOSApplicationExtension 17.0, *)
  private func actionButton<I: AppIntent>(intent: I, systemName: String, isPrimary: Bool, accessibilityLabel: String) -> some View {
    Button(intent: intent) {
      Image(systemName: systemName)
        .font(buttonFont)
        .foregroundStyle(actionForeground(isPrimary: isPrimary))
        .frame(width: 32, height: 32)
        .background(
          Circle()
            .fill(actionBackground(isPrimary: isPrimary))
        )
        .overlay(
          Circle()
            .stroke(actionStroke(isPrimary: isPrimary), lineWidth: isPrimary ? 0 : 1)
        )
    }
    .buttonStyle(.plain)
    .frame(width: 32, height: 32)
    .contentShape(Circle())
    .accessibilityLabel(accessibilityLabel)
  }

  private var listIndicatorColor: Color {
    usesAccentedRendering ? .accentColor : Color(hex: task.listColor)
  }

  private var titleFont: Font {
    .caption.weight(.semibold)
  }

  private var metaFont: Font {
    .system(size: 11.5, weight: .regular)
  }

  private var buttonFont: Font {
    .system(size: 14, weight: .bold)
  }

  private var meta: String {
    task.fullMeta(locale: locale)
  }

  private func actionBackground(isPrimary: Bool) -> Color {
    if usesAccentedRendering {
      return isPrimary ? .primary : .primary.opacity(0.18)
    }
    return isPrimary ? .accentColor : .accentColor.opacity(0.18)
  }

  private func actionForeground(isPrimary: Bool) -> Color {
    if usesAccentedRendering {
      return isPrimary ? Color(uiColor: .systemBackground) : .primary
    }
    return isPrimary ? Color(uiColor: .systemBackground) : .accentColor
  }

  private func actionStroke(isPrimary: Bool) -> Color {
    if isPrimary {
      return .clear
    }
    return usesAccentedRendering ? .primary.opacity(0.28) : .accentColor.opacity(0.42)
  }
}

private enum DoneYetWidgetStore {
  static func loadSnapshot() -> WidgetSnapshot {
    guard let data = DoneYetSharedStore.readSnapshotData(),
      let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data) else {
      return .empty
    }
    return snapshot
  }
}

private extension DateFormatter {
  static let widgetTime: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateFormat = "HH:mm"
    return formatter
  }()
}

private extension Color {
  init(hex: String) {
    var value = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if value.hasPrefix("#") {
      value.removeFirst()
    }
    var integer: UInt64 = 0
    Scanner(string: value).scanHexInt64(&integer)
    let red = Double((integer >> 16) & 0xFF) / 255.0
    let green = Double((integer >> 8) & 0xFF) / 255.0
    let blue = Double(integer & 0xFF) / 255.0
    self.init(red: red, green: green, blue: blue)
  }
}

private extension View {
  @ViewBuilder
  func containerBackgroundIfAvailable(_ color: Color) -> some View {
    if #available(iOS 17.0, *) {
      self.containerBackground(color, for: .widget)
    } else {
      self.background(color)
    }
  }
}
