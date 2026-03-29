import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { NestableDraggableFlatList, NestableScrollContainer } from 'react-native-draggable-flatlist';
import { useApp } from '@/hooks/useApp';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ListCard } from '@/components/ListCard';
import { Chip } from '@/components/Chip';
import { QuickAddTaskCard } from '@/features/tasks/QuickAddTaskCard';
import { TaskListView } from '@/features/tasks/TaskListView';
import { countTasksByState, getListTaskCounts, filterTasks, sortTasks } from '@/utils/taskFilters';
import { useTranslation } from 'react-i18next';

type SectionKey = 'active' | 'today' | 'overdue';

function StatCard({ title, value, tone, onPress }: { title: string; value: number; tone: string; onPress?: () => void }) {
  const { theme } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow,
          opacity: pressed ? 0.88 : 1
        }
      ]}
    >
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: theme.mutedText }]}>{title}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { tasks, lists, theme, completeTask, snoozeTask, notificationGranted, requestNotificationPermission, reorderLists } = useApp();
  const { t } = useTranslation();
  const scrollRef = useRef<any>(null);
  const [sectionOffsets, setSectionOffsets] = useState<Record<SectionKey, number | null>>({
    active: null,
    today: null,
    overdue: null
  });

  const activeTasks = useMemo(() => sortTasks(filterTasks(tasks, { filter: 'active', sort: 'nextNotification' }), 'nextNotification'), [tasks]);
  const todayTasks = useMemo(() => sortTasks(filterTasks(tasks, { filter: 'today', sort: 'nextNotification' }), 'nextNotification'), [tasks]);
  const overdueTasks = useMemo(() => sortTasks(filterTasks(tasks, { filter: 'overdue', sort: 'nextNotification' }), 'nextNotification'), [tasks]);
  const listCounts = useMemo(() => getListTaskCounts(tasks, lists), [lists, tasks]);

  const scrollToSection = (section: SectionKey) => {
    const offset = sectionOffsets[section];

    if (typeof offset !== 'number') {
      return;
    }

    scrollRef.current?.scrollTo?.({
      y: Math.max(0, offset - 16),
      animated: true
    });
  };

  return (
    <Screen scroll={false} padded={false} animateOnFocus>
      <NestableScrollContainer ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!notificationGranted ? (
          <Card>
            <Text style={[styles.bannerTitle, { color: theme.text }]}>{t('home.permissionTitle')}</Text>
            <Text style={[styles.bannerText, { color: theme.mutedText }]}>{t('home.permissionText')}</Text>
            <Button label={t('home.permissionButton')} onPress={() => void requestNotificationPermission()} />
          </Card>
        ) : null}

        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>{t('home.heroTitle')}</Text>
            <Text style={[styles.subtitle, { color: theme.mutedText }]}>{t('home.heroSubtitle')}</Text>
          </View>
        </View>

        <QuickAddTaskCard defaultListId={lists.length > 0 ? lists[lists.length - 1].id : undefined} />

        <View style={styles.statsRow}>
          <StatCard title={t('home.statsActive')} value={countTasksByState(tasks, 'active')} tone={theme.primary} onPress={() => scrollToSection('active')} />
          <StatCard title={t('home.statsToday')} value={countTasksByState(tasks, 'today')} tone={theme.success} onPress={() => scrollToSection('today')} />
          <StatCard title={t('home.statsOverdue')} value={countTasksByState(tasks, 'overdue')} tone={theme.danger} onPress={() => scrollToSection('overdue')} />
        </View>

        <View
          onLayout={(event) => setSectionOffsets((current) => ({ ...current, active: event.nativeEvent.layout.y }))}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.sectionActiveTitle')}</Text>
            <Text style={[styles.sectionAction, { color: theme.primary }]}>{t('home.sectionActiveAction')}</Text>
          </View>
          <Text style={[styles.sectionHint, { color: theme.mutedText }]}>{t('home.sectionActiveHint')}</Text>
          <TaskListView
            tasks={activeTasks}
            lists={lists}
            emptyTitle={t('home.emptyActiveTitle')}
            emptyDescription={t('home.emptyActiveDescription')}
            onPressTask={(task) => router.push(`/tasks/${task.id}`)}
            onCompleteTask={(task) => void completeTask(task.id)}
            onSnoozeTask={(task) => void snoozeTask(task.id, new Date(Date.now() + 10 * 60 * 1000))}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.sectionListsTitle')}</Text>
            <Chip label="" icon="add" tone="primary" accessibilityLabel={t('home.addList')} onPress={() => router.push('/lists/new')} />
          </View>
          <Text style={[styles.sectionHint, { color: theme.mutedText }]}>{t('quickAdd.helper')}</Text>
          {lists.length === 0 ? (
            <EmptyState title={t('empty.lists.title')} description={t('empty.lists.description')} />
          ) : (
            <NestableDraggableFlatList
              data={lists}
              keyExtractor={(item) => item.id}
              onDragEnd={({ data }) => void reorderLists(data.map((item) => item.id))}
              renderItem={({ item, drag, isActive }) => (
                <ListCard
                  list={item}
                  count={listCounts[item.id] ?? 0}
                  onPress={() => router.push(`/lists/${item.id}`)}
                  onLongPress={drag}
                  dragging={isActive}
                  showDragHandle
                />
              )}
            />
          )}
        </View>

        <View
          onLayout={(event) => {
            const todayOffset = event.nativeEvent.layout.y;
            setSectionOffsets((current) => ({ ...current, today: todayOffset }));
          }}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.sectionTodayTitle')}</Text>
            <Link href="/today" style={[styles.sectionAction, { color: theme.primary }]}>
              {t('home.sectionTodayAction')}
            </Link>
          </View>
          <TaskListView
            tasks={todayTasks.slice(0, 3)}
            lists={lists}
            emptyTitle={t('home.emptyTodayTitle')}
            emptyDescription={t('home.emptyTodayDescription')}
            onPressTask={(task) => router.push(`/tasks/${task.id}`)}
            onCompleteTask={(task) => void completeTask(task.id)}
            onSnoozeTask={(task) => void snoozeTask(task.id, new Date(Date.now() + 10 * 60 * 1000))}
          />
        </View>

        <View
          onLayout={(event) => {
            const overdueOffset = event.nativeEvent.layout.y;
            setSectionOffsets((current) => ({ ...current, overdue: overdueOffset }));
          }}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('home.sectionOverdueTitle')}</Text>
            <Link href="/upcoming" style={[styles.sectionAction, { color: theme.primary }]}>
              {t('home.sectionOverdueAction')}
            </Link>
          </View>
          <TaskListView
            tasks={overdueTasks.slice(0, 3)}
            lists={lists}
            emptyTitle={t('home.emptyOverdueTitle')}
            emptyDescription={t('home.emptyOverdueDescription')}
            onPressTask={(task) => router.push(`/tasks/${task.id}`)}
            onCompleteTask={(task) => void completeTask(task.id)}
            onSnoozeTask={(task) => void snoozeTask(task.id, new Date(Date.now() + 10 * 60 * 1000))}
          />
        </View>
      </NestableScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 44
  },
  hero: {
    marginBottom: 16
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 0,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '700'
  },
  section: {
    marginTop: 12,
    marginBottom: 12
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800'
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 12
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700'
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6
  },
  bannerText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12
  }
});
