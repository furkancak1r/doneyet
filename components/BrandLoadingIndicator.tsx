import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { useApp } from '@/hooks/useApp';

const appIcon = require('../assets/icon.png');

function withAlpha(hexColor: string, alpha: number): string {
  const normalized = hexColor.replace('#', '');
  const hex = normalized.length === 3 ? normalized.split('').map((value) => `${value}${value}`).join('') : normalized;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function BrandLoadingIndicator({ testID = 'brand-loading-indicator' }: { testID?: string }) {
  const { theme } = useApp();
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const outerScale = useSharedValue(1);
  const outerOpacity = useSharedValue(0.14);
  const innerScale = useSharedValue(0.96);
  const innerOpacity = useSharedValue(0.24);
  const shellScale = useSharedValue(1);
  const orbitRotation = useSharedValue(0);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) {
          setReduceMotionEnabled(enabled);
        }
      })
      .catch(() => {
        if (active) {
          setReduceMotionEnabled(false);
        }
      });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotionEnabled(enabled);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotionEnabled) {
      cancelAnimation(outerScale);
      cancelAnimation(outerOpacity);
      cancelAnimation(innerScale);
      cancelAnimation(innerOpacity);
      cancelAnimation(shellScale);
      cancelAnimation(orbitRotation);

      outerScale.value = 1;
      outerOpacity.value = 0.14;
      innerScale.value = 1;
      innerOpacity.value = 0.24;
      shellScale.value = 1;
      orbitRotation.value = 0;
      return;
    }

    outerScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 1800, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      false
    );
    outerOpacity.value = withRepeat(
      withSequence(
        withTiming(0.04, { duration: 1800, easing: Easing.out(Easing.quad) }),
        withTiming(0.14, { duration: 1800, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    innerScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1600, easing: Easing.out(Easing.cubic) }),
        withTiming(0.96, { duration: 1600, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      false
    );
    innerOpacity.value = withRepeat(
      withSequence(
        withTiming(0.1, { duration: 1600, easing: Easing.out(Easing.quad) }),
        withTiming(0.24, { duration: 1600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    shellScale.value = withRepeat(
      withSequence(
        withTiming(0.985, { duration: 1800, easing: Easing.inOut(Easing.cubic) }),
        withTiming(1.015, { duration: 1800, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      true
    );
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 4200, easing: Easing.inOut(Easing.cubic) }),
      -1,
      false
    );

    return () => {
      cancelAnimation(outerScale);
      cancelAnimation(outerOpacity);
      cancelAnimation(innerScale);
      cancelAnimation(innerOpacity);
      cancelAnimation(shellScale);
      cancelAnimation(orbitRotation);
    };
  }, [innerOpacity, innerScale, orbitRotation, outerOpacity, outerScale, reduceMotionEnabled, shellScale]);

  const outerHaloStyle = useAnimatedStyle(() => ({
    opacity: outerOpacity.value,
    transform: [{ scale: outerScale.value }]
  }));

  const innerHaloStyle = useAnimatedStyle(() => ({
    opacity: innerOpacity.value,
    transform: [{ scale: innerScale.value }]
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    opacity: reduceMotionEnabled ? 0.6 : 1,
    transform: [{ rotate: `${orbitRotation.value}deg` }]
  }), [reduceMotionEnabled]);

  const shellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shellScale.value }]
  }));

  return (
    <View testID={testID} style={styles.root}>
      <Animated.View
        style={[
          styles.outerHalo,
          {
            backgroundColor: withAlpha(theme.primary, 0.18)
          },
          outerHaloStyle
        ]}
      />
      <Animated.View
        style={[
          styles.innerHalo,
          {
            backgroundColor: withAlpha(theme.primary, 0.22)
          },
          innerHaloStyle
        ]}
      />
      <Animated.View testID="brand-loading-orbit" style={[styles.orbit, orbitStyle]}>
        <View style={[styles.orbitAccent, { backgroundColor: theme.primary }]} />
      </Animated.View>
      <Animated.View
        testID="brand-loading-shell"
        style={[
          styles.iconShell,
          {
            backgroundColor: theme.surface,
            borderColor: withAlpha(theme.border, 0.7),
            shadowColor: theme.shadow
          },
          shellStyle
        ]}
      >
        <View
          testID="brand-loading-mask"
          style={[
            styles.iconMask,
            {
              backgroundColor: withAlpha(theme.surfaceAlt ?? theme.primarySoft, 0.9),
              borderColor: withAlpha(theme.border, 0.45)
            }
          ]}
        >
          <Image source={appIcon} style={styles.icon} resizeMode="cover" />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 176,
    height: 176,
    alignItems: 'center',
    justifyContent: 'center'
  },
  outerHalo: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84
  },
  innerHalo: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68
  },
  orbit: {
    position: 'absolute',
    width: 176,
    height: 176,
    alignItems: 'center'
  },
  orbitAccent: {
    width: 18,
    height: 6,
    borderRadius: 999,
    marginTop: 12
  },
  iconShell: {
    width: 112,
    height: 112,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: {
      width: 0,
      height: 10
    },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6
  },
  iconMask: {
    width: 90,
    height: 90,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth
  },
  icon: {
    width: 90,
    height: 90
  }
});
