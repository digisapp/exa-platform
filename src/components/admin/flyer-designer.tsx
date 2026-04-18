"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  type FlyerDesignSettings,
  type FlyerTextElement,
  DEFAULT_DESIGN,
  FLYER_PRESETS,
  TEXT_PRESETS,
} from "@/types/flyer-design";
import { useState, useEffect } from "react";
import {
  RotateCcw,
  Upload,
  Trash2,
  Plus,
  Type,
  ChevronDown,
  ChevronRight,
  Italic,
  Save,
  FolderOpen,
} from "lucide-react";

interface FlyerDesignerProps {
  settings: FlyerDesignSettings;
  onChange: (settings: FlyerDesignSettings) => void;
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="relative w-7 h-7 rounded-md border border-white/10 overflow-hidden cursor-pointer shrink-0">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
      />
      <div className="w-full h-full" style={{ backgroundColor: value }} />
    </label>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full text-left"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-white/30" />
        ) : (
          <ChevronRight className="w-3 h-3 text-white/30" />
        )}
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
          {title}
        </h3>
      </button>
      {open && children}
    </div>
  );
}

interface SavedTemplate {
  id: string;
  name: string;
  settings: FlyerDesignSettings;
  updated_at: string;
}

export function FlyerDesigner({ settings, onChange }: FlyerDesignerProps) {
  const [expandedTextId, setExpandedTextId] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);

  // Load saved templates
  useEffect(() => {
    fetch("/api/admin/flyers/templates")
      .then((r) => r.json())
      .then((d) => setSavedTemplates(d.templates || []))
      .catch(() => {});
  }, []);

  async function saveTemplate() {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/flyers/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: saveName.trim(), settings }),
      });
      if (res.ok) {
        setSaveName("");
        setShowSaveInput(false);
        const data = await fetch("/api/admin/flyers/templates").then((r) => r.json());
        setSavedTemplates(data.templates || []);
      }
    } catch {}
    setSaving(false);
  }

  async function updateTemplate(id: string) {
    try {
      const res = await fetch("/api/admin/flyers/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, settings }),
      });
      if (!res.ok) throw new Error();
      const data = await fetch("/api/admin/flyers/templates").then((r) => r.json());
      setSavedTemplates(data.templates || []);
    } catch {
      alert("Failed to update template");
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      await fetch(`/api/admin/flyers/templates?id=${id}`, { method: "DELETE" });
      setSavedTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert("Failed to delete template");
    }
  }

  function update(partial: Partial<FlyerDesignSettings>) {
    onChange({ ...settings, ...partial });
  }

  function updateGradient(index: number, color: string) {
    const next = [...settings.gradientColors] as [string, string, string, string, string];
    next[index] = color;
    update({ gradientColors: next });
  }

  function addTextElement(preset: (typeof TEXT_PRESETS)[number]) {
    const newEl: FlyerTextElement = {
      ...preset.element,
      id: `text-${Date.now()}`,
    };
    update({ textElements: [...settings.textElements, newEl] });
    setExpandedTextId(newEl.id);
  }

  function updateTextElement(id: string, partial: Partial<FlyerTextElement>) {
    update({
      textElements: settings.textElements.map((t) =>
        t.id === id ? { ...t, ...partial } : t
      ),
    });
  }

  function removeTextElement(id: string) {
    update({ textElements: settings.textElements.filter((t) => t.id !== id) });
    if (expandedTextId === id) setExpandedTextId(null);
  }

  function duplicateTextElement(el: FlyerTextElement) {
    const dup: FlyerTextElement = { ...el, id: `text-${Date.now()}`, x: el.x + 20, y: el.y + 20 };
    update({ textElements: [...settings.textElements, dup] });
  }

  return (
    <div className="space-y-4 text-sm">
      {/* ── Saved Templates ── */}
      <Section title="Saved Templates">
        {/* Save current design */}
        {showSaveInput ? (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveTemplate()}
              placeholder="Template name..."
              autoFocus
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
            />
            <button
              onClick={saveTemplate}
              disabled={saving || !saveName.trim()}
              className="px-3 py-2 rounded-lg bg-pink-500/20 border border-pink-500/30 text-pink-400 text-xs font-semibold hover:bg-pink-500/30 disabled:opacity-50 transition-all"
            >
              {saving ? "..." : "Save"}
            </button>
            <button
              onClick={() => { setShowSaveInput(false); setSaveName(""); }}
              className="px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/60 transition-all"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSaveInput(true)}
            className="flex items-center gap-1.5 px-3 py-2 w-full rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs text-white/60 hover:text-white/80"
          >
            <Save className="w-3.5 h-3.5" />
            Save Current Design
          </button>
        )}

        {/* Template list */}
        {savedTemplates.length > 0 && (
          <div className="space-y-1.5">
            {savedTemplates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 group"
              >
                <FolderOpen className="w-3.5 h-3.5 text-white/30 shrink-0" />
                <button
                  onClick={() => onChange({ ...DEFAULT_DESIGN, ...tmpl.settings })}
                  className="flex-1 text-left text-xs text-white/70 hover:text-white truncate"
                  title={`Load "${tmpl.name}"`}
                >
                  {tmpl.name}
                </button>
                <button
                  onClick={() => updateTemplate(tmpl.id)}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 text-white/30 hover:text-white/60 transition-all"
                  title="Overwrite with current design"
                >
                  <Save className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteTemplate(tmpl.id)}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {savedTemplates.length === 0 && !showSaveInput && (
          <p className="text-[10px] text-white/25">No saved templates yet</p>
        )}
      </Section>

      {/* ── Color Presets ── */}
      <Section title="Color Presets">
        <div className="grid grid-cols-3 gap-2">
          {FLYER_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() =>
                onChange({
                  ...preset.settings,
                  textElements: settings.textElements,
                  overlays: settings.overlays,
                })
              }
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left"
            >
              <div className="flex -space-x-0.5">
                {preset.settings.gradientColors.slice(0, 3).map((c, i) => (
                  <div key={i} className="w-3.5 h-3.5 rounded-full border border-black/30" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="text-xs text-white/60 truncate">{preset.name}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Text Elements ── */}
      <Section title="Text Elements">
        {/* Quick add buttons */}
        <div className="flex flex-wrap gap-2">
          {TEXT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => addTextElement(preset)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs text-white/60 hover:text-white/80"
            >
              <Plus className="w-3.5 h-3.5" />
              {preset.label}
            </button>
          ))}
        </div>

        {/* Text element list */}
        {settings.textElements.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {settings.textElements.map((el) => {
              const isExpanded = expandedTextId === el.id;
              return (
                <div
                  key={el.id}
                  className="rounded-lg bg-white/5 border border-white/10 overflow-hidden"
                >
                  {/* Header row */}
                  <div
                    className="flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-white/5"
                    onClick={() => setExpandedTextId(isExpanded ? null : el.id)}
                  >
                    <Type className="w-3.5 h-3.5 text-pink-400/60 shrink-0" />
                    <span className="text-xs text-white/70 truncate flex-1">
                      {el.text || "Empty text"}
                    </span>
                    <span className="text-[10px] text-white/30">{el.fontSize}px</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); duplicateTextElement(el); }}
                      className="p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white/60"
                      title="Duplicate"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeTextElement(el.id); }}
                      className="p-0.5 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Expanded editor */}
                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 space-y-2.5 border-t border-white/5 pt-2">
                      {/* Text content */}
                      <input
                        type="text"
                        value={el.text}
                        onChange={(e) => updateTextElement(el.id, { text: e.target.value })}
                        placeholder="Type text..."
                        className="w-full bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
                      />

                      {/* Font size + color row */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/40 w-7">Size</span>
                        <input
                          type="range"
                          min={10}
                          max={120}
                          value={el.fontSize}
                          onChange={(e) => updateTextElement(el.id, { fontSize: Number(e.target.value) })}
                          className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:cursor-pointer"
                        />
                        <span className="text-[10px] text-white/50 w-7 text-right">{el.fontSize}</span>
                      </div>

                      {/* Style buttons */}
                      <div className="flex items-center gap-1.5">
                        <ColorInput value={el.color} onChange={(c) => updateTextElement(el.id, { color: c })} />
                        {([400, 600, 900] as const).map((w) => (
                          <button
                            key={w}
                            onClick={() => updateTextElement(el.id, { fontWeight: w })}
                            className={`px-2 py-1 rounded text-[10px] border transition-all ${
                              el.fontWeight === w
                                ? "bg-pink-500/20 border-pink-500/40 text-pink-400"
                                : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                            }`}
                          >
                            {w === 400 ? "Light" : w === 600 ? "Semi" : "Bold"}
                          </button>
                        ))}
                        <button
                          onClick={() => updateTextElement(el.id, { italic: !el.italic })}
                          className={`p-1 rounded border transition-all ${
                            el.italic
                              ? "bg-pink-500/20 border-pink-500/40 text-pink-400"
                              : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                          }`}
                        >
                          <Italic className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => updateTextElement(el.id, { uppercase: !el.uppercase })}
                          className={`px-1.5 py-1 rounded border text-[10px] transition-all ${
                            el.uppercase
                              ? "bg-pink-500/20 border-pink-500/40 text-pink-400"
                              : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
                          }`}
                        >
                          AA
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {settings.textElements.length === 0 && (
          <p className="text-[10px] text-white/25 mt-1">
            No text yet — click a button above to add
          </p>
        )}
      </Section>

      {/* ── Image Overlays ── */}
      <Section title="Image Overlays">
        <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors text-xs text-white/60 hover:text-white/80">
          <Upload className="w-3.5 h-3.5" />
          Upload PNG
          <input
            type="file"
            accept="image/png,image/webp,image/gif"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const formData = new FormData();
              formData.append("file", file);
              try {
                const res = await fetch("/api/admin/flyers/overlay", { method: "POST", body: formData });
                const data = await res.json();
                if (!res.ok) { alert(data.error || "Upload failed"); return; }
                const img = new Image();
                img.src = data.url;
                await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); });
                const natW = img.naturalWidth || 200;
                const natH = img.naturalHeight || 200;
                const scale = Math.min(200 / natW, 300 / natH);
                update({
                  overlays: [
                    ...settings.overlays,
                    {
                      id: `overlay-${Date.now()}`,
                      url: data.url,
                      x: 440,
                      y: 400,
                      width: Math.round(natW * scale),
                      height: Math.round(natH * scale),
                      opacity: 1,
                    },
                  ],
                });
              } catch { alert("Upload failed"); }
              e.target.value = "";
            }}
          />
        </label>

        {settings.overlays.map((overlay) => (
          <div key={overlay.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={overlay.url} alt="overlay" className="w-10 h-10 object-contain rounded bg-black/20" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 shrink-0">Size</span>
                <input type="range" min={30} max={1080} value={overlay.width}
                  onChange={(e) => {
                    const newW = Number(e.target.value);
                    const ratio = overlay.height / overlay.width;
                    update({ overlays: settings.overlays.map((o) => o.id === overlay.id ? { ...o, width: newW, height: Math.round(newW * ratio) } : o) });
                  }}
                  className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 shrink-0">Opacity</span>
                <input type="range" min={10} max={100} value={Math.round(overlay.opacity * 100)}
                  onChange={(e) => update({ overlays: settings.overlays.map((o) => o.id === overlay.id ? { ...o, opacity: Number(e.target.value) / 100 } : o) })}
                  className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <span className="text-[10px] text-white/40 w-6 text-right">{Math.round(overlay.opacity * 100)}%</span>
              </div>
            </div>
            <button onClick={() => update({ overlays: settings.overlays.filter((o) => o.id !== overlay.id) })}
              className="p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </Section>

      {/* ── Model Info (auto per model) ── */}
      <Section title="Model Info (auto)">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Show Name</Label>
            <Switch checked={settings.showModelName} onCheckedChange={(v) => update({ showModelName: v })} />
          </div>
          {settings.showModelName && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40">Name Size</span>
              <input type="range" min={24} max={72} value={settings.modelNameFontSize}
                onChange={(e) => update({ modelNameFontSize: Number(e.target.value) })}
                className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="text-[10px] text-white/50">{settings.modelNameFontSize}px</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Show @Instagram</Label>
            <Switch checked={settings.showInstagram} onCheckedChange={(v) => update({ showInstagram: v })} />
          </div>
        </div>
      </Section>

      {/* ── Gradient Overlays ── */}
      <Section title="Gradient Overlays" defaultOpen={false}>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Top Gradient</Label>
            <Switch checked={settings.showTopGradient} onCheckedChange={(v) => update({ showTopGradient: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Bottom Gradient</Label>
            <Switch checked={settings.showBottomGradient} onCheckedChange={(v) => update({ showBottomGradient: v })} />
          </div>
          <div className="space-y-1.5">
            {(["Top", "Upper", "Mid", "Lower", "Bottom"] as const).map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <ColorInput value={settings.gradientColors[i]} onChange={(c) => updateGradient(i, c)} />
                <span className="text-[10px] text-white/40">{label}</span>
              </div>
            ))}
          </div>
          <div className="h-5 rounded border border-white/10" style={{ background: `linear-gradient(90deg, ${settings.gradientColors.join(", ")})` }} />
        </div>
      </Section>

      {/* ── Decorations ── */}
      <Section title="Decorations" defaultOpen={false}>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Hearts</Label>
            <Switch checked={settings.showHearts} onCheckedChange={(v) => update({ showHearts: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Palm Trees</Label>
            <Switch checked={settings.showPalmTrees} onCheckedChange={(v) => update({ showPalmTrees: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Glow Effects</Label>
            <Switch checked={settings.showGlowEffects} onCheckedChange={(v) => update({ showGlowEffects: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Border Frame</Label>
            <Switch checked={settings.showBorder} onCheckedChange={(v) => update({ showBorder: v })} />
          </div>
          {settings.showBorder && (
            <div className="flex items-center gap-2">
              <ColorInput value={settings.borderColor} onChange={(c) => update({ borderColor: c })} />
              <span className="text-[10px] text-white/40">Border Color</span>
            </div>
          )}
        </div>
      </Section>

      {/* Reset */}
      <button
        onClick={() => onChange({ ...DEFAULT_DESIGN, textElements: settings.textElements, overlays: settings.overlays })}
        className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        <RotateCcw className="w-3 h-3" />
        Reset settings (keeps text + images)
      </button>
    </div>
  );
}
