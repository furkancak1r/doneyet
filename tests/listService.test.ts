import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { createList, deleteList, reorderLists, syncLocalizedDefaultLists, updateList } from '../services/listService';

const fetchLists = vi.fn();
const fetchListById = vi.fn();
const fetchMaxListSortOrder = vi.fn();
const fetchTasksByList = vi.fn();
const saveList = vi.fn();
const deleteListRow = vi.fn();
const removeTask = vi.fn();

vi.mock('../db/repositories', () => ({
  fetchLists: (...args: unknown[]) => fetchLists(...args),
  fetchListById: (...args: unknown[]) => fetchListById(...args),
  fetchMaxListSortOrder: (...args: unknown[]) => fetchMaxListSortOrder(...args),
  fetchTasksByList: (...args: unknown[]) => fetchTasksByList(...args),
  saveList: (...args: unknown[]) => saveList(...args),
  deleteListRow: (...args: unknown[]) => deleteListRow(...args)
}));

vi.mock('../services/taskService', () => ({
  removeTask: (...args: unknown[]) => removeTask(...args)
}));

describe('list service', () => {
  const workList = {
    id: 'list-1',
    name: 'Work',
    color: '#116466',
    icon: 'briefcase-outline',
    sortOrder: 0,
    createdAt: '2025-03-01T00:00:00.000Z',
    seedKey: 'seeds.work',
    seedNameLocked: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('syncs unlocked default lists to the active language', async () => {
    await i18n.changeLanguage('tr');
    fetchLists.mockResolvedValue([
      workList,
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
    fetchLists.mockResolvedValue([{ ...workList, name: 'My Work', seedNameLocked: 1 }]);
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
        ...workList,
        name: 'İş'
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

  it('updates a list with a trimmed name while preserving createdAt and sortOrder', async () => {
    fetchListById.mockResolvedValue(workList);
    fetchLists.mockResolvedValue([workList]);
    saveList.mockResolvedValue(undefined);

    const updated = await updateList('list-1', { name: '  Deep Work  ', color: '#2E8B57', icon: 'home-outline' });

    expect(updated).toEqual(
      expect.objectContaining({
        id: 'list-1',
        name: 'Deep Work',
        color: '#2E8B57',
        icon: 'home-outline',
        createdAt: workList.createdAt,
        sortOrder: workList.sortOrder,
        seedNameLocked: 1
      })
    );
    expect(saveList).toHaveBeenCalledWith(expect.objectContaining({ name: 'Deep Work', createdAt: workList.createdAt, sortOrder: workList.sortOrder }));
  });

  it('rejects duplicate names when updating a list', async () => {
    await i18n.changeLanguage('tr');
    fetchListById.mockResolvedValue(workList);
    fetchLists.mockResolvedValue([
      workList,
      {
        id: 'list-2',
        name: 'Kişisel',
        color: '#123456',
        icon: 'person-outline',
        sortOrder: 1,
        createdAt: '2025-03-02T00:00:00.000Z',
        seedKey: null,
        seedNameLocked: 0
      }
    ]);

    await expect(updateList('list-1', { name: 'kişisel' })).rejects.toThrow('Bu isimde bir liste zaten var.');
    expect(saveList).not.toHaveBeenCalled();
  });

  it('does not treat the current list name as a duplicate during update', async () => {
    await i18n.changeLanguage('tr');
    fetchListById.mockResolvedValue({ ...workList, name: 'İş' });
    fetchLists.mockResolvedValue([{ ...workList, name: 'İş' }]);
    saveList.mockResolvedValue(undefined);

    const updated = await updateList('list-1', { name: ' iş ' });

    expect(updated).toEqual(expect.objectContaining({ name: 'iş' }));
    expect(saveList).toHaveBeenCalledTimes(1);
  });

  it('deletes tasks through the task cleanup path before removing the list row', async () => {
    fetchTasksByList.mockResolvedValue([
      { id: 'task-1' },
      { id: 'task-2' }
    ]);
    removeTask.mockResolvedValue(undefined);
    deleteListRow.mockResolvedValue(undefined);

    await deleteList('list-1');

    expect(removeTask).toHaveBeenNthCalledWith(1, 'task-1');
    expect(removeTask).toHaveBeenNthCalledWith(2, 'task-2');
    expect(deleteListRow).toHaveBeenCalledWith('list-1');
    expect(removeTask.mock.invocationCallOrder[1]).toBeLessThan(deleteListRow.mock.invocationCallOrder[0]);
  });
});
