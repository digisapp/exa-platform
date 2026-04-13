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
import { TipDialog } from "./TipDialog";
import { ArrowLeft, MoreVertical, Ban, Circle, Gift, Users, Building2, Search } from "lucide-react";
import { ChatSearch } from "./ChatSearch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Actor, Model, Conversation } from "@/types/database";

export interface OtherParticipantInfo {
  name: string;
  avatar: string | null;
  username: string | null;
  type: "fan" | "brand" | "model";
  lastActive: string | null;
}

interface ChatHeaderProps {
  conversation: Conversation;
  currentActor: Actor;
  otherParticipantActorId: string;
  otherParticipantActorType: string;
  otherParticipantModel?: Model | null;
  otherInfo: OtherParticipantInfo;
  otherInitials: string;
  canTip: boolean;
  localCoinBalance: number;
  onBalanceChange: (newBalance: number) => void;
}

export function ChatHeader({
  conversation,
  currentActor,
  otherParticipantActorId,
  otherParticipantActorType,
  otherParticipantModel,
  otherInfo,
  otherInitials,
  canTip,
  localCoinBalance,
  onBalanceChange,
}: ChatHeaderProps) {
  const router = useRouter();
  const [showTipDialog, setShowTipDialog] = useState(false);
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

  const isOnline = !!(
    otherInfo.lastActive &&
    new Date().getTime() - new Date(otherInfo.lastActive).getTime() < 5 * 60 * 1000
  );

  return (
    <>
      <div className="flex items-center gap-4 p-4 border-b">
        <Link href="/chats" className="lg:hidden" aria-label="Back to chats">
          <Button variant="ghost" size="icon" aria-label="Back to chats">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>

        <div className="relative">
          <Avatar className={cn(
            "h-10 w-10 ring-2 ring-background",
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
              <Link href={`/${otherInfo.username}`} className="font-semibold truncate hover:text-primary transition-colors">
                {otherName}
              </Link>
            ) : (
              <h2 className="font-semibold truncate">{otherName}</h2>
            )}
            {otherInfo.type === "fan" && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-blue-500/10 text-blue-500 border-blue-500/20">
                <Users className="h-3 w-3 mr-1" />
                Fan
              </Badge>
            )}
            {otherInfo.type === "brand" && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-amber-500/10 text-amber-500 border-amber-500/20">
                <Building2 className="h-3 w-3 mr-1" />
                Brand
              </Badge>
            )}
          </div>
          {isOnline && otherInfo.username ? (
            <Link
              href={`/${otherInfo.username}`}
              className="text-xs font-medium text-green-500 hover:text-green-400 transition-colors"
            >
              Online
            </Link>
          ) : isOnline ? (
            <p className="text-xs font-medium text-green-500">Online</p>
          ) : otherInfo.username ? (
            <Link
              href={`/${otherInfo.username}`}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              @{otherInfo.username}
            </Link>
          ) : null}
        </div>

        {/* Call buttons grouped */}
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
          <VideoCallButton
            conversationId={conversation.id}
            coinBalance={localCoinBalance}
            isModel={currentActor.type === "model"}
            recipientIsModel={otherParticipantActorType === "model"}
            recipientActorId={otherParticipantActorId}
            recipientName={otherName}
            recipientAvatar={otherAvatar}
            videoCallRate={otherParticipantModel?.voice_call_rate || 5}
            callType="voice"
            onBalanceChange={onBalanceChange}
          />
          <VideoCallButton
            conversationId={conversation.id}
            coinBalance={localCoinBalance}
            isModel={currentActor.type === "model"}
            recipientIsModel={otherParticipantActorType === "model"}
            recipientActorId={otherParticipantActorId}
            recipientName={otherName}
            recipientAvatar={otherAvatar}
            videoCallRate={otherParticipantModel?.video_call_rate || 5}
            callType="video"
            onBalanceChange={onBalanceChange}
          />
        </div>

        {/* Tip button */}
        {canTip && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowTipDialog(true)}
            title="Send a tip"
            className="h-9 w-9 text-pink-500 hover:text-pink-600 hover:bg-pink-500/10"
          >
            <Gift className="h-5 w-5" />
          </Button>
        )}

        {/* More options menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="More options">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowSearch(!showSearch)}>
              <Search className="h-4 w-4 mr-2" />
              Search messages
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowBlockDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Ban className="h-4 w-4 mr-2" />
              Block {otherName}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tip Dialog */}
      {canTip && (
        <TipDialog
          recipientId={otherParticipantActorId}
          recipientName={otherName}
          conversationId={conversation.id}
          coinBalance={localCoinBalance}
          open={showTipDialog}
          onOpenChange={setShowTipDialog}
          onTipSuccess={(amount, newBalance) => {
            onBalanceChange(newBalance);
          }}
        />
      )}

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
