import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useApp } from '@/hooks/useApp';
import { formatDateTimeTR, formatDateTR, formatTimeDisplay } from '@/utils/date';

export function DateTimeField({
  label,
  value,
  mode = 'datetime',
  onChange
}: {
  label: string;
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  onChange: (date: Date) => void;
}) {
  const { theme } = useApp();
  const [open, setOpen] = useState(false);

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) {
      onChange(selected);
    }

    if (Platform.OS !== 'ios') {
      setOpen(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setOpen((current) => !current)} style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.buttonLabel, { color: theme.text }]}>
          {mode === 'date' ? formatDateTR(value) : mode === 'time' ? formatTimeDisplay(value) : formatDateTimeTR(value)}
        </Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value}
          mode={mode === 'datetime' ? 'datetime' : mode}
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
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: 10
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600'
  },
  iosPicker: {
    marginTop: 8
  }
});
