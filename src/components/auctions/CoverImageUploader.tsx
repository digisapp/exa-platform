"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, ImagePlus, Trash2, Radio } from "lucide-react";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";
const MAX_BYTES = 15 * 1024 * 1024;

export function CoverImageUploader({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("Image is too large (max 15MB)");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "auction-cover");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      onChange(data.url);
      toast.success("Cover uploaded");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        {/* 9:16 preview frame — matches what fans see in the live view */}
        <button
          type="button"
          onClick={value ? undefined : pick}
          disabled={disabled || uploading}
          aria-label={value ? "Cover image" : "Add cover image"}
          className={`relative shrink-0 w-28 aspect-[9/16] rounded-xl overflow-hidden border-2 ${
            value
              ? "border-violet-500/40"
              : "border-dashed border-violet-500/30 hover:border-violet-500/60 hover:bg-violet-500/5"
          } transition-all bg-violet-500/5 ${value ? "cursor-default" : "cursor-pointer"}`}
        >
          {value ? (
            <Image src={value} alt="Cover" fill className="object-cover" sizes="112px" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-violet-400">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Add cover</span>
                </>
              )}
            </div>
          )}
          {value && (
            <div className="absolute top-1 left-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-500/90 text-[8px] font-bold uppercase tracking-wider text-white shadow-[0_0_8px_rgba(244,63,94,0.5)]">
              <Radio className="h-2 w-2" />
              Live
            </div>
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-sm font-medium">Cover image</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Portrait (9:16) works best — this is the backdrop fans see in the live bid view.
              If you skip it, we&apos;ll use your profile photo.
            </p>
          </div>
          {value ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={pick}
                disabled={disabled || uploading}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Replace"}
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={disabled || uploading}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/15 text-white/60 hover:text-rose-300 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={pick}
              disabled={disabled || uploading}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
              Choose image
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}

export default CoverImageUploader;
