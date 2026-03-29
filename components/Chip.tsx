import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';

export function Chip({
  label,
  selected = false,
  onPress,
  tone = 'default',
  icon,
  accessibilityLabel
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'success' | 'danger' | 'warning' | 'primary';
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
}) {
  const { theme } = useApp();
  const toneColor =
    tone === 'primary'
      ? theme.primary
      : tone === 'success'
        ? theme.success
        : tone === 'danger'
          ? theme.danger
          : tone === 'warning'
            ? theme.warning
            : theme.chip;

  const selectedBackgroundColor = tone === 'default' ? theme.primarySoft : toneColor;
  const selectedBorderColor = tone === 'default' ? theme.primary : toneColor;
  const selectedLabelColor = tone === 'default' ? theme.primary : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? selectedBackgroundColor : theme.surfaceAlt,
          opacity: pressed ? 0.85 : 1,
          borderColor: selected ? selectedBorderColor : theme.border
        }
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={selected ? selectedLabelColor : tone === 'primary' ? toneColor : theme.text} style={styles.icon} /> : null}
      <Text style={[styles.label, { color: selected ? selectedLabelColor : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  icon: {
    marginRight: 6
  },
  label: {
    fontSize: 13,
    fontWeight: '600'
  }
});
