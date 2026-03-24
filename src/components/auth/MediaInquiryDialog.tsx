"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface MediaInquiryDialogProps {
  children: React.ReactNode;
}

export function MediaInquiryDialog({ children }: MediaInquiryDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    instagram_handle: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/media-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit");
        return;
      }

      toast.success("Submission received! We'll be in touch soon.");
      setForm({ name: "", email: "", phone: "", instagram_handle: "", message: "" });
      setOpen(false);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center bg-gradient-to-r from-violet-400 to-purple-500 text-transparent bg-clip-text">
            Media Inquiry
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center">
            Press, photographers, bloggers — let us know how you&apos;d like to collaborate.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <Input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Name *"
          />
          <Input
            required
            value={form.instagram_handle}
            onChange={(e) => setForm((f) => ({ ...f, instagram_handle: e.target.value }))}
            placeholder="Instagram @handle *"
          />
          <Input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="Phone"
          />
          <Input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="Email *"
          />
          <Textarea
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="What are you interested in?"
            rows={3}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
