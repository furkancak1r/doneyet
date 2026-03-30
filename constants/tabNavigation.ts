import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type TabIconName = ComponentProps<typeof Ionicons>['name'];
type TabScreen = {
  name: string;
  href: string;
  titleKey: string;
  icon: TabIconName;
};

export const TAB_SCREENS = [
  { name: 'index', href: '/', titleKey: 'tabs.home', icon: 'home-outline' },
  { name: 'today', href: '/today', titleKey: 'tabs.today', icon: 'today-outline' },
  { name: 'calendar', href: '/calendar', titleKey: 'tabs.calendar', icon: 'calendar-outline' },
  { name: 'upcoming', href: '/upcoming', titleKey: 'tabs.upcoming', icon: 'time-outline' },
  { name: 'completed', href: '/completed', titleKey: 'tabs.completed', icon: 'checkmark-done-outline' },
  { name: 'settings', href: '/settings', titleKey: 'tabs.settings', icon: 'settings-outline' }
] as const satisfies readonly TabScreen[];

export type TabHref = (typeof TAB_SCREENS)[number]['href'];

export function getAdjacentTabHref(current: TabHref, direction: 'previous' | 'next'): TabHref | null {
  const index = TAB_SCREENS.findIndex((screen) => screen.href === current);

  if (index === -1) {
    return null;
  }

  const nextIndex = direction === 'previous' ? index - 1 : index + 1;

  if (nextIndex < 0 || nextIndex >= TAB_SCREENS.length) {
    return null;
  }

  return TAB_SCREENS[nextIndex].href;
}
