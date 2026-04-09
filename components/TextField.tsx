import { ForwardedRef, forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useApp } from '@/hooks/useApp';
import { KeyboardAwareTextInput } from '@/components/KeyboardAwareTextInput';

type TextFieldProps = TextInputProps & {
  label: string;
  disabled?: boolean;
};

export const TextField = forwardRef(function TextField(
  { label, value, onChangeText, placeholder, multiline = false, disabled = false, style, editable, ...inputProps }: TextFieldProps,
  ref: ForwardedRef<TextInput>
) {
  const { theme } = useApp();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <KeyboardAwareTextInput
        {...inputProps}
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        editable={editable ?? !disabled}
        placeholder={placeholder}
        placeholderTextColor={theme.mutedText}
        multiline={multiline}
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            color: theme.text,
            borderColor: theme.border,
            minHeight: multiline ? 120 : 48,
            opacity: disabled ? 0.6 : 1
          },
          style
        ]}
      />
    </View>
  );
});

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.2
  },
  input: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top'
  }
});
