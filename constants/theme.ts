import { ThemeMode } from '@/types/domain';

export const themeModes: ThemeMode[] = ['system', 'light', 'dark'];

export const lightColors = {
  background: '#F4F0E8',
  surface: '#FCFAF6',
  surfaceAlt: '#EEE6DA',
  text: '#17201C',
  mutedText: '#66736B',
  border: '#D5CCBE',
  primary: '#1F5C52',
  primarySoft: '#DCE9E3',
  danger: '#A3473C',
  warning: '#A86A2A',
  success: '#2F7A56',
  chip: '#E4DCCD',
  shadow: '#0C1210'
};

export const darkColors = {
  background: '#101513',
  surface: '#161D1A',
  surfaceAlt: '#1B241F',
  text: '#F1F0EA',
  mutedText: '#A3B0A7',
  border: '#2A352F',
  primary: '#7EC7B8',
  primarySoft: '#1C2D27',
  danger: '#EF8A7A',
  warning: '#E0A25A',
  success: '#7BCB8B',
  chip: '#222C27',
  shadow: '#000000'
};

export const defaultListSeeds = [
  { nameKey: 'seeds.work', color: '#116466', icon: 'briefcase-outline' },
  { nameKey: 'seeds.personal', color: '#6B5B95', icon: 'person-outline' },
  { nameKey: 'seeds.bills', color: '#2E8B57', icon: 'cash-outline' },
  { nameKey: 'seeds.shopping', color: '#B5651D', icon: 'cart-outline' }
];
