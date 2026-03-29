import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { useApp } from '@/hooks/useApp';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  style
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  style?: ViewStyle;
}) {
  const { theme } = useApp();
  const backgroundColor =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? theme.danger
        : variant === 'secondary'
          ? theme.surfaceAlt
          : 'transparent';
  const textColor = variant === 'secondary' || variant === 'ghost' ? theme.text : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        style
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    fontSize: 16,
    fontWeight: '700'
  }
});
