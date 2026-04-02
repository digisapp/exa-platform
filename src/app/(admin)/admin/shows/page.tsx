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
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft, Plus, Search, X, GripVertical, Users, Calendar, Clock,
  Download, Trash2, ChevronDown, ChevronUp, Check, UserPlus, Loader2,
  Copy, AlertTriangle, FileText, Pencil, ArrowRightLeft,
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

interface ShowModel {
  id: string;
  model_id: string;
  walk_order: number;
  outfit_notes: string | null;
  status: string;
  model: ModelInfo;
}

interface DesignerEntry {
  id: string;
  designer_name: string;
  designer_order: number;
  notes: string | null;
  models: ShowModel[];
}

interface Show {
  id: string;
  event_id: string;
  name: string;
  show_date: string | null;
  show_time: string | null;
  show_order: number;
  status: string;
  notes: string | null;
  designers: DesignerEntry[];
}

// ─── Sortable Model Card ─────────────────────────────────────────────────────

function SortableModelCard({
  showModel, onRemove, walkNumber, onUpdateNotes, conflictWarning,
}: {
  showModel: ShowModel; onRemove: () => void; walkNumber: number;
  onUpdateNotes: (notes: string) => void; conflictWarning: string | null;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(showModel.outfit_notes || "");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: showModel.model_id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const m = showModel.model;

  function saveNotes() { onUpdateNotes(notesValue); setEditingNotes(false); }

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg bg-card border hover:border-pink-500/30 transition-colors group">
      <div className="flex items-center gap-3 p-2">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0">
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-xs font-mono text-muted-foreground w-6 text-center shrink-0">#{walkNumber}</span>
        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0">
          {m.profile_photo_url ? (
            <Image src={m.profile_photo_url} alt={m.first_name || ""} fill className="object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">{m.first_name?.[0]}{m.last_name?.[0]}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{m.first_name} {m.last_name}</p>
          <p className="text-xs text-muted-foreground truncate">@{m.username}{m.height ? ` · ${m.height}` : ""}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {conflictWarning && <span title={conflictWarning} className="text-amber-500"><AlertTriangle className="h-3.5 w-3.5" /></span>}
          <button onClick={() => { setEditingNotes(!editingNotes); setNotesValue(showModel.outfit_notes || ""); }}
            className={`text-muted-foreground hover:text-foreground transition-all shrink-0 ${showModel.outfit_notes ? "opacity-100 text-pink-500" : "opacity-0 group-hover:opacity-100"}`} title="Outfit notes">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {(editingNotes || showModel.outfit_notes) && (
        <div className="px-2 pb-2 pl-[72px]">
          {editingNotes ? (
            <div className="flex gap-1">
              <Textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} placeholder="Outfit description, look number, etc."
                className="text-xs min-h-[52px] resize-none" autoFocus
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNotes(); } if (e.key === "Escape") setEditingNotes(false); }} />
              <div className="flex flex-col gap-1">
                <Button size="sm" className="h-6 text-xs px-2" onClick={saveNotes}>Save</Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditingNotes(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setEditingNotes(true); setNotesValue(showModel.outfit_notes || ""); }}
              className="text-xs text-muted-foreground italic hover:text-foreground transition-colors">{showModel.outfit_notes}</button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Model Pool Card ─────────────────────────────────────────────────────────

function ModelPoolCard({ model, assignedCount, isSelected, onToggle }: {
  model: ModelInfo; assignedCount: number; isSelected: boolean; onToggle: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div className="relative">
      <button onClick={onToggle} onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}
        className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-colors text-left ${isSelected ? "border-pink-500 bg-pink-500/10" : "border-border hover:border-pink-500/30"}`}>
        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0">
          {model.profile_photo_url ? (
            <Image src={model.profile_photo_url} alt={model.first_name || ""} fill className="object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">{model.first_name?.[0]}{model.last_name?.[0]}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{model.first_name} {model.last_name}</p>
          <p className="text-xs text-muted-foreground truncate">@{model.username}{model.height ? ` · ${model.height}` : ""}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {assignedCount > 0 && <Badge variant="secondary" className="text-xs">{assignedCount}x</Badge>}
          {isSelected && <Check className="h-4 w-4 text-pink-500" />}
        </div>
      </button>
      {showTooltip && (
        <div className="absolute left-full ml-2 top-0 z-50 w-56 bg-popover border rounded-lg shadow-lg p-3 pointer-events-none">
          <div className="flex gap-3">
            <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
              {model.profile_photo_url ? <Image src={model.profile_photo_url} alt={model.first_name || ""} fill className="object-cover" />
                : <div className="h-full w-full flex items-center justify-center text-lg text-muted-foreground">{model.first_name?.[0]}{model.last_name?.[0]}</div>}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{model.first_name} {model.last_name}</p>
              <p className="text-xs text-muted-foreground">@{model.username}</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {model.height && <><span className="text-muted-foreground">Height</span><span>{model.height}</span></>}
            {model.instagram_followers && <><span className="text-muted-foreground">Followers</span><span>{model.instagram_followers.toLocaleString()}</span></>}
            {assignedCount > 0 && <><span className="text-muted-foreground">Walks</span><span>{assignedCount} lineup{assignedCount > 1 ? "s" : ""}</span></>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Designer Panel (within a show) ──────────────────────────────────────────

function DesignerPanel({
  designer, showId, onRemoveModel, onReorder, onDeleteDesigner, onUpdateOutfitNotes, onRenameDesigner, onMoveDesigner, modelConflicts, isActive, onActivate, otherShows,
}: {
  designer: DesignerEntry; showId: string;
  onRemoveModel: (designerEntryId: string, modelId: string) => void;
  onReorder: (designerEntryId: string, modelIds: string[]) => void;
  onDeleteDesigner: (designerEntryId: string) => void;
  onUpdateOutfitNotes: (designerEntryId: string, modelId: string, notes: string) => void;
  onRenameDesigner: (designerEntryId: string, showId: string, newName: string) => void;
  onMoveDesigner: (designerEntryId: string, fromShowId: string, toShowId: string) => void;
  modelConflicts: Record<string, string>;
  isActive: boolean; onActivate: () => void;
  otherShows: { id: string; name: string }[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(designer.designer_name);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const modelIds = designer.models.map((m) => m.model_id);

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = modelIds.indexOf(active.id as string);
    const newIndex = modelIds.indexOf(over.id as string);
    onReorder(designer.id, arrayMove(modelIds, oldIndex, newIndex));
  }

  function saveName() {
    if (nameValue.trim() && nameValue.trim() !== designer.designer_name) {
      onRenameDesigner(designer.id, showId, nameValue.trim());
    }
    setEditingName(false);
  }

  const activeModel = activeId ? designer.models.find((m) => m.model_id === activeId) : null;

  return (
    <div className={`border rounded-lg ${isActive ? "border-pink-500/50 bg-pink-500/5" : "border-border"}`}>
      <div className="flex items-center justify-between p-2 cursor-pointer group" onClick={onActivate}>
        <div className="flex items-center gap-2 min-w-0">
          {editingName ? (
            <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)}
              className="h-7 text-sm font-semibold w-[200px]" autoFocus
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setEditingName(false); setNameValue(designer.designer_name); } }}
              onBlur={saveName} />
          ) : (
            <span className="text-sm font-semibold truncate">{designer.designer_name}</span>
          )}
          <Badge variant="outline" className="text-xs shrink-0">{designer.models.length}</Badge>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!editingName && (
            <button onClick={(e) => { e.stopPropagation(); setNameValue(designer.designer_name); setEditingName(true); }}
              className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-muted-foreground hover:text-foreground transition-all" title="Rename designer">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {otherShows.length > 0 && (
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setShowMoveMenu(!showMoveMenu); }}
                className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-muted-foreground hover:text-foreground transition-all" title="Move to another show">
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </button>
              {showMoveMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[180px]"
                  onClick={(e) => e.stopPropagation()}>
                  <p className="text-xs text-muted-foreground px-3 py-1">Move to:</p>
                  {otherShows.map((s) => (
                    <button key={s.id} onClick={() => { onMoveDesigner(designer.id, showId, s.id); setShowMoveMenu(false); }}
                      className="w-full text-left text-xs px-3 py-1.5 hover:bg-accent transition-colors">{s.name}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); if (confirm(`Remove ${designer.designer_name}?`)) onDeleteDesigner(designer.id); }}
            className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {isActive && (
        <div className="px-2 pb-2 space-y-1">
          {designer.models.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Select models from the pool and click &quot;Add to Lineup&quot;</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter}
              onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
              <SortableContext items={modelIds} strategy={verticalListSortingStrategy}>
                {designer.models.map((sm, i) => (
                  <SortableModelCard key={sm.model_id} showModel={sm} walkNumber={i + 1}
                    onRemove={() => onRemoveModel(designer.id, sm.model_id)}
                    onUpdateNotes={(notes) => onUpdateOutfitNotes(designer.id, sm.model_id, notes)}
                    conflictWarning={modelConflicts[sm.model_id] || null} />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeModel ? (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-card border border-pink-500 shadow-lg">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0">
                      {activeModel.model.profile_photo_url ? <Image src={activeModel.model.profile_photo_url} alt={activeModel.model.first_name || ""} fill className="object-cover" />
                        : <div className="h-full w-full flex items-center justify-center text-xs">{activeModel.model.first_name?.[0]}{activeModel.model.last_name?.[0]}</div>}
                    </div>
                    <p className="text-sm font-medium">{activeModel.model.first_name} {activeModel.model.last_name}</p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminLineupsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [shows, setShows] = useState<Show[]>([]);
  const [allModels, setAllModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);

  // UI state
  const [modelSearch, setModelSearch] = useState("");
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
  const [expandedShowId, setExpandedShowId] = useState<string | null>(null);
  const [activeDesignerEntryId, setActiveDesignerEntryId] = useState<string | null>(null);
  const [filterAssigned, setFilterAssigned] = useState<"all" | "unassigned" | "assigned" | "event">("all");
  const [eventModelIds, setEventModelIds] = useState<Set<string>>(new Set());

  // Create show dialog
  const [showCreateShow, setShowCreateShow] = useState(false);
  const [newShowName, setNewShowName] = useState("");
  const [newShowDate, setNewShowDate] = useState("");
  const [newShowTime, setNewShowTime] = useState("");
  const [savingShow, setSavingShow] = useState(false);

  // Add designer input
  const [addDesignerShowId, setAddDesignerShowId] = useState<string | null>(null);
  const [newDesignerName, setNewDesignerName] = useState("");

  const supabase = createClient();

  // ─── Data Fetching ───────────────────────────────────────────────────────

  useEffect(() => {
    async function loadEvents() {
      const { data } = await supabase.from("events").select("id, name, short_name, start_date, end_date, year, status").order("start_date", { ascending: false });
      setEvents(data || []);
      if (data?.length && !selectedEventId) setSelectedEventId(data[0].id);
      setLoading(false);
    }
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    loadShows();
    loadEventModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  useEffect(() => { loadModels(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function loadShows() {
    const res = await fetch(`/api/admin/lineups?event_id=${selectedEventId}`);
    if (res.ok) {
      const data = await res.json();
      setShows(data);
      if (data.length > 0 && !expandedShowId) setExpandedShowId(data[0].id);
    }
  }

  async function loadModels() {
    setLoadingModels(true);
    const { data } = await supabase.from("models")
      .select("id, username, first_name, last_name, profile_photo_url, height, instagram_followers")
      .eq("is_approved", true).not("user_id", "is", null).order("first_name", { ascending: true });
    setAllModels(data || []);
    setLoadingModels(false);
  }

  async function loadEventModels() {
    if (!selectedEventId) return;
    const { data: gigs } = await supabase.from("gigs").select("id").eq("event_id", selectedEventId);
    if (!gigs?.length) { setEventModelIds(new Set()); return; }
    const { data: apps } = await supabase.from("gig_applications").select("model_id").in("gig_id", gigs.map((g) => g.id)).eq("status", "accepted");
    setEventModelIds(new Set((apps || []).map((a) => a.model_id)));
  }

  // ─── Computed ────────────────────────────────────────────────────────────

  const modelAssignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    shows.forEach((s) => s.designers.forEach((d) => d.models.forEach((m) => { counts[m.model_id] = (counts[m.model_id] || 0) + 1; })));
    return counts;
  }, [shows]);

  // Conflict detection: 4+ walks on same day
  const modelConflictsByDesigner = useMemo(() => {
    const dayWalks: Record<string, Record<string, string[]>> = {};
    shows.forEach((s) => {
      const day = s.show_date || "unscheduled";
      s.designers.forEach((d) => d.models.forEach((m) => {
        if (!dayWalks[m.model_id]) dayWalks[m.model_id] = {};
        if (!dayWalks[m.model_id][day]) dayWalks[m.model_id][day] = [];
        dayWalks[m.model_id][day].push(`${d.designer_name} (${s.name})`);
      }));
    });
    const result: Record<string, Record<string, string>> = {};
    shows.forEach((s) => {
      const day = s.show_date || "unscheduled";
      s.designers.forEach((d) => {
        const conflicts: Record<string, string> = {};
        d.models.forEach((m) => {
          const walks = dayWalks[m.model_id]?.[day];
          if (walks && walks.length >= 4) {
            conflicts[m.model_id] = `${walks.length} walks on ${day === "unscheduled" ? "unscheduled" : new Date(day + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}: ${walks.join(", ")}`;
          }
        });
        result[d.id] = conflicts;
      });
    });
    return result;
  }, [shows]);

  const filteredModels = useMemo(() => {
    let list = allModels;
    if (modelSearch) {
      const q = modelSearch.toLowerCase();
      list = list.filter((m) => m.first_name?.toLowerCase().includes(q) || m.last_name?.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q));
    }
    if (filterAssigned === "unassigned") list = list.filter((m) => !modelAssignmentCounts[m.id]);
    else if (filterAssigned === "assigned") list = list.filter((m) => !!modelAssignmentCounts[m.id]);
    else if (filterAssigned === "event") list = list.filter((m) => eventModelIds.has(m.id));
    return list;
  }, [allModels, modelSearch, filterAssigned, modelAssignmentCounts, eventModelIds]);

  const dayOverview = useMemo(() => {
    const days: Record<string, { shows: Show[]; totalDesigners: number; totalModels: number }> = {};
    shows.forEach((s) => {
      const key = s.show_date || "Unscheduled";
      if (!days[key]) days[key] = { shows: [], totalDesigners: 0, totalModels: 0 };
      days[key].shows.push(s);
      days[key].totalDesigners += s.designers.length;
      days[key].totalModels += s.designers.reduce((sum, d) => sum + d.models.length, 0);
    });
    return days;
  }, [shows]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  async function createShow() {
    if (!newShowName) return;
    setSavingShow(true);
    const res = await fetch("/api/admin/lineups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: selectedEventId, name: newShowName, show_date: newShowDate || null, show_time: newShowTime || null, show_order: shows.length }),
    });
    if (res.ok) {
      const data = await res.json();
      setShows((prev) => [...prev, data]);
      setExpandedShowId(data.id);
      setShowCreateShow(false);
      setNewShowName(""); setNewShowDate(""); setNewShowTime("");
      toast.success("Show created");
    } else { const err = await res.json(); toast.error(err.error || "Failed"); }
    setSavingShow(false);
  }

  async function deleteShow(showId: string) {
    const res = await fetch(`/api/admin/lineups/${showId}`, { method: "DELETE" });
    if (res.ok) {
      setShows((prev) => prev.filter((s) => s.id !== showId));
      if (expandedShowId === showId) setExpandedShowId(null);
      toast.success("Show deleted");
    }
  }

  async function updateShowStatus(showId: string, status: string) {
    const res = await fetch(`/api/admin/lineups/${showId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) { setShows((prev) => prev.map((s) => s.id === showId ? { ...s, status } : s)); toast.success(`Status: ${status}`); }
  }

  async function addDesigner(showId: string) {
    if (!newDesignerName.trim()) return;
    const res = await fetch(`/api/admin/lineups/${showId}/designers`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designer_name: newDesignerName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setShows((prev) => prev.map((s) => s.id === showId ? { ...s, designers: [...s.designers, data] } : s));
      setActiveDesignerEntryId(data.id);
      setNewDesignerName("");
      setAddDesignerShowId(null);
      toast.success("Designer added");
    } else { const err = await res.json(); toast.error(err.error || "Failed"); }
  }

  async function renameDesigner(designerEntryId: string, showId: string, newName: string) {
    const show = shows.find((s) => s.id === showId);
    if (!show) return;
    const res = await fetch(`/api/admin/lineups/${showId}/designers`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designer_id: designerEntryId, designer_name: newName }),
    });
    if (res.ok) {
      setShows((prev) => prev.map((s) => ({
        ...s, designers: s.designers.map((d) => d.id === designerEntryId ? { ...d, designer_name: newName } : d),
      })));
      toast.success("Designer renamed");
    } else { const err = await res.json(); toast.error(err.error || "Failed to rename"); }
  }

  async function moveDesigner(designerEntryId: string, fromShowId: string, toShowId: string) {
    const res = await fetch(`/api/admin/lineups/${fromShowId}/designers`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designer_id: designerEntryId, move_to_show_id: toShowId }),
    });
    if (res.ok) {
      // Move the designer entry (with its models) from source to target show
      const movedDesigner = shows.flatMap((s) => s.designers).find((d) => d.id === designerEntryId);
      if (movedDesigner) {
        setShows((prev) => prev.map((s) => {
          if (s.id === fromShowId) return { ...s, designers: s.designers.filter((d) => d.id !== designerEntryId) };
          if (s.id === toShowId) return { ...s, designers: [...s.designers, movedDesigner] };
          return s;
        }));
      }
      if (activeDesignerEntryId === designerEntryId) setActiveDesignerEntryId(null);
      toast.success("Designer moved");
    } else { const err = await res.json(); toast.error(err.error || "Failed to move"); }
  }

  async function deleteDesigner(designerEntryId: string) {
    const show = shows.find((s) => s.designers.some((d) => d.id === designerEntryId));
    if (!show) return;
    const res = await fetch(`/api/admin/lineups/${show.id}/designers`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designer_id: designerEntryId }),
    });
    if (res.ok) {
      setShows((prev) => prev.map((s) => ({ ...s, designers: s.designers.filter((d) => d.id !== designerEntryId) })));
      if (activeDesignerEntryId === designerEntryId) setActiveDesignerEntryId(null);
      toast.success("Designer removed");
    }
  }

  async function addModelsToDesigner() {
    if (!activeDesignerEntryId || selectedModelIds.size === 0) return;
    const res = await fetch(`/api/admin/lineups/${activeDesignerEntryId}/models`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_ids: Array.from(selectedModelIds) }),
    });
    if (res.ok) {
      const newModels = await res.json();
      setShows((prev) => prev.map((s) => ({
        ...s,
        designers: s.designers.map((d) => d.id === activeDesignerEntryId ? {
          ...d, models: [...d.models, ...newModels.filter((nm: ShowModel) => !d.models.some((em) => em.model_id === nm.model_id))].sort((a, b) => a.walk_order - b.walk_order),
        } : d),
      })));
      setSelectedModelIds(new Set());
      toast.success(`${newModels.length} model(s) added`);
    } else { toast.error("Failed to add models"); }
  }

  async function removeModel(designerEntryId: string, modelId: string) {
    const res = await fetch(`/api/admin/lineups/${designerEntryId}/models`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_ids: [modelId] }),
    });
    if (res.ok) {
      setShows((prev) => prev.map((s) => ({
        ...s, designers: s.designers.map((d) => d.id === designerEntryId ? { ...d, models: d.models.filter((m) => m.model_id !== modelId) } : d),
      })));
      toast.success("Model removed");
    }
  }

  const reorderModels = useCallback(async (designerEntryId: string, orderedModelIds: string[]) => {
    setShows((prev) => prev.map((s) => ({
      ...s, designers: s.designers.map((d) => {
        if (d.id !== designerEntryId) return d;
        const modelMap = new Map(d.models.map((m) => [m.model_id, m]));
        return { ...d, models: orderedModelIds.map((id, i) => { const m = modelMap.get(id); return m ? { ...m, walk_order: i } : null; }).filter(Boolean) as ShowModel[] };
      }),
    })));
    await fetch(`/api/admin/lineups/${designerEntryId}/models`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ordered_model_ids: orderedModelIds }) });
  }, []);

  async function updateOutfitNotes(designerEntryId: string, modelId: string, notes: string) {
    setShows((prev) => prev.map((s) => ({
      ...s, designers: s.designers.map((d) => d.id === designerEntryId ? { ...d, models: d.models.map((m) => m.model_id === modelId ? { ...m, outfit_notes: notes || null } : m) } : d),
    })));
    await fetch(`/api/admin/lineups/${designerEntryId}/models/notes`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model_id: modelId, outfit_notes: notes }) });
  }

  async function exportShowPdf(showId: string) {
    const res = await fetch(`/api/admin/lineups/${showId}/pdf`);
    if (res.ok) { const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; const show = shows.find((s) => s.id === showId); a.download = `show-${show?.name?.replace(/\s+/g, "-").toLowerCase() || showId}.html`; a.click(); URL.revokeObjectURL(url); }
    else toast.error("Export failed");
  }

  async function exportFullSchedule() {
    const res = await fetch(`/api/admin/lineups/day-sheet?event_id=${selectedEventId}`);
    if (res.ok) { const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; const ev = events.find((e) => e.id === selectedEventId); a.download = `schedule-${ev?.name?.replace(/\s+/g, "-").toLowerCase() || "event"}.html`; a.click(); URL.revokeObjectURL(url); }
    else toast.error("Export failed");
  }

  function toggleModelSelection(modelId: string) {
    setSelectedModelIds((prev) => { const next = new Set(prev); next.has(modelId) ? next.delete(modelId) : next.add(modelId); return next; });
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const totalModelsAssigned = new Set(shows.flatMap((s) => s.designers.flatMap((d) => d.models.map((m) => m.model_id)))).size;
  const totalDesigners = shows.reduce((sum, s) => sum + s.designers.length, 0);

  // Find which show the active designer belongs to
  const activeDesignerShow = activeDesignerEntryId ? shows.find((s) => s.designers.some((d) => d.id === activeDesignerEntryId)) : null;
  const activeDesigner = activeDesignerShow?.designers.find((d) => d.id === activeDesignerEntryId);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Top Bar */}
      <div className="border-b px-4 py-3 flex items-center gap-4 flex-wrap bg-background z-10">
        <Button variant="ghost" size="sm" asChild><Link href="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Link></Button>
        <h1 className="text-lg font-bold">Show Lineup Builder</h1>
        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select event" /></SelectTrigger>
          <SelectContent>{events.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.year})</SelectItem>)}</SelectContent>
        </Select>
        {selectedEvent && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground ml-auto">
            {selectedEvent.start_date && selectedEvent.end_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(selectedEvent.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" – "}{new Date(selectedEvent.end_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
            <span>{shows.length} shows</span>
            <span>{totalDesigners} designers</span>
            <span>{totalModelsAssigned} models</span>
            {shows.length > 0 && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={exportFullSchedule}><FileText className="h-3 w-3 mr-1" /> Full Schedule</Button>}
          </div>
        )}
      </div>

      {/* 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Model Pool */}
        <div className="w-[320px] border-r flex flex-col bg-background">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search models..." value={modelSearch} onChange={(e) => setModelSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <div className="flex items-center gap-1">
              <Button variant={filterAssigned === "all" ? "default" : "ghost"} size="sm" className="h-7 text-xs flex-1" onClick={() => setFilterAssigned("all")}>All ({allModels.length})</Button>
              <Button variant={filterAssigned === "unassigned" ? "default" : "ghost"} size="sm" className="h-7 text-xs flex-1" onClick={() => setFilterAssigned("unassigned")}>Free</Button>
              <Button variant={filterAssigned === "assigned" ? "default" : "ghost"} size="sm" className="h-7 text-xs flex-1" onClick={() => setFilterAssigned("assigned")}>Assigned</Button>
              {eventModelIds.size > 0 && <Button variant={filterAssigned === "event" ? "default" : "ghost"} size="sm" className="h-7 text-xs flex-1" onClick={() => setFilterAssigned("event")}>Event ({eventModelIds.size})</Button>}
            </div>
          </div>

          {selectedModelIds.size > 0 && activeDesignerEntryId && (
            <div className="p-2 border-b bg-pink-500/5 flex items-center gap-2">
              <Button size="sm" className="flex-1 h-8 text-xs bg-pink-500 hover:bg-pink-600" onClick={addModelsToDesigner}>
                <UserPlus className="h-3 w-3 mr-1" />Add {selectedModelIds.size} to {activeDesigner?.designer_name || "Lineup"}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedModelIds(new Set())}>Clear</Button>
            </div>
          )}
          {selectedModelIds.size > 0 && !activeDesignerEntryId && (
            <div className="p-2 border-b bg-yellow-500/5"><p className="text-xs text-yellow-600 text-center">Click a designer to add models</p></div>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingModels ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              : filteredModels.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No models found</p>
              : filteredModels.map((model) => (
                <ModelPoolCard key={model.id} model={model} assignedCount={modelAssignmentCounts[model.id] || 0}
                  isSelected={selectedModelIds.has(model.id)} onToggle={() => toggleModelSelection(model.id)} />
              ))}
          </div>
        </div>

        {/* Center — Shows & Designers */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">Shows ({shows.length})</h2>
            <Button size="sm" className="h-8 text-xs" onClick={() => setShowCreateShow(true)}><Plus className="h-3 w-3 mr-1" /> Create Show</Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {shows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No shows yet.</p>
                <p className="text-xs mt-1">Click &quot;Create Show&quot; to get started.</p>
              </div>
            ) : shows.map((show) => {
              const isExpanded = expandedShowId === show.id;
              const statusColor = show.status === "confirmed" ? "bg-green-500/10 text-green-500" : show.status === "completed" ? "bg-blue-500/10 text-blue-500" : "bg-yellow-500/10 text-yellow-500";
              const showModelCount = show.designers.reduce((s, d) => s + d.models.length, 0);

              return (
                <Card key={show.id} className="border-border">
                  <CardHeader className="cursor-pointer py-3 px-4" onClick={() => setExpandedShowId(isExpanded ? null : show.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{show.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {show.show_date ? new Date(show.show_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "No date"}
                            {show.show_time ? ` · ${show.show_time}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={statusColor}>{show.status}</Badge>
                        <Badge variant="outline"><Users className="h-3 w-3 mr-1" />{show.designers.length} designers · {showModelCount} models</Badge>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0 px-4 pb-4 space-y-3">
                      {/* Show actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select value={show.status} onValueChange={(v) => updateShowStatus(show.id, v)}>
                          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => exportShowPdf(show.id)}>
                          <Download className="h-3 w-3 mr-1" /> PDF
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:text-destructive"
                          onClick={() => { if (confirm(`Delete "${show.name}"?`)) deleteShow(show.id); }}>
                          <Trash2 className="h-3 w-3 mr-1" /> Delete Show
                        </Button>
                      </div>

                      {/* Designers list */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Designers ({show.designers.length})</p>
                          {addDesignerShowId === show.id ? (
                            <div className="flex items-center gap-1">
                              <Input placeholder="Designer / Brand name" value={newDesignerName} onChange={(e) => setNewDesignerName(e.target.value)}
                                className="h-7 text-xs w-[200px]" autoFocus
                                onKeyDown={(e) => { if (e.key === "Enter") addDesigner(show.id); if (e.key === "Escape") { setAddDesignerShowId(null); setNewDesignerName(""); } }} />
                              <Button size="sm" className="h-7 text-xs" onClick={() => addDesigner(show.id)} disabled={!newDesignerName.trim()}>Add</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddDesignerShowId(null); setNewDesignerName(""); }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAddDesignerShowId(show.id)}>
                              <Plus className="h-3 w-3 mr-1" /> Add Designer
                            </Button>
                          )}
                        </div>

                        {show.designers.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No designers yet. Click &quot;Add Designer&quot; above.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {show.designers.map((d) => (
                              <DesignerPanel key={d.id} designer={d} showId={show.id}
                                isActive={activeDesignerEntryId === d.id}
                                onActivate={() => setActiveDesignerEntryId(activeDesignerEntryId === d.id ? null : d.id)}
                                onRemoveModel={removeModel} onReorder={reorderModels} onDeleteDesigner={deleteDesigner}
                                onRenameDesigner={renameDesigner} onMoveDesigner={moveDesigner}
                                onUpdateOutfitNotes={updateOutfitNotes} modelConflicts={modelConflictsByDesigner[d.id] || {}}
                                otherShows={shows.filter((s) => s.id !== show.id).map((s) => ({ id: s.id, name: s.name }))} />
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right — Day Overview */}
        <div className="w-[260px] border-l flex flex-col bg-background">
          <div className="p-3 border-b"><h2 className="text-sm font-semibold">Day Overview</h2></div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {Object.keys(dayOverview).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No shows to display</p>
            ) : Object.entries(dayOverview).sort(([a], [b]) => a.localeCompare(b)).map(([date, info]) => (
              <Card key={date} className="border-border">
                <CardContent className="p-3">
                  <p className="text-sm font-medium mb-2">
                    {date === "Unscheduled" ? "Unscheduled" : <><Calendar className="h-3.5 w-3.5 inline mr-1" />{new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</>}
                  </p>
                  <div className="space-y-1.5">
                    {info.shows.sort((a, b) => a.show_order - b.show_order).map((s) => {
                      const statusDot = s.status === "confirmed" ? "bg-green-500" : s.status === "completed" ? "bg-blue-500" : "bg-yellow-500";
                      return (
                        <button key={s.id} onClick={() => setExpandedShowId(s.id)}
                          className={`w-full text-left text-xs p-2 rounded border transition-colors ${expandedShowId === s.id ? "border-pink-500 bg-pink-500/5" : "border-border hover:border-pink-500/30"}`}>
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${statusDot} shrink-0`} />
                            <span className="truncate font-medium">{s.name}</span>
                            <span className="ml-auto text-muted-foreground shrink-0">{s.designers.length}d · {s.designers.reduce((sum, d) => sum + d.models.length, 0)}m</span>
                          </div>
                          {s.show_time && <span className="text-muted-foreground flex items-center gap-1 mt-0.5 ml-4"><Clock className="h-2.5 w-2.5" />{s.show_time}</span>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{info.shows.length} shows · {info.totalDesigners} designers · {info.totalModels} models</p>
                </CardContent>
              </Card>
            ))}
            {shows.length > 0 && (
              <div className="border-t pt-3 mt-3 space-y-1">
                <p className="text-xs text-muted-foreground"><strong>{shows.length}</strong> total shows</p>
                <p className="text-xs text-muted-foreground"><strong>{totalDesigners}</strong> total designers</p>
                <p className="text-xs text-muted-foreground"><strong>{totalModelsAssigned}</strong> unique models</p>
                <p className="text-xs text-muted-foreground"><strong>{shows.reduce((s, sh) => s + sh.designers.reduce((d, de) => d + de.models.length, 0), 0)}</strong> total walk slots</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Show Dialog */}
      <Dialog open={showCreateShow} onOpenChange={setShowCreateShow}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Show</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Show Name</Label>
              <Input placeholder="e.g. Opening Night, Daytime Show, Emerging Designers" value={newShowName} onChange={(e) => setNewShowName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={newShowDate} onChange={(e) => setNewShowDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Time</Label><Input type="time" value={newShowTime} onChange={(e) => setNewShowTime(e.target.value)} /></div>
            </div>
            <Button onClick={createShow} disabled={!newShowName || savingShow} className="w-full">
              {savingShow ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Show
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
