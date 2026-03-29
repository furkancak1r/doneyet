import { ReactNode, RefObject, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useApp } from '@/hooks/useApp';

export function Screen({
  children,
  scroll = true,
  padded = true,
  scrollRef,
  animateOnFocus = false
}: {
  children?: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
  animateOnFocus?: boolean;
}) {
  const { theme } = useApp();
  const isFocused = useIsFocused();
  const focusProgress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    if (!animateOnFocus) {
      focusProgress.value = 1;
      return;
    }

    focusProgress.value = withTiming(isFocused ? 1 : 0, {
      duration: 240,
      easing: Easing.out(Easing.cubic)
    });
  }, [animateOnFocus, focusProgress, isFocused]);

  const animatedStyle = useAnimatedStyle(() => {
    if (!animateOnFocus) {
      return {
        opacity: 1,
        transform: [{ translateY: 0 }, { scale: 1 }]
      };
    }

    return {
      opacity: interpolate(focusProgress.value, [0, 1], [0.75, 1]),
      transform: [
        { translateY: interpolate(focusProgress.value, [0, 1], [10, 0]) },
        { scale: interpolate(focusProgress.value, [0, 1], [0.992, 1]) }
      ]
    };
  }, [animateOnFocus]);

  const content = scroll ? (
      <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.scrollContent, padded && styles.padded, { backgroundColor: theme.background }]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padded, { backgroundColor: theme.background }]}>{children}</View>
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <Animated.View style={[styles.flex, animatedStyle]}>{content}</Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1
  },
  padded: {
    padding: 16
  }
});
