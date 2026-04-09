import { describe, expect, it } from 'vitest';
import { getKeyboardAwareScrollTarget } from '../utils/keyboardAwareScroll';

describe('keyboard aware scroll helpers', () => {
  it('returns null when the keyboard is not visible yet', () => {
    expect(
      getKeyboardAwareScrollTarget({
        currentScrollY: 120,
        fieldTop: 520,
        fieldHeight: 44,
        containerTop: 80,
        containerHeight: 600,
        keyboardTop: null
      })
    ).toBeNull();
  });

  it('returns null when the focused field is already fully visible', () => {
    expect(
      getKeyboardAwareScrollTarget({
        currentScrollY: 64,
        fieldTop: 240,
        fieldHeight: 48,
        containerTop: 80,
        containerHeight: 620,
        keyboardTop: 760
      })
    ).toBeNull();
  });

  it('adds the overlap amount to the current scroll offset when the keyboard covers the field', () => {
    expect(
      getKeyboardAwareScrollTarget({
        currentScrollY: 120,
        fieldTop: 580,
        fieldHeight: 52,
        containerTop: 80,
        containerHeight: 620,
        keyboardTop: 640
      })
    ).toBe(136);
  });

  it('keeps taller multiline inputs above the keyboard with the same safety gap', () => {
    expect(
      getKeyboardAwareScrollTarget({
        currentScrollY: 180,
        fieldTop: 500,
        fieldHeight: 180,
        containerTop: 72,
        containerHeight: 640,
        keyboardTop: 700
      })
    ).toBe(184);
  });
});
