import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ListForm } from '@/features/lists/ListForm';
import { useApp } from '@/hooks/useApp';
import { useTranslation } from 'react-i18next';

export default function NewListScreen() {
  const { createList } = useApp();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen>
      <ListForm
        submitLabel={t('common.create')}
        onSubmit={async ({ name, color, icon }) => {
          await createList(name, color, icon);
          router.back();
        }}
      />
    </Screen>
  );
}
