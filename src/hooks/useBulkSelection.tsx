import { useState, useCallback } from "react";

export interface BulkSelectionHook<T = any> {
  selectedIds: Set<string>;
  isSelected: (id: string) => boolean;
  toggleSelection: (id: string) => void;
  toggleAll: (ids: string[]) => void;
  clearSelection: () => void;
  selectedCount: number;
  selectedItems: T[];
}

export function useBulkSelection<T extends { [key: string]: any }>(
  items: T[] = [],
  idField: string = "id"
): BulkSelectionHook<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) {
        return new Set();
      } else {
        return new Set(ids);
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedItems = items.filter((item) =>
    selectedIds.has(item[idField])
  );

  return {
    selectedIds,
    isSelected,
    toggleSelection,
    toggleAll,
    clearSelection,
    selectedCount: selectedIds.size,
    selectedItems,
  };
}
