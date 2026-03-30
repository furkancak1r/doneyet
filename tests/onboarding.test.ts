import { describe, expect, it } from 'vitest';
import { getInitialRoute, shouldShowOnboarding } from '../utils/onboarding';

describe('onboarding routing', () => {
  it('shows onboarding until the completed flag is set', () => {
    expect(shouldShowOnboarding({ onboardingCompleted: 0 })).toBe(true);
    expect(getInitialRoute({ onboardingCompleted: 0 })).toBe('/onboarding');
  });

  it('skips onboarding once the completed flag is set', () => {
    expect(shouldShowOnboarding({ onboardingCompleted: 1 })).toBe(false);
    expect(getInitialRoute({ onboardingCompleted: 1 })).toBe('/(tabs)');
  });
});
