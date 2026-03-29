import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useApp } from '@/hooks/useApp';
import { listColors, listIcons } from '@/constants/listOptions';
import { useTranslation } from 'react-i18next';

export function ListForm({
  onSubmit,
  submitLabel,
  initialName = ''
}: {
  onSubmit: (values: { name: string; color: string; icon: string }) => Promise<unknown> | unknown;
  submitLabel: string;
  initialName?: string;
}) {
  const { theme } = useApp();
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(listColors[0]);
  const [icon, setIcon] = useState<(typeof listIcons)[number]['name']>(listIcons[0].name);
  const [error, setError] = useState<string | null>(null);

  const selectedIcon = useMemo(() => listIcons.find((item) => item.name === icon) ?? listIcons[0], [icon]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('listForm.errorName'));
      return;
    }

    if (!color) {
      setError(t('listForm.errorColor'));
      return;
    }

    if (!icon) {
      setError(t('listForm.errorIcon'));
      return;
    }

    try {
      setError(null);
      await onSubmit({ name: trimmed, color, icon });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('listForm.errorCreate'));
    }
  };

  return (
    <View>
      <TextField label={t('listForm.name')} value={name} onChangeText={setName} placeholder={t('listForm.namePlaceholder')} />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('listForm.color')}</Text>
        <View style={styles.colorGrid}>
          {listColors.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`${t('listForm.colorAccessibility')} ${item}`}
              onPress={() => setColor(item)}
              style={({ pressed }) => [
                styles.colorButton,
                {
                  backgroundColor: item,
                  borderColor: color === item ? theme.text : theme.border,
                  shadowColor: theme.shadow,
                  opacity: pressed ? 0.88 : 1
                }
              ]}
            >
              {color === item ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('listForm.icon')}</Text>
        <View style={styles.iconGrid}>
          {listIcons.map((item) => {
            const isSelected = icon === item.name;
            return (
              <Pressable
                key={item.name}
                onPress={() => setIcon(item.name)}
                style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor: isSelected ? color : theme.surfaceAlt,
                  borderColor: isSelected ? color : theme.border,
                  shadowColor: theme.shadow,
                  opacity: pressed ? 0.9 : 1
                }
              ]}
              >
                <Ionicons name={item.name as any} size={20} color={isSelected ? '#FFFFFF' : theme.text} />
                <Text style={[styles.iconLabel, { color: isSelected ? '#FFFFFF' : theme.text }]}>{t(item.labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.preview, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
        <View style={[styles.previewBadge, { backgroundColor: color }]}>
          <Ionicons name={selectedIcon.name as any} size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.previewTitle, { color: theme.text }]}>{name.trim() || t('listForm.previewTitle')}</Text>
          <Text style={[styles.previewSubtitle, { color: theme.mutedText }]}>{t('listForm.previewSubtitle')}</Text>
        </View>
      </View>

      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

      <Button label={submitLabel} onPress={() => void handleSubmit()} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 18
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  iconButton: {
    width: '48%',
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  iconLabel: {
    fontSize: 13,
    fontWeight: '700'
  },
  preview: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  previewBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4
  },
  previewSubtitle: {
    fontSize: 13,
    lineHeight: 18
  },
  error: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12
  }
});
