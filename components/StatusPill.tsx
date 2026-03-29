import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/hooks/useApp';

export function StatusPill({
  label,
  tone = 'default'
}: {
  label: string;
  tone?: 'default' | 'success' | 'danger' | 'warning' | 'primary';
}) {
  const { theme } = useApp();
  const backgroundColor =
    tone === 'success'
      ? theme.success
      : tone === 'danger'
        ? theme.danger
        : tone === 'warning'
          ? theme.warning
          : tone === 'primary'
            ? theme.primary
            : theme.chip;

  return (
    <View style={[styles.pill, { backgroundColor }]}>
      <Text style={[styles.label, { color: tone === 'default' ? '#1B1B1B' : '#FFFFFF' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  }
});
