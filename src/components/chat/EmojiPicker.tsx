"use client";

import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({ onEmojiSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [Picker, setPicker] = useState<any>(null);

  // Lazy-load emoji-mart only when popover opens
  useEffect(() => {
    if (!open || Picker) return;
    let cancelled = false;
    Promise.all([
      import("@emoji-mart/react"),
      import("@emoji-mart/data"),
    ]).then(([pickerMod, dataMod]) => {
      if (!cancelled) {
        setPicker(() => ({ default: pickerMod.default, data: dataMod.default }));
      }
    });
    return () => { cancelled = true; };
  }, [open, Picker]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className={cn(
            "shrink-0 text-muted-foreground hover:text-primary",
            "hidden sm:inline-flex" // Only show on desktop
          )}
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-auto p-0 border-none shadow-xl"
        sideOffset={8}
      >
        {Picker ? (
          <Picker.default
            data={Picker.data}
            onEmojiSelect={(emoji: any) => {
              onEmojiSelect(emoji.native);
              setOpen(false);
            }}
            theme="dark"
            previewPosition="none"
            skinTonePosition="none"
            maxFrequentRows={2}
            perLine={8}
          />
        ) : (
          <div className="flex items-center justify-center w-[352px] h-[400px]">
            <div className="h-6 w-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
