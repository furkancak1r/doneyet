import { describe, expect, it } from 'vitest';
import { getAdjacentTabHref, TABS_FREEZE_ON_BLUR } from '../constants/tabNavigation';

describe('tab navigation helpers', () => {
  it('keeps tab screens interactive when returning from stack screens', () => {
    expect(TABS_FREEZE_ON_BLUR).toBe(false);
  });

  it('returns the next tab in order', () => {
    expect(getAdjacentTabHref('/today', 'next')).toBe('/calendar');
    expect(getAdjacentTabHref('/calendar', 'next')).toBe('/upcoming');
  });

  it('returns the previous tab in order', () => {
    expect(getAdjacentTabHref('/upcoming', 'previous')).toBe('/calendar');
    expect(getAdjacentTabHref('/settings', 'previous')).toBe('/completed');
  });

  it('stops at the ends of the tab list', () => {
    expect(getAdjacentTabHref('/', 'previous')).toBeNull();
    expect(getAdjacentTabHref('/settings', 'next')).toBeNull();
  });
});
