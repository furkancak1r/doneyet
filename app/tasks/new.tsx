import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { TaskForm } from '@/features/tasks/TaskForm';
import { useApp } from '@/hooks/useApp';
import { useTranslation } from 'react-i18next';

export default function NewTaskScreen() {
  const { createTask, requestQuickAddReset, isCreatingTask } = useApp();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ listId?: string; title?: string; taskMode?: string }>();
  const initialTaskMode =
    params.taskMode === 'single' || params.taskMode === 'todo' || params.taskMode === 'recurring' ? params.taskMode : 'recurring';

  return (
    <Screen>
      <TaskForm
        defaultListId={typeof params.listId === 'string' ? params.listId : undefined}
        initialTitle={typeof params.title === 'string' ? params.title : undefined}
        initialTaskMode={initialTaskMode}
        submitLabel={t('common.save')}
        submitting={isCreatingTask}
        onSubmit={async (values) => {
          await createTask(values);
          requestQuickAddReset();
          router.replace('/(tabs)');
        }}
      />
    </Screen>
  );
}
