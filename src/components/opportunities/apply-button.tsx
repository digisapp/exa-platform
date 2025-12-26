"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

interface ApplyButtonProps {
  opportunityId: string;
  actorId: string | null;
}

export function ApplyButton({ opportunityId, actorId }: ApplyButtonProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleApply = async () => {
    if (!actorId) {
      toast.error("Please sign in to apply");
      return;
    }

    setLoading(true);

    try {
      // Create application
      const { error: appError } = await (supabase
        .from("opportunity_applications") as any)
        .insert({
          opportunity_id: opportunityId,
          model_id: actorId,
          note: note || null,
        });

      if (appError) throw appError;

      // Award points for applying
      await (supabase.rpc as any)("award_points", {
        p_model_id: actorId,
        p_action: "opportunity_apply",
        p_points: 5,
        p_metadata: { opportunity_id: opportunityId },
      });

      toast.success("Application submitted! +5 points earned");
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
          <DialogTitle>Apply for this Opportunity</DialogTitle>
          <DialogDescription>
            Submit your application. You&apos;ll earn +5 points for applying!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Note to organizers (optional)
            </label>
            <Textarea
              placeholder="Tell them why you'd be great for this opportunity..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
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
