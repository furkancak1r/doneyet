import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { useApp } from '@/hooks/useApp';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  testID,
  accessibilityLabel
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const { theme } = useApp();
  const isDisabled = disabled || loading;
  const backgroundColor =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? theme.danger
        : variant === 'success'
          ? theme.success
        : variant === 'secondary'
          ? theme.surfaceAlt
          : 'transparent';
  const textColor = variant === 'secondary' ? theme.text : variant === 'ghost' ? theme.primary : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled }}
      collapsable={false}
      disabled={isDisabled}
      onPress={isDisabled ? undefined : onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor: theme.border,
          shadowColor: theme.shadow,
          opacity: isDisabled ? 0.56 : pressed ? 0.85 : 1
        },
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
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  label: {
    fontSize: 16,
    fontWeight: '700'
  }
});
