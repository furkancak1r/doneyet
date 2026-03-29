import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { AppList } from '@/types/domain';
import { useTranslation } from 'react-i18next';

export function ListCard({
  list,
  count,
  onPress,
  onLongPress,
  dragging = false,
  showDragHandle = false
}: {
  list: AppList;
  count: number;
  onPress?: () => void;
  onLongPress?: () => void;
  dragging?: boolean;
  showDragHandle?: boolean;
}) {
  const { theme } = useApp();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={180}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: dragging ? theme.primary : theme.border,
          opacity: pressed || dragging ? 0.88 : 1,
          transform: [{ scale: dragging ? 0.985 : 1 }]
        }
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: list.color }]}>
        <Ionicons name={list.icon as any} size={20} color="#FFFFFF" />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{list.name}</Text>
        <Text style={[styles.subtitle, { color: theme.mutedText }]}>{t('listCard.subtitle', { count })}</Text>
      </View>
      {showDragHandle ? <Ionicons name="reorder-three-outline" size={22} color={theme.mutedText} /> : null}
      <Ionicons name="chevron-forward" size={20} color={theme.mutedText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2
  },
  subtitle: {
    fontSize: 13
  }
});
