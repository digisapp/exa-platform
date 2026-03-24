'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentItem {
  id: string;
  model_id: string;
  title: string | null;
  description: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  preview_url: string | null;
  status: 'private' | 'portfolio' | 'exclusive';
  coin_price: number;
  set_id: string | null;
  publish_at: string | null;
  position: number;
  view_count: number;
  unlock_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ContentSet {
  id: string;
  model_id: string;
  title: string;
  description: string | null;
  cover_item_id: string | null;
  coin_price: number | null;
  status: 'draft' | 'live' | 'archived';
  position: number;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface ContentStats {
  total_items: number;
  portfolio_count: number;
  exclusive_count: number;
  private_count: number;
  total_unlocks: number;
  total_revenue: number;
  top_items: ContentItem[];
  sets_count: number;
  scheduled_count: number;
}

export interface ContentFilters {
  status: string | null;
  media_type: string | null;
  set_id: string | null;
  tag: string | null;
  search: string;
  sort: string;
  order: 'asc' | 'desc';
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS: ContentFilters = {
  status: null,
  media_type: null,
  set_id: null,
  tag: null,
  search: '',
  sort: 'created_at',
  order: 'desc',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildItemsQueryString(filters: ContentFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.media_type) params.set('media_type', filters.media_type);
  if (filters.set_id) params.set('set_id', filters.set_id);
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.search) params.set('search', filters.search);
  params.set('sort', filters.sort);
  params.set('order', filters.order);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useContentData() {
  // --- state ---------------------------------------------------------------
  const [items, setItems] = useState<ContentItem[]>([]);
  const [sets, setSets] = useState<ContentSet[]>([]);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ContentFilters>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Ref for debouncing search input
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -----------------------------------------------------------------------
  // API calls
  // -----------------------------------------------------------------------

  const fetchItems = useCallback(async (currentFilters?: ContentFilters) => {
    try {
      const qs = buildItemsQueryString(currentFilters ?? filters);
      const res = await fetch(`/api/content-hub/items${qs}`);
      if (!res.ok) throw new Error('Failed to fetch items');
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      toast.error('Failed to load content items');
    }
  }, [filters]);

  const fetchSets = useCallback(async () => {
    try {
      const res = await fetch('/api/content-hub/sets');
      if (!res.ok) throw new Error('Failed to fetch sets');
      const data = await res.json();
      setSets(data.sets || []);
    } catch {
      toast.error('Failed to load content sets');
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/content-hub/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch {
      toast.error('Failed to load content stats');
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchItems(), fetchSets(), fetchStats()]);
    setLoading(false);
  }, [fetchItems, fetchSets, fetchStats]);

  // --- mutations -----------------------------------------------------------

  const createItem = useCallback(
    async (data: Partial<ContentItem>) => {
      try {
        const res = await fetch('/api/content-hub/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create item');
        toast.success('Content item created');
        await Promise.all([fetchItems(), fetchStats()]);
        return await res.json();
      } catch {
        toast.error('Failed to create content item');
        return null;
      }
    },
    [fetchItems, fetchStats],
  );

  const updateItem = useCallback(
    async (id: string, data: Partial<ContentItem>) => {
      // Optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item,
        ),
      );
      try {
        const res = await fetch(`/api/content-hub/items/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update item');
        toast.success('Content item updated');
        return await res.json();
      } catch {
        toast.error('Failed to update content item');
        // Revert on failure
        await fetchItems();
        return null;
      }
    },
    [fetchItems],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      // Optimistic removal
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      try {
        const res = await fetch(`/api/content-hub/items/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete item');
        toast.success('Content item deleted');
      } catch {
        toast.error('Failed to delete content item');
        await fetchItems();
      }
    },
    [fetchItems],
  );

  const bulkAction = useCallback(
    async (action: string, params?: Record<string, unknown>) => {
      try {
        const res = await fetch('/api/content-hub/items/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: Array.from(selectedIds), action, ...params }),
        });
        if (!res.ok) throw new Error('Bulk action failed');
        toast.success('Bulk action completed');
        setSelectedIds(new Set());
        await fetchItems();
      } catch {
        toast.error('Bulk action failed');
      }
    },
    [selectedIds, fetchItems],
  );

  const createSet = useCallback(
    async (data: Partial<ContentSet>) => {
      try {
        const res = await fetch('/api/content-hub/sets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create set');
        toast.success('Content set created');
        await fetchSets();
        return await res.json();
      } catch {
        toast.error('Failed to create content set');
        return null;
      }
    },
    [fetchSets],
  );

  const updateSet = useCallback(
    async (id: string, data: Partial<ContentSet>) => {
      // Optimistic update
      setSets((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, ...data, updated_at: new Date().toISOString() } : s,
        ),
      );
      try {
        const res = await fetch(`/api/content-hub/sets/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update set');
        toast.success('Content set updated');
        return await res.json();
      } catch {
        toast.error('Failed to update content set');
        await fetchSets();
        return null;
      }
    },
    [fetchSets],
  );

  const deleteSet = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/content-hub/sets/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete set');
        toast.success('Content set deleted');
        await Promise.all([fetchSets(), fetchItems()]);
      } catch {
        toast.error('Failed to delete content set');
      }
    },
    [fetchSets, fetchItems],
  );

  // -----------------------------------------------------------------------
  // Selection helpers
  // -----------------------------------------------------------------------

  const toggleSelect = useCallback((id: string) => {
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

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((i) => i.id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  // -----------------------------------------------------------------------
  // Filter helpers
  // -----------------------------------------------------------------------

  const setFilter = useCallback(
    <K extends keyof ContentFilters>(key: K, value: ContentFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // -----------------------------------------------------------------------
  // Effects
  // -----------------------------------------------------------------------

  // Initial data load (sets + stats only, items handled by filter effect)
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSets(), fetchStats()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch items when filters change, with 300ms debounce on search
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const delay = filters.search ? 300 : 0;

    searchTimerRef.current = setTimeout(() => {
      fetchItems(filters);
    }, delay);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
    // We intentionally depend on the serialised filters rather than fetchItems
    // to avoid infinite re-render loops (fetchItems closes over filters).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.status,
    filters.media_type,
    filters.set_id,
    filters.tag,
    filters.search,
    filters.sort,
    filters.order,
  ]);

  // -----------------------------------------------------------------------
  // Return value
  // -----------------------------------------------------------------------

  return {
    // state
    items,
    sets,
    stats,
    loading,
    filters,
    selectedIds,

    // data fetching
    fetchItems,
    fetchSets,
    fetchStats,
    refreshAll,

    // mutations
    createItem,
    updateItem,
    deleteItem,
    bulkAction,
    createSet,
    updateSet,
    deleteSet,

    // selection
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,

    // filters
    setFilter,
    resetFilters,
  };
}
