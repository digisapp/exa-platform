"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PenSquare, Search, Loader2, Coins } from "lucide-react";
import { toast } from "sonner";
import type { Model } from "@/types/database";

interface NewMessageDialogProps {
  currentActorType?: string;
  coinBalance?: number;
}

export function NewMessageDialog({
  currentActorType = "model",
  coinBalance = 0,
}: NewMessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Determine if coins are required (use model's rate or default to 10)
  const coinCost = currentActorType === "model" ? 0 : ((selectedModel as any)?.message_rate || 10);
  const hasEnoughCoins = coinCost === 0 || coinBalance >= coinCost;

  // Search for models
  useEffect(() => {
    const searchModels = async () => {
      if (search.length < 2) {
        setModels([]);
        return;
      }

      setSearching(true);
      try {
        const { data } = await supabase
          .from("models")
          .select("*")
          .eq("is_approved", true)
          .or(`username.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
          .limit(10);

        setModels(data || []);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchModels, 300);
    return () => clearTimeout(debounce);
  }, [search, supabase]);

  const handleSelectModel = (model: Model) => {
    setSelectedModel(model);
    setSearch("");
    setModels([]);
  };

  const handleSend = async () => {
    if (!selectedModel || !message.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/messages/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: selectedModel.id,
          initialMessage: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error(
            `Insufficient coins. Need ${data.required}, have ${data.balance}`
          );
        } else {
          toast.error(data.error || "Failed to start conversation");
        }
        return;
      }

      setOpen(false);
      toast.success("Message sent!");
      router.push(`/chats/${data.conversationId}`);
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSearch("");
    setModels([]);
    setSelectedModel(null);
    setMessage("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-pink-500 to-violet-500">
          <PenSquare className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
          <DialogDescription>
            Search for a model to start chatting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selected model */}
          {selectedModel ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedModel.profile_photo_url || undefined} />
                <AvatarFallback>
                  {selectedModel.first_name?.charAt(0) || selectedModel.username?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {selectedModel.first_name ? `${selectedModel.first_name} ${selectedModel.last_name || ""}`.trim() : selectedModel.username}
                </p>
                <p className="text-sm text-muted-foreground">
                  @{selectedModel.username}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedModel(null)}
              >
                Change
              </Button>
            </div>
          ) : (
            /* Search input */
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or username..."
                className="pl-9"
              />

              {/* Search results */}
              {(models.length > 0 || searching) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {searching ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : (
                    models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleSelectModel(model)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={model.profile_photo_url || undefined} />
                          <AvatarFallback>
                            {model.first_name?.charAt(0) || model.username?.charAt(0)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left flex-1">
                          <p className="font-medium text-sm">
                            {model.first_name ? `${model.first_name} ${model.last_name || ""}`.trim() : model.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{model.username}
                          </p>
                        </div>
                        {currentActorType !== "model" && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Coins className="h-3 w-3" />
                            <span>{(model as any).message_rate || 10}/msg</span>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Message input */}
          {selectedModel && (
            <>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message..."
                rows={4}
              />

              {/* Coin cost warning */}
              {coinCost > 0 && (
                <div
                  className={`flex items-center gap-2 text-sm ${
                    hasEnoughCoins ? "text-muted-foreground" : "text-destructive"
                  }`}
                >
                  <Coins className="h-4 w-4" />
                  <span>
                    {hasEnoughCoins
                      ? `This message will cost ${coinCost} coins`
                      : `Insufficient coins (need ${coinCost}, have ${coinBalance})`}
                  </span>
                </div>
              )}

              <Button
                onClick={handleSend}
                disabled={
                  loading || !message.trim() || (coinCost > 0 && !hasEnoughCoins)
                }
                className="w-full bg-gradient-to-r from-pink-500 to-violet-500"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Message"
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
