"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Camera, Video, Mic, FolderOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttachmentMenuProps {
  onPhotoSelect: (file: File) => void;
  onVideoSelect: (file: File) => void;
  onVoiceRecord: () => void;
  onLibraryOpen: () => void;
  uploading?: boolean;
  disabled?: boolean;
  isModel?: boolean;
}

export function AttachmentMenu({
  onPhotoSelect,
  onVideoSelect,
  onVoiceRecord,
  onLibraryOpen,
  uploading = false,
  disabled = false,
  isModel = false,
}: AttachmentMenuProps) {
  const [open, setOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoSelect(file);
      setOpen(false);
    }
    // Reset input
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onVideoSelect(file);
      setOpen(false);
    }
    // Reset input
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handlePhotoClick = useCallback(() => {
    photoInputRef.current?.click();
  }, []);

  const handleVideoClick = useCallback(() => {
    videoInputRef.current?.click();
  }, []);

  const handleVoiceClick = useCallback(() => {
    onVoiceRecord();
    setOpen(false);
  }, [onVoiceRecord]);

  const handleLibraryClick = useCallback(() => {
    onLibraryOpen();
    setOpen(false);
  }, [onLibraryOpen]);

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoChange}
        className="hidden"
        disabled={uploading || disabled}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoChange}
        className="hidden"
        disabled={uploading || disabled}
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={uploading || disabled}
            className={cn(
              "shrink-0 h-12 w-12 rounded-2xl text-white/60 hover:text-pink-300 hover:bg-pink-500/10 transition-all border border-white/10 hover:border-pink-500/30",
              open && "rotate-45 bg-pink-500/15 text-pink-300 border-pink-500/40 shadow-[0_0_16px_rgba(236,72,153,0.3)]"
            )}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Plus className="h-6 w-6" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          className="w-auto p-3 rounded-2xl bg-[#120a24]/95 backdrop-blur-xl border border-violet-500/30 shadow-2xl shadow-violet-500/15"
          sideOffset={8}
        >
          <div className="flex gap-2">
            {/* Photo */}
            <button
              onClick={handlePhotoClick}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:bg-white/5 active:scale-95 min-w-[72px]"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-pink-500/10 ring-1 ring-pink-500/30 group-hover:ring-pink-500/60 group-hover:shadow-[0_0_16px_rgba(236,72,153,0.4)] transition-all">
                <Camera className="h-6 w-6 text-pink-300" />
              </div>
              <span className="text-xs font-semibold text-white/70 group-hover:text-white">Photo</span>
            </button>

            {/* Video */}
            <button
              onClick={handleVideoClick}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:bg-white/5 active:scale-95 min-w-[72px]"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-blue-500/10 ring-1 ring-cyan-500/30 group-hover:ring-cyan-500/60 group-hover:shadow-[0_0_16px_rgba(34,211,238,0.4)] transition-all">
                <Video className="h-6 w-6 text-cyan-300" />
              </div>
              <span className="text-xs font-semibold text-white/70 group-hover:text-white">Video</span>
            </button>

            {/* Voice */}
            <button
              onClick={handleVoiceClick}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:bg-white/5 active:scale-95 min-w-[72px]"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/10 ring-1 ring-amber-500/30 group-hover:ring-amber-500/60 group-hover:shadow-[0_0_16px_rgba(245,158,11,0.4)] transition-all">
                <Mic className="h-6 w-6 text-amber-300" />
              </div>
              <span className="text-xs font-semibold text-white/70 group-hover:text-white">Voice</span>
            </button>

            {/* Library - only for models */}
            {isModel && (
              <button
                onClick={handleLibraryClick}
                className="group flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:bg-white/5 active:scale-95 min-w-[72px]"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-purple-500/10 ring-1 ring-violet-500/30 group-hover:ring-violet-500/60 group-hover:shadow-[0_0_16px_rgba(167,139,250,0.4)] transition-all">
                  <FolderOpen className="h-6 w-6 text-violet-300" />
                </div>
                <span className="text-xs font-semibold text-white/70 group-hover:text-white">Library</span>
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
