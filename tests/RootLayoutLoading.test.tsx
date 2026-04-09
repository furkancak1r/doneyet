import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RootLayout from '@/app/_layout';
import { useApp } from '@/context/AppContext';

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    GestureHandlerRootView: ({ children, style }: { children?: React.ReactNode; style?: unknown }) => <View style={style}>{children}</View>
  };
});

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stack = ({ children }: { children?: React.ReactNode }) => <View testID="app-stack">{children}</View>;
  Stack.Screen = () => null;

  return {
    router: {
      back: jest.fn()
    },
    Stack
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null
}));

jest.mock('@/context/AppContext', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    AppProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    NotificationBridge: () => <View testID="notification-bridge" />,
    useApp: jest.fn()
  };
});

jest.mock('@/components/AppToast', () => ({
  AppToast: ({ toast }: { toast: unknown }) => {
    const { View } = require('react-native');
    return <View testID="app-toast" toast={toast} />;
  }
}));

jest.mock('@/components/BrandLoadingIndicator', () => ({
  BrandLoadingIndicator: ({ testID = 'brand-loading-indicator' }: { testID?: string }) => {
    const { View } = require('react-native');
    return <View testID={testID} />;
  }
}));

jest.mock('react-i18next', () => ({
  I18nextProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useTranslation: () => ({
    t: (key: string) =>
      (
        {
          'app.loading': 'Loading',
          'common.back': 'Back',
          'routes.newTask': 'New task',
          'routes.newList': 'New list',
          'routes.editTask': 'Edit task',
          'routes.editList': 'Edit list',
          'routes.listDetail': 'List details',
          'about.title': 'About'
        } as Record<string, string>
      )[key] ?? key
  })
}));

jest.mock('@/i18n', () => ({
  __esModule: true,
  default: {}
}));

const mockedUseApp = useApp as jest.MockedFunction<typeof useApp>;

const baseTheme = {
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

beforeEach(() => {
  mockedUseApp.mockReturnValue({
    ready: false,
    theme: baseTheme,
    toast: null,
    dismissToast: jest.fn()
  } as any);
});

describe('RootLayout loading state', () => {
  it('renders the brand loader without the loading text while the app is bootstrapping', () => {
    render(<RootLayout />);

    expect(screen.getByTestId('brand-loading-indicator')).toBeTruthy();
    expect(screen.queryByText('Loading')).toBeNull();
    expect(screen.queryByTestId('app-stack')).toBeNull();
  });

  it('renders the app shell after bootstrap is complete', () => {
    mockedUseApp.mockReturnValue({
      ready: true,
      theme: baseTheme,
      toast: null,
      dismissToast: jest.fn()
    } as any);

    render(<RootLayout />);

    expect(screen.getByTestId('app-stack')).toBeTruthy();
    expect(screen.getByTestId('notification-bridge')).toBeTruthy();
    expect(screen.getByTestId('app-toast')).toBeTruthy();
    expect(screen.queryByTestId('brand-loading-indicator')).toBeNull();
  });
});
