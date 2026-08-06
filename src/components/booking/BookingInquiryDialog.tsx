"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Agency-style booking inquiry — the "Book" CTA on /models cards, model
// profiles, and the explore header. No account required: the lead goes to
// the EXA team (team@ email + /admin/booking-inquiries), never directly to
// the model. Works with a preselected model or as a general talent inquiry.

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/${url}`;
}

export interface BookableModel {
  id: string;
  username: string;
  profile_photo_url?: string | null;
}

interface BookingInquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselected model, or null for a general "find me talent" inquiry. */
  model: BookableModel | null;
  /** Which surface produced the lead — stored for funnel reporting. */
  source: "card" | "profile" | "explore_header" | "rates";
  /** Pre-fill for logged-in users. */
  defaultEmail?: string;
  /** Pre-select the booking type, e.g. from a tapped rate card. */
  defaultInquiryType?: string;
  /** Pre-fill project details, e.g. the tapped service and its rate. */
  defaultDetails?: string;
}

const INQUIRY_TYPES = [
  { value: "photoshoot", label: "Photoshoot" },
  { value: "runway", label: "Runway / Fashion Show" },
  { value: "event", label: "Event / Appearance" },
  { value: "campaign", label: "Brand Campaign" },
  { value: "content", label: "Content Creation" },
  { value: "other", label: "Other" },
];

const BUDGET_RANGES = [
  { value: "under_1k", label: "Under $1,000" },
  { value: "1k_5k", label: "$1,000 – $5,000" },
  { value: "5k_15k", label: "$5,000 – $15,000" },
  { value: "15k_plus", label: "$15,000+" },
  { value: "discuss", label: "Prefer to discuss" },
];

export function BookingInquiryDialog({
  open,
  onOpenChange,
  model,
  source,
  defaultEmail,
  defaultInquiryType,
  defaultDetails,
}: BookingInquiryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState(defaultEmail || "");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [inquiryType, setInquiryType] = useState(defaultInquiryType || "");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [details, setDetails] = useState(defaultDetails || "");
  const [website, setWebsite] = useState(""); // honeypot

  const photoUrl = resolveMediaUrl(model?.profile_photo_url);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      toast.error("Please enter a valid email");
      return;
    }
    if (!inquiryType) {
      toast.error("Please pick a booking type");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/booking-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: model?.id || null,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          company: company.trim() || null,
          inquiryType,
          eventDate: eventDate.trim() || null,
          location: location.trim() || null,
          budgetRange: budgetRange || null,
          details: details.trim() || null,
          source,
          website: website || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit. Please try again.");
      }

      setSubmitted(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      // Keep contact fields for a likely next inquiry; reset the rest after
      // the close animation.
      setTimeout(() => setSubmitted(false), 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[90dvh] overflow-y-auto">
        <div className="bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-5 text-white text-center">
          {model && (
            <div className="mx-auto mb-2 w-14 h-14 rounded-full overflow-hidden ring-2 ring-white/70">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt={model.username}
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center text-lg font-bold">
                  {model.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
          <DialogTitle className="text-xl font-bold text-white notranslate">
            {model ? `Book @${model.username}` : "Book EXA Talent"}
          </DialogTitle>
          <p className="text-sm text-white/85 mt-1">
            {model
              ? "Tell us about your project — our team replies within 24 hours."
              : "Tell us what you need — we'll match you with the right models."}
          </p>
        </div>

        {submitted ? (
          <div className="px-6 py-10 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
            <p className="text-lg font-semibold">Inquiry sent!</p>
            <p className="text-sm text-muted-foreground">
              Our booking team will get back to you within 24 hours. A
              confirmation is on its way to your inbox.
            </p>
            <Button variant="outline" className="mt-2" onClick={() => handleOpenChange(false)}>
              Keep Browsing
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="biName">Your Name *</Label>
                <Input
                  id="biName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biEmail">Email *</Label>
                <Input
                  id="biEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  disabled={loading}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="biPhone">Phone</Label>
                <Input
                  id="biPhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                  disabled={loading}
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biCompany">Company / Brand</Label>
                <Input
                  id="biCompany"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Optional"
                  disabled={loading}
                  autoComplete="organization"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Booking Type *</Label>
              <Select value={inquiryType} onValueChange={setInquiryType} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select booking type" />
                </SelectTrigger>
                <SelectContent>
                  {INQUIRY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="biDate">Date(s)</Label>
                <Input
                  id="biDate"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  placeholder={'e.g. "Sept 14" or "TBD"'}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biLocation">Location</Label>
                <Input
                  id="biLocation"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City or remote"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Budget</Label>
              <Select value={budgetRange} onValueChange={setBudgetRange} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGES.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="biDetails">Project Details</Label>
              <Textarea
                id="biDetails"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Tell us about the shoot, event, or campaign — and mention if you're open to similar models."
                rows={3}
                maxLength={3000}
                disabled={loading}
              />
            </div>

            {/* Honeypot — hidden from real users, bots auto-fill it */}
            <div className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
              <label>
                Website
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base exa-gradient-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Inquiry"
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Goes straight to the EXA booking team — no account needed.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
