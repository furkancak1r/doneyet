import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useApp } from '@/hooks/useApp';
import { formatDateTimeTR, formatDateTR, formatTimeDisplay } from '@/utils/date';
import { getCurrentLocale } from '@/utils/locale';

export function DateTimeField({
  label,
  value,
  mode = 'datetime',
  onChange,
  disabled = false,
  allowChangesWhileDisabled = false
}: {
  label: string;
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  onChange: (date: Date) => void;
  disabled?: boolean;
  allowChangesWhileDisabled?: boolean;
}) {
  const { theme } = useApp();
  const [open, setOpen] = useState(false);
  const locale = getCurrentLocale();

  useEffect(() => {
    // Keep the iOS spinner mounted during short save windows. Callers can opt in
    // to still accepting wheel changes while disabled.
    if (disabled && open && Platform.OS !== 'ios') {
      setOpen(false);
    }
  }, [disabled, open]);

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (disabled && !allowChangesWhileDisabled) {
      return;
    }

    if (selected) {
      onChange(selected);
    }

    if (Platform.OS !== 'ios') {
      setOpen(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={disabled ? undefined : () => setOpen((current) => !current)}
        style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.border, opacity: disabled ? 0.6 : 1 }]}
      >
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.buttonLabel, { color: theme.text }]}>
            {mode === 'date' ? formatDateTR(value) : mode === 'time' ? formatTimeDisplay(value) : formatDateTimeTR(value)}
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.mutedText} />
        </View>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value}
          mode={mode === 'datetime' ? 'datetime' : mode}
          locale={Platform.OS === 'ios' ? locale : undefined}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          style={Platform.OS === 'ios' ? styles.iosPicker : undefined}
        />
      ) : null}
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
    marginBottom: 4
  },
  button: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: 10
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1
  },
  valueRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  iosPicker: {
    marginTop: 8
  }
});
