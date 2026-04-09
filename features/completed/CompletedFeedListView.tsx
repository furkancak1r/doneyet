import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { StatusPill } from '@/components/StatusPill';
import { useApp } from '@/hooks/useApp';
import { CompletedFeedItem } from '@/utils/completedFeed';
import { formatDateTimeTR } from '@/utils/date';
import { useTranslation } from 'react-i18next';

function getTaskModeLabel(taskMode: CompletedFeedItem['taskMode'], t: (key: string) => string): string {
  if (taskMode === 'todo') {
    return t('taskCard.modeTodo');
  }

  return taskMode === 'recurring' ? t('taskCard.modeRecurring') : t('taskCard.modeSingle');
}

export function CompletedFeedListView({
  items,
  emptyTitle,
  emptyDescription,
  onPressTask
}: {
  items: CompletedFeedItem[];
  emptyTitle: string;
  emptyDescription: string;
  onPressTask?: (taskId: string) => void;
}) {
  const { isTaskMutating } = useApp();

  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <View>
      {items.map((item) => (
        <CompletedFeedCard
          key={item.id}
          item={item}
          onPress={item.canOpen && onPressTask ? () => onPressTask(item.taskId) : undefined}
          disabled={item.canOpen ? isTaskMutating(item.taskId) : false}
        />
      ))}
    </View>
  );
}

function CompletedFeedCard({
  item,
  onPress,
  disabled = false
}: {
  item: CompletedFeedItem;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { theme } = useApp();
  const { t } = useTranslation();
  const isCycle = item.kind === 'cycle';
  const isInteractive = Boolean(onPress);
  const typeTone = item.taskMode === 'todo' ? 'primary' : item.taskMode === 'recurring' ? 'warning' : 'default';

  return (
    <Pressable
      accessibilityRole={isInteractive ? 'button' : undefined}
      accessibilityLabel={item.title}
      accessibilityState={{ disabled }}
      disabled={disabled || !isInteractive}
      onPress={disabled ? undefined : onPress}
      testID={`completed-feed-item-${item.id}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow,
          opacity: disabled ? 0.58 : pressed && isInteractive ? 0.88 : 1
        }
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          {item.listColor ? <View style={[styles.listColor, { backgroundColor: item.listColor }]} /> : null}
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        <View style={styles.pillRow}>
          <StatusPill label={t('taskCard.statusCompleted')} tone="success" />
          <StatusPill label={getTaskModeLabel(item.taskMode, t)} tone={typeTone} />
          {isCycle ? <StatusPill label={t('completed.cycleHistory')} tone="warning" /> : null}
        </View>
      </View>
      {item.description ? (
        <Text style={[styles.description, { color: theme.mutedText }]} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: theme.mutedText }]}>{item.listName || t('common.noList')}</Text>
        <Text style={[styles.meta, { color: theme.mutedText }]}>{formatDateTimeTR(item.completedAt)}</Text>
      </View>
      {isCycle ? <Text style={[styles.note, { color: theme.mutedText }]}>{t('completed.cycleReadOnly')}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1
  },
  header: {
    gap: 10,
    marginBottom: 10
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  listColor: {
    width: 12,
    height: 12,
    borderRadius: 999
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1
  },
  note: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600'
  }
});
