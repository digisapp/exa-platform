"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Copy, Check, ExternalLink, Users } from "lucide-react";
import { toast } from "sonner";

interface CreateRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelIds: string[];
}

export function CreateRosterModal({ isOpen, onClose, modelIds }: CreateRosterModalProps) {
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setTitle(""); setClientName(""); setNote("");
    setShareUrl(null); setCopied(false); setSubmitting(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Give the roster a title"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, client_name: clientName, note, model_ids: modelIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create roster");
      const url = `${window.location.origin}/roster/${data.share_token}`;
      setShareUrl(url);
      toast.success(`Roster created with ${data.model_count} models`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create roster");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        {!shareUrl ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-pink-500" />
                Create client roster
              </DialogTitle>
              <DialogDescription>
                {modelIds.length} model{modelIds.length === 1 ? "" : "s"} selected. This generates a public
                link you can send to a client — no account needed on their end.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="roster-title">Roster title *</Label>
                <Input
                  id="roster-title"
                  placeholder="e.g. Blonde models, 5'9&quot;+ — Spring campaign"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="roster-client">Client name</Label>
                <Input
                  id="roster-client"
                  placeholder="e.g. Acme Swimwear (optional)"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="roster-note">Note for the client</Label>
                <Textarea
                  id="roster-note"
                  placeholder="Optional intro shown at the top of the roster page"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting} className="bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create roster
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                Roster ready to share
              </DialogTitle>
              <DialogDescription>
                Send this link to your client. You can revoke or edit it anytime from the Rosters page.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2 py-2">
              <Input readOnly value={shareUrl} className="font-mono text-sm" onFocus={(e) => e.target.select()} />
              <Button variant="outline" size="icon" onClick={copyLink} title="Copy link">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" asChild>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />Preview
                </a>
              </Button>
              <Button onClick={handleClose} className="bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0">Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
