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
  disabled = false,
  dragging = false,
  showDragHandle = false,
  testID
}: {
  list: AppList;
  count: number;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  dragging?: boolean;
  showDragHandle?: boolean;
  testID?: string;
}) {
  const { theme } = useApp();
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={list.name}
      accessibilityState={{ disabled }}
      collapsable={false}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      delayLongPress={180}
      testID={testID ?? `list-card-${list.id}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: dragging ? theme.primary : theme.border,
          shadowColor: theme.shadow,
          opacity: disabled ? 0.58 : pressed || dragging ? 0.88 : 1,
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
    gap: 12,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
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
