"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Megaphone, Loader2, Users, Building2, Send } from "lucide-react";
import { toast } from "sonner";

interface BlastDialogProps {
  fanCount: number;
  brandCount: number;
}

type RecipientType = "fans" | "brands" | "all";

export function BlastDialog({ fanCount, brandCount }: BlastDialogProps) {
  const [open, setOpen] = useState(false);
  const [recipientType, setRecipientType] = useState<RecipientType>("fans");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const totalCount = fanCount + brandCount;
  const recipientCount =
    recipientType === "fans"
      ? fanCount
      : recipientType === "brands"
      ? brandCount
      : totalCount;

  const handleSend = async () => {
    if (!message.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/messages/blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          recipientType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error(data.error || "You can only send one blast per hour");
        } else {
          toast.error(data.error || "Failed to send blast");
        }
        return;
      }

      setOpen(false);
      setMessage("");
      toast.success(`Blast sent to ${data.sentCount} ${recipientType === "all" ? "people" : recipientType}!`);
    } catch (error) {
      toast.error("Failed to send blast");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMessage("");
    setRecipientType("fans");
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
        <Button variant="outline" className="gap-2">
          <Megaphone className="h-4 w-4" />
          Blast
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-pink-500" />
            Send a Blast
          </DialogTitle>
          <DialogDescription>
            Send a message to all your fans or brands at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Recipient selection */}
          <div className="space-y-3">
            <Label>Send to</Label>
            <RadioGroup
              value={recipientType}
              onValueChange={(v) => setRecipientType(v as RecipientType)}
              className="grid grid-cols-3 gap-2"
            >
              <Label
                htmlFor="fans"
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  recipientType === "fans"
                    ? "border-pink-500 bg-pink-500/10"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <RadioGroupItem value="fans" id="fans" className="sr-only" />
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">Fans</span>
                <span className="text-xs text-muted-foreground">{fanCount}</span>
              </Label>

              <Label
                htmlFor="brands"
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  recipientType === "brands"
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <RadioGroupItem value="brands" id="brands" className="sr-only" />
                <Building2 className="h-5 w-5" />
                <span className="text-sm font-medium">Brands</span>
                <span className="text-xs text-muted-foreground">{brandCount}</span>
              </Label>

              <Label
                htmlFor="all"
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  recipientType === "all"
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <RadioGroupItem value="all" id="all" className="sr-only" />
                <Megaphone className="h-5 w-5" />
                <span className="text-sm font-medium">Everyone</span>
                <span className="text-xs text-muted-foreground">{totalCount}</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Message input */}
          <div className="space-y-2">
            <Label htmlFor="message">Your message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hey everyone! Just wanted to let you know..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </p>
          </div>

          {/* Warning for no recipients */}
          {recipientCount === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No {recipientType === "all" ? "conversations" : recipientType} to send to yet
            </p>
          )}

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={loading || !message.trim() || recipientCount === 0}
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send to {recipientCount} {recipientType === "all" ? "people" : recipientType}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You can send one blast per hour
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
