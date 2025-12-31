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
              "shrink-0 text-muted-foreground hover:text-primary transition-transform",
              open && "rotate-45"
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          className="w-auto p-2"
          sideOffset={8}
        >
          <div className="flex gap-1">
            {/* Photo */}
            <button
              onClick={handlePhotoClick}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors hover:bg-muted min-w-[64px]"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-pink-500/10">
                <Camera className="h-5 w-5 text-pink-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Photo</span>
            </button>

            {/* Video */}
            <button
              onClick={handleVideoClick}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors hover:bg-muted min-w-[64px]"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10">
                <Video className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Video</span>
            </button>

            {/* Voice */}
            <button
              onClick={handleVoiceClick}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors hover:bg-muted min-w-[64px]"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/10">
                <Mic className="h-5 w-5 text-amber-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Voice</span>
            </button>

            {/* Library - only for models */}
            {isModel && (
              <button
                onClick={handleLibraryClick}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors hover:bg-muted min-w-[64px]"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-violet-500/10">
                  <FolderOpen className="h-5 w-5 text-violet-500" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Library</span>
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
