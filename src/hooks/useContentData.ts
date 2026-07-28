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
  like_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// Slim rows returned by the stats RPC — revenue is what fans actually paid
// (from content_purchases), not current price × unlocks.
export interface TopItem {
  id: string;
  title: string | null;
  media_type: 'image' | 'video';
  coin_price: number;
  unlock_count: number;
  preview_url: string | null;
  revenue: number;
}

export interface ContentStats {
  total_items: number;
  portfolio_count: number;
  exclusive_count: number;
  private_count: number;
  total_unlocks: number;
  total_revenue: number;
  revenue_30d?: number;
  unlocks_30d?: number;
  top_items: TopItem[];
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
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  // Items load through the filter effect, separately from stats — track the
  // first completion so the page doesn't flash its empty state before items arrive.
  const [itemsLoaded, setItemsLoaded] = useState(false);
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
      setTotal(data.total ?? (data.items || []).length);
    } catch {
      toast.error('Failed to load content items');
    } finally {
      setItemsLoaded(true);
    }
  }, [filters]);

  // The API caps a page at 500 rows; fetch the next page and append so large
  // libraries aren't silently truncated at the first page.
  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const qs = buildItemsQueryString(filters);
      const sep = qs ? '&' : '?';
      const res = await fetch(`/api/content-hub/items${qs}${sep}offset=${items.length}`);
      if (!res.ok) throw new Error('Failed to fetch items');
      const data = await res.json();
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...(data.items || []).filter((i: ContentItem) => !seen.has(i.id))];
      });
      setTotal(data.total ?? total);
    } catch {
      toast.error('Failed to load more items');
    } finally {
      setLoadingMore(false);
    }
  }, [filters, items.length, total]);

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
    await Promise.all([fetchItems(), fetchStats()]);
    setLoading(false);
  }, [fetchItems, fetchStats]);

  // --- mutations -----------------------------------------------------------

  const createItem = useCallback(
    async (data: Partial<ContentItem>) => {
      try {
        const res = await fetch('/api/content-hub/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.details || errData.error || 'Failed to create item');
        }
        const result = await res.json();
        await Promise.all([fetchItems(), fetchStats()]);
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create content item';
        toast.error(message);
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
        const result = await res.json();
        // Status flips can move media between buckets server-side (paid content
        // lives in a private bucket) — adopt the server's item, whose media_url
        // is freshly signed/resolved, over the optimistic merge.
        if (result?.item) {
          setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...result.item } : item)),
          );
        }
        toast.success('Content item updated');
        return result;
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
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      // The bulk API caps ids at 50 per request; Select All can select up to 500
      const CHUNK_SIZE = 50;
      try {
        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
          const res = await fetch('/api/content-hub/items/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: ids.slice(i, i + CHUNK_SIZE), action, ...params }),
          });
          if (!res.ok) throw new Error('Bulk action failed');
        }
        toast.success('Bulk action completed');
        setSelectedIds(new Set());
        await Promise.all([fetchItems(), fetchStats()]);
      } catch {
        toast.error('Bulk action failed');
        // Earlier chunks may have applied — resync
        await Promise.all([fetchItems(), fetchStats()]);
      }
    },
    [selectedIds, fetchItems, fetchStats],
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

  // Initial data load (stats only, items handled by filter effect)
  useEffect(() => {
    setLoading(true);
    fetchStats().finally(() => setLoading(false));
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
    total,
    stats,
    loading: loading || !itemsLoaded,
    loadingMore,
    filters,
    selectedIds,

    // data fetching
    fetchItems,
    fetchStats,
    refreshAll,
    loadMore,

    // mutations
    createItem,
    updateItem,
    deleteItem,
    bulkAction,

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
