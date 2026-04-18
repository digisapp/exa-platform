"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  type FlyerDesignSettings,
  DEFAULT_DESIGN,
  FLYER_PRESETS,
} from "@/types/flyer-design";
import { useState, useRef } from "react";
import { RotateCcw, Upload, Trash2, Move } from "lucide-react";
import type { FlyerOverlay } from "@/types/flyer-design";

interface FlyerDesignerProps {
  settings: FlyerDesignSettings;
  onChange: (settings: FlyerDesignSettings) => void;
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [focused, setFocused] = useState(false);

  // Sync from parent when not editing
  const displayValue = focused ? localValue : value;

  function commitValue(v: string) {
    // Accept 3 or 6 digit hex with #
    if (/^#[0-9A-Fa-f]{3}$/.test(v) || /^#[0-9A-Fa-f]{6}$/.test(v)) {
      onChange(v);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="relative w-8 h-8 rounded-lg border border-white/10 overflow-hidden cursor-pointer shrink-0">
        <input
          type="color"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setLocalValue(e.target.value);
          }}
          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
        />
        <div
          className="w-full h-full"
          style={{ backgroundColor: value }}
        />
      </label>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white/40 leading-none mb-0.5">
          {label}
        </p>
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#?[0-9A-Fa-f]{0,6}$/.test(v)) {
              setLocalValue(v);
              commitValue(v);
            }
          }}
          onFocus={() => {
            setLocalValue(value);
            setFocused(true);
          }}
          onBlur={() => {
            setFocused(false);
            // Reset to parent value if invalid
            setLocalValue(value);
          }}
          className="w-full bg-transparent text-xs text-white/70 font-mono outline-none"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function RangeSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">{label}</span>
        <span className="text-xs text-white/70 font-mono">{value}px</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3.5
          [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-pink-500
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-white/20"
      />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function FlyerDesigner({ settings, onChange }: FlyerDesignerProps) {
  function update(partial: Partial<FlyerDesignSettings>) {
    onChange({ ...settings, ...partial });
  }

  function updateGradient(index: number, color: string) {
    const next = [...settings.gradientColors] as [
      string,
      string,
      string,
      string,
      string
    ];
    next[index] = color;
    update({ gradientColors: next });
  }

  return (
    <div className="space-y-5 text-sm">
      {/* ── Presets ── */}
      <Section title="Presets">
        <div className="grid grid-cols-2 gap-2">
          {FLYER_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onChange({ ...preset.settings, overlays: settings.overlays })}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left"
            >
              <div className="flex -space-x-1">
                {preset.settings.gradientColors
                  .slice(0, 3)
                  .map((c, i) => (
                    <div
                      key={i}
                      className="w-3.5 h-3.5 rounded-full border border-black/30"
                      style={{ backgroundColor: c }}
                    />
                  ))}
              </div>
              <span className="text-xs text-white/70">{preset.name}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => onChange({ ...DEFAULT_DESIGN, overlays: settings.overlays })}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset to default
        </button>
      </Section>

      {/* ── Background Gradient ── */}
      <Section title="Background Gradient">
        <div className="space-y-2">
          {(["Top", "Upper", "Middle", "Lower", "Bottom"] as const).map(
            (label, i) => (
              <ColorInput
                key={i}
                label={label}
                value={settings.gradientColors[i]}
                onChange={(c) => updateGradient(i, c)}
              />
            )
          )}
        </div>
        {/* Gradient preview */}
        <div
          className="h-6 rounded-lg border border-white/10"
          style={{
            background: `linear-gradient(90deg, ${settings.gradientColors.join(", ")})`,
          }}
        />
      </Section>

      {/* ── Text Content ── */}
      <Section title="Text Content">
        <div className="space-y-3">
          {([
            { key: "logoText" as const, label: "Logo Text", placeholder: "exa" },
            { key: "tagline" as const, label: "Tagline", placeholder: "Swim Shows" },
            { key: "badgeText" as const, label: "Badge Text", placeholder: "MODEL" },
            { key: "eventTitle" as const, label: "Event Title", placeholder: "exa Swim Shows" },
            { key: "venueOverride" as const, label: "Venue", placeholder: "Leave empty to hide" },
            { key: "dateOverride" as const, label: "Date", placeholder: "Leave empty to hide" },
            { key: "ticketLineText" as const, label: "Ticket Line", placeholder: "TICKETS + VIP..." },
          ] as const).map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label className="text-xs text-white/50 mb-1 block">{label}</Label>
              <input
                type="text"
                value={settings[key]}
                onChange={(e) => update({ [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Typography ── */}
      <Section title="Typography">
        <div className="space-y-3">
          <RangeSlider
            label="Tagline"
            value={settings.taglineFontSize}
            min={40}
            max={96}
            onChange={(v) => update({ taglineFontSize: v })}
          />
          <RangeSlider
            label="Model Name"
            value={settings.modelNameFontSize}
            min={32}
            max={64}
            onChange={(v) => update({ modelNameFontSize: v })}
          />
          <RangeSlider
            label="Venue"
            value={settings.venueFontSize}
            min={20}
            max={48}
            onChange={(v) => update({ venueFontSize: v })}
          />
          <RangeSlider
            label="Date"
            value={settings.dateFontSize}
            min={14}
            max={32}
            onChange={(v) => update({ dateFontSize: v })}
          />
        </div>
      </Section>

      {/* ── Photo Border ── */}
      <Section title="Photo Border">
        <ColorInput
          label="Border Color"
          value={settings.photoBorderColor}
          onChange={(c) => update({ photoBorderColor: c })}
        />
      </Section>

      {/* ── Ticket Banner ── */}
      <Section title="Ticket Banner">
        <div className="space-y-2">
          <ColorInput
            label="Left Color"
            value={settings.ticketBannerColor1}
            onChange={(c) => update({ ticketBannerColor1: c })}
          />
          <ColorInput
            label="Right Color"
            value={settings.ticketBannerColor2}
            onChange={(c) => update({ ticketBannerColor2: c })}
          />
        </div>
        <div
          className="h-4 rounded border border-white/10"
          style={{
            background: `linear-gradient(90deg, ${settings.ticketBannerColor1}, ${settings.ticketBannerColor2})`,
          }}
        />
      </Section>

      {/* ── Model Info ── */}
      <Section title="Model Info">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Instagram Handle</Label>
            <Switch
              checked={settings.showInstagram}
              onCheckedChange={(v) => update({ showInstagram: v })}
            />
          </div>
        </div>
      </Section>

      {/* ── Custom Overlays ── */}
      <Section title="Custom Overlays">
        <p className="text-[10px] text-white/30 -mt-1">
          Upload PNGs (hearts, palm trees, logos). Drag to position on preview.
        </p>

        {/* Upload button */}
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
                const res = await fetch("/api/admin/flyers/overlay", {
                  method: "POST",
                  body: formData,
                });
                const data = await res.json();
                if (!res.ok) {
                  alert(data.error || "Upload failed");
                  return;
                }

                // Get image dimensions
                const img = new Image();
                img.src = data.url;
                await new Promise<void>((resolve) => {
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                });

                // Scale to fit ~200px wide in template coordinates
                const scale = Math.min(200 / (img.naturalWidth || 200), 300 / (img.naturalHeight || 300));
                const w = Math.round((img.naturalWidth || 200) * scale);
                const h = Math.round((img.naturalHeight || 200) * scale);

                const newOverlay: FlyerOverlay = {
                  id: `overlay-${Date.now()}`,
                  url: data.url,
                  x: 440, // center-ish
                  y: 400,
                  width: w,
                  height: h,
                  opacity: 1,
                };
                update({ overlays: [...settings.overlays, newOverlay] });
              } catch {
                alert("Upload failed");
              }
              // Reset input
              e.target.value = "";
            }}
          />
        </label>

        {/* Overlay list */}
        {settings.overlays.length > 0 && (
          <div className="space-y-2">
            {settings.overlays.map((overlay) => (
              <div
                key={overlay.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10"
              >
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={overlay.url}
                  alt="overlay"
                  className="w-10 h-10 object-contain rounded bg-black/20"
                />

                <div className="flex-1 min-w-0 space-y-1">
                  {/* Size slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 shrink-0">Size</span>
                    <input
                      type="range"
                      min={30}
                      max={1080}
                      value={overlay.width}
                      onChange={(e) => {
                        const newW = Number(e.target.value);
                        const ratio = overlay.height / overlay.width;
                        const updated = settings.overlays.map((o) =>
                          o.id === overlay.id
                            ? { ...o, width: newW, height: Math.round(newW * ratio) }
                            : o
                        );
                        update({ overlays: updated });
                      }}
                      className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-pink-500
                        [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                  {/* Opacity slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 shrink-0">Opacity</span>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={Math.round(overlay.opacity * 100)}
                      onChange={(e) => {
                        const updated = settings.overlays.map((o) =>
                          o.id === overlay.id
                            ? { ...o, opacity: Number(e.target.value) / 100 }
                            : o
                        );
                        update({ overlays: updated });
                      }}
                      className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-pink-500
                        [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <span className="text-[10px] text-white/40 w-6 text-right">{Math.round(overlay.opacity * 100)}%</span>
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => {
                    update({
                      overlays: settings.overlays.filter(
                        (o) => o.id !== overlay.id
                      ),
                    });
                  }}
                  className="p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {settings.overlays.length > 0 && (
          <p className="text-[10px] text-white/25 flex items-center gap-1">
            <Move className="w-3 h-3" />
            Drag overlays on the preview to reposition
          </p>
        )}
      </Section>

      {/* ── Decorations ── */}
      <Section title="Decorations">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Palm Trees</Label>
            <Switch
              checked={settings.showPalmTrees}
              onCheckedChange={(v) => update({ showPalmTrees: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Hearts</Label>
            <Switch
              checked={settings.showHearts}
              onCheckedChange={(v) => update({ showHearts: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Glow Effects</Label>
            <Switch
              checked={settings.showGlowEffects}
              onCheckedChange={(v) => update({ showGlowEffects: v })}
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
