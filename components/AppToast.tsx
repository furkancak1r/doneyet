import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppToastState } from '@/types/app';
import { useApp } from '@/hooks/useApp';

const TOAST_DURATION_MS = 2200;

export function AppToast({
  toast,
  onDismiss
}: {
  toast: AppToastState | null;
  onDismiss: () => void;
}) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = setTimeout(() => {
      onDismiss();
    }, TOAST_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, [onDismiss, toast]);

  if (!toast) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 12 }]}>
      <View
        accessibilityLiveRegion="polite"
        style={[styles.toast, { backgroundColor: theme.success, borderColor: theme.success, shadowColor: theme.shadow }]}
        testID="app-toast"
      >
        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
        <Text style={styles.message}>{toast.message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    alignItems: 'center'
  },
  toast: {
    minHeight: 46,
    maxWidth: 520,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    flexShrink: 1
  }
});
