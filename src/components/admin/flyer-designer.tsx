"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  type FlyerDesignSettings,
  DEFAULT_DESIGN,
  FLYER_PRESETS,
} from "@/types/flyer-design";
import { useState } from "react";
import { RotateCcw } from "lucide-react";

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
              onClick={() => onChange({ ...preset.settings })}
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
          onClick={() => onChange({ ...DEFAULT_DESIGN })}
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
          <div>
            <Label className="text-xs text-white/50 mb-1 block">
              Tagline
            </Label>
            <input
              type="text"
              value={settings.tagline}
              onChange={(e) => update({ tagline: e.target.value })}
              placeholder="Swim Shows"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
            />
          </div>
          <div>
            <Label className="text-xs text-white/50 mb-1 block">
              Venue Override
            </Label>
            <input
              type="text"
              value={settings.venueOverride}
              onChange={(e) => update({ venueOverride: e.target.value })}
              placeholder="Auto from event"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
            />
          </div>
          <div>
            <Label className="text-xs text-white/50 mb-1 block">
              Date Override
            </Label>
            <input
              type="text"
              value={settings.dateOverride}
              onChange={(e) => update({ dateOverride: e.target.value })}
              placeholder="Auto from event"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
            />
          </div>
          <div>
            <Label className="text-xs text-white/50 mb-1 block">
              Ticket Line
            </Label>
            <input
              type="text"
              value={settings.ticketLineText}
              onChange={(e) => update({ ticketLineText: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
            />
          </div>
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
