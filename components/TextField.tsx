import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '@/hooks/useApp';

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const { theme } = useApp();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.mutedText}
        multiline={multiline}
        style={[
          styles.input,
          { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, minHeight: multiline ? 120 : 48 }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top'
  }
});
