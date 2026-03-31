import { describe, expect, it } from 'vitest';
import { getInitialScreenFocusProgress, resolveScreenFocusAnimation } from '../components/screenFocusAnimation';

describe('screen focus animation helpers', () => {
  it('starts focused animated screens from hidden progress so the first entry can animate', () => {
    expect(getInitialScreenFocusProgress(true)).toBe(0);
  });

  it('animates the first time a screen receives focus', () => {
    expect(
      resolveScreenFocusAnimation({
        animateOnFocus: true,
        isFocused: true,
        hasFocusedBefore: false
      })
    ).toEqual({
      nextProgress: 1,
      shouldAnimate: true,
      hasFocusedBefore: true
    });
  });

  it('keeps previously visited screens ready when they lose focus', () => {
    expect(
      resolveScreenFocusAnimation({
        animateOnFocus: true,
        isFocused: false,
        hasFocusedBefore: true
      })
    ).toEqual({
      nextProgress: 1,
      shouldAnimate: false,
      hasFocusedBefore: true
    });
  });

  it('restores previously visited screens instantly by default', () => {
    expect(
      resolveScreenFocusAnimation({
        animateOnFocus: true,
        isFocused: true,
        hasFocusedBefore: true
      })
    ).toEqual({
      nextProgress: 1,
      shouldAnimate: false,
      hasFocusedBefore: true
    });
  });

  it('can opt back into restore animations when explicitly requested', () => {
    expect(
      resolveScreenFocusAnimation({
        animateOnFocus: true,
        animateOnRestore: true,
        isFocused: true,
        hasFocusedBefore: true
      })
    ).toEqual({
      nextProgress: 1,
      shouldAnimate: true,
      hasFocusedBefore: true
    });
  });
});
