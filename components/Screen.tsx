import { ReactNode, RefObject, useCallback, useEffect, useMemo } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { runOnJS } from 'react-native-reanimated';
import { useApp } from '@/hooks/useApp';
import { getAdjacentTabHref, type TabHref } from '@/constants/tabNavigation';

export function Screen({
  children,
  scroll = true,
  padded = true,
  scrollRef,
  animateOnFocus = false,
  tabHref
}: {
  children?: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
  animateOnFocus?: boolean;
  tabHref?: TabHref;
}) {
  const { theme } = useApp();
  const isFocused = useIsFocused();
  const focusProgress = useSharedValue(isFocused ? 1 : 0);
  const previousTabHref = tabHref ? getAdjacentTabHref(tabHref, 'previous') : null;
  const nextTabHref = tabHref ? getAdjacentTabHref(tabHref, 'next') : null;

  const navigateToTab = useCallback((href: TabHref) => {
    router.navigate(href);
  }, []);

  const swipeGesture = useMemo(() => {
    if (!tabHref) {
      return null;
    }

    return Gesture.Pan()
      .activeOffsetX([-16, 16])
      .failOffsetY([-14, 14])
      .onEnd(({ translationX, velocityX }) => {
        'worklet';
        const swipeDistance = 72;
        const swipeVelocity = 650;

        if (translationX > swipeDistance || velocityX > swipeVelocity) {
          if (previousTabHref) {
            runOnJS(navigateToTab)(previousTabHref);
          }
          return;
        }

        if (translationX < -swipeDistance || velocityX < -swipeVelocity) {
          if (nextTabHref) {
            runOnJS(navigateToTab)(nextTabHref);
          }
        }
      });
  }, [navigateToTab, nextTabHref, previousTabHref, tabHref]);

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

  const animatedContent = <Animated.View style={[styles.flex, { backgroundColor: theme.background }, animatedStyle]}>{content}</Animated.View>;

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.flex, { backgroundColor: theme.background }]}>
      {swipeGesture ? <GestureDetector gesture={swipeGesture}>{animatedContent}</GestureDetector> : animatedContent}
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
