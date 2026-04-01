import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ListDetailScreen from '@/app/lists/[listId]';
import { useApp } from '@/hooks/useApp';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn()
  },
  useLocalSearchParams: () => ({
    listId: 'list-1'
  })
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

jest.mock('react-native-draggable-flatlist', () => ({
  NestableScrollContainer: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
  NestableDraggableFlatList: ({
    data,
    renderItem
  }: {
    data: Array<{ id: string }>;
    renderItem: (args: { item: { id: string }; drag: () => void; isActive: boolean }) => React.ReactNode;
  }) => {
    const { View } = require('react-native');
    return (
      <View>
        {data.map((item) => (
          <View key={item.id}>{renderItem({ item, drag: () => {}, isActive: false })}</View>
        ))}
      </View>
    );
  }
}));

jest.mock('@/hooks/useApp', () => ({
  useApp: jest.fn()
}));

jest.mock('@/components/Screen', () => ({
  Screen: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

jest.mock('@/components/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  }
}));

jest.mock('@/components/TaskCard', () => ({
  TaskCard: ({ task }: { task: { title: string } }) => {
    const { Text } = require('react-native');
    return <Text>{task.title}</Text>;
  }
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

jest.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: () => {}
  },
  useTranslation: () => ({
    t: (key: string, params?: Record<string, number>) => {
      const staticMap: Record<string, string> = {
        'listDetail.addTask': 'Add task to this list',
        'listDetail.edit': 'Edit list',
        'listDetail.delete': 'Delete list',
        'listDetail.deleteTitle': 'Delete list',
        'listDetail.orderTitle': 'Task order',
        'listDetail.orderHint': 'Long-press and drag to reorder. New tasks are appended to the end of the list.',
        'listDetail.emptyTitle': 'No tasks in this list',
        'listDetail.emptyDescription': 'Add your first task to start using this list.',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete'
      };

      if (key === 'listDetail.description') {
        return `This list has ${params?.activeCount ?? 0} active and ${params?.completedCount ?? 0} completed tasks.`;
      }

      if (key === 'listDetail.deleteBody') {
        return `${params?.taskCount ?? 0} tasks in this list will be deleted, including ${params?.activeCount ?? 0} active and ${params?.completedCount ?? 0} completed items plus any scheduled reminders. Continue?`;
      }

      return staticMap[key] ?? key;
    }
  })
}));

const mockedUseApp = useApp as jest.MockedFunction<typeof useApp>;
const pushMock = router.push as jest.Mock;
const backMock = router.back as jest.Mock;

const theme = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F5F5',
  text: '#101010',
  mutedText: '#606060',
  border: '#DDDDDD',
  primary: '#2A6EF0',
  primarySoft: '#E8F0FF',
  danger: '#C62828',
  warning: '#F57C00',
  success: '#2F7A56',
  chip: '#999999',
  shadow: '#000000'
};

describe('ListDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows edit and delete actions and confirms deletion before removing the list', async () => {
    const deleteList = jest.fn().mockResolvedValue(undefined);
    mockedUseApp.mockReturnValue({
      lists: [{ id: 'list-1', name: 'Work', color: '#116466', icon: 'briefcase-outline', sortOrder: 0, createdAt: '' }],
      tasks: [
        { id: 'task-1', title: 'Prepare report', listId: 'list-1', sortOrder: 0, status: 'active', taskMode: 'todo' },
        { id: 'task-2', title: 'Pay invoice', listId: 'list-1', sortOrder: 1, status: 'completed', taskMode: 'todo' }
      ],
      settings: {
        autoHideCompletedTasks: 0
      },
      theme,
      completeTask: jest.fn(),
      snoozeTask: jest.fn(),
      reorderTasks: jest.fn(),
      deleteList
    } as any);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(<ListDetailScreen />);

    expect(screen.getByText('Edit list')).toBeTruthy();
    expect(screen.getByText('Delete list')).toBeTruthy();

    fireEvent.press(screen.getByText('Edit list'));
    expect(pushMock).toHaveBeenCalledWith('/lists/list-1/edit');

    fireEvent.press(screen.getByText('Delete list'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete list',
      '2 tasks in this list will be deleted, including 1 active and 1 completed items plus any scheduled reminders. Continue?',
      expect.any(Array)
    );

    const [, , buttons] = alertSpy.mock.calls[0];
    await buttons?.[1]?.onPress?.();

    await waitFor(() => expect(deleteList).toHaveBeenCalledWith('list-1'));
    expect(backMock).toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
