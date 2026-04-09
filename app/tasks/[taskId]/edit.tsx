import { useMemo } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { TaskForm } from '@/features/tasks/TaskForm';
import { useApp } from '@/hooks/useApp';
import { useTranslation } from 'react-i18next';

export default function EditTaskScreen() {
  const { tasks, updateTask, isTaskMutating } = useApp();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId: string }>();
  const task = useMemo(() => tasks.find((item) => item.id === params.taskId), [params.taskId, tasks]);

  if (!task) {
    return <Screen />;
  }

  const submitting = isTaskMutating(task.id);

  return (
    <Screen>
      <Stack.Screen options={{ title: t('routes.editTask') }} />
      <TaskForm
        initialTask={task}
        initialTaskMode={task.taskMode}
        submitLabel={t('common.update')}
        submitting={submitting}
        onSubmit={async (values) => {
          await updateTask(task.id, values);
          router.back();
        }}
      />
    </Screen>
  );
}
