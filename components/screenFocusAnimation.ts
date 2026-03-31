export function getInitialScreenFocusProgress(animateOnFocus: boolean): number {
  if (!animateOnFocus) {
    return 1;
  }

  return 0;
}

export function resolveScreenFocusAnimation({
  animateOnFocus,
  animateOnRestore = false,
  isFocused,
  hasFocusedBefore
}: {
  animateOnFocus: boolean;
  animateOnRestore?: boolean;
  isFocused: boolean;
  hasFocusedBefore: boolean;
}): {
  nextProgress: number;
  shouldAnimate: boolean;
  hasFocusedBefore: boolean;
} {
  if (!animateOnFocus) {
    return {
      nextProgress: 1,
      shouldAnimate: false,
      hasFocusedBefore
    };
  }

  if (isFocused) {
    return {
      nextProgress: 1,
      shouldAnimate: !hasFocusedBefore || animateOnRestore,
      hasFocusedBefore: true
    };
  }

  if (!hasFocusedBefore) {
    return {
      nextProgress: 0,
      shouldAnimate: false,
      hasFocusedBefore
    };
  }

  if (animateOnRestore) {
    return {
      nextProgress: 0,
      shouldAnimate: true,
      hasFocusedBefore
    };
  }

  return {
    nextProgress: 1,
    shouldAnimate: false,
    hasFocusedBefore
  };
}
