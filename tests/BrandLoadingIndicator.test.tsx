import React from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { BrandLoadingIndicator } from '@/components/BrandLoadingIndicator';
import { useApp } from '@/hooks/useApp';

jest.mock('@/hooks/useApp', () => ({
  useApp: jest.fn()
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

describe('BrandLoadingIndicator', () => {
  beforeEach(() => {
    mockedUseApp.mockReturnValue({
      theme: baseTheme
    } as any);

    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({
      remove: jest.fn()
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders a squircle shell instead of a perfect circle', () => {
    render(<BrandLoadingIndicator />);

    const shellStyle = StyleSheet.flatten(screen.getByTestId('brand-loading-shell').props.style);
    const maskStyle = StyleSheet.flatten(screen.getByTestId('brand-loading-mask').props.style);

    expect(shellStyle.width).toBe(112);
    expect(shellStyle.height).toBe(112);
    expect(shellStyle.borderRadius).toBe(42);
    expect(shellStyle.borderRadius).toBeLessThan(shellStyle.width / 2);

    expect(maskStyle.width).toBe(90);
    expect(maskStyle.height).toBe(90);
    expect(maskStyle.borderRadius).toBe(32);
    expect(maskStyle.borderRadius).toBeLessThan(maskStyle.width / 2);
  });

  it('softens the orbit animation when reduce motion is enabled', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);

    render(<BrandLoadingIndicator />);

    await waitFor(() => {
      const orbitStyle = StyleSheet.flatten(screen.getByTestId('brand-loading-orbit').props.style);
      expect(orbitStyle.opacity).toBe(0.6);
    });
  });
});
