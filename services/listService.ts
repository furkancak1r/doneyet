import { defaultListSeeds } from '@/constants/theme';
import { deleteListRow, fetchListById, fetchLists, fetchMaxListSortOrder, saveList } from '@/db/repositories';
import { AppList } from '@/types/domain';
import { createId } from '@/utils/id';
import { renumberSortOrders } from '@/utils/order';
import i18n from '@/i18n';

function normalizeListName(name: string): string {
  return name.trim();
}

export async function listAllLists(): Promise<AppList[]> {
  return fetchLists();
}

export async function createList(name: string, color: string, icon: string): Promise<AppList> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error(String(i18n.t('listForm.errorName')));
  }

  if (!color) {
    throw new Error(String(i18n.t('listForm.errorColor')));
  }

  if (!icon) {
    throw new Error(String(i18n.t('listForm.errorIcon')));
  }

  const existingLists = await fetchLists();
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', usage: 'search' });
  const duplicate = existingLists.find((item) => collator.compare(normalizeListName(item.name), normalizeListName(trimmedName)) === 0);
  if (duplicate) {
    throw new Error(String(i18n.t('errors.duplicateList')));
  }

  const nextSortOrder = (await fetchMaxListSortOrder()) + 1;
  const list: AppList = {
    id: createId('list'),
    name: trimmedName,
    color,
    icon,
    sortOrder: nextSortOrder,
    createdAt: new Date().toISOString()
  };

  await saveList(list);
  return list;
}

export async function updateList(listId: string, updates: Partial<Pick<AppList, 'name' | 'color' | 'icon' | 'sortOrder'>>): Promise<AppList | null> {
  const current = await fetchListById(listId);
  if (!current) {
    return null;
  }

  const updated: AppList = {
    ...current,
    ...updates
  };

  await saveList(updated);
  return updated;
}

export async function reorderLists(listIdsInOrder: string[]): Promise<void> {
  const existingLists = await fetchLists();
  const existingById = new Map(existingLists.map((list) => [list.id, list] as const));
  const ordered = listIdsInOrder.map((id) => existingById.get(id)).filter(Boolean) as AppList[];
  const nextLists = renumberSortOrders(ordered);

  for (const list of nextLists) {
    await saveList(list);
  }
}

export async function deleteList(listId: string): Promise<void> {
  await deleteListRow(listId);
}

export function getDefaultSeedListNames(): string[] {
  return defaultListSeeds.map((seed) => String(i18n.t(seed.nameKey)));
}
