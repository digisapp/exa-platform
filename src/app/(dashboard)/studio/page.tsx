'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useContentData, ContentItem } from '@/hooks/useContentData';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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
  Heart as HeartIcon,
  X,
  Check,
  Eye,
  ChevronDown,
  TrendingUp,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMediaUrl(url: string): string {
  if (url.startsWith('http')) return url;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/portfolio/${url}`;
}

// Resolve MIME type from file extension when browser doesn't report it (common on iOS for videos)
function resolveFileType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const extMap: Record<string, string> = {
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  };
  return extMap[ext] || '';
}

// Model-facing labels for content_items.status. "exclusive" is always shown as
// "Pay to Unlock" ("Paid" where space is tight) — never "PPV"; most EXA models
// aren't from creator platforms and don't know the acronym.
const STATUS_OPTIONS = [
  { value: 'private', label: 'Private', description: 'Only you can see it' },
  { value: 'portfolio', label: 'Public', description: 'Free for everyone on your profile' },
  { value: 'exclusive', label: 'Pay to Unlock', description: 'Fans pay coins to unlock it' },
] as const;

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
    fetchItems,
    fetchStats,
    updateItem,
    deleteItem,
    bulkAction,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,
    setFilter,
    resetFilters,
  } = useContentData();

  // Refresh the grid without flipping the hook's page-level loading spinner
  const refreshData = useCallback(async () => {
    await Promise.all([fetchItems(), fetchStats()]);
  }, [fetchItems, fetchStats]);

  // Local UI state
  const [activeTab, setActiveTab] = useState('all');
  const [modelUsername, setModelUsername] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');

  // Dialogs
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ContentItem | null>(null);
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [bulkPpvOpen, setBulkPpvOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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

  // Search — the hook already debounces item fetches by 300ms
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      setFilter('search', value);
    },
    [setFilter],
  );

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ───── Hero header ───── */}
        <section
          className="relative overflow-hidden rounded-3xl border border-white/10 p-5 md:p-6 mb-6"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,105,180,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(0,191,255,0.12) 100%)",
          }}
        >
          <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-pink-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-cyan-500/25 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
                <span className="exa-gradient-text">My Studio</span>
              </h1>
              <p className="text-xs md:text-sm text-white/60 mt-1">
                Upload, manage, and monetize your content.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {modelUsername && (
                <Link
                  href={`/${modelUsername}`}
                  className="flex items-center gap-1.5 text-xs md:text-sm text-white/70 hover:text-white transition-colors px-3 md:px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">View profile</span>
                </Link>
              )}
              <Button
                onClick={() => setUploadOpen(true)}
                className="bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:from-pink-400 hover:to-violet-400 shadow-[0_0_16px_rgba(236,72,153,0.4)] border-0 rounded-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </div>
          </div>
        </section>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          /* Tabs */
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Unified toolbar: tabs + search on one row (mobile), everything inline on desktop */}
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="flex items-center gap-2">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                </TabsList>

                {activeTab === 'all' && (
                  <div className="relative min-w-0 flex-1 sm:hidden">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchInput}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="h-9 w-full pl-8 text-xs"
                    />
                  </div>
                )}
              </div>

              {activeTab === 'all' && (
                <div className="flex items-center gap-2">
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(v) => setFilter('status', v === 'all' ? null : v)}
                  >
                    <SelectTrigger className="h-9 min-w-0 flex-1 text-xs sm:w-[120px] sm:flex-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="portfolio">Public</SelectItem>
                      <SelectItem value="exclusive">Paid</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.media_type || 'all'}
                    onValueChange={(v) => setFilter('media_type', v === 'all' ? null : v)}
                  >
                    <SelectTrigger className="h-9 min-w-0 flex-1 text-xs sm:w-[110px] sm:flex-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="image">Photos</SelectItem>
                      <SelectItem value="video">Videos</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative hidden sm:block">
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
                        like_count_desc: ['like_count', 'desc'],
                        coin_price_desc: ['coin_price', 'desc'],
                      };
                      const [sort, order] = map[v] || ['created_at', 'desc'];
                      setFilter('sort', sort);
                      setFilter('order', order as 'asc' | 'desc');
                    }}
                  >
                    <SelectTrigger className="h-9 min-w-0 flex-1 text-xs sm:w-[120px] sm:flex-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at_desc">Newest</SelectItem>
                      <SelectItem value="created_at_asc">Oldest</SelectItem>
                      <SelectItem value="unlock_count_desc">Most Unlocks</SelectItem>
                      <SelectItem value="like_count_desc">Most Liked</SelectItem>
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
                onClearFilters={() => {
                  resetFilters();
                  setSearchInput('');
                }}
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
                onBulkPPV={() => setBulkPpvOpen(true)}
                onBulkDelete={() => setBulkDeleteOpen(true)}
              />
            </TabsContent>

            <TabsContent value="stats">
              <StatsTab stats={stats} items={items} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Upload Dialog */}
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} refreshData={refreshData} />

      {/* Edit Item Dialog */}
      {editItem && (
        <ItemEditDialog
          item={editItem}
          open={!!editItem}
          onOpenChange={(open) => {
            if (!open) setEditItem(null);
          }}
          updateItem={updateItem}
          onRequestDelete={() => {
            setDeleteConfirmItem(editItem);
            setEditItem(null);
          }}
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
          bulkAction('update_price', { coin_price: price });
          setBulkPriceOpen(false);
        }}
      />

      {/* Bulk Pay-to-Unlock Dialog — making items paid requires a price, otherwise they're invisible to fans */}
      <BulkPriceDialog
        open={bulkPpvOpen}
        onOpenChange={setBulkPpvOpen}
        selectedCount={selectedIds.size}
        title="Set Unlock Price"
        description={`Set the unlock price for ${selectedIds.size} selected item${selectedIds.size > 1 ? 's' : ''}. Fans will see a blurred preview on your profile until they pay to unlock.`}
        onConfirm={(price) => {
          bulkAction('update_status', { status: 'exclusive', coin_price: price });
          setBulkPpvOpen(false);
        }}
      />

      {/* Bulk Delete Confirm */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected item{selectedIds.size > 1 ? 's' : ''}?
              The files will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                bulkAction('delete');
                setBulkDeleteOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

// ===========================================================================
// ALL TAB
// ===========================================================================

function AllTab({
  items,
  filters,
  onClearFilters,
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
  onBulkPPV,
  onBulkDelete,
}: {
  items: ContentItem[];
  filters: { status: string | null; media_type: string | null; search: string; sort: string; order: string };
  onClearFilters: () => void;
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
  onBulkPPV: () => void;
  onBulkDelete: () => void;
}) {
  const hasSelection = selectedIds.size > 0;
  const filtersActive = !!(filters.status || filters.media_type || filters.search);

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
              <DropdownMenuItem onClick={() => bulkAction('update_status', { status: 'private' })}>
                Private
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkAction('update_status', { status: 'portfolio' })}>
                Public
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onBulkPPV}>
                Pay to Unlock…
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
            onClick={onBulkDelete}
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
            {filtersActive ? (
              <>
                <h3 className="mb-2 text-lg font-semibold">No items match your filters</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Try a different search or clear the filters to see everything.
                </p>
                <Button variant="outline" onClick={onClearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
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
      className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
      role="button"
      tabIndex={0}
      aria-label={`Edit ${item.title || 'content item'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit();
        }
      }}
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

      {/* Unlock count + hearts — bottom left */}
      {((item.status === 'exclusive' && item.unlock_count > 0) || item.like_count > 0) && (
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1">
          {item.status === 'exclusive' && item.unlock_count > 0 && (
            <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
              {item.unlock_count} unlock{item.unlock_count === 1 ? '' : 's'}
            </span>
          )}
          {item.like_count > 0 && (
            <span className="flex items-center gap-0.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
              <HeartIcon className="h-2.5 w-2.5 fill-pink-500 text-pink-500" />
              {item.like_count}
            </span>
          )}
        </div>
      )}


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
  onRequestDelete,
}: {
  item: ContentItem;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  updateItem: (id: string, data: Partial<ContentItem>) => Promise<ContentItem | null>;
  onRequestDelete: () => void;
}) {
  const [title, setTitle] = useState(item.title || '');
  const [description, setDescription] = useState(item.description || '');
  const [status, setStatus] = useState(item.status);
  const [coinPrice, setCoinPrice] = useState(item.coin_price);
  const [saving, setSaving] = useState(false);
  const mediaUrl = getMediaUrl(item.media_url);

  const handleSave = async () => {
    if (status === 'exclusive' && coinPrice < 1) {
      toast.error('Paid content needs a price of at least 1 coin — fans never see 0-coin items.');
      return;
    }
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
            <Select
              value={status}
              onValueChange={(v) => {
                const next = v as ContentItem['status'];
                setStatus(next);
                if (next === 'exclusive' && coinPrice < 1) setCoinPrice(100);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {STATUS_OPTIONS.find((o) => o.value === status)?.description}
            </p>
          </div>

          {/* Coin Price */}
          {status === 'exclusive' && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-price">Unlock Price</Label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="edit-price"
                  type="number"
                  min={1}
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
            <Button variant="destructive" onClick={onRequestDelete}>
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
      {/* ───── Summary cards ───── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 hover:border-emerald-500/50 transition-all">
          <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Total revenue</p>
          <p className="mt-1 text-2xl md:text-3xl font-bold text-white">{stats.total_revenue.toLocaleString()}</p>
          <p className="text-[11px] text-emerald-300/80">${(stats.total_revenue * 0.1).toFixed(2)}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-pink-500/25 bg-gradient-to-br from-pink-500/10 to-pink-500/5 p-4 hover:border-pink-500/50 transition-all">
          <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Total unlocks</p>
          <p className="mt-1 text-2xl md:text-3xl font-bold text-white">{stats.total_unlocks.toLocaleString()}</p>
          <p className="text-[11px] text-pink-300/80">across all items</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-4 hover:border-cyan-500/50 transition-all">
          <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Total items</p>
          <p className="mt-1 text-2xl md:text-3xl font-bold text-white">{stats.total_items.toLocaleString()}</p>
          <p className="text-[11px] text-cyan-300/80">in your studio</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-violet-500/5 p-4 hover:border-violet-500/50 transition-all">
          <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Paid items</p>
          <p className="mt-1 text-2xl md:text-3xl font-bold text-white">{stats.exclusive_count.toLocaleString()}</p>
          <p className="text-[11px] text-violet-300/80">premium</p>
        </div>
      </div>

      {/* ───── Top performing items ───── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
        <header className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-pink-400" />
              Top performing items
            </h3>
            <p className="text-xs text-white/50 mt-0.5">Your top 5 items by unlocks</p>
          </div>
        </header>
        <div className="p-4">
          {stats.top_items.length === 0 ? (
            <p className="text-sm text-white/50 text-center py-6">
              No unlock data yet. Paid items will appear here.
            </p>
          ) : (
            <div className="space-y-2">
              {stats.top_items.map((topItem, idx) => {
                const fullItem = items.find((i) => i.id === topItem.id);
                const mediaUrl = fullItem ? getMediaUrl(fullItem.media_url) : null;
                const revenue = (topItem.coin_price || 0) * (topItem.unlock_count || 0);

                return (
                  <div
                    key={topItem.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <span
                      className={`w-5 text-sm font-bold text-center shrink-0 ${
                        idx === 0
                          ? "text-amber-400"
                          : idx === 1
                            ? "text-white/70"
                            : idx === 2
                              ? "text-amber-700"
                              : "text-white/40"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
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
                      <p className="text-sm font-medium text-white truncate">
                        {topItem.title || 'Untitled'}
                      </p>
                      <p className="text-[11px] text-white/50">
                        {topItem.unlock_count} unlocks
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
                        {revenue.toLocaleString()}c
                      </p>
                      <p className="text-[11px] text-white/40">
                        ${(revenue * 0.1).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ───── Content breakdown ───── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
        <header className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            Content breakdown
          </h3>
        </header>
        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="flex items-center gap-2 text-white/80">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                Public
              </span>
              <span className="text-white/60">
                {stats.portfolio_count} <span className="text-white/40">({portfolioPct}%)</span>
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                style={{ width: `${portfolioPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="flex items-center gap-2 text-white/80">
                <span className="h-2.5 w-2.5 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.7)]" />
                Paid
              </span>
              <span className="text-white/60">
                {stats.exclusive_count} <span className="text-white/40">({exclusivePct}%)</span>
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 shadow-[0_0_12px_rgba(236,72,153,0.5)]"
                style={{ width: `${exclusivePct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="flex items-center gap-2 text-white/80">
                <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
                Private
              </span>
              <span className="text-white/60">
                {stats.private_count} <span className="text-white/40">({privatePct}%)</span>
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-white/30" style={{ width: `${privatePct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Upload Dialog — files upload immediately on selection (saved as Private),
// then the model picks who can see them (and a price) in the same dialog.
// ===========================================================================

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  itemId?: string; // content_items.id once the row is created
}

const UPLOAD_CONCURRENCY = 3;

// PUT with real upload progress — fetch() can't report request-body progress,
// which left the bar frozen for the whole transfer on large videos.
function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress: (fraction: number) => void,
): Promise<{ ok: boolean; status: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status });
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}

// Capture a heavily blurred teaser frame from a local video file. The frame is
// decoded in the uploader's browser (no server-side video processing): seek
// ~10% in, draw through a tiny canvas so the upscale acts as a strong blur on
// every browser (no ctx.filter dependency), return a 512px JPEG. Resolves null
// on any failure — the preview is best-effort and locked cards fall back to a
// placeholder without it.
function captureBlurredVideoPreview(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let settled = false;
    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    const timer = setTimeout(() => finish(null), 8000);
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.onerror = () => finish(null);
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 0) * 0.1);
    };
    video.onseeked = () => {
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return finish(null);
        const tiny = document.createElement('canvas');
        tiny.width = 24;
        tiny.height = Math.max(1, Math.round((h / w) * 24));
        tiny.getContext('2d')!.drawImage(video, 0, 0, tiny.width, tiny.height);
        const out = document.createElement('canvas');
        out.width = 512;
        out.height = Math.max(1, Math.round((h / w) * 512));
        const ctx = out.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(tiny, 0, 0, out.width, out.height);
        out.toBlob((blob) => finish(blob), 'image/jpeg', 0.6);
      } catch {
        finish(null);
      }
    };
    video.src = url;
    video.load();
  });
}

function UploadDialog({
  open,
  onOpenChange,
  refreshData,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  refreshData: () => Promise<void>;
}) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [visibility, setVisibility] = useState<'private' | 'portfolio' | 'exclusive'>('private');
  const [coinPrice, setCoinPrice] = useState(100);
  const [finishing, setFinishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraImageRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLInputElement>(null);
  const idCounterRef = useRef(0);
  const startedRef = useRef<Set<string>>(new Set());
  const activeRef = useRef(0);

  // Cleanup previews on unmount only. Keying this on [files] revoked blob URLs
  // that were still displayed every time progress/status updates replaced the array.
  const filesRef = useRef<UploadFile[]>([]);
  filesRef.current = files;
  useEffect(() => {
    return () => {
      filesRef.current.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
    };
  }, []);

  // Reset on close. Items were created row-by-row via direct fetches (not the
  // hook), so the grid only learns about them from this single refresh.
  useEffect(() => {
    if (!open) {
      const uploadedAny = filesRef.current.some((f) => f.itemId);
      filesRef.current.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      setFiles([]);
      setVisibility('private');
      setCoinPrice(100);
      setFinishing(false);
      startedRef.current = new Set();
      activeRef.current = 0;
      if (uploadedAny) void refreshData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
  const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
  const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
  const MAX_FILES = 50; // matches the bulk endpoint's 50-id cap

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

      const resolvedType = resolveFileType(file);
      const isImage = ALLOWED_IMAGE_TYPES.includes(resolvedType);
      const isVideo = ALLOWED_VIDEO_TYPES.includes(resolvedType);

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
        id: `f${idCounterRef.current++}`,
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

  // Files are removable only before their upload starts (or after it fails) —
  // a 'done' tile is already saved to the Studio.
  const removeFile = (id: string) => {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const updateFile = (id: string, patch: Partial<UploadFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  // Videos get their blurred teaser frame captured client-side and uploaded to
  // the public portfolio bucket (previews are the public teaser even for paid
  // items — same as server-generated image previews). Best-effort: null on
  // failure and the item simply has no preview.
  const uploadVideoPreviewFrame = async (file: File): Promise<string | null> => {
    try {
      const blob = await captureBlurredVideoPreview(file);
      if (!blob) return null;
      const signedRes = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'video-preview.jpg',
          fileType: 'image/jpeg',
          fileSize: blob.size,
          exclusive: false,
        }),
      });
      if (!signedRes.ok) return null;
      const { signedUrl, storagePath } = await signedRes.json();
      const put = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });
      return put.ok ? storagePath : null;
    } catch {
      return null;
    }
  };

  const uploadSingleFile = async (uploadFile: UploadFile): Promise<void> => {
    const { file, id } = uploadFile;
    const fileType = resolveFileType(file);
    updateFile(id, { status: 'uploading', progress: 10 });

    try {
      // Step 1: Get signed URL. Everything starts in the public portfolio
      // bucket as a Private item; if the model picks Pay to Unlock in the next
      // step, the bulk status route moves the object into the private
      // content-media bucket (syncContentItemStorageForStatus).
      const signedRes = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType,
          fileSize: file.size,
          title: file.name.split('.')[0],
          exclusive: false,
        }),
      });

      if (!signedRes.ok) {
        const err = await signedRes.json();
        throw new Error(err.error || 'Failed to get upload URL');
      }

      const { signedUrl, storagePath } = await signedRes.json();

      // Step 2: Upload to storage directly from browser (bypasses Vercel size
      // limit), streaming real transfer progress into the tile's bar
      const uploadRes = await putWithProgress(signedUrl, file, fileType, (fraction) => {
        updateFile(id, { progress: 10 + Math.round(fraction * 75) });
      });

      if (!uploadRes.ok) {
        throw new Error(`Storage upload failed (${uploadRes.status})`);
      }

      updateFile(id, { progress: 90 });

      // Step 3: videos get a blurred teaser frame (images get theirs generated
      // server-side when the item is created)
      const isVideo = fileType.startsWith('video/');
      const previewPath = isVideo ? await uploadVideoPreviewFrame(file) : null;

      // Step 4: Create the content item (Private until the model chooses)
      const createRes = await fetch('/api/content-hub/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_url: storagePath,
          media_type: isVideo ? 'video' : 'image',
          title: null,
          status: 'private',
          coin_price: 0,
          ...(previewPath ? { preview_url: previewPath } : {}),
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || 'Failed to save item');
      }

      const { item } = await createRes.json();
      updateFile(id, { status: 'done', progress: 100, itemId: item.id });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      updateFile(id, { status: 'error', error: message, progress: 0 });
    }
  };

  // Uploads start on their own as files are picked; the pool keeps big camera
  // roll batches moving without saturating the connection. startedRef makes the
  // pump idempotent across re-renders.
  useEffect(() => {
    if (!open) return;
    const pump = () => {
      while (activeRef.current < UPLOAD_CONCURRENCY) {
        const next = filesRef.current.find(
          (f) => f.status === 'pending' && !startedRef.current.has(f.id),
        );
        if (!next) break;
        startedRef.current.add(next.id);
        activeRef.current += 1;
        void uploadSingleFile(next).finally(() => {
          activeRef.current -= 1;
          pump();
        });
      }
    };
    pump();
  });

  const retryFailed = () => {
    filesRef.current.forEach((f) => {
      if (f.status === 'error') startedRef.current.delete(f.id);
    });
    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'error' ? { ...f, status: 'pending' as const, error: undefined } : f,
      ),
    );
  };

  const doneCount = files.filter((f) => f.status === 'done').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const inFlightCount = files.length - doneCount - errorCount;
  const allSettled = files.length > 0 && inFlightCount === 0;

  const finish = async () => {
    const ids = filesRef.current.filter((f) => f.itemId).map((f) => f.itemId!);
    if (ids.length === 0) {
      onOpenChange(false);
      return;
    }
    if (visibility === 'exclusive' && coinPrice < 1) {
      toast.error('Paid content needs a price of at least 1 coin — fans never see 0-coin items.');
      return;
    }
    // Uploads are already Private rows — only Public / Pay to Unlock need a flip
    if (visibility === 'private') {
      toast.success(`${ids.length} item${ids.length > 1 ? 's' : ''} saved as Private`);
      onOpenChange(false);
      return;
    }
    setFinishing(true);
    try {
      const res = await fetch('/api/content-hub/items/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids,
          action: 'update_status',
          status: visibility,
          ...(visibility === 'exclusive' ? { coin_price: coinPrice } : {}),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update items');
      }
      toast.success(
        visibility === 'portfolio'
          ? `${ids.length} item${ids.length > 1 ? 's' : ''} published to your profile`
          : `${ids.length} item${ids.length > 1 ? 's' : ''} set to unlock for ${coinPrice} coins`,
      );
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update items');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={inFlightCount > 0 || finishing ? undefined : onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Content</DialogTitle>
          <DialogDescription>
            Photos and videos upload right away — then choose who can see them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File picker area */}
          {files.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">Tap to select photos &amp; videos</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Up to {MAX_FILES} at a time · Images up to 50MB · Videos up to 500MB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className={cn(
                      'relative aspect-square overflow-hidden rounded-lg bg-muted',
                      f.status === 'error' && 'ring-2 ring-destructive',
                    )}
                  >
                    {f.file.type.startsWith('video/') ? (
                      <video
                        src={f.preview}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image src={f.preview} alt="" fill className="object-cover" sizes="120px" />
                    )}
                    {f.file.type.startsWith('video/') && (
                      <Video className="absolute bottom-1 left-1 h-3.5 w-3.5 text-white drop-shadow" />
                    )}
                    {f.status === 'uploading' && (
                      <div className="absolute inset-0 flex items-end bg-black/40 p-1.5">
                        <Progress value={f.progress} className="h-1 w-full" />
                      </div>
                    )}
                    {f.status === 'done' && (
                      <span className="absolute right-1 top-1 rounded-full bg-green-500 p-0.5">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    )}
                    {(f.status === 'pending' || f.status === 'error') && (
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                        onClick={() => removeFile(f.id)}
                        aria-label="Remove file"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {files.length < MAX_FILES && (
                  <button
                    type="button"
                    className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={finishing}
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-[10px]">Add</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {inFlightCount > 0 ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading… {doneCount}/{files.length}
                  </>
                ) : (
                  <>
                    {doneCount > 0 && <span className="text-green-500">{doneCount} uploaded</span>}
                    {errorCount > 0 && (
                      <>
                        <span className="text-destructive">{errorCount} failed</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={retryFailed}
                        >
                          Retry
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
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
          {/* capture="user" defaults to the front camera (models mostly shoot themselves);
              the native camera UI still allows flipping */}
          <input
            ref={cameraImageRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />
          <input
            ref={cameraVideoRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            capture="user"
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />

          {/* Camera buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => cameraImageRef.current?.click()}
              disabled={finishing}
            >
              <Camera className="mr-1.5 h-4 w-4" />
              Take Photo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => cameraVideoRef.current?.click()}
              disabled={finishing}
            >
              <Video className="mr-1.5 h-4 w-4" />
              Record Video
            </Button>
          </div>

          {/* Visibility — pick while uploads run; applied when Finish is tapped */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Who can see {files.length > 1 ? 'these' : 'it'}?</Label>
              {STATUS_OPTIONS.map((o) => {
                const selected = visibility === o.value;
                const OptionIcon =
                  o.value === 'private' ? Lock : o.value === 'portfolio' ? Eye : Coins;
                return (
                  <button
                    key={o.value}
                    type="button"
                    disabled={finishing}
                    onClick={() => setVisibility(o.value)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                      selected ? 'border-pink-500 bg-pink-500/10' : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <OptionIcon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        selected ? 'text-pink-500' : 'text-muted-foreground',
                      )}
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{o.label}</span>
                      <span className="block text-xs text-muted-foreground">{o.description}</span>
                    </span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-pink-500" />}
                  </button>
                );
              })}

              {visibility === 'exclusive' && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="upload-price">Unlock Price</Label>
                  <div className="flex gap-1.5">
                    {[25, 50, 100, 250].map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={finishing}
                        onClick={() => setCoinPrice(p)}
                        className={cn(
                          'flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                          coinPrice === p
                            ? 'border-pink-500 bg-pink-500/10 text-pink-500'
                            : 'border-border text-muted-foreground hover:bg-muted/50',
                        )}
                      >
                        {p} coins
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="upload-price"
                      type="number"
                      min={1}
                      max={10000}
                      value={coinPrice}
                      onChange={(e) => setCoinPrice(Number(e.target.value))}
                      className="pl-9"
                      disabled={finishing}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ${(coinPrice * 0.1).toFixed(2)} USD equivalent per item
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Finish button */}
          {files.length > 0 && (
            <Button
              onClick={finish}
              disabled={!allSettled || doneCount === 0 || finishing}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:from-pink-600 hover:to-violet-600"
            >
              {inFlightCount > 0 || finishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {finishing ? 'Saving…' : `Uploading… ${doneCount}/${files.length}`}
                </>
              ) : visibility === 'private' ? (
                `Save ${doneCount} as Private`
              ) : visibility === 'portfolio' ? (
                `Publish ${doneCount} to Profile`
              ) : (
                'Set Price & Finish'
              )}
            </Button>
          )}
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
  title = 'Set Price',
  description,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedCount: number;
  onConfirm: (price: number) => void;
  title?: string;
  description?: string;
}) {
  const [price, setPrice] = useState(100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ||
              `Set the coin price for ${selectedCount} selected item${selectedCount > 1 ? 's' : ''}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number"
              min={1}
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
            <Button className="flex-1" disabled={price < 1} onClick={() => onConfirm(price)}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

