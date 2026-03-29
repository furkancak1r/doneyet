import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/hooks/useApp';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TaskMode } from '@/types/domain';
import { useTranslation } from 'react-i18next';

export function QuickAddTaskCard({
  defaultListId
}: {
  defaultListId?: string | null;
}) {
  const { lists, theme } = useApp();
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [listId, setListId] = useState(defaultListId ?? lists[0]?.id ?? '');
  const [taskMode, setTaskMode] = useState<TaskMode>('single');

  const visibleLists = useMemo(() => lists, [lists]);

  useEffect(() => {
    const nextDefaultListId = defaultListId ?? lists[0]?.id ?? '';
    const currentExists = listId ? lists.some((list) => list.id === listId) : false;

    if (!currentExists && nextDefaultListId) {
      setListId(nextDefaultListId);
      return;
    }

    if (defaultListId && listId !== defaultListId) {
      setListId(defaultListId);
    }
  }, [defaultListId, listId, lists]);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed || !listId) {
      return;
    }

    router.push({
      pathname: '/tasks/new',
      params: {
        title: trimmed,
        listId,
        taskMode
      }
    });
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t('quickAdd.title')}</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t('quickAdd.placeholder')}
        placeholderTextColor={theme.mutedText}
        style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
      />
      <View style={styles.modeRow}>
        <Chip label={t('quickAdd.modeReminder')} selected={taskMode !== 'todo'} onPress={() => setTaskMode('single')} />
        <Chip label={t('quickAdd.modeTodo')} tone="primary" selected={taskMode === 'todo'} onPress={() => setTaskMode('todo')} />
      </View>
      <View style={styles.chipWrap}>
        {visibleLists.map((list) => (
          <Chip key={list.id} label={list.name} selected={listId === list.id} onPress={() => setListId(list.id)} />
        ))}
      </View>
      <Text style={[styles.helper, { color: theme.mutedText }]}>{t('quickAdd.helper')}</Text>
      <Button label={t('quickAdd.continue')} onPress={() => void handleSubmit()} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12
  },
  input: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  helper: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 10
  }
});
