import { defaultListSeeds } from '@/constants/theme';
import { deleteListRow, fetchListById, fetchLists, fetchMaxListSortOrder, saveList } from '@/db/repositories';
import { AppList } from '@/types/domain';
import { createId } from '@/utils/id';
import { renumberSortOrders } from '@/utils/order';
import i18n from '@/i18n';
import { getDefaultSeedName, resolveDefaultSeedKey, shouldLockSeedName } from '@/utils/defaultLists';

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
    createdAt: new Date().toISOString(),
    seedKey: null,
    seedNameLocked: 0
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
    ...updates,
    seedNameLocked: shouldLockSeedName(current, updates) ? 1 : current.seedNameLocked ?? 0
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

export async function syncLocalizedDefaultLists(): Promise<void> {
  const lists = await fetchLists();
  const nextLanguage = i18n.language === 'tr' ? 'tr' : 'en';
  const updates = lists
    .map((list) => {
      const resolvedSeedKey = list.seedKey ?? resolveDefaultSeedKey(list);
      if (!resolvedSeedKey) {
        return null;
      }

      const seed = defaultListSeeds.find((item) => item.nameKey === resolvedSeedKey);
      if (!seed) {
        return null;
      }

      const nextName = getDefaultSeedName(seed, nextLanguage);
      const shouldRename = (list.seedNameLocked ?? 0) === 0 && list.name !== nextName;

      if (list.seedKey === resolvedSeedKey && !shouldRename) {
        return null;
      }

      return {
        ...list,
        seedKey: resolvedSeedKey,
        name: shouldRename ? nextName : list.name
      };
    })
    .filter(Boolean) as AppList[];

  for (const list of updates) {
    await saveList(list);
  }
}
