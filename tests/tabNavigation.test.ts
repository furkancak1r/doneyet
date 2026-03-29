import { describe, expect, it } from 'vitest';
import { getAdjacentTabHref } from '../constants/tabNavigation';

describe('tab navigation helpers', () => {
  it('returns the next tab in order', () => {
    expect(getAdjacentTabHref('/today', 'next')).toBe('/upcoming');
    expect(getAdjacentTabHref('/upcoming', 'next')).toBe('/completed');
  });

  it('returns the previous tab in order', () => {
    expect(getAdjacentTabHref('/completed', 'previous')).toBe('/upcoming');
    expect(getAdjacentTabHref('/settings', 'previous')).toBe('/completed');
  });

  it('stops at the ends of the tab list', () => {
    expect(getAdjacentTabHref('/', 'previous')).toBeNull();
    expect(getAdjacentTabHref('/settings', 'next')).toBeNull();
  });
});
