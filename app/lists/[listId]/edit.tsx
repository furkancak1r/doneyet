import { useMemo } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ListForm } from '@/features/lists/ListForm';
import { useApp } from '@/hooks/useApp';
import { useTranslation } from 'react-i18next';

export default function EditListScreen() {
  const { lists, updateList } = useApp();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ listId: string }>();
  const list = useMemo(() => lists.find((item) => item.id === params.listId), [lists, params.listId]);

  if (!list) {
    return <Screen />;
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t('routes.editList') }} />
      <ListForm
        initialName={list.name}
        initialColor={list.color}
        initialIcon={list.icon}
        submitLabel={t('common.update')}
        submitErrorKey="listForm.errorUpdate"
        onSubmit={async ({ name, color, icon }) => {
          await updateList(list.id, { name, color, icon });
          router.back();
        }}
      />
    </Screen>
  );
}
