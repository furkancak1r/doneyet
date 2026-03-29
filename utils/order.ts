export function renumberSortOrders<T extends { sortOrder: number }>(items: T[]): T[] {
  return items.map((item, index) => ({
    ...item,
    sortOrder: index
  }));
}

export function mergeVisibleOrder<T extends { id: string }>(currentItems: T[], orderedVisibleIds: string[]): T[] {
  const visibleIdSet = new Set(orderedVisibleIds);
  const visibleItemsById = new Map(currentItems.filter((item) => visibleIdSet.has(item.id)).map((item) => [item.id, item] as const));
  const orderedVisibleItems = orderedVisibleIds.map((id) => visibleItemsById.get(id)).filter(Boolean) as T[];
  const nextVisibleItems = [...orderedVisibleItems];

  return currentItems.map((item) => {
    if (!visibleIdSet.has(item.id)) {
      return item;
    }

    return nextVisibleItems.shift() ?? item;
  });
}
