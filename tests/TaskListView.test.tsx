import { render, screen } from '@testing-library/react-native';
import { TaskListView } from '@/features/tasks/TaskListView';
import { useApp } from '@/hooks/useApp';

jest.mock('@/hooks/useApp', () => ({
  useApp: jest.fn()
}));

jest.mock('@/components/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => {
    const { Text, View } = require('react-native');
    return (
      <View>
        <Text>{title}</Text>
        <Text>{description}</Text>
      </View>
    );
  }
}));

jest.mock('@/components/TaskCard', () => ({
  TaskCard: ({
    task,
    onFinishRecurringTask
  }: {
    task: { id: string; title: string };
    onFinishRecurringTask?: () => void;
  }) => {
    const { Text, View } = require('react-native');
    return (
      <View>
        <Text>{task.title}</Text>
        <Text testID={`task-list-finish-${task.id}`}>{onFinishRecurringTask ? 'finish' : 'no-finish'}</Text>
      </View>
    );
  }
}));

const mockedUseApp = useApp as jest.MockedFunction<typeof useApp>;

describe('TaskListView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseApp.mockReturnValue({
      isTaskMutating: jest.fn().mockReturnValue(false)
    } as any);
  });

  it('does not forward the finish action for completed recurring tasks', () => {
    render(
      <TaskListView
        tasks={[
          { id: 'task-1', title: 'Completed recurring', listId: 'list-1', status: 'completed', taskMode: 'recurring' },
          { id: 'task-2', title: 'Active recurring', listId: 'list-1', status: 'active', taskMode: 'recurring' }
        ] as any}
        lists={[{ id: 'list-1', name: 'Focus', color: '#2A6EF0', icon: 'list-outline', sortOrder: 0, createdAt: '' }] as any}
        emptyTitle="Empty"
        emptyDescription="Empty state"
        onFinishRecurringTask={() => {}}
      />
    );

    expect(screen.getByTestId('task-list-finish-task-1').props.children).toBe('no-finish');
    expect(screen.getByTestId('task-list-finish-task-2').props.children).toBe('finish');
  });
});
