"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Plus,
  Search,
  X,
  GripVertical,
  Users,
  Calendar,
  Clock,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  UserPlus,
  Loader2,
  Copy,
  AlertTriangle,
  FileText,
  Pencil,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Event {
  id: string;
  name: string;
  short_name: string;
  start_date: string | null;
  end_date: string | null;
  year: number;
  status: string | null;
}

interface ModelInfo {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  height: string | null;
  instagram_followers: number | null;
}

interface LineupModel {
  id: string;
  model_id: string;
  walk_order: number;
  outfit_notes: string | null;
  status: string;
  model: ModelInfo;
}

interface Lineup {
  id: string;
  event_id: string;
  designer_name: string | null;
  name: string;
  show_date: string | null;
  show_time: string | null;
  show_order: number;
  status: string;
  notes: string | null;
  models: LineupModel[];
}

// ─── Sortable Model Card with Inline Outfit Notes ────────────────────────────

function SortableModelCard({
  lineupModel,
  onRemove,
  walkNumber,
  onUpdateNotes,
  conflictWarning,
}: {
  lineupModel: LineupModel;
  onRemove: () => void;
  walkNumber: number;
  onUpdateNotes: (notes: string) => void;
  conflictWarning: string | null;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(lineupModel.outfit_notes || "");
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lineupModel.model_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const m = lineupModel.model;

  function saveNotes() {
    onUpdateNotes(notesValue);
    setEditingNotes(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg bg-card border hover:border-pink-500/30 transition-colors group"
    >
      <div className="flex items-center gap-3 p-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-xs font-mono text-muted-foreground w-6 text-center shrink-0">
          #{walkNumber}
        </span>
        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0">
          {m.profile_photo_url ? (
            <Image
              src={m.profile_photo_url}
              alt={m.first_name || ""}
              fill
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
              {m.first_name?.[0]}
              {m.last_name?.[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {m.first_name} {m.last_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            @{m.username}
            {m.height ? ` · ${m.height}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {conflictWarning && (
            <span title={conflictWarning} className="text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          )}
          {/* Outfit notes toggle */}
          <button
            onClick={() => {
              setEditingNotes(!editingNotes);
              setNotesValue(lineupModel.outfit_notes || "");
            }}
            className={`text-muted-foreground hover:text-foreground transition-all shrink-0 ${
              lineupModel.outfit_notes ? "opacity-100 text-pink-500" : "opacity-0 group-hover:opacity-100"
            }`}
            title="Outfit notes"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Inline outfit notes */}
      {(editingNotes || lineupModel.outfit_notes) && (
        <div className="px-2 pb-2 pl-[72px]">
          {editingNotes ? (
            <div className="flex gap-1">
              <Textarea
                ref={notesRef}
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Outfit description, look number, etc."
                className="text-xs min-h-[52px] resize-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveNotes();
                  }
                  if (e.key === "Escape") setEditingNotes(false);
                }}
              />
              <div className="flex flex-col gap-1">
                <Button size="sm" className="h-6 text-xs px-2" onClick={saveNotes}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-2"
                  onClick={() => setEditingNotes(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditingNotes(true);
                setNotesValue(lineupModel.outfit_notes || "");
              }}
              className="text-xs text-muted-foreground italic hover:text-foreground transition-colors"
            >
              {lineupModel.outfit_notes}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Model Pool Card with Hover Tooltip ──────────────────────────────────────

function ModelPoolCard({
  model,
  assignedCount,
  isSelected,
  onToggle,
}: {
  model: ModelInfo;
  assignedCount: number;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-colors text-left ${
          isSelected
            ? "border-pink-500 bg-pink-500/10"
            : "border-border hover:border-pink-500/30"
        }`}
      >
        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0">
          {model.profile_photo_url ? (
            <Image
              src={model.profile_photo_url}
              alt={model.first_name || ""}
              fill
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
              {model.first_name?.[0]}
              {model.last_name?.[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {model.first_name} {model.last_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            @{model.username}
            {model.height ? ` · ${model.height}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {assignedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {assignedCount}x
            </Badge>
          )}
          {isSelected && <Check className="h-4 w-4 text-pink-500" />}
        </div>
      </button>

      {/* Hover tooltip with larger photo */}
      {showTooltip && (
        <div className="absolute left-full ml-2 top-0 z-50 w-56 bg-popover border rounded-lg shadow-lg p-3 pointer-events-none">
          <div className="flex gap-3">
            <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
              {model.profile_photo_url ? (
                <Image
                  src={model.profile_photo_url}
                  alt={model.first_name || ""}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-lg text-muted-foreground">
                  {model.first_name?.[0]}
                  {model.last_name?.[0]}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {model.first_name} {model.last_name}
              </p>
              <p className="text-xs text-muted-foreground">@{model.username}</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {model.height && (
              <>
                <span className="text-muted-foreground">Height</span>
                <span>{model.height}</span>
              </>
            )}
            {model.instagram_followers && (
              <>
                <span className="text-muted-foreground">Followers</span>
                <span>{model.instagram_followers.toLocaleString()}</span>
              </>
            )}
            {assignedCount > 0 && (
              <>
                <span className="text-muted-foreground">Walks</span>
                <span>{assignedCount} lineup{assignedCount > 1 ? "s" : ""}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Designer Lineup Panel ───────────────────────────────────────────────────

function DesignerLineupPanel({
  lineup,
  isExpanded,
  onToggle,
  onRemoveModel,
  onReorder,
  onDelete,
  onExportPdf,
  onUpdateStatus,
  onUpdateOutfitNotes,
  onCopyLineup,
  modelConflicts,
}: {
  lineup: Lineup;
  isExpanded: boolean;
  onToggle: () => void;
  onRemoveModel: (lineupId: string, modelId: string) => void;
  onReorder: (lineupId: string, modelIds: string[]) => void;
  onDelete: (lineupId: string) => void;
  onExportPdf: (lineupId: string) => void;
  onUpdateStatus: (lineupId: string, status: string) => void;
  onUpdateOutfitNotes: (lineupId: string, modelId: string, notes: string) => void;
  onCopyLineup: (lineup: Lineup) => void;
  modelConflicts: Record<string, string>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const modelIds = lineup.models.map((m) => m.model_id);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = modelIds.indexOf(active.id as string);
    const newIndex = modelIds.indexOf(over.id as string);
    const newOrder = arrayMove(modelIds, oldIndex, newIndex);
    onReorder(lineup.id, newOrder);
  }

  const activeModel = activeId
    ? lineup.models.find((m) => m.model_id === activeId)
    : null;

  const displayName = lineup.designer_name || "Designer";

  const statusColor =
    lineup.status === "confirmed"
      ? "bg-green-500/10 text-green-500"
      : lineup.status === "completed"
      ? "bg-blue-500/10 text-blue-500"
      : "bg-yellow-500/10 text-yellow-500";

  return (
    <Card className="border-border">
      <CardHeader
        className="cursor-pointer py-3 px-4"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{displayName}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {lineup.name}
                {lineup.show_date ? ` · ${new Date(lineup.show_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}` : ""}
                {lineup.show_time ? ` ${lineup.show_time}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={statusColor}>{lineup.status}</Badge>
            <Badge variant="outline">
              <Users className="h-3 w-3 mr-1" />
              {lineup.models.length}
            </Badge>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 px-4 pb-4 space-y-3">
          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={lineup.status} onValueChange={(v) => onUpdateStatus(lineup.id, v)}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onExportPdf(lineup.id);
              }}
            >
              <Download className="h-3 w-3 mr-1" /> PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onCopyLineup(lineup);
              }}
            >
              <Copy className="h-3 w-3 mr-1" /> Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete ${displayName}'s lineup?`)) {
                  onDelete(lineup.id);
                }
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>

          {/* Model list with drag-and-drop */}
          {lineup.models.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No models assigned. Select models from the pool and click &quot;Add to Lineup&quot;.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={modelIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {lineup.models.map((lm, i) => (
                    <SortableModelCard
                      key={lm.model_id}
                      lineupModel={lm}
                      walkNumber={i + 1}
                      onRemove={() => onRemoveModel(lineup.id, lm.model_id)}
                      onUpdateNotes={(notes) => onUpdateOutfitNotes(lineup.id, lm.model_id, notes)}
                      conflictWarning={modelConflicts[lm.model_id] || null}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeModel ? (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-card border border-pink-500 shadow-lg">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0">
                      {activeModel.model.profile_photo_url ? (
                        <Image
                          src={activeModel.model.profile_photo_url}
                          alt={activeModel.model.first_name || ""}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs">
                          {activeModel.model.first_name?.[0]}
                          {activeModel.model.last_name?.[0]}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium">
                      {activeModel.model.first_name} {activeModel.model.last_name}
                    </p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminLineupsPage() {
  // State
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [allModels, setAllModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);

  // UI state
  const [modelSearch, setModelSearch] = useState("");
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
  const [expandedLineupId, setExpandedLineupId] = useState<string | null>(null);
  const [showAddDesigner, setShowAddDesigner] = useState(false);
  const [filterAssigned, setFilterAssigned] = useState<"all" | "unassigned" | "assigned" | "event">("all");
  const [eventModelIds, setEventModelIds] = useState<Set<string>>(new Set());

  // New lineup form
  const [newLineupDesignerName, setNewLineupDesignerName] = useState("");
  const [newLineupName, setNewLineupName] = useState("");
  const [newLineupDate, setNewLineupDate] = useState("");
  const [newLineupTime, setNewLineupTime] = useState("");
  const [savingLineup, setSavingLineup] = useState(false);

  // Copy lineup dialog
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copySourceLineup, setCopySourceLineup] = useState<Lineup | null>(null);
  const [copyTargetDesignerName, setCopyTargetDesignerName] = useState("");
  const [copyTargetName, setCopyTargetName] = useState("");

  const supabase = createClient();

  // ─── Data Fetching ───────────────────────────────────────────────────────

  useEffect(() => {
    async function loadEvents() {
      const { data } = await supabase
        .from("events")
        .select("id, name, short_name, start_date, end_date, year, status")
        .order("start_date", { ascending: false });
      setEvents(data || []);
      if (data?.length && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
      setLoading(false);
    }
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    loadLineups();
    loadEventModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  useEffect(() => {
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLineups() {
    const res = await fetch(`/api/admin/lineups?event_id=${selectedEventId}`);
    if (res.ok) {
      const data = await res.json();
      setLineups(data);
      if (data.length > 0 && !expandedLineupId) {
        setExpandedLineupId(data[0].id);
      }
    }
  }

  async function loadModels() {
    setLoadingModels(true);
    const { data } = await supabase
      .from("models")
      .select("id, username, first_name, last_name, profile_photo_url, height, instagram_followers")
      .eq("is_approved", true)
      .not("user_id", "is", null)
      .order("first_name", { ascending: true });
    setAllModels(data || []);
    setLoadingModels(false);
  }

  async function loadEventModels() {
    if (!selectedEventId) return;
    // Find models who applied to gigs linked to this event (accepted status)
    const { data: gigs } = await supabase
      .from("gigs")
      .select("id")
      .eq("event_id", selectedEventId);

    if (!gigs?.length) {
      setEventModelIds(new Set());
      return;
    }

    const gigIds = gigs.map((g) => g.id);
    const { data: apps } = await supabase
      .from("gig_applications")
      .select("model_id")
      .in("gig_id", gigIds)
      .eq("status", "accepted");

    setEventModelIds(new Set((apps || []).map((a) => a.model_id)));
  }

  // ─── Computed ────────────────────────────────────────────────────────────

  const modelAssignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    lineups.forEach((l) =>
      l.models.forEach((m) => {
        counts[m.model_id] = (counts[m.model_id] || 0) + 1;
      })
    );
    return counts;
  }, [lineups]);

  // Conflict detection: warn if a model has 4+ walks on the same day
  const modelConflictsByLineup = useMemo(() => {
    // Build per-day walk counts for each model
    const dayWalks: Record<string, Record<string, string[]>> = {}; // modelId -> date -> designerNames[]
    lineups.forEach((l) => {
      const day = l.show_date || "unscheduled";
      const dn = l.designer_name || "Designer";
      l.models.forEach((m) => {
        if (!dayWalks[m.model_id]) dayWalks[m.model_id] = {};
        if (!dayWalks[m.model_id][day]) dayWalks[m.model_id][day] = [];
        dayWalks[m.model_id][day].push(dn);
      });
    });

    // For each lineup, compute conflict warnings for its models
    const result: Record<string, Record<string, string>> = {}; // lineupId -> modelId -> warning
    lineups.forEach((l) => {
      const day = l.show_date || "unscheduled";
      const conflicts: Record<string, string> = {};
      l.models.forEach((m) => {
        const walks = dayWalks[m.model_id]?.[day];
        if (walks && walks.length >= 4) {
          conflicts[m.model_id] = `${walks.length} walks on ${day === "unscheduled" ? "unscheduled day" : new Date(day + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}: ${walks.join(", ")}`;
        }
      });
      result[l.id] = conflicts;
    });
    return result;
  }, [lineups]);

  const filteredModels = useMemo(() => {
    let list = allModels;
    if (modelSearch) {
      const q = modelSearch.toLowerCase();
      list = list.filter(
        (m) =>
          m.first_name?.toLowerCase().includes(q) ||
          m.last_name?.toLowerCase().includes(q) ||
          m.username?.toLowerCase().includes(q)
      );
    }
    if (filterAssigned === "unassigned") {
      list = list.filter((m) => !modelAssignmentCounts[m.id]);
    } else if (filterAssigned === "assigned") {
      list = list.filter((m) => !!modelAssignmentCounts[m.id]);
    } else if (filterAssigned === "event") {
      list = list.filter((m) => eventModelIds.has(m.id));
    }
    return list;
  }, [allModels, modelSearch, filterAssigned, modelAssignmentCounts, eventModelIds]);

  const dayOverview = useMemo(() => {
    const days: Record<string, { lineups: Lineup[]; totalModels: number }> = {};
    lineups.forEach((l) => {
      const key = l.show_date || "Unscheduled";
      if (!days[key]) days[key] = { lineups: [], totalModels: 0 };
      days[key].lineups.push(l);
      days[key].totalModels += l.models.length;
    });
    return days;
  }, [lineups]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  async function addDesignerLineup() {
    if (!newLineupDesignerName || !newLineupName) return;
    setSavingLineup(true);

    const res = await fetch("/api/admin/lineups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: selectedEventId,
        designer_name: newLineupDesignerName.trim(),
        name: newLineupName,
        show_date: newLineupDate || null,
        show_time: newLineupTime || null,
        show_order: lineups.length,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setLineups((prev) => [...prev, data]);
      setExpandedLineupId(data.id);
      setShowAddDesigner(false);
      setNewLineupDesignerName("");
      setNewLineupName("");
      setNewLineupDate("");
      setNewLineupTime("");
      toast.success("Designer lineup created");
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create lineup");
    }
    setSavingLineup(false);
  }

  async function addModelsToLineup() {
    if (!expandedLineupId || selectedModelIds.size === 0) return;
    const res = await fetch(`/api/admin/lineups/${expandedLineupId}/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_ids: Array.from(selectedModelIds) }),
    });

    if (res.ok) {
      const newModels = await res.json();
      setLineups((prev) =>
        prev.map((l) =>
          l.id === expandedLineupId
            ? {
                ...l,
                models: [
                  ...l.models,
                  ...newModels.filter(
                    (nm: LineupModel) => !l.models.some((em) => em.model_id === nm.model_id)
                  ),
                ].sort((a, b) => a.walk_order - b.walk_order),
              }
            : l
        )
      );
      setSelectedModelIds(new Set());
      toast.success(`${newModels.length} model(s) added`);
    } else {
      toast.error("Failed to add models");
    }
  }

  async function removeModel(lineupId: string, modelId: string) {
    const res = await fetch(`/api/admin/lineups/${lineupId}/models`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_ids: [modelId] }),
    });

    if (res.ok) {
      setLineups((prev) =>
        prev.map((l) =>
          l.id === lineupId
            ? { ...l, models: l.models.filter((m) => m.model_id !== modelId) }
            : l
        )
      );
      toast.success("Model removed");
    }
  }

  const reorderModels = useCallback(
    async (lineupId: string, orderedModelIds: string[]) => {
      setLineups((prev) =>
        prev.map((l) => {
          if (l.id !== lineupId) return l;
          const modelMap = new Map(l.models.map((m) => [m.model_id, m]));
          const reordered = orderedModelIds
            .map((id, i) => {
              const m = modelMap.get(id);
              return m ? { ...m, walk_order: i } : null;
            })
            .filter(Boolean) as LineupModel[];
          return { ...l, models: reordered };
        })
      );

      await fetch(`/api/admin/lineups/${lineupId}/models`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordered_model_ids: orderedModelIds }),
      });
    },
    []
  );

  async function deleteLineup(lineupId: string) {
    const res = await fetch(`/api/admin/lineups/${lineupId}`, { method: "DELETE" });
    if (res.ok) {
      setLineups((prev) => prev.filter((l) => l.id !== lineupId));
      if (expandedLineupId === lineupId) setExpandedLineupId(null);
      toast.success("Lineup deleted");
    }
  }

  async function updateLineupStatus(lineupId: string, status: string) {
    const res = await fetch(`/api/admin/lineups/${lineupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setLineups((prev) =>
        prev.map((l) => (l.id === lineupId ? { ...l, status } : l))
      );
      toast.success(`Status updated to ${status}`);
    }
  }

  async function updateOutfitNotes(lineupId: string, modelId: string, notes: string) {
    // Optimistic update
    setLineups((prev) =>
      prev.map((l) =>
        l.id === lineupId
          ? {
              ...l,
              models: l.models.map((m) =>
                m.model_id === modelId ? { ...m, outfit_notes: notes || null } : m
              ),
            }
          : l
      )
    );

    await fetch(`/api/admin/lineups/${lineupId}/models/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: modelId, outfit_notes: notes }),
    });
  }

  async function exportPdf(lineupId: string) {
    const res = await fetch(`/api/admin/lineups/${lineupId}/pdf`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const lineup = lineups.find((l) => l.id === lineupId);
      a.download = `lineup-${lineup?.name?.replace(/\s+/g, "-").toLowerCase() || lineupId}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      toast.error("PDF export failed");
    }
  }

  async function exportFullDayPdf() {
    if (!selectedEventId) return;
    const res = await fetch(`/api/admin/lineups/day-sheet?event_id=${selectedEventId}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const event = events.find((e) => e.id === selectedEventId);
      a.download = `full-schedule-${event?.name?.replace(/\s+/g, "-").toLowerCase() || "event"}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      toast.error("Full schedule export failed");
    }
  }

  // Copy lineup: create new lineup for a different designer, then assign same models
  async function copyLineup() {
    if (!copySourceLineup || !copyTargetDesignerName || !copyTargetName) return;
    setSavingLineup(true);

    // Create the new lineup
    const createRes = await fetch("/api/admin/lineups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: selectedEventId,
        designer_name: copyTargetDesignerName.trim(),
        name: copyTargetName,
        show_date: copySourceLineup.show_date,
        show_time: copySourceLineup.show_time,
        show_order: lineups.length,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      toast.error(err.error || "Failed to create lineup");
      setSavingLineup(false);
      return;
    }

    const newLineup = await createRes.json();

    // Copy models over
    const modelIds = copySourceLineup.models.map((m) => m.model_id);
    if (modelIds.length > 0) {
      const addRes = await fetch(`/api/admin/lineups/${newLineup.id}/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_ids: modelIds }),
      });

      if (addRes.ok) {
        const models = await addRes.json();
        newLineup.models = models;
      }
    }

    setLineups((prev) => [...prev, newLineup]);
    setExpandedLineupId(newLineup.id);
    setShowCopyDialog(false);
    setCopySourceLineup(null);
    setCopyTargetDesignerName("");
    setCopyTargetName("");
    setSavingLineup(false);
    toast.success(`Lineup copied with ${modelIds.length} models`);
  }

  function openCopyDialog(lineup: Lineup) {
    setCopySourceLineup(lineup);
    setCopyTargetName(`${lineup.name} (copy from ${lineup.designer_name || "Designer"})`);
    setShowCopyDialog(true);
  }

  function toggleModelSelection(modelId: string) {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const totalModelsAssigned = new Set(
    lineups.flatMap((l) => l.models.map((m) => m.model_id))
  ).size;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Top Bar */}
      <div className="border-b px-4 py-3 flex items-center gap-4 flex-wrap bg-background z-10">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-1" /> Admin
          </Link>
        </Button>

        <h1 className="text-lg font-bold">Show Lineup Builder</h1>

        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Select event" />
          </SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name} ({e.year})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedEvent && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground ml-auto">
            {selectedEvent.start_date && selectedEvent.end_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(selectedEvent.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" – "}
                {new Date(selectedEvent.end_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
            <span>{lineups.length} designers</span>
            <span>{totalModelsAssigned} unique models</span>
            {lineups.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={exportFullDayPdf}
              >
                <FileText className="h-3 w-3 mr-1" /> Full Schedule
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Model Pool */}
        <div className="w-[320px] border-r flex flex-col bg-background">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={filterAssigned === "all" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => setFilterAssigned("all")}
              >
                All ({allModels.length})
              </Button>
              <Button
                variant={filterAssigned === "unassigned" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => setFilterAssigned("unassigned")}
              >
                Free
              </Button>
              <Button
                variant={filterAssigned === "assigned" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => setFilterAssigned("assigned")}
              >
                Assigned
              </Button>
              {eventModelIds.size > 0 && (
                <Button
                  variant={filterAssigned === "event" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => setFilterAssigned("event")}
                >
                  Event ({eventModelIds.size})
                </Button>
              )}
            </div>
          </div>

          {/* Selection action bar */}
          {selectedModelIds.size > 0 && expandedLineupId && (
            <div className="p-2 border-b bg-pink-500/5 flex items-center gap-2">
              <Button
                size="sm"
                className="flex-1 h-8 text-xs bg-pink-500 hover:bg-pink-600"
                onClick={addModelsToLineup}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Add {selectedModelIds.size} to Lineup
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setSelectedModelIds(new Set())}
              >
                Clear
              </Button>
            </div>
          )}
          {selectedModelIds.size > 0 && !expandedLineupId && (
            <div className="p-2 border-b bg-yellow-500/5">
              <p className="text-xs text-yellow-600 text-center">
                Expand a designer lineup to add models
              </p>
            </div>
          )}

          {/* Model list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingModels ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredModels.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No models found
              </p>
            ) : (
              filteredModels.map((model) => (
                <ModelPoolCard
                  key={model.id}
                  model={model}
                  assignedCount={modelAssignmentCounts[model.id] || 0}
                  isSelected={selectedModelIds.has(model.id)}
                  onToggle={() => toggleModelSelection(model.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Center Panel — Designer Lineups */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Designer Lineups ({lineups.length})
            </h2>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowAddDesigner(true)}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Designer
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {lineups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No designer lineups yet.</p>
                <p className="text-xs mt-1">Click &quot;Add Designer&quot; to get started.</p>
              </div>
            ) : (
              lineups.map((lineup) => (
                <DesignerLineupPanel
                  key={lineup.id}
                  lineup={lineup}
                  isExpanded={expandedLineupId === lineup.id}
                  onToggle={() =>
                    setExpandedLineupId(expandedLineupId === lineup.id ? null : lineup.id)
                  }
                  onRemoveModel={removeModel}
                  onReorder={reorderModels}
                  onDelete={deleteLineup}
                  onExportPdf={exportPdf}
                  onUpdateStatus={updateLineupStatus}
                  onUpdateOutfitNotes={updateOutfitNotes}
                  onCopyLineup={openCopyDialog}
                  modelConflicts={modelConflictsByLineup[lineup.id] || {}}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel — Day Overview */}
        <div className="w-[260px] border-l flex flex-col bg-background">
          <div className="p-3 border-b">
            <h2 className="text-sm font-semibold">Day Overview</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {Object.keys(dayOverview).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No lineups to show
              </p>
            ) : (
              Object.entries(dayOverview)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, info]) => (
                  <Card key={date} className="border-border">
                    <CardContent className="p-3">
                      <p className="text-sm font-medium mb-2">
                        {date === "Unscheduled" ? (
                          "Unscheduled"
                        ) : (
                          <>
                            <Calendar className="h-3.5 w-3.5 inline mr-1" />
                            {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </>
                        )}
                      </p>
                      <div className="space-y-1.5">
                        {info.lineups
                          .sort((a, b) => a.show_order - b.show_order)
                          .map((l) => {
                            const dn = l.designer_name || "Designer";
                            const statusDot =
                              l.status === "confirmed"
                                ? "bg-green-500"
                                : l.status === "completed"
                                ? "bg-blue-500"
                                : "bg-yellow-500";
                            return (
                              <button
                                key={l.id}
                                onClick={() => setExpandedLineupId(l.id)}
                                className={`w-full text-left text-xs p-2 rounded border transition-colors ${
                                  expandedLineupId === l.id
                                    ? "border-pink-500 bg-pink-500/5"
                                    : "border-border hover:border-pink-500/30"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`h-2 w-2 rounded-full ${statusDot} shrink-0`} />
                                  <span className="truncate font-medium">{dn}</span>
                                  <span className="ml-auto text-muted-foreground shrink-0">
                                    {l.models.length}
                                  </span>
                                </div>
                                {l.show_time && (
                                  <span className="text-muted-foreground flex items-center gap-1 mt-0.5 ml-4">
                                    <Clock className="h-2.5 w-2.5" />
                                    {l.show_time}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {info.lineups.length} shows · {info.totalModels} model slots
                      </p>
                    </CardContent>
                  </Card>
                ))
            )}

            {/* Summary */}
            {lineups.length > 0 && (
              <div className="border-t pt-3 mt-3 space-y-1">
                <p className="text-xs text-muted-foreground">
                  <strong>{lineups.length}</strong> total lineups
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>{totalModelsAssigned}</strong> unique models assigned
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>{lineups.reduce((s, l) => s + l.models.length, 0)}</strong> total walk slots
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Designer Dialog */}
      <Dialog open={showAddDesigner} onOpenChange={setShowAddDesigner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Designer to Lineup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Designer</Label>
              <Input
                placeholder="e.g. Brand Name or Designer Name"
                value={newLineupDesignerName}
                onChange={(e) => setNewLineupDesignerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Lineup Name</Label>
              <Input
                placeholder="e.g. Opening Night Show"
                value={newLineupName}
                onChange={(e) => setNewLineupName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Show Date</Label>
                <Input
                  type="date"
                  value={newLineupDate}
                  onChange={(e) => setNewLineupDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Show Time</Label>
                <Input
                  type="time"
                  value={newLineupTime}
                  onChange={(e) => setNewLineupTime(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={addDesignerLineup}
              disabled={!newLineupDesignerName || !newLineupName || savingLineup}
              className="w-full"
            >
              {savingLineup ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Lineup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Lineup Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Lineup</DialogTitle>
          </DialogHeader>
          {copySourceLineup && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Copying {copySourceLineup.models.length} models from{" "}
                <strong>{copySourceLineup.designer_name || "Designer"}</strong>
              </p>
              <div className="space-y-2">
                <Label>Target Designer</Label>
                <Input
                  placeholder="e.g. Brand Name or Designer Name"
                  value={copyTargetDesignerName}
                  onChange={(e) => setCopyTargetDesignerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Lineup Name</Label>
                <Input
                  value={copyTargetName}
                  onChange={(e) => setCopyTargetName(e.target.value)}
                />
              </div>
              <Button
                onClick={copyLineup}
                disabled={!copyTargetDesignerName || !copyTargetName || savingLineup}
                className="w-full"
              >
                {savingLineup ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy Lineup ({copySourceLineup.models.length} models)
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
