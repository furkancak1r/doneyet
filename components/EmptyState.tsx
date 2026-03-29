import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/hooks/useApp';

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const { theme } = useApp();
  return (
    <View style={[styles.wrap, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, shadowColor: theme.shadow }]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.mutedText }]}>{description}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center'
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20
  }
});
