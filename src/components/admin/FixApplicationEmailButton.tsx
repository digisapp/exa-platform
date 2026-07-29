"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Escape hatch for applicants who mistyped their email at signup: the confirm
// link (and everything after it) goes to an address they can't read, so
// "Resend confirm email" can never unblock them. This corrects the address
// everywhere (application + login + fan record) and sends a fresh confirm
// link to the fixed one — approval unlocks once she clicks it.
export function FixApplicationEmailButton({
  applicationId,
  currentEmail,
  onSuccess,
  size = "sm",
}: {
  applicationId: string;
  currentEmail: string;
  /** Called with the corrected email after a successful save */
  onSuccess?: (newEmail: string) => void;
  /** "sm" for list rows, "lg" for the triage queue's round action row */
  size?: "sm" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const openDialog = () => {
    setEmail(currentEmail);
    setOpen(true);
  };

  const handleSave = async () => {
    const cleaned = email.trim().toLowerCase();
    if (!cleaned || cleaned === currentEmail.toLowerCase()) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/model-applications/${applicationId}/update-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update email");
      }
      toast.success(`Email fixed — confirm link sent to ${data.email}`);
      setOpen(false);
      onSuccess?.(data.email);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update email";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {size === "lg" ? (
        <Button
          variant="outline"
          size="lg"
          onClick={openDialog}
          title="She entered the wrong email — fix it and send the confirm link to the right address"
          className="h-16 px-5 rounded-full border-amber-500/50 hover:bg-amber-500/10 hover:border-amber-500 font-semibold"
        >
          <Pencil className="h-5 w-5 mr-2 text-amber-500" />
          Fix email
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={openDialog}
          title="She entered the wrong email — fix it and send the confirm link to the right address"
          className="text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
        >
          <Pencil className="h-4 w-4 mr-1" />
          Fix email
        </Button>
      )}

      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fix application email</DialogTitle>
            <DialogDescription>
              Updates her application and login email, then sends a fresh confirm
              link to the corrected address. Approve once she clicks it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="fix-application-email">Correct email</Label>
            <Input
              id="fix-application-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave();
              }}
            />
            <p className="text-xs text-muted-foreground">
              Currently on file: {currentEmail}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !email.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save &amp; send confirm link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
