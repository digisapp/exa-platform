"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { VideoCallButton } from "@/components/video";
import { ArrowLeft, MoreVertical, Ban, Circle, Users, Building2, Search, Volume2, VolumeX } from "lucide-react";
import { ChatSearch } from "./ChatSearch";
import { cn } from "@/lib/utils";
import {
  isReachableForCalls,
  GATE_CALL_CTAS_ON_REACHABILITY,
} from "@/lib/call-availability";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { VipBadge } from "@/components/vip/VipBadge";
import { vipTierOf } from "@/lib/vip-config";
import type { Actor, Model, Conversation } from "@/types/database";

/**
 * The slice of a model row the chat UI is allowed to see about the OTHER
 * participant. Deliberately narrow: full model rows carry admin-only PII
 * (first_name/last_name — see src/lib/model-display.ts). The RSC page selects
 * exactly these columns, so widen this type together with that select.
 */
export type ChatParticipantModel = Pick<
  Model,
  | "id"
  | "username"
  | "profile_photo_url"
  | "last_active_at"
  | "message_rate"
  | "voice_call_rate"
  | "video_call_rate"
  | "video_is_online"
> & {
  /** models.available_for_calls — newer than the generated DB types */
  available_for_calls?: boolean | null;
};

export interface OtherParticipantInfo {
  name: string;
  avatar: string | null;
  username: string | null;
  type: "fan" | "brand" | "model";
  lastActive: string | null;
  /** fans.lifetime_spend_coins — drives the VIP badge; null for non-fans. */
  lifetimeSpendCoins: number | null;
}

interface ChatHeaderProps {
  conversation: Conversation;
  currentActor: Actor;
  otherParticipantActorId: string;
  otherParticipantActorType: string;
  otherParticipantModel?: ChatParticipantModel | null;
  otherInfo: OtherParticipantInfo;
  otherInitials: string;
  localCoinBalance: number;
  onBalanceChange: (newBalance: number) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export function ChatHeader({
  conversation,
  currentActor,
  otherParticipantActorId,
  otherParticipantActorType,
  otherParticipantModel,
  otherInfo,
  otherInitials,
  localCoinBalance,
  onBalanceChange,
  soundEnabled = true,
  onToggleSound,
}: ChatHeaderProps) {
  const router = useRouter();
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const otherName = otherInfo.name;
  const otherAvatar = otherInfo.avatar;

  const handleBlockUser = async () => {
    if (isBlocking) return;

    setIsBlocking(true);
    try {
      const response = await fetch("/api/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: otherParticipantActorId,
        }),
      });

