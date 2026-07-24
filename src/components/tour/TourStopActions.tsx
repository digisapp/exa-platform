"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Sparkles, Shirt, Camera } from "lucide-react";

// The three apply entry points on a tour stop row. Models go through the
// normal gig flow (/gigs/[slug] → ApplyButton); designers and media submit a
// no-account form to /api/tour/apply.

type Role = "designer" | "media";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  company: "",
  instagram_handle: "",
  website_url: "",
  media_type: "photographer",
  message: "",
};

export function TourStopActions({
  gigId,
  showTitle,
  slug,
  status,
  hasApplied,
  applicationStatus,
}: {
  gigId: string;
  showTitle: string;
  slug: string;
  status: string;
  hasApplied?: boolean;
  applicationStatus?: string;
}) {
  const [role, setRole] = useState<Role | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function openDialog(r: Role) {
    setForm(EMPTY_FORM);
    setError("");
    setRole(r);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/tour/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gigId,
          role,
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          company: form.company || null,
          instagram_handle: form.instagram_handle || null,
          website_url: form.website_url || null,
          media_type: role === "media" ? form.media_type : null,
          message: form.message || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit");
        return;
      }
      toast.success(
        data.alreadyApplied
          ? "You're already on the list for this show!"
          : "Application received! We'll be in touch."
      );
      setRole(null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Models → normal gig flow */}
      {hasApplied ? (
        <span
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold ${
            applicationStatus === "accepted"
              ? "bg-green-500/15 text-green-400 border border-green-500/30"
              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {applicationStatus === "accepted" ? "You're In" : "Applied"}
        </span>
      ) : (
        <Button
          asChild
          size="sm"
          className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold"
        >
          <Link href={`/gigs/${slug}`}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {status === "open" ? "Models Apply" : "Model Details"}
          </Link>
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={() => openDialog("designer")}
        className="rounded-full border-violet-500/40 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
      >
        <Shirt className="h-3.5 w-3.5 mr-1.5" />
        Designers
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => openDialog("media")}
        className="rounded-full border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200"
      >
        <Camera className="h-3.5 w-3.5 mr-1.5" />
        Media
      </Button>

      <Dialog open={role !== null} onOpenChange={(open) => !open && setRole(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400 text-transparent bg-clip-text">
              {role === "designer" ? "Designer Application" : "Media Application"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-center">
              {showTitle}
              {role === "media" && (
                <span className="block">Photographers, videographers, press &amp; PR</span>
              )}
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Name *"
              maxLength={200}
            />
            <Input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Email *"
              maxLength={200}
            />
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Phone"
              maxLength={50}
            />
            {role === "media" && (
              <Select
                value={form.media_type}
                onValueChange={(v) => setForm((f) => ({ ...f, media_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="What do you do?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photographer">Photographer</SelectItem>
                  <SelectItem value="videographer">Videographer</SelectItem>
                  <SelectItem value="press_pr">Press / PR</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Input
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              placeholder={role === "designer" ? "Brand name" : "Outlet / company"}
              maxLength={200}
            />
            <Input
              value={form.instagram_handle}
              onChange={(e) => setForm((f) => ({ ...f, instagram_handle: e.target.value }))}
              placeholder="Instagram @handle"
              maxLength={100}
            />
            <Input
              value={form.website_url}
              onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
              placeholder={role === "designer" ? "Website / lookbook link" : "Website / portfolio link"}
              maxLength={500}
            />
            <Textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder={
                role === "designer"
                  ? "Tell us about your collection"
                  : "What would you like to cover?"
              }
              rows={3}
              maxLength={2000}
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Application
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
