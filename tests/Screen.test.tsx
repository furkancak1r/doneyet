import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { useApp } from '@/hooks/useApp';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(() => true),
  useScrollToTop: jest.fn()
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaView: ({ children, edges, style }: { children: React.ReactNode; edges?: string[]; style?: unknown }) =>
      React.createElement(View, { testID: 'safe-area-view', edges, style } as any, children)
  };
});

jest.mock('@/hooks/useApp', () => ({
  useApp: jest.fn()
}));

jest.mock('@/components/keyboardAwareScroll', () => ({
  KeyboardAwareScrollProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useKeyboardAwareScrollController: () => ({
    registerScrollHandle: jest.fn(),
    handleInputFocus: jest.fn(),
    scrollViewProps: {}
  })
}));

const mockedUseApp = useApp as jest.MockedFunction<typeof useApp>;

beforeEach(() => {
  mockedUseApp.mockReturnValue({
    theme: {
      background: '#FFFFFF'
    }
  } as any);
});

describe('Screen', () => {
  it('includes the bottom safe area by default', () => {
    render(
      <Screen scroll={false}>
        <Text>Content</Text>
      </Screen>
    );

    expect(screen.getByTestId('safe-area-view').props.edges).toEqual(['left', 'right', 'bottom']);
  });

  it('can omit the bottom safe area when requested', () => {
    render(
      <Screen scroll={false} includeBottomSafeArea={false}>
        <Text>Content</Text>
      </Screen>
    );

    expect(screen.getByTestId('safe-area-view').props.edges).toEqual(['left', 'right']);
  });
});
