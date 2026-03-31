import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ListForm } from '@/features/lists/ListForm';
import { useApp } from '@/hooks/useApp';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

jest.mock('@/hooks/useApp', () => ({
  useApp: jest.fn()
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        {
          'listForm.name': 'List name',
          'listForm.namePlaceholder': 'For example: House chores',
          'listForm.color': 'Color',
          'listForm.icon': 'Icon',
          'listForm.previewTitle': 'New list',
          'listForm.previewSubtitle': 'This list will be used to group your tasks.',
          'listForm.colorAccessibility': 'Select color',
          'listForm.errorName': 'List name is required.',
          'listForm.errorColor': 'Select a color.',
          'listForm.errorIcon': 'Select an icon.',
          'listForm.errorCreate': 'Could not create list.',
          'listForm.errorUpdate': 'Could not update list.',
          'listIcons.work': 'Work',
          'listIcons.home': 'Home',
          'listIcons.personal': 'Personal',
          'listIcons.money': 'Money',
          'listIcons.shopping': 'Shopping',
          'listIcons.health': 'Health',
          'listIcons.calendar': 'Calendar',
          'listIcons.note': 'Note'
        } as Record<string, string>
      )[key] ?? key
  })
}));

const mockedUseApp = useApp as jest.MockedFunction<typeof useApp>;

const theme = {
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
};

describe('ListForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseApp.mockReturnValue({ theme } as any);
  });

  it('shows edit defaults and submits the updated list payload', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <ListForm
        initialName="Deep Work"
        initialColor="#2E8B57"
        initialIcon="home-outline"
        submitLabel="Update"
        submitErrorKey="listForm.errorUpdate"
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByDisplayValue('Deep Work');

    expect(nameInput).toBeTruthy();
    expect(screen.getByLabelText('Select color #2E8B57').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByLabelText('Home').props.accessibilityState).toEqual({ selected: true });

    fireEvent.changeText(nameInput, 'Errands');
    fireEvent.press(screen.getByLabelText('Select color #B42318'));
    fireEvent.press(screen.getByLabelText('Shopping'));
    fireEvent.press(screen.getByText('Update'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Errands',
        color: '#B42318',
        icon: 'cart-outline'
      })
    );
  });
});
