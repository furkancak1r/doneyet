import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/hooks/useApp';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { TaskListView } from '@/features/tasks/TaskListView';
import { ThemePalette } from '@/types/app';
import {
  buildCalendarMonthDays,
  groupTasksByCalendarDay,
  isSameCalendarDay,
  shiftMonth,
  sortCalendarTasks,
  startOfMonth,
  toCalendarDateKey
} from '@/utils/calendar';
import { getVisibleTaskState, startOfDay } from '@/utils/date';
import { getCurrentAppLanguage, getCurrentLocale } from '@/utils/locale';

function getStatusColor(taskState: ReturnType<typeof getVisibleTaskState>, theme: ThemePalette): string {
  switch (taskState) {
    case 'paused':
      return theme.mutedText;
    case 'overdue':
      return theme.danger;
    case 'snoozed':
      return theme.warning;
    case 'completed':
      return theme.success;
    default:
      return theme.primary;
  }
}

function CalendarDayCell({
  date,
  isCurrentMonth,
  isSelected,
  isToday,
  tasks,
  locale,
  theme,
  onPress
}: {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  tasks: ReturnType<typeof sortCalendarTasks>;
  locale: string;
  theme: ThemePalette;
  onPress: () => void;
}) {
  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(date),
    [date, locale]
  );
  const taskWord = getCurrentAppLanguage() === 'tr' ? 'görev' : tasks.length === 1 ? 'task' : 'tasks';

  const visibleDots = tasks.slice(0, 2);
  const extraTaskCount = Math.max(tasks.length - visibleDots.length, 0);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${dateLabel}, ${tasks.length} ${taskWord}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.dayCell,
        {
          opacity: isCurrentMonth ? 1 : 0.45
        },
        pressed ? styles.dayCellPressed : null
      ]}
    >
      <View
        style={[
          styles.dayCellInner,
          {
            backgroundColor: isSelected ? theme.primarySoft : theme.surface,
            borderColor: isSelected ? theme.primary : isToday ? theme.primary : theme.border,
            shadowColor: theme.shadow
          }
        ]}
      >
        <View style={styles.dayCellTop}>
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={[styles.dayNumber, { color: isSelected ? theme.primary : theme.text }]}
          >
            {date.getDate()}
          </Text>
          {tasks.length > 0 ? (
            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor: isSelected ? theme.primary : theme.surfaceAlt,
                  borderColor: isSelected ? theme.primary : theme.border
                }
              ]}
            >
              <Text numberOfLines={1} style={[styles.countText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                {tasks.length}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.dotRow}>
          {visibleDots.map((task) => {
            const state = getVisibleTaskState(task);
            return <View key={task.id} style={[styles.statusDot, { backgroundColor: getStatusColor(state, theme) }]} />;
          })}
          {extraTaskCount > 0 ? (
            <Text numberOfLines={1} style={[styles.moreTasks, { color: theme.mutedText }]}>
              +{extraTaskCount}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function LegendItem({ label, color, theme }: { label: string; color: string; theme: ThemePalette }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: theme.mutedText }]}>{label}</Text>
    </View>
  );
}

