'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useContentData, ContentItem, ContentFilters } from '@/hooks/useContentData';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';

import {
  Camera,
  Video,
  Lock,
  Coins,
  Upload,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  ExternalLink,
  BarChart3,
  Image as ImageIcon,
  X,
  ChevronDown,
  TrendingUp,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


function getMediaUrl(url: string): string {
  if (url.startsWith('http')) return url;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/portfolio/${url}`;
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function ContentPage() {
  const {
    items,
    stats,
    loading,
    filters,
    selectedIds,
    refreshAll,
    createItem,
    updateItem,
    deleteItem,
    bulkAction,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,
    setFilter,
  } = useContentData();

  // Local UI state
  const [activeTab, setActiveTab] = useState('all');
  const [modelUsername, setModelUsername] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialogs
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ContentItem | null>(null);
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);

  // Fetch model username on mount
  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: model } = (await supabase
        .from('models')
        .select('username')
        .eq('user_id', user.id)
        .single()) as { data: { username: string } | null };
      if (model) setModelUsername(model.username);
    }
    loadProfile();
  }, []);

  // Debounced search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        setFilter('search', value);
      }, 300);
    },
    [setFilter],
  );

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // Scheduled items for Drops tab
  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Content</h1>
          <div className="flex items-center gap-3">
            {modelUsername && (
              <Link
                href={`/${modelUsername}`}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                View Profile
              </Link>
            )}
            <Button
              onClick={() => setUploadOpen(true)}
              className="bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:from-pink-600 hover:to-violet-600"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          /* Tabs */
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Unified toolbar: tabs + filters in one row */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
              </TabsList>

              {activeTab === 'all' && (
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(v) => setFilter('status', v === 'all' ? null : v)}
                  >
                    <SelectTrigger className="h-9 w-[120px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="portfolio">Public</SelectItem>
                      <SelectItem value="exclusive">PPV</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.media_type || 'all'}
                    onValueChange={(v) => setFilter('media_type', v === 'all' ? null : v)}
                  >
                    <SelectTrigger className="h-9 w-[110px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="image">Photos</SelectItem>
                      <SelectItem value="video">Videos</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchInput}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="h-9 w-[140px] pl-8 text-xs"
                    />
                  </div>

                  <Select
                    value={`${filters.sort}_${filters.order}`}
                    onValueChange={(v) => {
                      const map: Record<string, [string, string]> = {
                        created_at_desc: ['created_at', 'desc'],
                        created_at_asc: ['created_at', 'asc'],
                        unlock_count_desc: ['unlock_count', 'desc'],
                        coin_price_desc: ['coin_price', 'desc'],
                      };
                      const [sort, order] = map[v] || ['created_at', 'desc'];
                      setFilter('sort', sort);
                      setFilter('order', order as 'asc' | 'desc');
                    }}
                  >
                    <SelectTrigger className="h-9 w-[120px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at_desc">Newest</SelectItem>
                      <SelectItem value="created_at_asc">Oldest</SelectItem>
                      <SelectItem value="unlock_count_desc">Most Unlocks</SelectItem>
                      <SelectItem value="coin_price_desc">Highest Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <TabsContent value="all">
              <AllTab
                items={items}
                filters={filters}
                selectedIds={selectedIds}
                toggleSelect={toggleSelect}
                selectAll={selectAll}
                clearSelection={clearSelection}
                isSelected={isSelected}
                bulkAction={bulkAction}
                onEditItem={setEditItem}
                onDeleteItem={setDeleteConfirmItem}
                onUpload={() => setUploadOpen(true)}
                onBulkPrice={() => setBulkPriceOpen(true)}
              />
            </TabsContent>

            <TabsContent value="stats">
              <StatsTab stats={stats} items={items} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        createItem={createItem}
        refreshAll={refreshAll}
      />

      {/* Edit Item Dialog */}
      {editItem && (
        <ItemEditDialog
          item={editItem}
          open={!!editItem}
          onOpenChange={(open) => {
            if (!open) setEditItem(null);
          }}
          updateItem={updateItem}
          deleteItem={deleteItem}
        />
      )}

      {/* Delete Item Confirm */}
      {deleteConfirmItem && (
        <AlertDialog
          open={!!deleteConfirmItem}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirmItem(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deleteConfirmItem.title || 'Untitled'}&quot;?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  deleteItem(deleteConfirmItem.id);
                  setDeleteConfirmItem(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Bulk Price Dialog */}
      <BulkPriceDialog
        open={bulkPriceOpen}
        onOpenChange={setBulkPriceOpen}
        selectedCount={selectedIds.size}
        onConfirm={(price) => {
          bulkAction('set_price', { coin_price: price });
          setBulkPriceOpen(false);
        }}
      />

    </div>
  );
}

// ===========================================================================
// ALL TAB
// ===========================================================================

function AllTab({
  items,
  filters,
  selectedIds,
  toggleSelect,
  selectAll,
  clearSelection,
  isSelected,
  bulkAction,
  onEditItem,
  onDeleteItem,
  onUpload,
  onBulkPrice,
}: {
  items: ContentItem[];
  filters: { status: string | null; media_type: string | null; sort: string; order: string };
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  bulkAction: (action: string, params?: Record<string, unknown>) => Promise<void>;
  onEditItem: (item: ContentItem) => void;
  onDeleteItem: (item: ContentItem) => void;
  onUpload: () => void;
  onBulkPrice: () => void;
}) {
  const hasSelection = selectedIds.size > 0;

  return (
    <div className="space-y-4">
      {/* Bulk Action Bar */}
      {hasSelection && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="mx-2 h-4 w-px bg-border" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Set Status <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => bulkAction('set_status', { status: 'private' })}>
                Private
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkAction('set_status', { status: 'portfolio' })}>
                Public
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkAction('set_status', { status: 'exclusive' })}>
                PPV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={onBulkPrice}>
            Set Price
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => bulkAction('delete')}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>

          <div className="flex-1" />

          <Button variant="ghost" size="sm" onClick={clearSelection}>
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        </div>
      )}

      {/* Select All */}
      {items.length > 0 && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={hasSelection ? clearSelection : selectAll}>
            {hasSelection ? 'Deselect All' : 'Select All'}
          </Button>
          <span className="text-xs text-muted-foreground">{items.length} items</span>
        </div>
      )}

      {/* Content Grid */}
      {items.length === 0 ? (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Upload your first photo or video</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Your content library is empty. Start building your portfolio.
            </p>
            <Button
              onClick={onUpload}
              className="bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:from-pink-600 hover:to-violet-600"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ContentItemCard
              key={item.id}
              item={item}
              selected={isSelected(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
              onEdit={() => onEditItem(item)}
              onDelete={() => onDeleteItem(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Content Item Card
// ===========================================================================

function ContentItemCard({
  item,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  item: ContentItem;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaUrl = getMediaUrl(item.media_url);

  useEffect(() => {
    if (item.media_type === 'video' && videoRef.current) {
      if (hovered) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [hovered, item.media_type]);

  return (
    <div
      className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-muted"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onEdit}
    >
      {/* Media */}
      {item.media_type === 'video' ? (
        <video
          ref={videoRef}
          src={mediaUrl}
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      ) : (
        <Image
          src={mediaUrl}
          alt={item.title || 'Content'}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      )}

      {/* Checkbox — top left */}
      <div
        className={cn(
          'absolute left-2 top-2 z-20 transition-opacity',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 sm:opacity-0',
          'max-sm:opacity-100',
        )}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
      >
        <Checkbox checked={selected} className="h-5 w-5 border-2 border-white bg-black/30" />
      </div>

      {/* Status indicator — top right */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        {item.status === 'private' && (
          <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm">
            <Lock className="h-2.5 w-2.5" />
            Private
          </span>
        )}
        {item.status === 'portfolio' && (
          <span className="flex items-center gap-1 rounded-full bg-green-500/80 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            Public
          </span>
        )}
        {item.status === 'exclusive' && (
          <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500/90 to-violet-500/90 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            <Coins className="h-2.5 w-2.5" />
            {item.coin_price}
          </span>
        )}
      </div>


      {/* Hover overlay */}
      <div
        className={cn(
          'absolute inset-0 z-[5] flex items-center justify-center gap-3 bg-black/40 transition-opacity',
          hovered ? 'opacity-100' : 'opacity-0',
        )}
      >
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ===========================================================================
// Item Edit Dialog
// ===========================================================================

function ItemEditDialog({
  item,
  open,
  onOpenChange,
  updateItem,
  deleteItem,
}: {
  item: ContentItem;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  updateItem: (id: string, data: Partial<ContentItem>) => Promise<ContentItem | null>;
  deleteItem: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(item.title || '');
  const [description, setDescription] = useState(item.description || '');
  const [status, setStatus] = useState(item.status);
  const [coinPrice, setCoinPrice] = useState(item.coin_price);
  const [saving, setSaving] = useState(false);
  const mediaUrl = getMediaUrl(item.media_url);

  const handleSave = async () => {
    setSaving(true);
    await updateItem(item.id, {
      title: title || null,
      description: description || null,
      status,
      coin_price: status === 'exclusive' ? coinPrice : 0,
    });
    setSaving(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    await deleteItem(item.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>Update the details of this content item.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
            {item.media_type === 'video' ? (
              <video
                src={mediaUrl}
                controls
                className="h-full w-full object-contain"
                preload="metadata"
              />
            ) : (
              <Image
                src={mediaUrl}
                alt={item.title || 'Content'}
                fill
                className="object-contain"
                sizes="500px"
              />
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this content a title"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ContentItem['status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="portfolio">Public</SelectItem>
                <SelectItem value="exclusive">PPV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Coin Price */}
          {status === 'exclusive' && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-price">Coin Price</Label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="edit-price"
                  type="number"
                  min={0}
                  max={10000}
                  value={coinPrice}
                  onChange={(e) => setCoinPrice(Number(e.target.value))}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                ${(coinPrice * 0.1).toFixed(2)} USD equivalent
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// STATS TAB
// ===========================================================================

function StatsTab({
  stats,
  items,
}: {
  stats: import('@/hooks/useContentData').ContentStats | null;
  items: ContentItem[];
}) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalItems = stats.total_items || 1;
  const portfolioPct = Math.round((stats.portfolio_count / totalItems) * 100);
  const exclusivePct = Math.round((stats.exclusive_count / totalItems) * 100);
  const privatePct = 100 - portfolioPct - exclusivePct;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">{stats.total_revenue}</p>
            <p className="text-xs text-muted-foreground">
              ${(stats.total_revenue * 0.1).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Unlocks</p>
            <p className="text-2xl font-bold">{stats.total_unlocks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Items</p>
            <p className="text-2xl font-bold">{stats.total_items}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">PPV Items</p>
            <p className="text-2xl font-bold">{stats.exclusive_count}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top performing items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Top Performing Items
          </CardTitle>
          <CardDescription>Your top 5 items by unlocks</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.top_items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No unlock data yet. PPV items will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.top_items.map((topItem, idx) => {
                const fullItem = items.find((i) => i.id === topItem.id);
                const mediaUrl = fullItem ? getMediaUrl(fullItem.media_url) : null;
                const revenue = (topItem.coin_price || 0) * (topItem.unlock_count || 0);

                return (
                  <div key={topItem.id} className="flex items-center gap-3">
                    <span className="w-5 text-sm font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      {mediaUrl && (
                        <Image
                          src={mediaUrl}
                          alt={topItem.title || ''}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {topItem.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {topItem.unlock_count} unlocks
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{revenue} coins</p>
                      <p className="text-xs text-muted-foreground">
                        ${(revenue * 0.1).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Content Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                Public
              </span>
              <span>
                {stats.portfolio_count} ({portfolioPct}%)
              </span>
            </div>
            <Progress value={portfolioPct} className="h-2 [&>div]:bg-green-500" />

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-pink-500" />
                PPV
              </span>
              <span>
                {stats.exclusive_count} ({exclusivePct}%)
              </span>
            </div>
            <Progress value={exclusivePct} className="h-2 [&>div]:bg-pink-500" />

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-400" />
                Private
              </span>
              <span>
                {stats.private_count} ({privatePct}%)
              </span>
            </div>
            <Progress value={privatePct} className="h-2 [&>div]:bg-gray-400" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================================================================
// Upload Dialog
// ===========================================================================

interface UploadFile {
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

function UploadDialog({
  open,
  onOpenChange,
  createItem,
  refreshAll,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  createItem: (data: Partial<ContentItem>) => Promise<ContentItem | null>;
  refreshAll: () => Promise<void>;
}) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'private' | 'portfolio' | 'exclusive'>('private');
  const [coinPrice, setCoinPrice] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraImageRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLInputElement>(null);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
    };
  }, [files]);

  // Reset form on close
  useEffect(() => {
    if (!open) {
      files.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      setFiles([]);
      setTitle('');
      setStatus('private');
      setCoinPrice(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
  const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
  const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
  const MAX_FILES = 20;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const incoming = Array.from(fileList);

    // Enforce max file count
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) {
      toast.error(`You can upload up to ${MAX_FILES} files at a time`);
      return;
    }
    if (incoming.length > remaining) {
      toast.error(`Only ${remaining} more file${remaining === 1 ? '' : 's'} can be added (max ${MAX_FILES})`);
    }
    const toProcess = incoming.slice(0, remaining);

    const accepted: UploadFile[] = [];

    for (const file of toProcess) {
      // Detect HEIC/HEIF from iPhone
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isHeic =
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        ext === 'heic' ||
        ext === 'heif';

      if (isHeic) {
        toast.error(
          'HEIC photos are not supported. On your iPhone, go to Settings → Camera → Formats → Most Compatible. Then try again!',
          { duration: 8000 },
        );
        continue;
      }

      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

      if (!isImage && !isVideo) {
        toast.error(`"${file.name}" is not a supported format. Use JPEG, PNG, WebP, GIF, MP4, MOV, or WebM.`);
        continue;
      }

      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (file.size > maxSize) {
        toast.error(`"${file.name}" is too large. Max ${isVideo ? '500MB' : '50MB'}.`);
        continue;
      }

      accepted.push({
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: 'pending' as const,
      });
    }

    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => {
      const removed = prev[idx];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const uploadSingleFile = async (uploadFile: UploadFile, idx: number): Promise<boolean> => {
    const { file } = uploadFile;

    // Update status
    setFiles((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, status: 'uploading' as const, progress: 10 } : f)),
    );

    try {
      // Step 1: Get signed URL
      const signedRes = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          title: title || file.name.split('.')[0],
        }),
      });

      if (!signedRes.ok) {
        const err = await signedRes.json();
        throw new Error(err.error || 'Failed to get upload URL');
      }

      const { signedUrl, storagePath } = await signedRes.json();

      setFiles((prev) =>
        prev.map((f, i) => (i === idx ? { ...f, progress: 30 } : f)),
      );

      // Step 2: Upload to storage
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage');
      }

      setFiles((prev) =>
        prev.map((f, i) => (i === idx ? { ...f, progress: 70 } : f)),
      );

      // Step 3: Create content item
      const isVideo = file.type.startsWith('video/');

      const itemData: Partial<ContentItem> = {
        media_url: storagePath,
        media_type: isVideo ? 'video' : 'image',
        title: title || null,
        status,
        coin_price: status === 'exclusive' ? coinPrice : 0,
      } as Partial<ContentItem>;

      const result = await createItem(itemData);

      if (!result) throw new Error('Failed to create content item');

      setFiles((prev) =>
        prev.map((f, i) =>
          i === idx ? { ...f, status: 'done' as const, progress: 100 } : f,
        ),
      );

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setFiles((prev) =>
        prev.map((f, i) =>
          i === idx ? { ...f, status: 'error' as const, error: message, progress: 0 } : f,
        ),
      );
      return false;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Select at least one file');
      return;
    }

    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'done') continue;
      const ok = await uploadSingleFile(files[i], i);
      if (ok) successCount++;
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded`);
      await refreshAll();
      if (successCount === files.length) {
        onOpenChange(false);
      }
    }
  };

  const allDone = files.length > 0 && files.every((f) => f.status === 'done');
  const hasErrors = files.some((f) => f.status === 'error');

  return (
    <Dialog open={open} onOpenChange={uploading ? undefined : onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Content</DialogTitle>
          <DialogDescription>Add photos or videos to your content.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File picker area */}
          {files.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">Click to select files</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Images up to 50MB · Videos up to 500MB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((f, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-lg border p-2">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {f.file.type.startsWith('video/') ? (
                      <video
                        src={f.preview}
                        muted
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={f.preview}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{f.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(f.file.size)}</p>
                    {f.status === 'uploading' && (
                      <Progress value={f.progress} className="mt-1 h-1.5" />
                    )}
                    {f.status === 'done' && (
                      <p className="text-xs text-green-600">Uploaded</p>
                    )}
                    {f.status === 'error' && (
                      <p className="text-xs text-destructive">{f.error}</p>
                    )}
                  </div>
                  {f.status !== 'uploading' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeFile(idx)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add More
              </Button>
            </div>
          )}

          {/* Hidden file inputs */}
          {/* Explicit MIME types instead of image/* so iOS auto-converts HEIC → JPEG */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />
          <input
            ref={cameraImageRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />
          <input
            ref={cameraVideoRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            capture="environment"
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />

          {/* Camera buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => cameraImageRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="mr-1.5 h-4 w-4" />
              Take Photo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => cameraVideoRef.current?.click()}
              disabled={uploading}
            >
              <Video className="mr-1.5 h-4 w-4" />
              Record Video
            </Button>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="upload-title">Title (optional)</Label>
            <Input
              id="upload-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your content a title"
              disabled={uploading}
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as typeof status)}
              disabled={uploading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="portfolio">Public</SelectItem>
                <SelectItem value="exclusive">PPV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Coin price */}
          {status === 'exclusive' && (
            <div className="space-y-1.5">
              <Label htmlFor="upload-price">Coin Price</Label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="upload-price"
                  type="number"
                  min={0}
                  max={10000}
                  value={coinPrice}
                  onChange={(e) => setCoinPrice(Number(e.target.value))}
                  className="pl-9"
                  disabled={uploading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                ${(coinPrice * 0.1).toFixed(2)} USD equivalent
              </p>
            </div>
          )}

          {/* Upload button */}
          <Button
            onClick={allDone ? () => onOpenChange(false) : handleUpload}
            disabled={uploading || files.length === 0}
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:from-pink-600 hover:to-violet-600"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : allDone ? (
              'Done'
            ) : hasErrors ? (
              'Retry Failed'
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// Bulk Price Dialog
// ===========================================================================

function BulkPriceDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedCount: number;
  onConfirm: (price: number) => void;
}) {
  const [price, setPrice] = useState(0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Set Price</DialogTitle>
          <DialogDescription>
            Set the coin price for {selectedCount} selected item{selectedCount > 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number"
              min={0}
              max={10000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            ${(price * 0.1).toFixed(2)} USD equivalent per item
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => onConfirm(price)}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

