import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '@/hooks/useApp';

export function Card({ children, style }: { children: ReactNode; style?: any }) {
  const { theme } = useApp();
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  }
});
