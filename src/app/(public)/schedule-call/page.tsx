"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, Phone } from "lucide-react";

function getNext14Weekdays(): string[] {
  const days: string[] = [];
  const now = new Date();
  const current = new Date(now);
  current.setDate(current.getDate() + 1); // Start from tomorrow

  while (days.length < 14) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      const label = current.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      days.push(label);
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

const TIME_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM",
  "7:00 PM",
];

function ScheduleCallContent() {
  const searchParams = useSearchParams();
  const gigTitle = searchParams.get("gig") || "";

  const [state, setState] = useState<"form" | "submitting" | "success">("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  const weekdays = getNext14Weekdays();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !phone || !selectedDay || !selectedTime) return;

    setState("submitting");
    try {
      const res = await fetch("/api/schedule-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          instagram: instagram || undefined,
          phone,
          day: selectedDay,
          time: selectedTime,
          gigTitle: gigTitle || undefined,
        }),
      });

      if (!res.ok) {
        setState("form");
        return;
      }

      setState("success");
    } catch {
      setState("form");
    }
  }

  if (state === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-8 text-center space-y-4 shadow-[0_0_28px_rgba(52,211,153,0.2)]">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/40 blur-2xl" />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500/25 to-teal-500/25 ring-1 ring-emerald-500/40 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-emerald-300" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white">
            <span className="exa-gradient-text">Call Scheduled!</span>
          </h2>
          <p className="text-white/70">
            Thanks for letting us know your availability. We&apos;ll call you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="relative mx-auto mb-3 inline-flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-pink-500/40 blur-xl opacity-60" />
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-[0_0_16px_rgba(236,72,153,0.45)]">
              <Phone className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-1">
            Consultation
          </p>
          <h1 className="text-2xl font-bold text-white">
            <span className="exa-gradient-text">Schedule a Call</span>
          </h1>
          {gigTitle && (
            <p className="text-white/60 text-sm mt-1">
              Re: <span className="text-white font-medium">{gigTitle}</span>
            </p>
          )}
          <p className="text-white/60 text-sm mt-2">
            Pick a time that works for you and we&apos;ll give you a call.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-white/80">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-white/80">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            {/* Instagram */}
            <div className="space-y-2">
              <Label htmlFor="instagram" className="text-white/80">Instagram</Label>
              <Input
                id="instagram"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@username"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-white/80">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                required
              />
              <p className="text-xs text-white/50">
                We&apos;ll call you at this number.
              </p>
            </div>

            {/* Day Selection */}
            <div className="space-y-2">
              <Label className="text-white/80">Day</Label>
              <div className="grid grid-cols-2 gap-2">
                {weekdays.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                      selectedDay === day
                        ? "bg-pink-500/15 border-pink-500/60 text-pink-200 font-semibold shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 text-white/70"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {!selectedDay && (
                <p className="text-xs text-amber-300">
                  Please select a day
                </p>
              )}
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label htmlFor="time" className="text-white/80">Time (ET)</Label>
              <select
                id="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm focus:border-pink-400/60 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                required
              >
                <option value="">Select a time</option>
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 hover:from-pink-400 hover:via-violet-400 hover:to-cyan-400 text-white font-bold rounded-full h-11 shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:shadow-[0_0_28px_rgba(236,72,153,0.6)] border-0 active:scale-[0.98] transition-all"
              disabled={state === "submitting" || !selectedDay || !selectedTime || !phone || !firstName || !lastName}
            >
              {state === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Schedule My Call"
              )}
            </Button>
          </form>
        </div>
    </div>
  );
}

export default function ScheduleCallPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      }
    >
      <ScheduleCallContent />
    </Suspense>
  );
}
