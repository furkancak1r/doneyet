import { fireEvent, render, screen } from '@testing-library/react-native';
import { Chip } from '@/components/Chip';
import { useApp } from '@/hooks/useApp';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

jest.mock('@/hooks/useApp', () => ({
  useApp: jest.fn()
}));

const mockedUseApp = useApp as jest.MockedFunction<typeof useApp>;

beforeEach(() => {
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

describe('Chip', () => {
  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();

    render(<Chip label="Theme" onPress={onPress} disabled testID="theme-chip" />);

    fireEvent.press(screen.getByTestId('theme-chip'));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('theme-chip').props.accessibilityState).toEqual({ disabled: true, selected: false });
  });
});
