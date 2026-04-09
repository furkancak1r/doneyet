import { act, render, screen } from '@testing-library/react-native';
import { AppToast } from '@/components/AppToast';
import { useApp } from '@/hooks/useApp';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 10, right: 0, bottom: 0, left: 0 })
}));

jest.mock('@/hooks/useApp', () => ({
  useApp: jest.fn()
}));

const mockedUseApp = useApp as jest.MockedFunction<typeof useApp>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockedUseApp.mockReturnValue({
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
    }
  } as any);
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('AppToast', () => {
  it('auto-dismisses after the configured delay', () => {
    const onDismiss = jest.fn();

    render(<AppToast toast={{ id: 1, message: 'Updated.' }} onDismiss={onDismiss} />);

    expect(screen.getByText('Updated.')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2199);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
