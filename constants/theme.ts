import { ThemeMode } from '@/types/domain';

export const themeModes: ThemeMode[] = ['system', 'light', 'dark'];

export const lightColors = {
  background: '#F7F7F2',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1EB',
  text: '#142016',
  mutedText: '#5B6B60',
  border: '#D7DED8',
  primary: '#116466',
  primarySoft: '#D8F0EE',
  danger: '#B42318',
  warning: '#C2410C',
  success: '#157F3D',
  chip: '#E7ECE8',
  shadow: '#000000'
};

export const darkColors = {
  background: '#0B1111',
  surface: '#111A1A',
  surfaceAlt: '#162020',
  text: '#ECF3EE',
  mutedText: '#A9B9AE',
  border: '#263230',
  primary: '#5CE1E6',
  primarySoft: '#193234',
  danger: '#F97066',
  warning: '#F79009',
  success: '#32D583',
  chip: '#1E2A2A',
  shadow: '#000000'
};

export const defaultListSeeds = [
  { nameKey: 'seeds.work', color: '#116466', icon: 'briefcase-outline' },
  { nameKey: 'seeds.personal', color: '#6B5B95', icon: 'person-outline' },
  { nameKey: 'seeds.bills', color: '#2E8B57', icon: 'cash-outline' },
  { nameKey: 'seeds.shopping', color: '#B5651D', icon: 'cart-outline' }
];