export default function CalendarScreen() {
  const { tasks, lists, theme, completeTask, snoozeTask } = useApp();
  const { t } = useTranslation();
  const locale = getCurrentLocale();
  const today = startOfDay(new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(() => today);

  const monthDays = useMemo(() => buildCalendarMonthDays(visibleMonth), [visibleMonth]);
  const groupedTasks = useMemo(() => groupTasksByCalendarDay(tasks), [tasks]);
  const selectedDayKey = useMemo(() => toCalendarDateKey(selectedDate), [selectedDate]);
  const selectedDayTasks = useMemo(() => sortCalendarTasks(groupedTasks[selectedDayKey] ?? []), [groupedTasks, selectedDayKey]);
  const monthTaskCount = useMemo(
    () =>
      monthDays.reduce((count, day) => {
        if (day.getFullYear() !== visibleMonth.getFullYear() || day.getMonth() !== visibleMonth.getMonth()) {
          return count;
        }

        return count + (groupedTasks[toCalendarDateKey(day)]?.length ?? 0);
      }, 0),
    [groupedTasks, monthDays, visibleMonth]
  );
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(visibleMonth),
    [locale, visibleMonth]
  );
  const monthSummary = monthTaskCount === 1 ? t('calendar.monthSummarySingle') : t('calendar.monthSummaryMany', { count: monthTaskCount });
  const selectedDayLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedDate),
    [locale, selectedDate]
  );
  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
    return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(Date.UTC(2024, 0, 7 + index))));
  }, [locale]);
  const visibleMonthIsToday = visibleMonth.getFullYear() === today.getFullYear() && visibleMonth.getMonth() === today.getMonth();
  const selectedDateIsToday = isSameCalendarDay(selectedDate, today);

  const jumpToMonth = (date: Date) => {
    const nextMonth = startOfMonth(date);
    setVisibleMonth(nextMonth);
    setSelectedDate(startOfDay(date));
  };

  const selectDay = (date: Date) => {
    if (date.getFullYear() !== visibleMonth.getFullYear() || date.getMonth() !== visibleMonth.getMonth()) {
      jumpToMonth(date);
      return;
    }

    setSelectedDate(startOfDay(date));
  };

  const previousMonth = () => {
    jumpToMonth(shiftMonth(visibleMonth, -1));
  };

  const nextMonth = () => {
    jumpToMonth(shiftMonth(visibleMonth, 1));
  };

  const goToToday = () => {
    jumpToMonth(today);
  };

  const statusLegend = [
    { label: t('common.active'), color: theme.primary },
    { label: t('common.snoozed'), color: theme.warning },
    { label: t('common.overdue'), color: theme.danger },
    { label: t('common.completed'), color: theme.success }
  ];

  return (
    <Screen animateOnFocus testID="calendar-screen">
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: theme.text }]}>{t('tabs.calendar')}</Text>
          <Text style={[styles.subtitle, { color: theme.mutedText }]}>{monthTaskCount > 0 ? monthSummary : t('calendar.emptyMonthDescription')}</Text>
        </View>
        <View style={styles.todayChipWrap}>
          <Chip
            label={t('common.today')}
            icon="today-outline"
            tone="primary"
            selected={selectedDateIsToday && visibleMonthIsToday}
            onPress={goToToday}
            accessibilityLabel={t('common.today')}
            testID="calendar-today-chip"
          />
        </View>
      </View>

      <Card style={[styles.calendarCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
        <View style={styles.monthBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('calendar.previousMonth')}
            onPress={previousMonth}
            style={({ pressed }) => [
              styles.navButton,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                opacity: pressed ? 0.86 : 1
              }
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </Pressable>

          <View style={styles.monthTextWrap}>
            <Text style={[styles.monthTitle, { color: theme.text }]}>{monthLabel}</Text>
            <Text style={[styles.monthMeta, { color: theme.mutedText }]}>{selectedDayLabel}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('calendar.nextMonth')}
            onPress={nextMonth}
            style={({ pressed }) => [
              styles.navButton,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                opacity: pressed ? 0.86 : 1
              }
            ]}
          >
            <Ionicons name="chevron-forward" size={20} color={theme.text} />
          </Pressable>
        </View>

        {monthTaskCount === 0 ? (
          <View style={[styles.emptyMonthNote, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <Text style={[styles.emptyMonthTitle, { color: theme.text }]}>{t('calendar.emptyMonthTitle')}</Text>
            <Text style={[styles.emptyMonthDescription, { color: theme.mutedText }]}>{t('calendar.emptyMonthDescription')}</Text>
          </View>
        ) : (
          <View style={styles.legendRow}>
            {statusLegend.map((item) => (
              <LegendItem key={item.label} label={item.label} color={item.color} theme={theme} />
            ))}
          </View>
        )}

        <View style={styles.weekdayRow}>
          {weekdayLabels.map((label) => (
            <Text key={label} style={[styles.weekdayLabel, { color: theme.mutedText }]}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {monthDays.map((date) => {
            const dayKey = toCalendarDateKey(date);
            const dayTasks = groupedTasks[dayKey] ?? [];
            return (
              <CalendarDayCell
                key={dayKey}
                date={date}
                isCurrentMonth={date.getMonth() === visibleMonth.getMonth() && date.getFullYear() === visibleMonth.getFullYear()}
                isSelected={isSameCalendarDay(date, selectedDate)}
                isToday={isSameCalendarDay(date, today)}
                tasks={dayTasks}
                locale={locale}
                theme={theme}
                onPress={() => selectDay(date)}
              />
            );
          })}
        </View>
      </Card>

      <Section title={t('calendar.agendaTitle')}>
        <TaskListView
          tasks={selectedDayTasks}
          lists={lists}
          emptyTitle={t('calendar.emptyDayTitle')}
          emptyDescription={t('calendar.emptyDayDescription')}
          onPressTask={(task) => router.push(`/tasks/${task.id}`)}
          onCompleteTask={(task) => void completeTask(task.id)}
          onSnoozeTask={(task) => void snoozeTask(task.id, new Date(Date.now() + 60 * 60 * 1000))}
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  headerCopy: {
    flex: 1,
    minWidth: 0
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600'
  },
  todayChipWrap: {
    flexShrink: 0,
    alignSelf: 'flex-start',
    marginRight: -8,
    marginBottom: -8
  },
  calendarCard: {
    padding: 14,
    marginBottom: 20
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12
  },
  navButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  monthTextWrap: {
    flex: 1,
    alignItems: 'center'
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '900',
    textTransform: 'capitalize'
  },
  monthMeta: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700'
  },
  emptyMonthNote: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12
  },
  emptyMonthTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4
  },
  emptyMonthDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600'
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '700'
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  dayCell: {
    width: `${100 / 7}%`,
    padding: 2
  },
  dayCellPressed: {
    transform: [{ scale: 0.985 }]
  },
  dayCellInner: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 7,
    justifyContent: 'space-between',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  dayCellTop: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 4
  },
  dayNumber: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    flexShrink: 1
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  countText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800'
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 3,
    minHeight: 10,
    flexWrap: 'nowrap',
    overflow: 'hidden'
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999
  },
  moreTasks: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    marginLeft: 1,
    flexShrink: 1
  }
});
