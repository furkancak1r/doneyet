import { fireEvent, render, screen } from '@testing-library/react-native';
import { DateTimeField } from '@/components/DateTimeField';
import { useApp } from '@/hooks/useApp';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const { Text } = require('react-native');
    return <Text>{name}</Text>;
  }
}));

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: ({ mode, onChange }: { mode: string; onChange?: (event: unknown, selected?: Date) => void }) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID={`picker-${mode}`} onPress={() => onChange?.({ type: 'set' }, new Date('2026-04-04T10:30:00.000Z'))}>
        <Text>{`picker:${mode}`}</Text>
      </Pressable>
    );
  }
}));

jest.mock('@/hooks/useApp', () => ({
  useApp: jest.fn()
}));

jest.mock('@/utils/date', () => ({
  formatDateTR: () => '4 Nisan 2026',
  formatTimeDisplay: () => '09:00',
  formatDateTimeTR: () => '4 Nisan 2026 09:00'
}));

jest.mock('@/utils/locale', () => ({
  getCurrentLocale: () => 'tr-TR'
}));

const mockedUseApp = useApp as jest.MockedFunction<typeof useApp>;

describe('DateTimeField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('shows a chevron and flips it when the picker is expanded', () => {
    render(<DateTimeField label="Başlama saati" value={new Date('2026-04-04T09:00:00.000Z')} mode="time" onChange={jest.fn()} />);

    expect(screen.getByText('chevron-down')).toBeTruthy();
    expect(screen.queryByText('picker:time')).toBeNull();

    fireEvent.press(screen.getByRole('button'));

    expect(screen.getByText('chevron-up')).toBeTruthy();
    expect(screen.getByText('picker:time')).toBeTruthy();
  });

  it('keeps the iOS picker open when the field becomes temporarily disabled', () => {
    const view = render(<DateTimeField label="Başlama saati" value={new Date('2026-04-04T09:00:00.000Z')} mode="time" onChange={jest.fn()} />);

    fireEvent.press(screen.getByRole('button'));
    expect(screen.getByText('picker:time')).toBeTruthy();

    view.rerender(<DateTimeField label="Başlama saati" value={new Date('2026-04-04T09:00:00.000Z')} mode="time" onChange={jest.fn()} disabled />);

    expect(screen.getByText('picker:time')).toBeTruthy();
  });

  it('ignores picker changes while disabled unless the caller explicitly allows them', () => {
    const onChange = jest.fn();
    const view = render(<DateTimeField label="Başlama saati" value={new Date('2026-04-04T09:00:00.000Z')} mode="time" onChange={onChange} />);

    fireEvent.press(screen.getByRole('button'));
    view.rerender(<DateTimeField label="Başlama saati" value={new Date('2026-04-04T09:00:00.000Z')} mode="time" onChange={onChange} disabled />);

    fireEvent.press(screen.getByTestId('picker-time'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('still forwards picker changes during a disabled iOS autosave when opted in', () => {
    const onChange = jest.fn();
    const view = render(<DateTimeField label="Başlama saati" value={new Date('2026-04-04T09:00:00.000Z')} mode="time" onChange={onChange} />);

    fireEvent.press(screen.getByRole('button'));
    view.rerender(
      <DateTimeField
        label="Başlama saati"
        value={new Date('2026-04-04T09:00:00.000Z')}
        mode="time"
        onChange={onChange}
        disabled
        allowChangesWhileDisabled
      />
    );

    fireEvent.press(screen.getByTestId('picker-time'));

    expect(onChange).toHaveBeenCalledWith(new Date('2026-04-04T10:30:00.000Z'));
  });
});
