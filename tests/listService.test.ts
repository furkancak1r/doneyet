import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { createList, reorderLists, syncLocalizedDefaultLists } from '../services/listService';

const fetchLists = vi.fn();
const fetchMaxListSortOrder = vi.fn();
const saveList = vi.fn();

vi.mock('../db/repositories', () => ({
  fetchLists: (...args: unknown[]) => fetchLists(...args),
  fetchMaxListSortOrder: (...args: unknown[]) => fetchMaxListSortOrder(...args),
  saveList: (...args: unknown[]) => saveList(...args)
}));

describe('list service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('syncs unlocked default lists to the active language', async () => {
    await i18n.changeLanguage('tr');
    fetchLists.mockResolvedValue([
      {
        id: 'list-1',
        name: 'Work',
        color: '#116466',
        icon: 'briefcase-outline',
        sortOrder: 0,
        createdAt: '2025-03-01T00:00:00.000Z',
        seedKey: 'seeds.work',
        seedNameLocked: 0
      },
      {
        id: 'list-2',
        name: 'Custom',
        color: '#123456',
        icon: 'note',
        sortOrder: 1,
        createdAt: '2025-03-01T00:00:00.000Z',
        seedKey: null,
        seedNameLocked: 0
      }
    ]);
    saveList.mockResolvedValue(undefined);

    await syncLocalizedDefaultLists();

    expect(saveList).toHaveBeenCalledWith(expect.objectContaining({ id: 'list-1', name: 'İş', seedKey: 'seeds.work', seedNameLocked: 0 }));
    expect(saveList).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'list-2' }));
  });

  it('does not sync locked default lists', async () => {
    await i18n.changeLanguage('tr');
    fetchLists.mockResolvedValue([
      {
        id: 'list-1',
        name: 'My Work',
        color: '#116466',
        icon: 'briefcase-outline',
        sortOrder: 0,
        createdAt: '2025-03-01T00:00:00.000Z',
        seedKey: 'seeds.work',
        seedNameLocked: 1
      }
    ]);
    saveList.mockResolvedValue(undefined);

    await syncLocalizedDefaultLists();

    expect(saveList).not.toHaveBeenCalled();
  });

  it('creates a list with trimmed name, color and icon', async () => {
    fetchLists.mockResolvedValue([]);
    fetchMaxListSortOrder.mockResolvedValue(-1);
    saveList.mockResolvedValue(undefined);

    const list = await createList('  Ev işleri  ', '#116466', 'home-outline');

    expect(list.name).toBe('Ev işleri');
    expect(list.color).toBe('#116466');
    expect(list.icon).toBe('home-outline');
    expect(list.sortOrder).toBe(0);
    expect(saveList).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate list names regardless of case', async () => {
    await i18n.changeLanguage('tr');
    fetchLists.mockResolvedValue([
      {
        id: 'list-1',
        name: 'İş',
        color: '#116466',
        icon: 'briefcase-outline',
        sortOrder: 0,
        createdAt: '2025-03-01T00:00:00.000Z'
      }
    ]);

    await expect(createList('iş', '#116466', 'briefcase-outline')).rejects.toThrow('Bu isimde bir liste zaten var.');
    expect(saveList).not.toHaveBeenCalled();
  });

  it('rejects empty names', async () => {
    await i18n.changeLanguage('tr');
    fetchLists.mockResolvedValue([]);
    fetchMaxListSortOrder.mockResolvedValue(-1);

    await expect(createList('   ', '#116466', 'briefcase-outline')).rejects.toThrow('Liste adı zorunludur.');
    expect(saveList).not.toHaveBeenCalled();
  });

  it('reorders lists and renumbers them sequentially', async () => {
    fetchLists.mockResolvedValue([
      { id: 'list-1', name: 'A', color: '#111111', icon: 'home-outline', sortOrder: 0, createdAt: '2025-03-01T00:00:00.000Z' },
      { id: 'list-2', name: 'B', color: '#222222', icon: 'home-outline', sortOrder: 1, createdAt: '2025-03-01T00:00:00.000Z' },
      { id: 'list-3', name: 'C', color: '#333333', icon: 'home-outline', sortOrder: 2, createdAt: '2025-03-01T00:00:00.000Z' }
    ]);
    saveList.mockResolvedValue(undefined);

    await reorderLists(['list-3', 'list-1', 'list-2']);

    expect(saveList).toHaveBeenCalledWith(expect.objectContaining({ id: 'list-3', sortOrder: 0 }));
    expect(saveList).toHaveBeenCalledWith(expect.objectContaining({ id: 'list-1', sortOrder: 1 }));
    expect(saveList).toHaveBeenCalledWith(expect.objectContaining({ id: 'list-2', sortOrder: 2 }));
  });
});
