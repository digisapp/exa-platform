"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function NewChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const modelUsername = searchParams.get("model") || "";
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [modelInfo, setModelInfo] = useState<{
    username: string;
    first_name: string | null;
    profile_photo_url: string | null;
    message_rate: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch model info
  useEffect(() => {
    if (!modelUsername) return;

    async function fetchModel() {
      try {
        const res = await fetch(`/api/models/lookup?username=${encodeURIComponent(modelUsername)}`);
        if (res.ok) {
          const data = await res.json();
          setModelInfo(data.model);
        }
      } catch {
        // Model info is for display only, not critical
      } finally {
        setLoading(false);
      }
    }
    fetchModel();
  }, [modelUsername]);

  // Auto-focus input
  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetModelUsername: modelUsername,
          content: trimmed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          toast.error(`Insufficient coins. Need ${data.required}, have ${data.balance}`);
        } else {
          toast.error(data.error || "Failed to send message");
        }
        return;
      }

      // Redirect to the conversation
      const convId = data.conversationId || data.message?.conversation_id;
      if (convId) {
        router.replace(`/chats/${convId}`);
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!modelUsername) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-muted-foreground">No model specified.</p>
        <Link href="/chats" className="text-pink-500 hover:underline mt-2">
          Back to chats
        </Link>
      </div>
    );
  }

  const displayName = modelInfo?.first_name || modelUsername;
  const coinCost = modelInfo?.message_rate || 10;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Link href="/chats" className="lg:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Avatar className="h-9 w-9">
          {modelInfo?.profile_photo_url && (
            <AvatarImage src={modelInfo.profile_photo_url} alt={displayName} />
          )}
          <AvatarFallback className="bg-pink-500/20 text-pink-500 text-sm">
            {displayName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground">@{modelUsername}</p>
        </div>
      </div>

      {/* Empty chat area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <Avatar className="h-16 w-16 mx-auto mb-4">
            {modelInfo?.profile_photo_url && (
              <AvatarImage src={modelInfo.profile_photo_url} alt={displayName} />
            )}
            <AvatarFallback className="bg-pink-500/20 text-pink-500 text-xl">
              {displayName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-semibold text-lg">{displayName}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Send your first message to start a conversation
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message (${coinCost} coins)...`}
              disabled={sending}
              rows={1}
              className="w-full resize-none rounded-xl border bg-muted/50 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 disabled:opacity-50 max-h-32"
              style={{ minHeight: "44px" }}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            size="icon"
            className="h-11 w-11 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 flex-shrink-0"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
