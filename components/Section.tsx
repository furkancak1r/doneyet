import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/hooks/useApp';

export function Section({ title, action, children }: { title: string; action?: ReactNode; children?: ReactNode }) {
  const { theme } = useApp();

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20
  },
  header: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    fontSize: 18,
    fontWeight: '800'
  }
});
