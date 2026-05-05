"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ArrowLeft, Plus, Search, X, GripVertical, Calendar, Clock,
  Download, Trash2, ChevronDown, ChevronUp, Check, UserPlus, Loader2,
  Copy, AlertTriangle, FileText, Pencil, ArrowRightLeft, Eye, Repeat, Star,
  CalendarCheck, RefreshCw,
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
  bust: string | null;
  waist: string | null;
  hips: string | null;
  dress_size: string | null;
  shoe_size: string | null;
  instagram_followers: number | null;
}

interface ShowModel {
  id: string;
  model_id: string;
  walk_order: number;
  outfit_notes: string | null;
  status: string;
  check_in_status?: string;
  model: ModelInfo;
}

interface DesignerEntry {
  id: string;
  designer_name: string;
  designer_order: number;
  brand_id: string | null;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTimeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const parts = time.split(":");
  if (parts.length < 2) return null;
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// ─── Sortable Model Card ─────────────────────────────────────────────────────

function SortableModelCard({
  showModel, onRemove, walkNumber, onUpdateNotes, conflictWarning, isBulkSelected, onBulkToggle, multiWalkInfo,
}: {
  showModel: ShowModel; onRemove: () => void; walkNumber: number;
  onUpdateNotes: (notes: string) => void; conflictWarning: string | null;
  isBulkSelected: boolean; onBulkToggle: () => void;
  multiWalkInfo?: { count: number; designers: string[]; hasBackToBack: boolean } | null;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(showModel.outfit_notes || "");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: showModel.model_id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  const m = showModel.model;

  function saveNotes() { onUpdateNotes(notesValue); setEditingNotes(false); }

  return (
    <div ref={setNodeRef} style={style}
      className={`rounded-lg border transition-all duration-150 group ${
        isBulkSelected
          ? "border-pink-500/50 bg-pink-500/10 shadow-[inset_0_0_20px_rgba(236,72,153,0.06)]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-pink-500/25 hover:bg-pink-500/[0.02]"
      }`}>
      <div className="flex items-center gap-3 p-2.5">
        <input
          type="checkbox"
          checked={isBulkSelected}
          onChange={onBulkToggle}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-pink-500 shrink-0 cursor-pointer"
        />
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 shrink-0 transition-colors">
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-[10px] font-mono text-white/25 w-6 text-center shrink-0">#{walkNumber}</span>
        <div className="relative h-9 w-9 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10 shrink-0">
          {m.profile_photo_url ? (
            <Image src={m.profile_photo_url} alt={m.first_name || ""} fill className="object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[10px] text-white/30">
              {m.first_name?.[0]}{m.last_name?.[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-white/85">{m.first_name} {m.last_name}</p>
          <p className="text-[11px] text-white/30 truncate">@{m.username}{m.height ? ` · ${m.height}` : ""}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {multiWalkInfo && multiWalkInfo.count > 1 && (
            <span
              title={`${multiWalkInfo.count} walks: ${multiWalkInfo.designers.join(", ")}${multiWalkInfo.hasBackToBack ? " ⚠ BACK-TO-BACK — may not have time to change" : ""}`}
              className={multiWalkInfo.hasBackToBack ? "text-red-400" : "text-blue-400"}>
              <Repeat className="h-3.5 w-3.5" />
            </span>
          )}
          {conflictWarning && (
            <span title={conflictWarning} className="text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          )}
          <button
            onClick={() => { setEditingNotes(!editingNotes); setNotesValue(showModel.outfit_notes || ""); }}
            className={`transition-all shrink-0 ${
              showModel.outfit_notes
                ? "opacity-100 text-pink-400"
                : "opacity-0 group-hover:opacity-60 text-white/40 hover:text-white/80"
            }`}
            title="Outfit notes">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-white/30 hover:text-red-400 transition-all shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {(editingNotes || showModel.outfit_notes) && (
        <div className="px-2.5 pb-2.5 pl-[88px]">
          {editingNotes ? (
            <div className="flex gap-1.5">
              <Textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Outfit description, look number, etc."
                className="text-xs min-h-[52px] resize-none bg-white/5 border-white/10 text-white/80 placeholder:text-white/25"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNotes(); }
                  if (e.key === "Escape") setEditingNotes(false);
                }}
              />
              <div className="flex flex-col gap-1">
                <Button size="sm" className="h-6 text-xs px-2 bg-pink-500 hover:bg-pink-600 border-0" onClick={saveNotes}>Save</Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-white/40 hover:text-white/70" onClick={() => setEditingNotes(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setEditingNotes(true); setNotesValue(showModel.outfit_notes || ""); }}
              className="text-xs text-pink-400/70 italic hover:text-pink-400 transition-colors">
              {showModel.outfit_notes}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Model Pool Card ─────────────────────────────────────────────────────────

function ModelPoolCard({ model, assignedCount, isSelected, onToggle, isPick }: {
  model: ModelInfo; assignedCount: number; isSelected: boolean; onToggle: () => void; isPick: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const hasMeasurements = model.bust || model.waist || model.hips || model.dress_size || model.shoe_size;
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-150 text-left ${
          isSelected
            ? "border-pink-500/60 bg-pink-500/12 shadow-[inset_0_0_20px_rgba(236,72,153,0.07)]"
            : isPick
              ? "border-amber-400/30 bg-amber-500/[0.04] hover:border-amber-400/60"
              : "border-white/[0.05] bg-white/[0.01] hover:border-pink-500/25 hover:bg-pink-500/[0.02]"
        }`}>
        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10 shrink-0">
          {model.profile_photo_url ? (
            <Image src={model.profile_photo_url} alt={model.first_name || ""} fill className="object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-white/30">
              {model.first_name?.[0]}{model.last_name?.[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-white/85">{model.first_name} {model.last_name}</p>
          <p className="text-[11px] text-white/30 truncate">
            @{model.username}{model.height ? ` · ${model.height}` : ""}{model.dress_size ? ` · Sz ${model.dress_size}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isPick && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
          {assignedCount > 0 && (
            <span className="text-[10px] font-semibold bg-pink-500/20 text-pink-300 rounded-full px-1.5 py-0.5 leading-none tabular-nums">
              {assignedCount}×
            </span>
          )}
          {isSelected && <Check className="h-4 w-4 text-pink-400" />}
        </div>
      </button>
      {showTooltip && (
        <div className="absolute left-full ml-2 top-0 z-50 w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl shadow-black/60 p-3.5 pointer-events-none">
          <div className="flex gap-3">
            <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/10 shrink-0">
              {model.profile_photo_url
                ? <Image src={model.profile_photo_url} alt={model.first_name || ""} fill className="object-cover" />
                : <div className="h-full w-full flex items-center justify-center text-lg text-white/25">{model.first_name?.[0]}{model.last_name?.[0]}</div>}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white/90 truncate">{model.first_name} {model.last_name}</p>
              <p className="text-xs text-white/35">@{model.username}</p>
              {isPick && (
                <p className="text-xs text-amber-400 font-medium mt-1 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400" /> Designer&apos;s pick
                </p>
              )}
            </div>
          </div>
          {hasMeasurements && (
            <div className="mt-3 pt-2.5 border-t border-white/[0.07] grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {model.height && <><span className="text-white/30">Height</span><span className="text-white/70">{model.height}</span></>}
              {model.bust && <><span className="text-white/30">Bust</span><span className="text-white/70">{model.bust}</span></>}
              {model.waist && <><span className="text-white/30">Waist</span><span className="text-white/70">{model.waist}</span></>}
              {model.hips && <><span className="text-white/30">Hips</span><span className="text-white/70">{model.hips}</span></>}
              {model.dress_size && <><span className="text-white/30">Dress</span><span className="text-white/70">{model.dress_size}</span></>}
              {model.shoe_size && <><span className="text-white/30">Shoe</span><span className="text-white/70">{model.shoe_size}</span></>}
            </div>
          )}
          <div className="mt-2.5 pt-2.5 border-t border-white/[0.07] grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {model.instagram_followers && (
              <><span className="text-white/30">Followers</span><span className="text-white/70">{model.instagram_followers.toLocaleString()}</span></>
            )}
            {assignedCount > 0 && (
              <><span className="text-white/30">Walks</span><span className="text-white/70">{assignedCount} lineup{assignedCount > 1 ? "s" : ""}</span></>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sortable Designer Panel ─────────────────────────────────────────────────

function SortableDesignerPanel({
  designer, showId, onRemoveModel, onReorder, onDeleteDesigner, onUpdateOutfitNotes,
  onRenameDesigner, onMoveDesigner, onBulkRemove, onBulkMove,
  modelConflicts, isActive, onActivate, otherShows, allDesigners, showModelWalkMap,
}: {
  designer: DesignerEntry; showId: string;
  onRemoveModel: (designerEntryId: string, modelId: string) => void;
  onReorder: (designerEntryId: string, modelIds: string[]) => void;
  onDeleteDesigner: (designerEntryId: string) => void;
  onUpdateOutfitNotes: (designerEntryId: string, modelId: string, notes: string) => void;
  onRenameDesigner: (designerEntryId: string, showId: string, newName: string) => void;
  onMoveDesigner: (designerEntryId: string, fromShowId: string, toShowId: string) => void;
  onBulkRemove: (designerEntryId: string, modelIds: string[]) => void;
  onBulkMove: (fromDesignerEntryId: string, toDesignerEntryId: string, modelIds: string[]) => void;
  modelConflicts: Record<string, string>;
  isActive: boolean; onActivate: () => void;
  otherShows: { id: string; name: string; show_date: string | null }[];
  allDesigners: { id: string; designerName: string; showName: string }[];
  showModelWalkMap: Record<string, { count: number; designers: string[]; hasBackToBack: boolean }>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(designer.designer_name);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [showBulkMoveMenu, setShowBulkMoveMenu] = useState(false);

  const {
    attributes: sortableAttributes, listeners: sortableListeners,
    setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: designer.id });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

  const modelSensors = useSensors(
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

  function toggleBulkSelect(modelId: string) {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) { next.delete(modelId); } else { next.add(modelId); }
      return next;
    });
  }

  function handleBulkRemove() {
    if (bulkSelected.size === 0) return;
    onBulkRemove(designer.id, Array.from(bulkSelected));
    setBulkSelected(new Set());
  }

  function handleBulkMove(targetDesignerId: string) {
    if (bulkSelected.size === 0) return;
    onBulkMove(designer.id, targetDesignerId, Array.from(bulkSelected));
    setBulkSelected(new Set());
    setShowBulkMoveMenu(false);
  }

  const activeModel = activeId ? designer.models.find((m) => m.model_id === activeId) : null;
  const moveTargetDesigners = allDesigners.filter((d) => d.id !== designer.id);

  return (
    <div ref={setNodeRef} style={style}
      className={`border rounded-xl overflow-hidden transition-all duration-200 ${
        isActive
          ? "border-pink-500/40 shadow-[0_0_24px_rgba(236,72,153,0.08)]"
          : "border-white/[0.07] hover:border-white/[0.12]"
      }`}>
      {/* Designer header */}
      <div
        className={`flex items-center justify-between px-3 py-2.5 cursor-pointer group transition-colors ${
          isActive ? "bg-pink-500/[0.06]" : "hover:bg-white/[0.02]"
        }`}
        onClick={onActivate}>
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            {...sortableAttributes}
            {...sortableListeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 shrink-0 transition-colors">
            <GripVertical className="h-4 w-4" />
          </button>
          {editingName ? (
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="h-7 text-sm font-semibold w-[200px] bg-white/5 border-white/20 text-white/90"
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") { setEditingName(false); setNameValue(designer.designer_name); }
              }}
              onBlur={saveName}
            />
          ) : (
            <span className="text-sm font-semibold uppercase tracking-wide text-white/80 truncate">
              {designer.designer_name}
            </span>
          )}
          <span className="text-[10px] font-mono bg-white/[0.07] border border-white/10 rounded-full px-2 py-0.5 text-white/35 shrink-0 tabular-nums">
            {designer.models.length}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!editingName && (
            <button
              onClick={(e) => { e.stopPropagation(); setNameValue(designer.designer_name); setEditingName(true); }}
              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-white/30 hover:text-white/70 transition-all"
              title="Rename designer">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {otherShows.length > 0 && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMoveMenu(!showMoveMenu); }}
                className="text-white/30 hover:text-white/70 transition-colors"
                title="Move to another show">
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </button>
              {showMoveMenu && (
                <div
                  className="absolute right-0 top-full mt-1 z-50 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl shadow-black/60 py-1.5 min-w-[200px]"
                  onClick={(e) => e.stopPropagation()}>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/25 px-3 py-1.5 font-semibold">Move to show</p>
                  {otherShows.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { onMoveDesigner(designer.id, showId, s.id); setShowMoveMenu(false); }}
                      className="w-full text-left text-xs px-3 py-2 text-white/60 hover:text-white/90 hover:bg-white/[0.05] transition-colors">
                      {s.name}
                      {s.show_date && (
                        <span className="text-white/30 ml-1.5">
                          ({new Date(s.show_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); if (confirm(`Remove ${designer.designer_name}?`)) onDeleteDesigner(designer.id); }}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-white/30 hover:text-red-400 transition-all">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isActive && (
        <div className="px-2.5 pb-2.5 space-y-1.5 border-t border-white/[0.06]">
          {/* Bulk action bar */}
          {bulkSelected.size > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-pink-500/[0.08] border border-pink-500/20 mt-2">
              <span className="text-xs font-medium text-white/60">{bulkSelected.size} selected</span>
              <button
                onClick={handleBulkRemove}
                className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30 rounded-md px-2 py-1 transition-colors">
                <Trash2 className="h-3 w-3" />Remove
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowBulkMoveMenu(!showBulkMoveMenu)}
                  className="flex items-center gap-1 text-xs bg-white/5 text-white/50 border border-white/10 hover:border-white/20 rounded-md px-2 py-1 transition-colors">
                  <ArrowRightLeft className="h-3 w-3" />Move to...
                </button>
                {showBulkMoveMenu && (
                  <div className="absolute left-0 top-full mt-1 z-50 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl shadow-black/60 py-1.5 min-w-[240px] max-h-[200px] overflow-y-auto">
                    {moveTargetDesigners.length === 0 ? (
                      <p className="text-xs text-white/30 px-3 py-2">No other designers</p>
                    ) : moveTargetDesigners.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => handleBulkMove(d.id)}
                        className="w-full text-left text-xs px-3 py-2 text-white/60 hover:text-white/90 hover:bg-white/[0.05] transition-colors">
                        {d.designerName} <span className="text-white/30">({d.showName})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setBulkSelected(new Set())}
                className="ml-auto text-xs text-white/30 hover:text-white/60 transition-colors">
                Clear
              </button>
            </div>
          )}

          {designer.models.length === 0 ? (
            <p className="text-xs text-white/25 text-center py-4 mt-2">
              Select models from the pool and click &quot;Add to Lineup&quot;
            </p>
          ) : (
            <DndContext
              sensors={modelSensors}
              collisionDetection={closestCenter}
              onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
              onDragEnd={handleDragEnd}>
              <SortableContext items={modelIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-1 pt-1.5">
                  {designer.models.map((sm, i) => (
                    <SortableModelCard
                      key={sm.model_id}
                      showModel={sm}
                      walkNumber={i + 1}
                      onRemove={() => onRemoveModel(designer.id, sm.model_id)}
                      onUpdateNotes={(notes) => onUpdateOutfitNotes(designer.id, sm.model_id, notes)}
                      conflictWarning={modelConflicts[sm.model_id] || null}
                      isBulkSelected={bulkSelected.has(sm.model_id)}
                      onBulkToggle={() => toggleBulkSelect(sm.model_id)}
                      multiWalkInfo={showModelWalkMap[sm.model_id]}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeModel ? (
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900 border border-pink-500/60 shadow-[0_0_20px_rgba(236,72,153,0.2)]">
                    <GripVertical className="h-4 w-4 text-white/30" />
                    <div className="relative h-9 w-9 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10 shrink-0">
                      {activeModel.model.profile_photo_url
                        ? <Image src={activeModel.model.profile_photo_url} alt={activeModel.model.first_name || ""} fill className="object-cover" />
                        : <div className="h-full w-full flex items-center justify-center text-xs text-white/30">{activeModel.model.first_name?.[0]}{activeModel.model.last_name?.[0]}</div>}
                    </div>
                    <p className="text-sm font-medium text-white/90">{activeModel.model.first_name} {activeModel.model.last_name}</p>
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

// ─── Model Map Panel ─────────────────────────────────────────────────────────

const CHECK_IN_CYCLE = ["not_arrived", "arrived", "hair_makeup", "dressed", "on_deck", "done"] as const;
type CheckInStatus = (typeof CHECK_IN_CYCLE)[number];

const CI: Record<CheckInStatus, { label: string; short: string; dot: string }> = {
  not_arrived: { label: "Not arrived", short: "—",       dot: "bg-white/20" },
  arrived:     { label: "Arrived",     short: "In",      dot: "bg-blue-400" },
  hair_makeup: { label: "Hair & Makeup", short: "H+M",   dot: "bg-violet-400" },
  dressed:     { label: "Dressed",     short: "Dressed", dot: "bg-amber-400" },
  on_deck:     { label: "On Deck",     short: "Ready",   dot: "bg-lime-400" },
  done:        { label: "Done",        short: "Done",    dot: "bg-emerald-400" },
};

function nextCheckIn(s: string | undefined): CheckInStatus {
  const i = CHECK_IN_CYCLE.indexOf((s || "not_arrived") as CheckInStatus);
  return CHECK_IN_CYCLE[(i + 1) % CHECK_IN_CYCLE.length];
}

function gapBadge(gap: number, paceMin?: number) {
  const t = paceMin ? ` · ~${gap * paceMin}m` : "";
  if (gap === 0) return { cls: "bg-red-500/15 border-red-500/35 text-red-400",     txt: `No gap!${t}` };
  if (gap <= 2)  return { cls: "bg-red-500/10 border-red-500/25 text-red-400",     txt: `${gap} slot gap${t}` };
  if (gap <= 5)  return { cls: "bg-amber-500/10 border-amber-500/25 text-amber-400", txt: `${gap} slot gap${t}` };
  return               { cls: "bg-emerald-500/8 border-emerald-500/18 text-emerald-400", txt: `${gap} slots clear${t}` };
}

function ModelMapPanel({
  show,
  walkMap,
  onUpdateCheckInStatus,
}: {
  show: Show;
  walkMap: Record<string, { count: number; designers: string[]; hasBackToBack: boolean; minGap: number }>;
  onUpdateCheckInStatus: (showId: string, modelId: string, status: string) => void;
}) {
  const [view, setView] = useState<"sequence" | "grid" | "timeline">("sequence");
  const [search, setSearch] = useState("");
  const [pace, setPace] = useState(2);

  const sequence = useMemo(() => {
    const items: { slot: number; sm: ShowModel; d: DesignerEntry }[] = [];
    let slot = 1;
    show.designers.forEach((d) => d.models.forEach((sm) => items.push({ slot: slot++, sm, d })));
    return items;
  }, [show.designers]);

  const modelIndices = useMemo(() => {
    const map: Record<string, number[]> = {};
    sequence.forEach((item, i) => {
      if (!map[item.sm.model_id]) map[item.sm.model_id] = [];
      map[item.sm.model_id].push(i);
    });
    return map;
  }, [sequence]);

  const itemGaps = useMemo(() => sequence.map((item, i) => {
    const idxs = modelIndices[item.sm.model_id] || [];
    const pos = idxs.indexOf(i);
    const prevI = idxs[pos - 1] ?? null;
    const nextI = idxs[pos + 1] ?? null;
    return {
      gapBefore: prevI !== null ? i - prevI - 1 : null,
      prevDesigner: prevI !== null ? sequence[prevI].d.designer_name : null,
    };
  }), [sequence, modelIndices]);

  const q = search.toLowerCase();
  const matches = (m: ModelInfo) =>
    !q || [m.first_name, m.last_name, m.username].some((v) => v?.toLowerCase().includes(q));

  const totalSlots = sequence.length;
  const multiCount = Object.values(walkMap).filter((v) => v.count > 1).length;
  const b2bCount = Object.values(walkMap).filter((v) => v.hasBackToBack).length;
  const checkedIn = show.designers.reduce(
    (s, d) => s + d.models.filter((m) => m.check_in_status && m.check_in_status !== "not_arrived").length, 0
  );
  const showStartMin = parseTimeToMinutes(show.show_time);

  // ── Sequence / Timeline ──────────────────────────────────────────────────

  function renderSequence(withTime: boolean) {
    const items = q ? sequence.filter((it) => matches(it.sm.model)) : sequence;
    if (items.length === 0) return (
      <p className="text-xs text-white/25 text-center py-8">No models match &ldquo;{search}&rdquo;</p>
    );
    return (
      <div className="max-h-[560px] overflow-y-auto space-y-px pr-0.5">
        {items.map((item) => {
          const seqI = sequence.indexOf(item);
          const gaps = itemGaps[seqI];
          const wInfo = walkMap[item.sm.model_id];
          const isMulti = (wInfo?.count ?? 1) > 1;
          const isB2B = wInfo?.hasBackToBack ?? false;
          const ciKey = (item.sm.check_in_status || "not_arrived") as CheckInStatus;
          const ci = CI[ciKey] || CI.not_arrived;
          const isCancelled = item.sm.status === "cancelled";
          const isStandby = item.sm.status === "standby";
          const estMin = withTime && showStartMin !== null ? showStartMin + (item.slot - 1) * pace : null;
          const timeStr = estMin !== null
            ? `${String(Math.floor(estMin / 60) % 24).padStart(2, "0")}:${String(estMin % 60).padStart(2, "0")}`
            : null;
          const gb = gaps.gapBefore;
          const showBanner = gb !== null && gb <= 8;

          return (
            <div key={`${item.d.id}-${item.sm.model_id}`}>
              {showBanner && (
                <div className={`flex items-center justify-between mx-0.5 my-1 rounded-md px-3 py-1.5 border text-[10px] font-medium ${gapBadge(gb!).cls}`}>
                  <span>⚡ Quick change — from {gaps.prevDesigner}</span>
                  <span className="opacity-70">{gapBadge(gb!, withTime ? pace : undefined).txt}</span>
                </div>
              )}
              <div className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
                isCancelled ? "opacity-25 border-transparent" :
                isB2B && isMulti ? "bg-red-500/[0.05] border-red-500/10" :
                isMulti ? "bg-blue-500/[0.03] border-blue-500/8" :
                "border-transparent hover:bg-white/[0.02]"
              }`}>
                {withTime && (
                  <span className="text-[10px] font-mono text-white/25 w-11 shrink-0 tabular-nums text-right">
                    {timeStr ?? "—:—"}
                  </span>
                )}
                <span className="text-[11px] font-mono text-white/18 w-5 text-right shrink-0 tabular-nums">{item.slot}</span>
                <span className="w-[80px] shrink-0 text-[10px] uppercase tracking-wide text-white/22 truncate" title={item.d.designer_name}>
                  {item.d.designer_name}
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative h-7 w-7 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10 shrink-0">
                    {item.sm.model.profile_photo_url
                      ? <Image src={item.sm.model.profile_photo_url} alt="" fill className="object-cover" />
                      : <div className="h-full w-full flex items-center justify-center text-[8px] text-white/25">
                          {item.sm.model.first_name?.[0]}{item.sm.model.last_name?.[0]}
                        </div>}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate leading-tight ${
                      isCancelled ? "line-through text-white/30" :
                      isStandby ? "text-amber-300/70" : "text-white/80"
                    }`}>
                      {item.sm.model.first_name} {item.sm.model.last_name}
                      {isStandby && <span className="ml-1 text-[9px] text-amber-400/50 font-normal">standby</span>}
                    </p>
                    {item.sm.outfit_notes && (
                      <p className="text-[10px] text-pink-400/40 truncate leading-tight">{item.sm.outfit_notes}</p>
                    )}
                  </div>
                </div>
                {isMulti && <Repeat className={`h-3 w-3 shrink-0 ${isB2B ? "text-red-400" : "text-blue-400/50"}`} />}
                <button
                  onClick={() => onUpdateCheckInStatus(show.id, item.sm.model_id, nextCheckIn(item.sm.check_in_status))}
                  title={`${ci.label} — click to advance`}
                  className="flex items-center gap-1.5 rounded-full px-2 py-0.5 border border-transparent hover:border-white/12 hover:bg-white/[0.04] transition-all shrink-0">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${ci.dot}`} />
                  <span className={`text-[10px] font-medium ${ciKey === "not_arrived" ? "text-white/15" : "text-white/50"}`}>
                    {ci.short}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Grid ─────────────────────────────────────────────────────────────────

  function renderGrid() {
    type GridRow = {
      modelId: string; model: ModelInfo;
      byDesigner: Map<number, { pos: number; sm: ShowModel }>;
      isMulti: boolean; isB2B: boolean; minGap: number; checkInStatus: string;
    };
    const seen = new Set<string>();
    const rows: GridRow[] = [];
    show.designers.forEach((d, dIdx) => {
      d.models.forEach((sm) => {
        if (!seen.has(sm.model_id)) {
          seen.add(sm.model_id);
          rows.push({
            modelId: sm.model_id, model: sm.model,
            byDesigner: new Map(),
            isMulti: (walkMap[sm.model_id]?.count ?? 1) > 1,
            isB2B: walkMap[sm.model_id]?.hasBackToBack ?? false,
            minGap: walkMap[sm.model_id]?.minGap ?? Infinity,
            checkInStatus: sm.check_in_status || "not_arrived",
          });
        }
        rows.find((r) => r.modelId === sm.model_id)!.byDesigner.set(dIdx, { pos: sm.walk_order + 1, sm });
      });
    });
    rows.sort((a, b) => {
      if (a.isB2B !== b.isB2B) return a.isB2B ? -1 : 1;
      if (a.isMulti !== b.isMulti) return a.isMulti ? -1 : 1;
      return (a.model.first_name || "").localeCompare(b.model.first_name || "");
    });
    const filtered = q ? rows.filter((r) => matches(r.model)) : rows;
    if (filtered.length === 0) return (
      <p className="text-xs text-white/25 text-center py-8">No models match &ldquo;{search}&rdquo;</p>
    );
    return (
      <div className="overflow-x-auto">
        <div className="flex items-center gap-1 min-w-fit pl-[196px] mb-1.5 sticky top-0 bg-black/60 backdrop-blur-sm py-1 z-10">
          {show.designers.map((d) => (
            <div key={d.id} className="w-[62px] shrink-0 text-center text-[10px] uppercase tracking-wide text-white/20 truncate" title={d.designer_name}>
              {d.designer_name.length > 8 ? `${d.designer_name.slice(0, 7)}…` : d.designer_name}
            </div>
          ))}
        </div>
        <div className="max-h-[500px] overflow-y-auto space-y-0.5 min-w-fit">
          {filtered.map((row) => {
            const ci = CI[(row.checkInStatus || "not_arrived") as CheckInStatus] || CI.not_arrived;
            return (
              <div key={row.modelId} className={`flex items-center gap-1 rounded-lg px-1.5 py-1.5 min-w-fit border ${
                row.isB2B ? "bg-red-500/[0.06] border-red-500/12" :
                row.isMulti ? "bg-blue-500/[0.03] border-blue-500/8" :
                "border-transparent hover:bg-white/[0.02]"
              }`}>
                <div className="flex items-center gap-2 w-[186px] shrink-0 min-w-0">
                  <button
                    onClick={() => onUpdateCheckInStatus(show.id, row.modelId, nextCheckIn(row.checkInStatus))}
                    title={`${ci.label} — click to advance`}
                    className="shrink-0 p-0.5 rounded-full hover:bg-white/10 transition-colors">
                    <span className={`block h-2 w-2 rounded-full ${ci.dot}`} />
                  </button>
                  <div className="relative h-6 w-6 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10 shrink-0">
                    {row.model.profile_photo_url
                      ? <Image src={row.model.profile_photo_url} alt="" fill className="object-cover" />
                      : <div className="h-full w-full flex items-center justify-center text-[8px] text-white/25">
                          {row.model.first_name?.[0]}{row.model.last_name?.[0]}
                        </div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white/75 truncate leading-tight">
                      {row.model.first_name} {row.model.last_name}
                    </p>
                    {row.isMulti && (
                      <p className={`text-[10px] leading-tight ${row.isB2B ? "text-red-400" : "text-blue-400/70"}`}>
                        {row.byDesigner.size} walks{row.isB2B && row.minGap < Infinity ? ` · ${row.minGap} slot gap` : ""}
                      </p>
                    )}
                  </div>
                </div>
                {show.designers.map((d, dIdx) => {
                  const cell = row.byDesigner.get(dIdx);
                  const isHot = (() => {
                    if (!cell || !row.isB2B) return false;
                    const prev = row.byDesigner.get(dIdx - 1);
                    const next = row.byDesigner.get(dIdx + 1);
                    if (prev) {
                      const prevD = show.designers[dIdx - 1];
                      if (prevD && (prevD.models.length - 1 - (prev.pos - 1)) + (cell.pos - 1) <= 2) return true;
                    }
                    if (next) {
                      const nextD = show.designers[dIdx + 1];
                      const nextCell = row.byDesigner.get(dIdx + 1)!;
                      if (nextD && (d.models.length - 1 - (cell.pos - 1)) + (nextCell.pos - 1) <= 2) return true;
                    }
                    return false;
                  })();
                  return (
                    <div key={d.id} className="w-[62px] shrink-0 text-center">
                      {cell ? (
                        <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
                          isHot ? "bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-pink-500 text-white"
                        }`}>
                          {cell.pos}
                        </span>
                      ) : (
                        <span className="text-white/8">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-white/[0.08] rounded-xl bg-black/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] flex-wrap gap-y-2">
        <div className="flex bg-white/[0.05] rounded-lg p-0.5 gap-px">
          {(["sequence", "grid", "timeline"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all capitalize ${
                view === v ? "bg-white/12 text-white/90" : "text-white/30 hover:text-white/60"
              }`}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/22">{totalSlots} slots</span>
          {multiCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-full px-2 py-0.5">
              <Repeat className="h-2.5 w-2.5" />{multiCount} multi
            </span>
          )}
          {b2bCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-full px-2 py-0.5">
              <AlertTriangle className="h-2.5 w-2.5" />{b2bCount} B2B
            </span>
          )}
          {checkedIn > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
              <Check className="h-2.5 w-2.5" />{checkedIn}/{totalSlots} in
            </span>
          )}
        </div>
        {view === "timeline" && (
          <div className="flex items-center gap-1.5 text-[11px] text-white/30">
            <Clock className="h-3 w-3" />
            <input
              type="number"
              min={1}
              max={10}
              value={pace}
              onChange={(e) => setPace(Math.max(1, Number(e.target.value) || 2))}
              className="w-10 bg-white/[0.05] border border-white/[0.08] rounded px-1.5 py-0.5 text-white/60 text-center text-[11px] tabular-nums focus:outline-none focus:border-white/20"
            />
            <span>min/walk</span>
          </div>
        )}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-white/20" />
          <Input
            placeholder="Find model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs pl-7 w-[155px] bg-white/[0.04] border-white/[0.08] text-white/70 placeholder:text-white/20"
          />
        </div>
      </div>
      {/* Body */}
      <div className="p-3">
        {view === "grid" ? renderGrid() : renderSequence(view === "timeline")}
      </div>
      {/* Legend */}
      <div className="px-4 py-2 border-t border-white/[0.05] flex items-center gap-4 flex-wrap">
        <span className="text-[9px] uppercase tracking-widest text-white/15 font-semibold">Status</span>
        {CHECK_IN_CYCLE.map((s) => (
          <span key={s} className="flex items-center gap-1 text-[10px] text-white/25">
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${CI[s].dot}`} />
            {CI[s].label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminShowsPage() {
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
  const [filterAssigned, setFilterAssigned] = useState<"all" | "unassigned" | "assigned" | "event" | "picks">("all");
  const [eventModelIds, setEventModelIds] = useState<Set<string>>(new Set());
  const [modelMapShowId, setModelMapShowId] = useState<string | null>(null);
  const [designerPickIds, setDesignerPickIds] = useState<Set<string>>(new Set());
  const [filterDress, setFilterDress] = useState("");

  // Create show dialog
  const [showCreateShow, setShowCreateShow] = useState(false);
  const [newShowName, setNewShowName] = useState("");
  const [newShowDate, setNewShowDate] = useState("");
  const [newShowTime, setNewShowTime] = useState("");
  const [savingShow, setSavingShow] = useState(false);

  // Rename show
  const [renamingShowId, setRenamingShowId] = useState<string | null>(null);
  const [renameShowValue, setRenameShowValue] = useState("");

  // Add designer input
  const [addDesignerShowId, setAddDesignerShowId] = useState<string | null>(null);
  const [newDesignerName, setNewDesignerName] = useState("");

  // Main view toggle: shows builder vs. availability grid
  const [mainView, setMainView] = useState<"shows" | "availability">("shows");

  // Availability state
  type AvailModel = {
    id: string; first_name: string | null; last_name: string | null;
    username: string | null; profile_photo_url: string | null;
    available_dates: string[]; has_responded: boolean;
  };
  const [availModels, setAvailModels] = useState<AvailModel[]>([]);
  const [availTotal, setAvailTotal] = useState(0);
  const [availResponded, setAvailResponded] = useState(0);
  const [availLoading, setAvailLoading] = useState(false);
  const [availGigId, setAvailGigId] = useState<string>("");
  const [availGigs, setAvailGigs] = useState<{ id: string; title: string }[]>([]);
  const [availFilterDay, setAvailFilterDay] = useState<string>("all");

  const supabase = createClient();

  const designerSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadModels(); }, []);

  useEffect(() => {
    loadDesignerPicks(activeDesignerEntryId);
    if (!activeDesignerEntryId && filterAssigned === "picks") setFilterAssigned("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDesignerEntryId]);

  useEffect(() => {
    if (mainView === "availability" && availGigId) loadAvailability(availGigId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainView, availGigId]);

  useEffect(() => {
    if (!selectedEventId) return;
    async function loadAvailGigs() {
      const event = events.find((e) => e.id === selectedEventId);

      // Primary: gigs linked to this event via event_id
      const { data: byEventId } = await (supabase.from("gigs") as any)
        .select("id, title")
        .eq("event_id", selectedEventId)
        .order("start_at", { ascending: true });

      let gigs = byEventId || [];

      // Fallback: gigs in the event's date range (catches unlinked gigs)
      if (gigs.length === 0 && event?.start_date) {
        const from = event.start_date;
        const to = event.end_date || event.start_date;
        const { data: byDate } = await (supabase.from("gigs") as any)
          .select("id, title")
          .gte("start_at", from)
          .lte("start_at", to + "T23:59:59")
          .order("start_at", { ascending: true });
        gigs = byDate || [];
      }

      // Last resort: search by event short name in title
      if (gigs.length === 0 && event?.short_name) {
        const { data: byTitle } = await (supabase.from("gigs") as any)
          .select("id, title")
          .ilike("title", `%${event.short_name}%`)
          .order("start_at", { ascending: true })
          .limit(10);
        gigs = byTitle || [];
      }

      setAvailGigs(gigs);
      if (gigs.length > 0) setAvailGigId(gigs[0].id);
      else setAvailGigId("");
    }
    loadAvailGigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, events]);

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
      .select("id, username, first_name, last_name, profile_photo_url, height, bust, waist, hips, dress_size, shoe_size, instagram_followers")
      .eq("is_approved", true).not("user_id", "is", null).order("first_name", { ascending: true });
    setAllModels((data || []) as ModelInfo[]);
    setLoadingModels(false);
  }

  async function loadEventModels() {
    if (!selectedEventId) return;
    const confirmedIds = new Set<string>();
    const { data: gigs } = await supabase.from("gigs").select("id").eq("event_id", selectedEventId);
    if (gigs?.length) {
      const { data: apps } = await supabase.from("gig_applications").select("model_id").in("gig_id", gigs.map((g) => g.id)).eq("status", "accepted");
      (apps || []).forEach((a) => confirmedIds.add(a.model_id));
    }
    const { data: eventBadge } = await supabase.from("badges").select("id")
      .eq("event_id", selectedEventId).eq("badge_type", "event").eq("is_active", true)
      .maybeSingle() as { data: { id: string } | null };
    if (eventBadge) {
      const { data: holders } = await supabase.from("model_badges").select("model_id")
        .eq("badge_id", eventBadge.id) as { data: { model_id: string }[] | null };
      (holders || []).forEach((h) => confirmedIds.add(h.model_id));
    }
    setEventModelIds(confirmedIds);
  }

  async function loadDesignerPicks(designerEntryId: string | null) {
    if (!designerEntryId || !selectedEventId) { setDesignerPickIds(new Set()); return; }
    const designer = shows.flatMap((s) => s.designers).find((d) => d.id === designerEntryId);
    if (!designer?.brand_id) { setDesignerPickIds(new Set()); return; }
    const res = await fetch(`/api/admin/msw-casting/picks?brand_id=${designer.brand_id}&event_id=${selectedEventId}`);
    if (res.ok) {
      const { picks } = await res.json();
      setDesignerPickIds(new Set(picks as string[]));
    }
  }

  // ─── Computed ────────────────────────────────────────────────────────────

  const modelAssignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    shows.forEach((s) => s.designers.forEach((d) => d.models.forEach((m) => { counts[m.model_id] = (counts[m.model_id] || 0) + 1; })));
    return counts;
  }, [shows]);

  const modelConflictsByDesigner = useMemo(() => {
    const modelAssignments: Record<string, { showId: string; showName: string; showDate: string | null; showTime: string | null; designerName: string }[]> = {};
    shows.forEach((s) => {
      s.designers.forEach((d) => d.models.forEach((m) => {
        if (!modelAssignments[m.model_id]) modelAssignments[m.model_id] = [];
        modelAssignments[m.model_id].push({ showId: s.id, showName: s.name, showDate: s.show_date, showTime: s.show_time, designerName: d.designer_name });
      }));
    });
    const result: Record<string, Record<string, string>> = {};
    shows.forEach((s) => {
      s.designers.forEach((d) => {
        const conflicts: Record<string, string> = {};
        d.models.forEach((m) => {
          const assignments = modelAssignments[m.model_id] || [];
          const warnings: string[] = [];
          const byDate: Record<string, typeof assignments> = {};
          assignments.forEach((a) => { const key = a.showDate || "unscheduled"; if (!byDate[key]) byDate[key] = []; byDate[key].push(a); });
          for (const [date, dateAssignments] of Object.entries(byDate)) {
            if (dateAssignments.length < 2) continue;
            if (dateAssignments.length >= 4) {
              const dateLabel = date === "unscheduled" ? "unscheduled" : new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
              warnings.push(`${dateAssignments.length} walks on ${dateLabel}`);
            }
            const withTimes = dateAssignments.filter((a) => a.showTime).map((a) => ({ ...a, minutes: parseTimeToMinutes(a.showTime)! }));
            if (withTimes.length >= 2) {
              withTimes.sort((a, b) => a.minutes - b.minutes);
              for (let i = 0; i < withTimes.length; i++) {
                for (let j = i + 1; j < withTimes.length; j++) {
                  if (withTimes[i].showId === withTimes[j].showId) continue;
                  const diff = withTimes[j].minutes - withTimes[i].minutes;
                  if (diff === 0) warnings.push(`Time conflict: ${withTimes[i].showName} and ${withTimes[j].showName} at same time`);
                  else if (diff <= 60) warnings.push(`Back-to-back: ${withTimes[i].showName} (${withTimes[i].showTime}) → ${withTimes[j].showName} (${withTimes[j].showTime})`);
                }
              }
            }
            const withoutTimes = dateAssignments.filter((a) => !a.showTime);
            const uniqueShowsNoTime = new Set(withoutTimes.map((a) => a.showId));
            if (uniqueShowsNoTime.size >= 2 && withTimes.length === 0) {
              warnings.push(`${dateAssignments.length} shows on same day (no times set)`);
            }
          }
          if (warnings.length > 0) conflicts[m.model_id] = [...new Set(warnings)].join(" · ");
        });
        result[d.id] = conflicts;
      });
    });
    return result;
  }, [shows]);

  const allDesignersList = useMemo(() => {
    return shows.flatMap((s) => s.designers.map((d) => ({ id: d.id, designerName: d.designer_name, showName: s.name })));
  }, [shows]);

  const showModelWalkMaps = useMemo(() => {
    const maps: Record<string, Record<string, { count: number; designers: string[]; hasBackToBack: boolean; minGap: number }>> = {};
    shows.forEach((show) => {
      const walkMap: Record<string, { count: number; designers: string[]; designerIndices: number[] }> = {};
      show.designers.forEach((d, dIdx) => {
        d.models.forEach((m) => {
          if (!walkMap[m.model_id]) walkMap[m.model_id] = { count: 0, designers: [], designerIndices: [] };
          walkMap[m.model_id].count++;
          walkMap[m.model_id].designers.push(d.designer_name);
          walkMap[m.model_id].designerIndices.push(dIdx);
        });
      });
      const result: Record<string, { count: number; designers: string[]; hasBackToBack: boolean; minGap: number }> = {};
      for (const [modelId, info] of Object.entries(walkMap)) {
        let minGap = Infinity;
        if (info.designerIndices.length > 1) {
          const sorted = [...info.designerIndices].sort((a, b) => a - b);
          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i + 1] - sorted[i] !== 1) continue; // only care about adjacent designers
            const currDesigner = show.designers[sorted[i]];
            const nextDesigner = show.designers[sorted[i + 1]];
            if (!currDesigner || !nextDesigner) continue;
            const posInCurr = currDesigner.models.findIndex((m) => m.model_id === modelId);
            const posInNext = nextDesigner.models.findIndex((m) => m.model_id === modelId);
            // Gap = models walking after this model in curr designer + models walking before in next designer
            const gap = (currDesigner.models.length - 1 - posInCurr) + posInNext;
            if (gap < minGap) minGap = gap;
          }
        }
        result[modelId] = { count: info.count, designers: info.designers, hasBackToBack: minGap <= 2, minGap };
      }
      maps[show.id] = result;
    });
    return maps;
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
    else if (filterAssigned === "picks") list = list.filter((m) => designerPickIds.has(m.id));
    if (filterDress) {
      const q = filterDress.toLowerCase();
      list = list.filter((m) => m.dress_size?.toLowerCase().includes(q));
    }
    return list;
  }, [allModels, modelSearch, filterAssigned, modelAssignmentCounts, eventModelIds, designerPickIds, filterDress]);

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

  async function loadAvailability(gigId: string) {
    if (!gigId) return;
    setAvailLoading(true);
    const res = await fetch(`/api/admin/gig-availability?gig_id=${gigId}`);
    if (res.ok) {
      const data = await res.json();
      setAvailModels(data.models || []);
      setAvailTotal(data.total || 0);
      setAvailResponded(data.responded || 0);
    }
    setAvailLoading(false);
  }

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

  async function duplicateShow(showId: string) {
    const res = await fetch(`/api/admin/lineups/${showId}/duplicate`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setShows((prev) => [...prev, data]);
      setExpandedShowId(data.id);
      toast.success("Show duplicated");
    } else { const err = await res.json(); toast.error(err.error || "Failed to duplicate"); }
  }

  async function deleteShow(showId: string) {
    const res = await fetch(`/api/admin/lineups/${showId}`, { method: "DELETE" });
    if (res.ok) {
      setShows((prev) => prev.filter((s) => s.id !== showId));
      if (expandedShowId === showId) setExpandedShowId(null);
      toast.success("Show deleted");
    }
  }

  async function renameShow(showId: string, newName: string) {
    const current = shows.find((s) => s.id === showId);
    if (!newName.trim() || newName.trim() === current?.name) { setRenamingShowId(null); return; }
    const res = await fetch(`/api/admin/lineups/${showId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setShows((prev) => prev.map((s) => s.id === showId ? { ...s, name: newName.trim() } : s));
      toast.success("Show renamed");
    } else { toast.error("Failed to rename show"); }
    setRenamingShowId(null);
  }

  async function updateShowStatus(showId: string, status: string) {
    const res = await fetch(`/api/admin/lineups/${showId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) { setShows((prev) => prev.map((s) => s.id === showId ? { ...s, status } : s)); toast.success(`Status: ${status}`); }
  }

  async function updateShowDateTime(showId: string, field: "show_date" | "show_time", value: string) {
    const payload = { [field]: value || null };
    const res = await fetch(`/api/admin/lineups/${showId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { setShows((prev) => prev.map((s) => s.id === showId ? { ...s, [field]: value || null } : s)); toast.success("Updated"); }
    else { toast.error("Failed to update"); }
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

  const reorderDesigners = useCallback(async (showId: string, orderedDesignerIds: string[]) => {
    setShows((prev) => prev.map((s) => {
      if (s.id !== showId) return s;
      const designerMap = new Map(s.designers.map((d) => [d.id, d]));
      return {
        ...s,
        designers: orderedDesignerIds.map((id, i) => {
          const d = designerMap.get(id);
          return d ? { ...d, designer_order: i } : null;
        }).filter(Boolean) as DesignerEntry[],
      };
    }));
    await fetch(`/api/admin/lineups/${showId}/designers`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ordered_designer_ids: orderedDesignerIds }),
    });
  }, []);

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

  async function bulkRemoveModels(designerEntryId: string, modelIds: string[]) {
    const res = await fetch(`/api/admin/lineups/${designerEntryId}/models`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_ids: modelIds }),
    });
    if (res.ok) {
      setShows((prev) => prev.map((s) => ({
        ...s, designers: s.designers.map((d) => d.id === designerEntryId ? { ...d, models: d.models.filter((m) => !modelIds.includes(m.model_id)) } : d),
      })));
      toast.success(`${modelIds.length} model(s) removed`);
    }
  }

  async function bulkMoveModels(fromDesignerEntryId: string, toDesignerEntryId: string, modelIds: string[]) {
    const delRes = await fetch(`/api/admin/lineups/${fromDesignerEntryId}/models`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_ids: modelIds }),
    });
    if (!delRes.ok) { toast.error("Failed to remove models"); return; }
    const addRes = await fetch(`/api/admin/lineups/${toDesignerEntryId}/models`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_ids: modelIds }),
    });
    if (addRes.ok) {
      const newModels = await addRes.json();
      setShows((prev) => prev.map((s) => ({
        ...s,
        designers: s.designers.map((d) => {
          if (d.id === fromDesignerEntryId) return { ...d, models: d.models.filter((m) => !modelIds.includes(m.model_id)) };
          if (d.id === toDesignerEntryId) return { ...d, models: [...d.models, ...newModels].sort((a, b) => a.walk_order - b.walk_order) };
          return d;
        }),
      })));
      toast.success(`${modelIds.length} model(s) moved`);
    } else { toast.error("Failed to add models to target"); }
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
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const show = shows.find((s) => s.id === showId);
      a.download = `show-${show?.name?.replace(/\s+/g, "-").toLowerCase() || showId}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else toast.error("Export failed");
  }

  async function exportFullSchedule() {
    const res = await fetch(`/api/admin/lineups/day-sheet?event_id=${selectedEventId}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ev = events.find((e) => e.id === selectedEventId);
      a.download = `schedule-${ev?.name?.replace(/\s+/g, "-").toLowerCase() || "event"}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else toast.error("Export failed");
  }

  async function updateCheckInStatus(showId: string, modelId: string, status: string) {
    setShows((prev) => prev.map((s) => s.id !== showId ? s : {
      ...s,
      designers: s.designers.map((d) => ({
        ...d,
        models: d.models.map((m) => m.model_id !== modelId ? m : { ...m, check_in_status: status }),
      })),
    }));
    await fetch(`/api/admin/lineups/${showId}/models/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: modelId, check_in_status: status }),
    });
  }

  function toggleModelSelection(modelId: string) {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) { next.delete(modelId); } else { next.add(modelId); }
      return next;
    });
  }

  function handleDesignerDragEnd(showId: string) {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const show = shows.find((s) => s.id === showId);
      if (!show) return;
      const ids = show.designers.map((d) => d.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      reorderDesigners(showId, arrayMove(ids, oldIndex, newIndex));
    };
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-white/20" />
      </div>
    );
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const totalModelsAssigned = new Set(shows.flatMap((s) => s.designers.flatMap((d) => d.models.map((m) => m.model_id)))).size;
  const totalDesigners = shows.reduce((sum, s) => sum + s.designers.length, 0);
  const activeDesignerShow = activeDesignerEntryId ? shows.find((s) => s.designers.some((d) => d.id === activeDesignerEntryId)) : null;
  const activeDesigner = activeDesignerShow?.designers.find((d) => d.id === activeDesignerEntryId);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">

      {/* ── Command Bar ─────────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.06] px-4 py-2.5 flex items-center gap-3 flex-wrap bg-black/30 backdrop-blur-sm z-10 shrink-0">
        <Button variant="ghost" size="sm" asChild className="text-white/35 hover:text-white/70 hover:bg-white/5 h-8 px-2.5">
          <Link href="/admin"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Admin</Link>
        </Button>
        <div className="h-4 w-px bg-white/10" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40 hidden sm:block">Show Builder</p>

        {/* Main view tabs */}
        <div className="flex items-center gap-0.5 bg-white/[0.04] border border-white/[0.07] rounded-lg p-0.5">
          {([
            { key: "shows", label: "Lineups" },
            { key: "availability", label: "Availability" },
          ] as { key: typeof mainView; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMainView(key)}
              className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md transition-all ${
                mainView === key
                  ? "bg-white/12 text-white/90"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              {key === "availability" && <CalendarCheck className="h-3 w-3" />}
              {label}
              {key === "availability" && availTotal > 0 && (
                <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 rounded-full px-1.5 py-0.5 leading-none tabular-nums">
                  {availResponded}/{availTotal}
                </span>
              )}
            </button>
          ))}
        </div>

        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger className="w-[240px] h-8 border-white/10 bg-white/[0.04] text-white/75 text-sm hover:border-white/20 transition-colors">
            <SelectValue placeholder="Select event" />
          </SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name} ({e.year})</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedEvent && (
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {selectedEvent.start_date && (
              <span className="flex items-center gap-1.5 text-[11px] text-white/35 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1">
                <Calendar className="h-3 w-3" />
                {new Date(selectedEvent.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
            {[
              { v: shows.length, label: "shows" },
              { v: totalDesigners, label: "designers" },
              { v: totalModelsAssigned, label: "models" },
            ].map(({ v, label }) => (
              <span key={label} className="text-[11px] text-white/35 bg-white/[0.04] border border-white/[0.07] rounded-full px-2.5 py-1 tabular-nums">
                <span className="text-white/60 font-semibold">{v}</span> {label}
              </span>
            ))}
            {shows.length > 0 && (
              <button
                onClick={exportFullSchedule}
                className="flex items-center gap-1.5 text-[11px] text-white/35 bg-white/[0.04] border border-white/[0.07] hover:border-white/20 hover:text-white/60 rounded-full px-3 py-1 transition-all">
                <FileText className="h-3 w-3" /> Full Schedule
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Availability Grid ───────────────────────────────────────────── */}
      {mainView === "availability" && (() => {
        const MSW_DAYS = [
          { date: "2026-05-26", label: "Mon 5/26" },
          { date: "2026-05-27", label: "Tue 5/27" },
          { date: "2026-05-28", label: "Wed 5/28" },
          { date: "2026-05-29", label: "Thu 5/29" },
          { date: "2026-05-30", label: "Fri 5/30" },
          { date: "2026-05-31", label: "Sat 5/31" },
        ];
        const filteredAvail = availFilterDay === "all"
          ? availModels
          : availModels.filter((m) => m.available_dates.includes(availFilterDay));
        const notResponded = availModels.filter((m) => !m.has_responded).length;

        return (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3 flex-wrap shrink-0 bg-black/10">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-pink-400" />
                <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/50">Model Availability</p>
              </div>
              {/* Gig selector */}
              {availGigs.length > 1 ? (
                <select
                  value={availGigId}
                  onChange={(e) => setAvailGigId(e.target.value)}
                  className="h-7 text-xs bg-white/[0.04] border border-white/[0.08] text-white/70 rounded-lg px-2 focus:outline-none focus:border-pink-500/40"
                >
                  {availGigs.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              ) : availGigs.length === 1 ? (
                <span className="text-[11px] text-white/35 truncate max-w-[260px]">{availGigs[0].title}</span>
              ) : (
                <span className="text-[11px] text-amber-400/70">No gig found for this event</span>
              )}
              <div className="flex items-center gap-2 ml-2">
                <span className="text-[11px] text-white/40 tabular-nums">
                  <span className="text-emerald-400 font-semibold">{availResponded}</span>/{availTotal} responded
                </span>
                {notResponded > 0 && (
                  <span className="text-[10px] text-amber-400/70 tabular-nums">
                    · {notResponded} pending
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 ml-auto flex-wrap">
                {/* Day filter pills */}
                {[{ date: "all", label: `All · ${availModels.length}` },
                  ...MSW_DAYS.map((d) => ({
                    date: d.date,
                    label: `${d.label} · ${availModels.filter((m) => m.available_dates.includes(d.date)).length}`,
                  }))
                ].map(({ date, label }) => (
                  <button
                    key={date}
                    onClick={() => setAvailFilterDay(date)}
                    className={`text-[10px] uppercase tracking-wide font-medium px-2.5 py-1 rounded-full border transition-all ${
                      availFilterDay === date
                        ? "bg-pink-500 border-pink-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.35)]"
                        : "border-white/[0.08] text-white/30 hover:border-white/20 hover:text-white/55"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => loadAvailability(availGigId)}
                  className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 border border-white/[0.08] hover:border-white/20 rounded-full px-2.5 py-1 transition-all"
                >
                  <RefreshCw className="h-2.5 w-2.5" /> Refresh
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-5">
              {availLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-5 w-5 animate-spin text-white/20" />
                </div>
              ) : availModels.length === 0 ? (
                <div className="text-center py-20">
                  <CalendarCheck className="h-8 w-8 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/30">No confirmed models found for this event&apos;s gig.</p>
                  <p className="text-xs text-white/20 mt-1">Make sure the gig has accepted applications.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-white/[0.07] overflow-hidden">
                  {/* Header row */}
                  <div className="flex items-center bg-black/30 border-b border-white/[0.07] px-4 py-2.5 sticky top-0 z-10">
                    <div className="w-[200px] shrink-0 text-[10px] uppercase tracking-[0.18em] font-semibold text-white/25">Model</div>
                    {MSW_DAYS.map((d) => (
                      <div key={d.date} className="flex-1 text-center text-[10px] uppercase tracking-wide font-semibold text-white/25">
                        {d.label}
                      </div>
                    ))}
                    <div className="w-[80px] shrink-0 text-right text-[10px] uppercase tracking-wide font-semibold text-white/25">Days</div>
                  </div>

                  {/* Model rows */}
                  <div className="divide-y divide-white/[0.04]">
                    {filteredAvail.map((m) => (
                      <div key={m.id} className="flex items-center px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                        {/* Model info */}
                        <div className="w-[200px] shrink-0 flex items-center gap-2.5 min-w-0">
                          <div className="relative h-7 w-7 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10 shrink-0">
                            {m.profile_photo_url ? (
                              <Image src={m.profile_photo_url} alt="" fill className="object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[8px] text-white/25">
                                {m.first_name?.[0]}{m.last_name?.[0]}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white/80 truncate leading-tight">
                              {m.first_name} {m.last_name}
                            </p>
                            {!m.has_responded && (
                              <p className="text-[9px] text-amber-400/60 leading-tight">No response</p>
                            )}
                          </div>
                        </div>

                        {/* Day cells */}
                        {MSW_DAYS.map((d) => {
                          const avail = m.available_dates.includes(d.date);
                          return (
                            <div key={d.date} className="flex-1 flex items-center justify-center">
                              {!m.has_responded ? (
                                <span className="h-2 w-2 rounded-full bg-white/[0.08]" title="No response" />
                              ) : avail ? (
                                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 shadow-[0_0_8px_rgba(34,197,94,0.25)]">
                                  <Check className="h-3 w-3 text-emerald-400" />
                                </span>
                              ) : (
                                <span className="h-1 w-1 rounded-full bg-white/10" title="Unavailable" />
                              )}
                            </div>
                          );
                        })}

                        {/* Days count */}
                        <div className="w-[80px] shrink-0 text-right">
                          {m.has_responded ? (
                            <span className={`text-xs font-semibold tabular-nums ${
                              m.available_dates.length === 6 ? "text-emerald-400" :
                              m.available_dates.length >= 3 ? "text-white/70" :
                              m.available_dates.length > 0 ? "text-amber-400" :
                              "text-red-400/70"
                            }`}>
                              {m.available_dates.length}/6
                            </span>
                          ) : (
                            <span className="text-[10px] text-white/20">—</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── 3-Panel Layout ──────────────────────────────────────────────── */}
      {mainView === "shows" && <div className="flex-1 flex overflow-hidden">

        {/* Left — Model Pool */}
        <div className="w-[300px] border-r border-white/[0.06] flex flex-col bg-black/20 shrink-0">
          <div className="px-4 pt-4 pb-3 border-b border-white/[0.06] space-y-3">
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/25">Model Pool</p>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/20" />
              <Input
                placeholder="Search models..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="pl-9 h-9 bg-white/[0.04] border-white/10 text-white/80 placeholder:text-white/20 text-sm focus:border-pink-500/40"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { key: "all" as const, label: `All · ${allModels.length}` },
                  { key: "unassigned" as const, label: "Free" },
                  { key: "assigned" as const, label: "In Lineup" },
                  ...(eventModelIds.size > 0 ? [{ key: "event" as const, label: `Confirmed · ${eventModelIds.size}` }] : []),
                ] as { key: typeof filterAssigned; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterAssigned(key)}
                  className={`text-[10px] uppercase tracking-wide font-medium px-2.5 py-1 rounded-full border transition-all ${
                    filterAssigned === key
                      ? "bg-pink-500 border-pink-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.35)]"
                      : "border-white/[0.08] text-white/30 hover:border-white/20 hover:text-white/55"
                  }`}>
                  {label}
                </button>
              ))}
              {designerPickIds.size > 0 && (
                <button
                  onClick={() => setFilterAssigned(filterAssigned === "picks" ? "all" : "picks")}
                  className={`text-[10px] uppercase tracking-wide font-medium px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
                    filterAssigned === "picks"
                      ? "bg-amber-400 border-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                      : "border-amber-400/20 text-amber-400/60 hover:border-amber-400/50 hover:text-amber-400"
                  }`}>
                  <Star className="h-2.5 w-2.5 fill-current" />Picks · {designerPickIds.size}
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                placeholder="Filter by dress size (e.g. 4, XS)"
                value={filterDress}
                onChange={(e) => setFilterDress(e.target.value)}
                className="h-7 text-xs pr-7 bg-white/[0.03] border-white/[0.07] text-white/65 placeholder:text-white/20"
              />
              {filterDress && (
                <button onClick={() => setFilterDress("")} className="absolute right-2 top-1.5 text-white/25 hover:text-white/55 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {selectedModelIds.size > 0 && activeDesignerEntryId && (
            <div className="px-3 py-2 border-b border-white/[0.06] bg-pink-500/[0.05] flex items-center gap-2">
              <Button
                size="sm"
                onClick={addModelsToDesigner}
                className="flex-1 h-8 text-xs bg-pink-500 hover:bg-pink-600 border-0 shadow-[0_0_16px_rgba(236,72,153,0.3)]">
                <UserPlus className="h-3 w-3 mr-1.5" />
                Add {selectedModelIds.size} to {activeDesigner?.designer_name || "Lineup"}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-white/35 hover:text-white/65 px-2" onClick={() => setSelectedModelIds(new Set())}>
                Clear
              </Button>
            </div>
          )}
          {selectedModelIds.size > 0 && !activeDesignerEntryId && (
            <div className="px-3 py-2.5 border-b border-white/[0.06] bg-amber-500/[0.04]">
              <p className="text-xs text-amber-400/75 text-center">Click a designer to assign models</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
            {loadingModels ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-white/15" /></div>
            ) : filteredModels.length === 0 ? (
              <p className="text-sm text-white/20 text-center py-10">No models found</p>
            ) : filteredModels.map((model) => (
              <ModelPoolCard
                key={model.id}
                model={model}
                assignedCount={modelAssignmentCounts[model.id] || 0}
                isSelected={selectedModelIds.has(model.id)}
                onToggle={() => toggleModelSelection(model.id)}
                isPick={designerPickIds.has(model.id)}
              />
            ))}
          </div>
        </div>

        {/* Center — Shows & Designers */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between shrink-0">
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/25">
              Shows <span className="text-white/15">({shows.length})</span>
            </p>
            <div className="flex items-center gap-2">
              {shows.length > 1 && (
                <button
                  onClick={() => setExpandedShowId(expandedShowId ? null : shows[0]?.id || null)}
                  className="text-[11px] text-white/30 hover:text-white/60 border border-white/[0.07] hover:border-white/15 rounded-full px-3 py-1 transition-all">
                  {expandedShowId ? "Collapse" : "Expand"}
                </button>
              )}
              <button
                onClick={() => setShowCreateShow(true)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-white bg-pink-500 hover:bg-pink-600 border-0 rounded-full px-3 py-1.5 transition-all shadow-[0_0_14px_rgba(236,72,153,0.3)]">
                <Plus className="h-3 w-3" /> New Show
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {shows.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="h-10 w-10 mx-auto mb-3 text-white/10" />
                <p className="text-sm text-white/25">No shows yet</p>
                <p className="text-xs text-white/15 mt-1">Click &quot;New Show&quot; to get started</p>
              </div>
            ) : shows.map((show) => {
              const isExpanded = expandedShowId === show.id;
              const statusBorder = show.status === "confirmed"
                ? "border-l-emerald-400/60"
                : show.status === "completed"
                  ? "border-l-blue-400/50"
                  : "border-l-amber-400/40";
              const statusPill = show.status === "confirmed"
                ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                : show.status === "completed"
                  ? "text-blue-400 bg-blue-400/10 border-blue-400/20"
                  : "text-amber-400 bg-amber-400/10 border-amber-400/20";
              const showModelCount = show.designers.reduce((s, d) => s + d.models.length, 0);
              const designerIds = show.designers.map((d) => d.id);

              return (
                <div
                  key={show.id}
                  className={`border-l-[3px] border border-white/[0.07] rounded-xl overflow-hidden transition-all duration-200 ${statusBorder} ${isExpanded ? "shadow-[0_4px_32px_rgba(0,0,0,0.4)]" : "hover:border-white/[0.12]"}`}>

                  {/* Show header */}
                  <div
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${isExpanded ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"}`}
                    onClick={() => setExpandedShowId(isExpanded ? null : show.id)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-white/20 shrink-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        {renamingShowId === show.id ? (
                          <Input
                            value={renameShowValue}
                            onChange={(e) => setRenameShowValue(e.target.value)}
                            className="h-7 text-sm font-semibold w-[220px] bg-white/5 border-pink-500/40 text-white/90"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.stopPropagation(); renameShow(show.id, renameShowValue); }
                              if (e.key === "Escape") { e.stopPropagation(); setRenamingShowId(null); }
                            }}
                            onBlur={() => renameShow(show.id, renameShowValue)}
                          />
                        ) : (
                          <p className="text-sm font-semibold uppercase tracking-wide text-white/85 truncate">{show.name}</p>
                        )}
                        <p className="text-[11px] text-white/28 mt-0.5">
                          {show.show_date
                            ? new Date(show.show_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                            : "No date"}
                          {show.show_time ? ` · ${show.show_time}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-medium uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${statusPill}`}>
                        {show.status}
                      </span>
                      <span className="text-[10px] text-white/25 bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-0.5 tabular-nums">
                        {show.designers.length}d · {showModelCount}m
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-white/[0.06] px-4 pb-4 space-y-4">
                      {/* Show toolbar */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); setRenamingShowId(show.id); setRenameShowValue(show.name); }}
                          className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 border border-white/[0.07] hover:border-white/18 rounded-lg px-2.5 py-1.5 transition-all">
                          <Pencil className="h-3 w-3" /> Rename
                        </button>
                        <Select value={show.status} onValueChange={(v) => updateShowStatus(show.id, v)}>
                          <SelectTrigger className="w-[120px] h-8 text-xs bg-white/[0.04] border-white/[0.08] text-white/65 hover:border-white/18">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="date"
                          value={show.show_date || ""}
                          className="h-8 text-xs w-[145px] bg-white/[0.04] border-white/[0.08] text-white/65"
                          onChange={(e) => updateShowDateTime(show.id, "show_date", e.target.value)}
                        />
                        <Input
                          type="time"
                          value={show.show_time || ""}
                          className="h-8 text-xs w-[110px] bg-white/[0.04] border-white/[0.08] text-white/65"
                          onChange={(e) => updateShowDateTime(show.id, "show_time", e.target.value)}
                        />
                        <button
                          onClick={() => duplicateShow(show.id)}
                          className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 border border-white/[0.07] hover:border-white/18 rounded-lg px-2.5 py-1.5 transition-all">
                          <Copy className="h-3 w-3" /> Duplicate
                        </button>
                        <button
                          onClick={() => exportShowPdf(show.id)}
                          className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 border border-white/[0.07] hover:border-white/18 rounded-lg px-2.5 py-1.5 transition-all">
                          <Download className="h-3 w-3" /> PDF
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete "${show.name}"?`)) deleteShow(show.id); }}
                          className="flex items-center gap-1.5 text-xs text-red-500/50 hover:text-red-400 border border-white/[0.07] hover:border-red-500/25 rounded-lg px-2.5 py-1.5 transition-all">
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                        <button
                          onClick={() => setModelMapShowId(modelMapShowId === show.id ? null : show.id)}
                          className={`ml-auto flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 border transition-all ${
                            modelMapShowId === show.id
                              ? "bg-pink-500 border-pink-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                              : "text-white/35 hover:text-white/70 border-white/[0.07] hover:border-white/18"
                          }`}>
                          <Eye className="h-3 w-3" /> Model Map
                        </button>
                      </div>

                      {/* Model Map Panel */}
                      {modelMapShowId === show.id && show.designers.length > 0 && (
                        <ModelMapPanel
                          show={show}
                          walkMap={showModelWalkMaps[show.id] || {}}
                          onUpdateCheckInStatus={updateCheckInStatus}
                        />
                      )}

                      {/* Designers section */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/25">
                            Designers <span className="text-white/15">({show.designers.length})</span>
                          </p>
                          {addDesignerShowId === show.id ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                placeholder="Designer / Brand name"
                                value={newDesignerName}
                                onChange={(e) => setNewDesignerName(e.target.value)}
                                className="h-7 text-xs w-[200px] bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/20"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") addDesigner(show.id);
                                  if (e.key === "Escape") { setAddDesignerShowId(null); setNewDesignerName(""); }
                                }}
                              />
                              <Button size="sm" className="h-7 text-xs bg-pink-500 hover:bg-pink-600 border-0" onClick={() => addDesigner(show.id)} disabled={!newDesignerName.trim()}>Add</Button>
                              <button
                                className="text-white/30 hover:text-white/60 transition-colors"
                                onClick={() => { setAddDesignerShowId(null); setNewDesignerName(""); }}>
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddDesignerShowId(show.id)}
                              className="flex items-center gap-1 text-[10px] uppercase tracking-wide font-medium text-white/30 hover:text-pink-400 border border-white/[0.07] hover:border-pink-500/25 rounded-full px-3 py-1 transition-all">
                              <Plus className="h-3 w-3" /> Add Designer
                            </button>
                          )}
                        </div>

                        {show.designers.length === 0 ? (
                          <p className="text-xs text-white/20 text-center py-5">No designers yet. Click &quot;Add Designer&quot; above.</p>
                        ) : (
                          <DndContext
                            sensors={designerSensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDesignerDragEnd(show.id)}>
                            <SortableContext items={designerIds} strategy={verticalListSortingStrategy}>
                              <div className="space-y-1.5">
                                {show.designers.map((d) => (
                                  <SortableDesignerPanel
                                    key={d.id}
                                    designer={d}
                                    showId={show.id}
                                    isActive={activeDesignerEntryId === d.id}
                                    onActivate={() => setActiveDesignerEntryId(activeDesignerEntryId === d.id ? null : d.id)}
                                    onRemoveModel={removeModel}
                                    onReorder={reorderModels}
                                    onDeleteDesigner={deleteDesigner}
                                    onRenameDesigner={renameDesigner}
                                    onMoveDesigner={moveDesigner}
                                    onBulkRemove={bulkRemoveModels}
                                    onBulkMove={bulkMoveModels}
                                    onUpdateOutfitNotes={updateOutfitNotes}
                                    modelConflicts={modelConflictsByDesigner[d.id] || {}}
                                    otherShows={shows.filter((s) => s.id !== show.id).map((s) => ({ id: s.id, name: s.name, show_date: s.show_date }))}
                                    allDesigners={allDesignersList}
                                    showModelWalkMap={showModelWalkMaps[show.id] || {}}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — Schedule Overview */}
        <div className="w-[232px] border-l border-white/[0.06] flex flex-col bg-black/20 shrink-0">
          <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/25">Schedule</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {Object.keys(dayOverview).length === 0 ? (
              <p className="text-xs text-white/18 text-center py-10">No shows</p>
            ) : Object.entries(dayOverview).sort(([a], [b]) => a.localeCompare(b)).map(([date, info]) => (
              <div key={date} className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/22 px-0.5 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 shrink-0" />
                  {date === "Unscheduled"
                    ? "Unscheduled"
                    : new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </p>
                {info.shows.sort((a, b) => a.show_order - b.show_order).map((s) => {
                  const dot = s.status === "confirmed" ? "bg-emerald-400" : s.status === "completed" ? "bg-blue-400" : "bg-amber-400";
                  return (
                    <button
                      key={s.id}
                      onClick={() => setExpandedShowId(s.id)}
                      className={`w-full text-left rounded-lg border px-2.5 py-2 transition-all ${
                        expandedShowId === s.id
                          ? "border-pink-500/40 bg-pink-500/[0.06]"
                          : "border-white/[0.06] bg-white/[0.01] hover:border-white/14 hover:bg-white/[0.03]"
                      }`}>
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${dot} shrink-0`} />
                        <span className="truncate text-[11px] font-medium text-white/65 uppercase tracking-wide">{s.name}</span>
                      </div>
                      {s.show_time && (
                        <span className="flex items-center gap-1 mt-1 ml-[18px] text-[10px] text-white/25">
                          <Clock className="h-2.5 w-2.5" />{s.show_time}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 ml-[18px] text-[10px] text-white/20 tabular-nums">
                        <span>{s.designers.length}d</span>
                        <span>·</span>
                        <span>{s.designers.reduce((sum, d) => sum + d.models.length, 0)}m</span>
                      </div>
                    </button>
                  );
                })}
                <p className="text-[10px] text-white/18 px-0.5 tabular-nums">
                  {info.shows.length} show{info.shows.length !== 1 ? "s" : ""} · {info.totalDesigners}d · {info.totalModels}m
                </p>
              </div>
            ))}

            {shows.length > 0 && (
              <div className="border-t border-white/[0.06] pt-4 space-y-2">
                {[
                  { label: "Total Shows", value: shows.length },
                  { label: "Designers", value: totalDesigners },
                  { label: "Models", value: totalModelsAssigned },
                  { label: "Walk Slots", value: shows.reduce((s, sh) => s + sh.designers.reduce((d, de) => d + de.models.length, 0), 0) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-0.5">
                    <span className="text-[10px] text-white/22 uppercase tracking-wide">{label}</span>
                    <span className="text-xs font-semibold text-white/45 tabular-nums">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>}

      {/* Create Show Dialog */}
      <Dialog open={showCreateShow} onOpenChange={setShowCreateShow}>
        <DialogContent className="max-w-md bg-zinc-950 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white/85 uppercase tracking-wide text-sm">New Show</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-semibold">Show Name</Label>
              <Input
                placeholder="e.g. Opening Night, Daytime Show, Emerging Designers"
                value={newShowName}
                onChange={(e) => setNewShowName(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08] text-white/85 placeholder:text-white/20 focus:border-pink-500/40"
                onKeyDown={(e) => { if (e.key === "Enter" && newShowName && !savingShow) createShow(); }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-semibold">Date</Label>
                <Input
                  type="date"
                  value={newShowDate}
                  onChange={(e) => setNewShowDate(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white/75"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-semibold">Time</Label>
                <Input
                  type="time"
                  value={newShowTime}
                  onChange={(e) => setNewShowTime(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white/75"
                />
              </div>
            </div>
            <Button
              onClick={createShow}
              disabled={!newShowName || savingShow}
              className="w-full bg-pink-500 hover:bg-pink-600 border-0 shadow-[0_0_20px_rgba(236,72,153,0.25)] disabled:opacity-40">
              {savingShow ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Show
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
