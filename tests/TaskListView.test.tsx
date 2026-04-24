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
    onComplete,
    onFinishRecurringTask
  }: {
    task: { id: string; title: string };
    onComplete?: () => void;
    onFinishRecurringTask?: () => void;
  }) => {
    const { Text, View } = require('react-native');
    return (
      <View>
        <Text>{task.title}</Text>
        <Text testID={`task-list-complete-${task.id}`}>{onComplete ? 'complete' : 'no-complete'}</Text>
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
          {
            id: 'task-2',
            title: 'Active recurring',
            listId: 'list-1',
            status: 'active',
            taskMode: 'recurring',
            startDateTime: '2020-01-01T09:00:00.000Z',
            nextNotificationAt: '2020-01-01T09:00:00.000Z'
          }
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

  it('does not forward completion actions for future recurring cycles', () => {
    render(
      <TaskListView
        tasks={[
          {
            id: 'task-future',
            title: 'Future recurring',
            listId: 'list-1',
            status: 'active',
            taskMode: 'recurring',
            startDateTime: '2030-01-01T09:00:00.000Z',
            nextNotificationAt: '2030-01-01T09:00:00.000Z'
          },
          {
            id: 'task-due',
            title: 'Due recurring',
            listId: 'list-1',
            status: 'active',
            taskMode: 'recurring',
            startDateTime: '2020-01-01T09:00:00.000Z',
            nextNotificationAt: '2020-01-01T09:00:00.000Z'
          },
          {
            id: 'task-single',
            title: 'Single',
            listId: 'list-1',
            status: 'active',
            taskMode: 'single',
            startDateTime: '2030-01-01T09:00:00.000Z',
            nextNotificationAt: '2030-01-01T09:00:00.000Z'
          },
          {
            id: 'task-todo',
            title: 'Todo',
            listId: 'list-1',
            status: 'active',
            taskMode: 'todo'
          }
        ] as any}
        lists={[{ id: 'list-1', name: 'Focus', color: '#2A6EF0', icon: 'list-outline', sortOrder: 0, createdAt: '' }] as any}
        emptyTitle="Empty"
        emptyDescription="Empty state"
        onCompleteTask={() => {}}
        onFinishRecurringTask={() => {}}
      />
    );

    expect(screen.getByTestId('task-list-complete-task-future').props.children).toBe('no-complete');
    expect(screen.getByTestId('task-list-finish-task-future').props.children).toBe('no-finish');
    expect(screen.getByTestId('task-list-complete-task-due').props.children).toBe('complete');
    expect(screen.getByTestId('task-list-finish-task-due').props.children).toBe('finish');
    expect(screen.getByTestId('task-list-complete-task-single').props.children).toBe('complete');
    expect(screen.getByTestId('task-list-complete-task-todo').props.children).toBe('complete');
  });

  it('keeps forwarding recurring completion actions after a remindered cycle even when the next notification is future-dated', () => {
    render(
      <TaskListView
        tasks={[
          {
            id: 'task-reminded',
            title: 'Remindered recurring',
            listId: 'list-1',
            status: 'active',
            taskMode: 'recurring',
            startDateTime: '2020-01-01T09:00:00.000Z',
            lastNotificationAt: '2020-01-01T09:00:00.000Z',
            nextNotificationAt: '2030-01-01T09:00:00.000Z'
          }
        ] as any}
        lists={[{ id: 'list-1', name: 'Focus', color: '#2A6EF0', icon: 'list-outline', sortOrder: 0, createdAt: '' }] as any}
        emptyTitle="Empty"
        emptyDescription="Empty state"
        onCompleteTask={() => {}}
        onFinishRecurringTask={() => {}}
      />
    );

    expect(screen.getByTestId('task-list-complete-task-reminded').props.children).toBe('complete');
    expect(screen.getByTestId('task-list-finish-task-reminded').props.children).toBe('finish');
  });
});
