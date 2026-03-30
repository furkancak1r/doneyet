import { describe, expect, it } from 'vitest';
import { getLayoutYOffset } from '../utils/layout';

describe('layout helpers', () => {
  it('returns null when the layout event is missing', () => {
    expect(getLayoutYOffset(null)).toBeNull();
    expect(getLayoutYOffset(undefined)).toBeNull();
    expect(getLayoutYOffset({} as any)).toBeNull();
    expect(getLayoutYOffset({ nativeEvent: null } as any)).toBeNull();
    expect(getLayoutYOffset({ nativeEvent: { layout: null } } as any)).toBeNull();
  });

  it('extracts the y offset from a layout event', () => {
    expect(getLayoutYOffset({ nativeEvent: { layout: { y: 128 } } } as any)).toBe(128);
  });
});
