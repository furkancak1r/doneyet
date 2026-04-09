import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useApp } from '@/hooks/useApp';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { CompletedFeedListView } from '@/features/completed/CompletedFeedListView';
import { Chip } from '@/components/Chip';
import { DateTimeField } from '@/components/DateTimeField';
import { addDays, startOfDay } from '@/utils/date';
import { buildCompletedFeedItems, CompletedDateFilter, CompletedFeedModeFilter, filterCompletedFeedItems } from '@/utils/completedFeed';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function CompletedScreen() {
  const { tasks, taskCompletionHistory, lists, theme } = useApp();
  const { t } = useTranslation();
  const [mode, setMode] = useState<CompletedFeedModeFilter>('all');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<CompletedDateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState<Date>(startOfDay(addDays(new Date(), -29)));
  const [customEndDate, setCustomEndDate] = useState<Date>(startOfDay(new Date()));
  const [referenceNow, setReferenceNow] = useState(() => new Date());

  useEffect(() => {
    if (selectedListId && !lists.some((list) => list.id === selectedListId)) {
      setSelectedListId(null);
    }
  }, [lists, selectedListId]);

  useEffect(() => {
    setReferenceNow(new Date());
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextRefresh = () => {
      const now = new Date();
      const nextMidnight = startOfDay(addDays(now, 1));
      const delay = Math.max(1000, nextMidnight.getTime() - now.getTime() + 100);

      timeoutId = setTimeout(() => {
        setReferenceNow(new Date());
        scheduleNextRefresh();
      }, delay);
    };

    scheduleNextRefresh();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const completedItems = useMemo(() => buildCompletedFeedItems(tasks, taskCompletionHistory, lists), [lists, taskCompletionHistory, tasks]);
  const visibleItems = useMemo(
    () =>
      filterCompletedFeedItems(
        completedItems,
        {
          mode,
          listId: selectedListId,
          dateFilter,
          customStartDate,
          customEndDate
        },
        referenceNow
      ),
    [completedItems, customEndDate, customStartDate, dateFilter, mode, referenceNow, selectedListId]
  );

  const emptyState =
    mode === 'cycles'
      ? { title: t('completed.emptyCyclesTitle'), description: t('completed.emptyCyclesDescription') }
      : mode === 'reminder'
        ? { title: t('completed.emptyReminderTitle'), description: t('completed.emptyReminderDescription') }
        : mode === 'todo'
          ? { title: t('completed.emptyTodoTitle'), description: t('completed.emptyTodoDescription') }
          : { title: t('completed.emptyTitle'), description: t('completed.emptyDescription') };

  return (
    <Screen includeBottomSafeArea={false} animateOnFocus>
      <Section title={t('completed.title')} />
      <View style={styles.filterBlock}>
        <Text style={[styles.filterLabel, { color: theme.text }]}>{t('completed.modeFilterLabel')}</Text>
        <View style={styles.filterRow}>
          <Chip label={t('completed.filterAll')} selected={mode === 'all'} onPress={() => setMode('all')} testID="completed-mode-all" />
          <Chip
            label={t('completed.filterReminder')}
            selected={mode === 'reminder'}
            onPress={() => setMode('reminder')}
            tone="warning"
            testID="completed-mode-reminder"
          />
          <Chip label={t('completed.filterTodo')} selected={mode === 'todo'} onPress={() => setMode('todo')} tone="primary" testID="completed-mode-todo" />
          <Chip
            label={t('completed.filterCycles')}
            selected={mode === 'cycles'}
            onPress={() => setMode('cycles')}
            tone="warning"
            testID="completed-mode-cycles"
          />
        </View>
      </View>
      <View style={styles.filterBlock}>
        <Text style={[styles.filterLabel, { color: theme.text }]}>{t('completed.listFilterLabel')}</Text>
        <View style={styles.filterRow}>
          <Chip label={t('completed.listAll')} selected={selectedListId === null} onPress={() => setSelectedListId(null)} testID="completed-list-all" />
          {lists.map((list) => (
            <Chip
              key={list.id}
              label={list.name}
              selected={selectedListId === list.id}
              onPress={() => setSelectedListId(list.id)}
              testID={`completed-list-${list.id}`}
            />
          ))}
        </View>
      </View>
      <View style={styles.filterBlock}>
        <Text style={[styles.filterLabel, { color: theme.text }]}>{t('completed.dateFilterLabel')}</Text>
        <View style={styles.filterRow}>
          <Chip label={t('completed.dateToday')} selected={dateFilter === 'today'} onPress={() => setDateFilter('today')} testID="completed-date-today" />
          <Chip label={t('completed.dateLast7')} selected={dateFilter === 'last7'} onPress={() => setDateFilter('last7')} testID="completed-date-last7" />
          <Chip label={t('completed.dateLast30')} selected={dateFilter === 'last30'} onPress={() => setDateFilter('last30')} testID="completed-date-last30" />
          <Chip label={t('completed.dateAllTime')} selected={dateFilter === 'all'} onPress={() => setDateFilter('all')} testID="completed-date-all" />
          <Chip label={t('completed.dateCustom')} selected={dateFilter === 'custom'} onPress={() => setDateFilter('custom')} testID="completed-date-custom" />
        </View>
      </View>
      {dateFilter === 'custom' ? (
        <View style={styles.customDateWrap}>
          <DateTimeField label={t('completed.customStartLabel')} value={customStartDate} mode="date" onChange={setCustomStartDate} />
          <DateTimeField label={t('completed.customEndLabel')} value={customEndDate} mode="date" onChange={setCustomEndDate} />
        </View>
      ) : null}
      <CompletedFeedListView items={visibleItems} emptyTitle={emptyState.title} emptyDescription={emptyState.description} onPressTask={(taskId) => router.push(`/tasks/${taskId}`)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterBlock: {
    marginBottom: 12
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  customDateWrap: {
    marginBottom: 4
  }
});
