import type { AppSettings } from '@/types/domain';

export type InitialRoute = '/onboarding' | '/(tabs)';

export function shouldShowOnboarding(settings?: Pick<AppSettings, 'onboardingCompleted'> | null): boolean {
  return Number(settings?.onboardingCompleted ?? 0) !== 1;
}

export function getInitialRoute(settings?: Pick<AppSettings, 'onboardingCompleted'> | null): InitialRoute {
  return shouldShowOnboarding(settings) ? '/onboarding' : '/(tabs)';
}
