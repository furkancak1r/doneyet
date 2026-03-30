import { describe, expect, it } from 'vitest';
import { getAdjacentTabHref } from '../constants/tabNavigation';

describe('tab navigation helpers', () => {
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
