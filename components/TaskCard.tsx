import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useApp } from '@/hooks/useApp';
import { Task } from '@/types/domain';
import { AppList } from '@/types/domain';
import { getVisibleTaskState, formatDateTimeTR } from '@/utils/date';
import { StatusPill } from '@/components/StatusPill';
import { useTranslation } from 'react-i18next';

export type TaskCardSwipeHintDirection = 'two-way' | 'left-only';

const SWIPE_HINT_RIGHT_OFFSET = 22;
const SWIPE_HINT_LEFT_OFFSET = -16;
const SWIPE_HINT_OUT_DURATION_MS = 280;
const SWIPE_HINT_CROSS_DURATION_MS = 440;
const SWIPE_HINT_RETURN_DURATION_MS = 360;
const SWIPE_HINT_PAUSE_BEFORE_CROSS_MS = 140;
const SWIPE_HINT_PAUSE_BEFORE_RETURN_MS = 120;

function getTaskModeLabel(taskMode: Task['taskMode'], t: (key: string) => string): string {
  if (taskMode === 'todo') {
    return t('taskCard.modeTodo');
  }

  return taskMode === 'recurring' ? t('taskCard.modeRecurring') : t('taskCard.modeSingle');
}

export function TaskCard({
  task,
  list,
  onPress,
  onComplete,
  onFinishRecurringTask,
  onSnooze,
  onLongPress,
  disabled = false,
  dragging = false,
  showDragHandle = false,
  swipeHintDirection,
  onSwipeHintStarted,
  testID
}: {
  task: Task;
  list?: AppList | null;
  onPress?: () => void;
  onComplete?: () => void;
  onFinishRecurringTask?: () => void;
  onSnooze?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  dragging?: boolean;
  showDragHandle?: boolean;
  swipeHintDirection?: TaskCardSwipeHintDirection;
  onSwipeHintStarted?: () => void;
  testID?: string;
}) {
  const { theme } = useApp();
  const { t } = useTranslation();
  const state = useMemo(() => getVisibleTaskState(task), [task]);
  const isTodo = task.taskMode === 'todo';
  const isRecurring = task.taskMode === 'recurring';
  const swipeHintStartedRef = useRef(false);
  const swipeHintOffset = useSharedValue(0);
  const metaTimestamp = useMemo(() => {
    if (isTodo) {
      return t('common.noNotification');
    }

    if (task.nextNotificationAt) {
      return formatDateTimeTR(task.nextNotificationAt);
    }

    if (task.status === 'completed' && task.completedAt) {
      return formatDateTimeTR(task.completedAt);
    }

    return formatDateTimeTR(task.startDateTime);
  }, [isTodo, t, task.completedAt, task.nextNotificationAt, task.startDateTime, task.status]);

  const stopSwipeHint = () => {
    cancelAnimation(swipeHintOffset);
    swipeHintOffset.value = 0;
  };

  useEffect(() => {
    if (!swipeHintDirection || disabled || dragging || swipeHintStartedRef.current) {
      return;
    }

    let cancelled = false;

    async function runSwipeHint(): Promise<void> {
      const reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);

      if (cancelled || reduceMotionEnabled || swipeHintStartedRef.current) {
        return;
      }

      swipeHintStartedRef.current = true;
      onSwipeHintStarted?.();

      if (swipeHintDirection === 'two-way') {
        swipeHintOffset.value = withSequence(
          withTiming(SWIPE_HINT_RIGHT_OFFSET, {
            duration: SWIPE_HINT_OUT_DURATION_MS,
            easing: Easing.out(Easing.cubic)
          }),
          withDelay(
            SWIPE_HINT_PAUSE_BEFORE_CROSS_MS,
            withTiming(SWIPE_HINT_LEFT_OFFSET, {
              duration: SWIPE_HINT_CROSS_DURATION_MS,
              easing: Easing.inOut(Easing.cubic)
            })
          ),
          withDelay(
            SWIPE_HINT_PAUSE_BEFORE_RETURN_MS,
            withTiming(0, {
              duration: SWIPE_HINT_RETURN_DURATION_MS,
              easing: Easing.out(Easing.cubic)
            })
          )
        );
        return;
      }

      swipeHintOffset.value = withSequence(
        withTiming(SWIPE_HINT_LEFT_OFFSET, {
          duration: SWIPE_HINT_OUT_DURATION_MS,
          easing: Easing.out(Easing.cubic)
        }),
        withDelay(
          SWIPE_HINT_PAUSE_BEFORE_CROSS_MS + SWIPE_HINT_PAUSE_BEFORE_RETURN_MS,
          withTiming(0, {
            duration: SWIPE_HINT_RETURN_DURATION_MS,
            easing: Easing.out(Easing.cubic)
          })
        )
      );
    }

    void runSwipeHint();

    return () => {
      cancelled = true;
    };
  }, [disabled, dragging, onSwipeHintStarted, swipeHintDirection, swipeHintOffset]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeHintOffset.value }]
  }));

  const rightActions = () => {
    const doneLabel = isRecurring ? t('taskCard.actionDoneCycle') : t('taskCard.actionDone');

    if (isRecurring && onFinishRecurringTask) {
      return (
        <View style={styles.actionRow}>
          <Pressable onPress={onComplete} style={[styles.actionButton, { backgroundColor: theme.success }]}>
            <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
            <Text style={styles.actionLabel}>{doneLabel}</Text>
          </Pressable>
          <Pressable onPress={onFinishRecurringTask} style={[styles.actionButton, { backgroundColor: theme.primary }]}>
            <Ionicons name="checkmark-done-circle" size={22} color="#FFFFFF" />
            <Text style={styles.actionLabel}>{t('taskCard.actionFinish')}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <Pressable onPress={onComplete} style={[styles.actionButton, { backgroundColor: theme.success }]}>
        <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
        <Text style={styles.actionLabel}>{doneLabel}</Text>
      </Pressable>
    );
  };

  const leftActions = () => (
    <Pressable onPress={onSnooze} style={[styles.actionButton, { backgroundColor: theme.warning }]}>
      <Ionicons name="alarm" size={22} color="#FFFFFF" />
      <Text style={styles.actionLabel}>{t('taskCard.actionSnooze')}</Text>
    </Pressable>
  );

  const card = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={task.title}
      accessibilityState={{ disabled }}
      collapsable={false}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : stopSwipeHint}
      onLongPress={disabled ? undefined : onLongPress}
      delayLongPress={180}
      testID={testID ?? `task-card-${task.id}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: dragging ? theme.primary : theme.border,
          shadowColor: theme.shadow,
          opacity: disabled ? 0.58 : pressed || dragging ? 0.88 : task.status === 'completed' ? 0.7 : 1,
          transform: [{ scale: dragging ? 0.985 : 1 }]
        }
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          {list ? <View style={[styles.listColor, { backgroundColor: list.color }]} /> : null}
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {task.title}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {showDragHandle ? <Ionicons name="reorder-three-outline" size={22} color={theme.mutedText} /> : null}
          <StatusPill
            label={state === 'paused' ? t('common.paused') : state === 'overdue' ? t('taskCard.statusOverdue') : state === 'snoozed' ? t('taskCard.statusSnoozed') : state === 'completed' ? t('taskCard.statusCompleted') : t('taskCard.statusActive')}
            tone={state === 'paused' ? 'default' : state === 'overdue' ? 'danger' : state === 'snoozed' ? 'warning' : state === 'completed' ? 'success' : 'primary'}
          />
        </View>
      </View>
      <View style={styles.modeRow}>
        <StatusPill
          label={getTaskModeLabel(task.taskMode, t)}
          tone={task.taskMode === 'todo' ? 'primary' : task.taskMode === 'recurring' ? 'warning' : 'default'}
        />
      </View>
      {task.description ? <Text style={[styles.description, { color: theme.mutedText }]} numberOfLines={2}>{task.description}</Text> : null}
      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: theme.mutedText }]}>{list?.name ?? t('common.noList')}</Text>
        <Text style={[styles.meta, { color: theme.mutedText }]}>{metaTimestamp}</Text>
      </View>
    </Pressable>
  );

  if (disabled) {
    return <Animated.View style={animatedCardStyle}>{card}</Animated.View>;
  }

  return (
    <Animated.View style={animatedCardStyle}>
      <Swipeable
        renderRightActions={onComplete ? rightActions : undefined}
        renderLeftActions={onSnooze && !isTodo ? leftActions : undefined}
        onSwipeableOpenStartDrag={stopSwipeHint}
        onSwipeableCloseStartDrag={stopSwipeHint}
      >
        {card}
      </Swipeable>
    </Animated.View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1
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
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10
  },
  modeRow: {
    marginBottom: 10
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10
  },
  meta: {
    fontSize: 12,
    fontWeight: '600'
  },
  actionButton: {
    width: 96,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 18,
    marginHorizontal: 4,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4
  },
  actionRow: {
    flexDirection: 'row'
  }
});
