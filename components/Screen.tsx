import { ReactNode, RefObject, useCallback, useEffect, useRef } from 'react';
import { useIsFocused, useScrollToTop } from '@react-navigation/native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useApp } from '@/hooks/useApp';
import { getInitialScreenFocusProgress, resolveScreenFocusAnimation } from '@/components/screenFocusAnimation';
import { KeyboardAwareScrollController, KeyboardAwareScrollHandle, KeyboardAwareScrollProvider, useKeyboardAwareScrollController } from '@/components/keyboardAwareScroll';
export function Screen({
  children,
  scroll = true,
  padded = true,
  scrollRef,
  includeBottomSafeArea = true,
  animateOnFocus = false,
  animateOnRestore = false,
  testID,
  keyboardController
}: {
  children?: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
  includeBottomSafeArea?: boolean;
  animateOnFocus?: boolean;
  animateOnRestore?: boolean;
  testID?: string;
  keyboardController?: KeyboardAwareScrollController;
}) {
  const { theme } = useApp();
  const isFocused = useIsFocused();
  const hasFocusedBeforeRef = useRef(false);
  const internalScrollRef = useRef<ScrollView | null>(null);
  const internalKeyboardController = useKeyboardAwareScrollController();
  const activeKeyboardController = keyboardController ?? internalKeyboardController;
  const activeScrollRef = scrollRef ?? internalScrollRef;
  const focusProgress = useSharedValue(getInitialScreenFocusProgress(animateOnFocus));

  useScrollToTop(activeScrollRef);

  useEffect(() => {
    const transition = resolveScreenFocusAnimation({
      animateOnFocus,
      animateOnRestore,
      isFocused,
      hasFocusedBefore: hasFocusedBeforeRef.current
    });

    hasFocusedBeforeRef.current = transition.hasFocusedBefore;

    if (!transition.shouldAnimate) {
      focusProgress.value = transition.nextProgress;
      return;
    }

    focusProgress.value = withTiming(transition.nextProgress, {
      duration: 240,
      easing: Easing.out(Easing.cubic)
    });
  }, [animateOnFocus, animateOnRestore, focusProgress, isFocused]);

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

  const setScrollRef = useCallback(
    (node: ScrollView | null) => {
      internalScrollRef.current = node;
      activeKeyboardController.registerScrollHandle(node as KeyboardAwareScrollHandle | null);

      if (!scrollRef) {
        return;
      }

      scrollRef.current = node;
    },
    [activeKeyboardController, scrollRef]
  );

  const content = scroll ? (
    <ScrollView
      ref={setScrollRef}
      {...activeKeyboardController.scrollViewProps}
      testID={testID}
      contentContainerStyle={[styles.scrollContent, padded && styles.padded, { backgroundColor: theme.background }]}
    >
      {children}
    </ScrollView>
  ) : (
    <View testID={testID} style={[styles.flex, padded && styles.padded, { backgroundColor: theme.background }]}>
      {children}
    </View>
  );

  const animatedContent = <Animated.View style={[styles.flex, { backgroundColor: theme.background }, animatedStyle]}>{content}</Animated.View>;
  const safeAreaEdges: readonly Edge[] = includeBottomSafeArea ? ['left', 'right', 'bottom'] : ['left', 'right'];
  const keyboardAvoidingBehavior = Platform.OS === 'ios' && !scroll ? 'padding' : undefined;

  return (
    <KeyboardAwareScrollProvider controller={activeKeyboardController}>
      <SafeAreaView edges={safeAreaEdges} style={[styles.flex, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView behavior={keyboardAvoidingBehavior} style={styles.flex}>
          {animatedContent}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </KeyboardAwareScrollProvider>
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
