import { fireEvent, render, screen } from '@testing-library/react-native';
import { Switch } from 'react-native';
import SettingsScreen from '@/app/(tabs)/settings';
import { useApp } from '@/hooks/useApp';
import { useKeyboardAwareScrollContext } from '@/components/keyboardAwareScroll';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn()
  }
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

jest.mock('@/hooks/useApp', () => ({
  useApp: jest.fn()
}));

jest.mock('@/components/keyboardAwareScroll', () => ({
  useKeyboardAwareScrollContext: jest.fn()
}));

jest.mock('@/components/Screen', () => ({
  Screen: ({ children }: { children: any }) => <>{children}</>
}));

jest.mock('@/components/Section', () => ({
  Section: ({ children }: { children: any }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  }
}));

jest.mock('@/components/Button', () => ({
  Button: ({ label, disabled, loading, testID }: { label: string; disabled?: boolean; loading?: boolean; testID?: string }) => {
    const { Text } = require('react-native');
    return <Text {...({ testID: testID ?? `button:${label}`, disabled, loading } as any)}>{label}</Text>;
  }
}));

jest.mock('@/components/Chip', () => ({
  Chip: ({ label, disabled, testID }: { label: string; disabled?: boolean; testID?: string }) => {
    const { Text } = require('react-native');
    return <Text {...({ testID: testID ?? `chip:${label}`, disabled } as any)}>{label}</Text>;
  }
}));

jest.mock('@/components/DateTimeField', () => ({
  DateTimeField: ({ label, disabled, allowChangesWhileDisabled }: { label: string; disabled?: boolean; allowChangesWhileDisabled?: boolean }) => {
    const { Text } = require('react-native');
    return <Text {...({ testID: `datetime:${label}`, disabled, allowChangesWhileDisabled } as any)}>{label}</Text>;
  }
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        {
          'settings.permissionTitle': 'Notification permission',
          'settings.permissionCardTitle': 'Reminders are off',
          'settings.permissionText': 'Permission info',
          'settings.permissionButton': 'Grant permission',
          'settings.startSection': 'Default start',
          'settings.startLabel': 'Default start time',
          'settings.autoHide': 'Auto-hide completed tasks',
          'settings.sound': 'Sound',
          'settings.vibration': 'Vibration',
          'settings.theme': 'Theme',
          'settings.language': 'Language',
          'settings.themeSystem': 'System',
          'settings.themeLight': 'Light',
          'settings.themeDark': 'Dark',
          'settings.languageSystem': 'System language',
          'settings.languageTurkish': 'Turkish',
          'settings.languageEnglish': 'English',
          'settings.backupSection': 'Backup',
          'settings.backupExport': 'Export JSON',
          'settings.backupImportTitle': 'Import JSON',
          'settings.backupImportOpen': 'Open',
          'settings.backupImportClose': 'Close',
          'settings.backupPersistenceNote': 'Persistence note',
          'settings.backupImportPlaceholder': 'Paste the backup JSON here',
          'settings.backupImportButton': 'Import backup',
          'settings.backupImportError': 'Import failed.',
          'settings.aboutSection': 'About',
          'settings.aboutMenuTitle': 'About the App',
          'settings.aboutMenuDescription': 'About description'
        } as Record<string, string>
      )[key] ?? key
  })
}));

const mockedUseApp = useApp as jest.MockedFunction<typeof useApp>;
const mockedUseKeyboardAwareScrollContext = useKeyboardAwareScrollContext as jest.MockedFunction<typeof useKeyboardAwareScrollContext>;
const originalRequestAnimationFrame = global.requestAnimationFrame;
const originalCancelAnimationFrame = global.cancelAnimationFrame;

