"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

interface SMSBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: Array<{
    id: string;
    name: string;
    phone: string | null;
  }>;
}

export function SMSBroadcastModal({
  isOpen,
  onClose,
  recipients,
}: SMSBroadcastModalProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // Filter recipients with valid phone numbers
  const validRecipients = recipients.filter((r) => r.phone && r.phone.trim());
  const invalidCount = recipients.length - validRecipients.length;

  const characterCount = message.length;
  const segmentCount = Math.ceil(characterCount / 160) || 1;
  const estimatedCost = (validRecipients.length * segmentCount * 0.01).toFixed(2);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (validRecipients.length === 0) {
      toast.error("No recipients with valid phone numbers");
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/twilio/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumbers: validRecipients.map((r) => r.phone),
          modelIds: validRecipients.map((r) => r.id),
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send");
      }

      setResult({
        sent: data.sent,
        failed: data.failed,
        errors: data.errors || [],
      });

      if (data.sent > 0) {
        toast.success(`Sent ${data.sent} messages`);
      }
      if (data.failed > 0) {
        toast.error(`${data.failed} messages failed`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setMessage("");
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-pink-500" />
            Send SMS Broadcast
          </DialogTitle>
          <DialogDescription>
            Send a text message to selected models
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            {/* Recipients Summary */}
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {validRecipients.length} recipients
                  </span>
                </div>
                {invalidCount > 0 && (
                  <span className="text-sm text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {invalidCount} without phone
                  </span>
                )}
              </div>
            </Card>

            {/* Message Input */}
            <div className="space-y-2">
              <Textarea
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={1600}
                className="resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {characterCount}/1600 characters
                  {segmentCount > 1 && ` (${segmentCount} segments)`}
                </span>
                <span>Est. cost: ${estimatedCost}</span>
              </div>
            </div>

            {/* Warning for Twilio not configured */}
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
              <p className="font-medium mb-1">Required Environment Variables:</p>
              <code className="text-xs">
                TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
              </code>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !message.trim() || validRecipients.length === 0}
                className="bg-gradient-to-r from-pink-500 to-violet-500"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to {validRecipients.length}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* Results */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 text-center border-green-500/20 bg-green-500/5">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-500">{result.sent}</p>
                <p className="text-sm text-muted-foreground">Sent</p>
              </Card>
              <Card className="p-4 text-center border-red-500/20 bg-red-500/5">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-500">{result.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </Card>
            </div>

            {result.errors.length > 0 && (
              <div className="max-h-32 overflow-auto bg-red-500/5 border border-red-500/20 rounded p-3">
                <p className="text-sm font-medium text-red-500 mb-2">Errors:</p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-400">
                    {err}
                  </p>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
