"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SmilePlus } from "lucide-react";
import { toast } from "sonner";

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  currentActorId: string;
  onReactionChange?: () => void;
  isOwn?: boolean;
}

export function MessageReactions({
  messageId,
  reactions,
  currentActorId,
  onReactionChange,
  isOwn = false,
}: MessageReactionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localReactions, setLocalReactions] = useState<Reaction[]>(reactions);

  const handleReact = async (emoji: string) => {
    if (isLoading) return;

    setIsLoading(true);
    setIsOpen(false);

    // Optimistic update
    const existingIndex = localReactions.findIndex((r) => r.emoji === emoji);
    const hadReacted = existingIndex !== -1 && localReactions[existingIndex].hasReacted;

    setLocalReactions((prev) => {
      const updated = [...prev];
      if (existingIndex !== -1) {
        if (hadReacted) {
          // Remove reaction
          updated[existingIndex] = {
            ...updated[existingIndex],
            count: Math.max(0, updated[existingIndex].count - 1),
            hasReacted: false,
          };
          // Remove if count is 0
          if (updated[existingIndex].count === 0) {
            updated.splice(existingIndex, 1);
          }
        } else {
          // Add to existing
          updated[existingIndex] = {
            ...updated[existingIndex],
            count: updated[existingIndex].count + 1,
            hasReacted: true,
          };
        }
      } else {
        // Add new reaction
        updated.push({ emoji, count: 1, hasReacted: true });
      }
      return updated;
    });

    try {
      const response = await fetch("/api/messages/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });

      if (!response.ok) {
        throw new Error("Failed to react");
      }

      onReactionChange?.();
    } catch (error) {
      // Revert optimistic update
      setLocalReactions(reactions);
      toast.error("Failed to add reaction");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", isOwn ? "justify-end" : "justify-start")}>
      {/* Display existing reactions */}
      {localReactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReact(reaction.emoji)}
          disabled={isLoading}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all",
            reaction.hasReacted
              ? "bg-pink-500/20 border border-pink-500/30"
              : "bg-muted hover:bg-muted/80 border border-transparent",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          <span>{reaction.emoji}</span>
          <span className={cn(
            "text-muted-foreground",
            reaction.hasReacted && "text-pink-500"
          )}>
            {reaction.count}
          </span>
        </button>
      ))}

      {/* Add reaction button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
              localReactions.length > 0 && "opacity-100"
            )}
            disabled={isLoading}
          >
            <SmilePlus className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side={isOwn ? "left" : "right"}
          className="w-auto p-2"
          align="center"
        >
          <div className="flex gap-1">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