      if (response.ok) {
        toast.success(`${otherName} has been blocked`);
        setShowBlockDialog(false);
        router.push("/chats");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to block user");
      }
    } catch {
      toast.error("Failed to block user");
    } finally {
      setIsBlocking(false);
    }
  };

  // Model participants: status + call gating are driven by the SAME
  // reachability signal /api/calls/start enforces (video_is_online OR
  // available_for_calls) so the green dot never sits next to a call button
  // that would 409. Fan/brand participants keep the 5-min presence window.
  const otherIsModel = otherParticipantActorType === "model";
  const modelReachable = otherIsModel
    ? otherParticipantModel
      ? isReachableForCalls(otherParticipantModel)
      : true // no model row loaded — fail open, the server still gates
    : true;
  const isOnline = otherIsModel
    ? !!otherParticipantModel && modelReachable
    : !!(
        otherInfo.lastActive &&
        new Date().getTime() - new Date(otherInfo.lastActive).getTime() < 5 * 60 * 1000
      );
  const statusLabel = !isOnline
    ? null
    : otherIsModel && !otherParticipantModel?.video_is_online
      ? "Taking calls"
      : "Online";
  // Only fans get gated (models can always ring their fans; the server gate
  // is fan-only too)
  const callsDisabled =
    GATE_CALL_CTAS_ON_REACHABILITY &&
    otherIsModel &&
    currentActor.type !== "model" &&
    !modelReachable;

  // The current user pays per minute only when calling a model (fan/brand →
  // model). ?? keeps an explicit 0 rate (free calls) instead of coercing it
  // to the default like || would.
  const paysToCall =
    otherParticipantActorType === "model" && currentActor.type !== "model";
  const voiceCallRate = otherParticipantModel?.voice_call_rate ?? 5;
  const videoCallRate = otherParticipantModel?.video_call_rate ?? 5;

  return (
    <>
      <div className="flex items-center gap-3 p-4 border-b">
        <Link href="/chats" className="lg:hidden" aria-label="Back to chats">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" aria-label="Back to chats">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>

        <div className="relative">
          <Avatar className={cn(
            "h-11 w-11 ring-2 ring-background",
            otherInfo.type === "brand" && "ring-amber-500/30",
            otherInfo.type === "fan" && "ring-blue-500/30",
            otherInfo.type === "model" && "ring-pink-500/30"
          )}>
            <AvatarImage src={otherAvatar || undefined} />
            <AvatarFallback className={cn(
              "text-white font-semibold",
              otherInfo.type === "brand" && "bg-gradient-to-br from-amber-500 to-orange-600",
              otherInfo.type === "fan" && "bg-gradient-to-br from-blue-500 to-cyan-600",
              otherInfo.type === "model" && "bg-gradient-to-br from-pink-500 to-rose-600"
            )}>
              {otherInitials}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <Circle className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-green-500 text-green-500 stroke-background stroke-2" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {otherInfo.username ? (
              <Link href={`/${otherInfo.username}`} className="notranslate font-bold text-[15px] truncate hover:text-primary transition-colors">
                {otherName}
              </Link>
            ) : (
              <h2 className="notranslate font-bold text-[15px] truncate">{otherName}</h2>
            )}
            {/* VIP fans get their earned tier instead of the generic Fan chip */}
            {otherInfo.type === "fan" && (
              vipTierOf(otherInfo.lifetimeSpendCoins) ? (
                <VipBadge lifetimeSpendCoins={otherInfo.lifetimeSpendCoins} size="sm" />
              ) : (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-blue-500/10 text-blue-500 border-blue-500/20">
                  <Users className="h-3 w-3 mr-1" />
                  Fan
                </Badge>
              )
            )}
            {otherInfo.type === "brand" && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-amber-500/10 text-amber-500 border-amber-500/20">
                <Building2 className="h-3 w-3 mr-1" />
                Brand
              </Badge>
            )}
          </div>
          {statusLabel && otherInfo.username ? (
            <Link
              href={`/${otherInfo.username}`}
              className="text-xs font-medium text-green-500 hover:text-green-400 transition-colors"
            >
              {statusLabel}
            </Link>
          ) : statusLabel ? (
            <p className="text-xs font-medium text-green-500">{statusLabel}</p>
          ) : otherInfo.username && otherInfo.username !== otherName ? (
            <Link
              href={`/${otherInfo.username}`}
              className="notranslate text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              @{otherInfo.username}
            </Link>
          ) : null}
        </div>

        {/* Call buttons — voice is desktop-only to keep the mobile header
            from crowding out the participant name. Per-minute rates render
            inside each button (desktop, paying callers only); the exact
            amount is still confirmed in the call dialog. */}
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline-flex">
            <VideoCallButton
              conversationId={conversation.id}
              coinBalance={localCoinBalance}
              isModel={currentActor.type === "model"}
              recipientIsModel={otherParticipantActorType === "model"}
              recipientActorId={otherParticipantActorId}
              recipientName={otherName}
              recipientAvatar={otherAvatar}
              videoCallRate={voiceCallRate}
              callType="voice"
              onBalanceChange={onBalanceChange}
              reachable={!callsDisabled}
              showRate={paysToCall}
            />
          </span>
          <VideoCallButton
            conversationId={conversation.id}
            coinBalance={localCoinBalance}
            isModel={currentActor.type === "model"}
            recipientIsModel={otherParticipantActorType === "model"}
            recipientActorId={otherParticipantActorId}
            recipientName={otherName}
            recipientAvatar={otherAvatar}
            videoCallRate={videoCallRate}
            callType="video"
            onBalanceChange={onBalanceChange}
            reachable={!callsDisabled}
            showRate={paysToCall}
          />
        </div>

        {/* More options menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl text-white/60 hover:text-white hover:bg-white/10" aria-label="More options">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#120a24]/95 backdrop-blur-xl border-violet-500/30 shadow-2xl shadow-violet-500/10">
            <DropdownMenuItem
              onClick={() => setShowSearch(!showSearch)}
              className="cursor-pointer text-white/80 focus:bg-white/10 focus:text-white"
            >
              <Search className="h-4 w-4 mr-2 text-cyan-400" />
              Search messages
            </DropdownMenuItem>
            {onToggleSound && (
              <DropdownMenuItem
                onClick={onToggleSound}
                className="cursor-pointer text-white/80 focus:bg-white/10 focus:text-white"
              >
                {soundEnabled ? (
                  <>
                    <VolumeX className="h-4 w-4 mr-2 text-white/60" />
                    Mute sounds
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 mr-2 text-pink-400" />
                    Unmute sounds
                  </>
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={() => setShowBlockDialog(true)}
              className="cursor-pointer text-rose-300 focus:bg-rose-500/10 focus:text-rose-200"
            >
              <Ban className="h-4 w-4 mr-2" />
              Block {otherName}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {otherName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won&apos;t be able to message you or see your profile. You can
              unblock them later from your settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBlocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              disabled={isBlocking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBlocking ? "Blocking..." : "Block"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Search overlay */}
      {showSearch && (
        <div className="absolute inset-0 z-50 bg-background flex flex-col">
          <ChatSearch
            conversationId={conversation.id}
            onClose={() => setShowSearch(false)}
          />
        </div>
      )}
    </>
  );
}
