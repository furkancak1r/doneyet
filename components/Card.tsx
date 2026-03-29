import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '@/hooks/useApp';

export function Card({ children, style }: { children: ReactNode; style?: any }) {
  const { theme } = useApp();
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1
  }
});
