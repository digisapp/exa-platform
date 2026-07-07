"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ModelSignupDialog } from "@/components/auth/ModelSignupDialog";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

interface ApplyButtonProps {
  gigId: string;
  gigSlug: string;
  modelId: string | null;
  isLoggedIn: boolean;
}

export function ApplyButton({ gigId, gigSlug, modelId, isLoggedIn }: ApplyButtonProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Logged-out visitors are prospective models arriving from outreach —
  // open the model signup flow instead of dead-ending on a toast.
  if (!isLoggedIn) {
    return (
      <div className="space-y-2">
        <ModelSignupDialog>
          <Button className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
            <Sparkles className="mr-2 h-4 w-4" />
            Apply Now
          </Button>
        </ModelSignupDialog>
        <p className="text-center text-xs text-white/50">
          Already on EXA?{" "}
          <Link
            href={`/signin?redirect=/gigs/${gigSlug}`}
            className="text-pink-400 hover:text-pink-300 underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  // Logged in without a model profile (fan/brand accounts)
  if (!modelId) {
    return (
      <p className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center text-sm text-white/50">
        Gig applications are for EXA models.
      </p>
    );
  }

  const handleApply = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/gigs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gigId, note: note || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      toast.success("Application submitted!");
      setOpen(false);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit application";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
          <Sparkles className="mr-2 h-4 w-4" />
          Apply Now
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply for this Gig</DialogTitle>
          <DialogDescription>
            Submit your application to express your interest in this opportunity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Note to organizers (optional)
            </label>
            <Textarea
              placeholder="Tell them why you'd be great for this gig..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={loading}
            className="bg-gradient-to-r from-pink-500 to-violet-500"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
