import { View } from 'react-native';
import { TaskCard } from '@/components/TaskCard';
import { EmptyState } from '@/components/EmptyState';
import { AppList, Task } from '@/types/domain';

export function TaskListView({
  tasks,
  lists,
  emptyTitle,
  emptyDescription,
  onPressTask,
  onCompleteTask,
  onSnoozeTask
}: {
  tasks: Task[];
  lists: AppList[];
  emptyTitle: string;
  emptyDescription: string;
  onPressTask?: (task: Task) => void;
  onCompleteTask?: (task: Task) => void;
  onSnoozeTask?: (task: Task) => void;
}) {
  if (tasks.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <View>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          list={lists.find((list) => list.id === task.listId)}
          onPress={onPressTask ? () => onPressTask(task) : undefined}
          onComplete={onCompleteTask ? () => onCompleteTask(task) : undefined}
          onSnooze={onSnoozeTask ? () => onSnoozeTask(task) : undefined}
        />
      ))}
    </View>
  );
}