const baseContext = {
  settings: {
    defaultStartTime: '09:00',
    autoHideCompletedTasks: 0,
    soundEnabled: 1,
    vibrationEnabled: 1,
    themeMode: 'system',
    language: 'en'
  },
  theme: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#F5F5F5',
    text: '#101010',
    mutedText: '#606060',
    border: '#DDDDDD',
    primary: '#2A6EF0',
    primarySoft: '#E8F0FF',
    danger: '#C62828',
    warning: '#F57C00',
    success: '#2F7A56',
    chip: '#999999',
    shadow: '#000000'
  },
  exportBackup: jest.fn(),
  importBackup: jest.fn().mockResolvedValue({ ok: true }),
  updateSettings: jest.fn().mockResolvedValue(undefined),
  notificationGranted: false,
  debugScreenshotMode: false,
  requestNotificationPermission: jest.fn().mockResolvedValue(undefined),
  isSettingsMutating: false,
  isImportingBackup: false,
  isRequestingNotificationPermission: false
};

function renderScreen(overrides?: Partial<typeof baseContext>) {
  mockedUseApp.mockReturnValue({
    ...baseContext,
    ...overrides
  } as any);

  return render(<SettingsScreen />);
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.requestAnimationFrame = (((callback: (time: number) => void) => {
      callback(0);
      return 0;
    }) as typeof requestAnimationFrame);
    global.cancelAnimationFrame = jest.fn() as typeof cancelAnimationFrame;
    mockedUseKeyboardAwareScrollContext.mockReturnValue({
      handleInputFocus: jest.fn(),
      registerScrollHandle: jest.fn(),
      scrollViewProps: {
        keyboardShouldPersistTaps: 'handled',
        keyboardDismissMode: 'on-drag',
        automaticallyAdjustKeyboardInsets: false,
        scrollEventThrottle: 16,
        onLayout: jest.fn(),
        onScroll: jest.fn()
      }
    });
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it('disables settings controls while a settings mutation is running', () => {
    const view = renderScreen({ isSettingsMutating: true, isRequestingNotificationPermission: true });

    expect(screen.getByTestId('button:Grant permission').props.disabled).toBe(true);
    expect(screen.getByTestId('datetime:Default start time').props.disabled).toBe(true);
    expect(screen.getByTestId('datetime:Default start time').props.allowChangesWhileDisabled).toBe(true);
    expect(screen.getByTestId('chip:System').props.disabled).toBe(true);
    expect(screen.getByTestId('chip:Light').props.disabled).toBe(true);
    expect(screen.getByTestId('chip:Dark').props.disabled).toBe(true);
    expect(screen.getByTestId('chip:System language').props.disabled).toBe(true);
    expect(screen.getByTestId('chip:Turkish').props.disabled).toBe(true);
    expect(screen.getByTestId('chip:English').props.disabled).toBe(true);

    const switches = view.UNSAFE_getAllByType(Switch);
    expect(switches).toHaveLength(3);
    switches.forEach((toggle) => expect(toggle.props.disabled).toBe(true));
  });

  it('keeps the import editor open and disables it while an import is running', () => {
    const view = renderScreen();

    fireEvent.press(screen.getByText('Import JSON'));

    mockedUseApp.mockReturnValue({
      ...baseContext,
      isImportingBackup: true
    } as any);
    view.rerender(<SettingsScreen />);

    expect(screen.getByPlaceholderText('Paste the backup JSON here').props.editable).toBe(false);
    expect(screen.getByTestId('button:Import backup').props.disabled).toBe(true);
  });

  it('routes import-editor focus through the keyboard-aware helper', () => {
    const handleInputFocus = jest.fn();
    mockedUseKeyboardAwareScrollContext.mockReturnValue({
      handleInputFocus,
      registerScrollHandle: jest.fn(),
      scrollViewProps: {
        keyboardShouldPersistTaps: 'handled',
        keyboardDismissMode: 'on-drag',
        automaticallyAdjustKeyboardInsets: false,
        scrollEventThrottle: 16,
        onLayout: jest.fn(),
        onScroll: jest.fn()
      }
    });

    renderScreen();

    fireEvent.press(screen.getByText('Import JSON'));
    screen.getByPlaceholderText('Paste the backup JSON here').props.onFocus?.({ nativeEvent: {} });

    expect(handleInputFocus).toHaveBeenCalledTimes(1);
  });
});
