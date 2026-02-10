"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertTriangle, Phone } from "lucide-react";

interface ModelInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface GigInfo {
  id: string;
  title: string;
}

function getNext14Weekdays(): string[] {
  const days: string[] = [];
  const now = new Date();
  const current = new Date(now);
  current.setDate(current.getDate() + 1); // Start from tomorrow

  while (days.length < 14) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      // Format as "Mon Jan 6"
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
  const token = searchParams.get("token");

  const hasToken = !!token;
  const [state, setState] = useState<"loading" | "form" | "submitting" | "success" | "error" | "already_scheduled">(hasToken ? "loading" : "error");
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [gig, setGig] = useState<GigInfo | null>(null);

  const [phone, setPhone] = useState("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  const weekdays = getNext14Weekdays();

  useEffect(() => {
    if (!token) return;

    async function validate() {
      try {
        const res = await fetch(`/api/schedule-call?token=${encodeURIComponent(token!)}`);
        if (!res.ok) {
          setState("error");
          return;
        }
        const data = await res.json();
        setModel(data.model);
        setGig(data.gig);
        setPhone(data.model?.phone || "");
        setState("form");
      } catch {
        setState("error");
      }
    }

    validate();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedDay || !selectedTime) return;

    setState("submitting");
    try {
      const res = await fetch("/api/schedule-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          preferred_days: [selectedDay],
          preferred_time_range: selectedTime,
          timezone: "America/New_York",
          phone,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.error === "already_scheduled") {
        setState("already_scheduled");
        return;
      }

      if (!res.ok) {
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold">Invalid or Expired Link</h2>
            <p className="text-muted-foreground">
              This scheduling link is no longer valid. It may have expired or already been used.
            </p>
            <p className="text-sm text-muted-foreground">
              Need help? Contact us at{" "}
              <a href="mailto:info@examodels.com" className="text-pink-500 underline">
                info@examodels.com
              </a>{" "}
              or DM us on Instagram{" "}
              <a
                href="https://instagram.com/eaboratory"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-500 underline"
              >
                @eaboratory
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "success" || state === "already_scheduled") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">
              {state === "already_scheduled" ? "Already Scheduled!" : "Call Scheduled!"}
            </h2>
            <p className="text-muted-foreground">
              {state === "already_scheduled"
                ? "You've already submitted your preferences for this gig. We'll be in touch soon!"
                : "Thanks for letting us know your availability. We'll call you soon!"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Phone className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Schedule a Call</CardTitle>
          {gig && (
            <p className="text-muted-foreground text-sm mt-1">
              Re: {gig.title}
            </p>
          )}
          {model && (
            <p className="text-muted-foreground text-sm">
              Hey {model.firstName}! Pick a time that works for you.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                required
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll call you at this number
              </p>
            </div>

            {/* Day Selection */}
            <div className="space-y-2">
              <Label>Day</Label>
              <div className="grid grid-cols-2 gap-2">
                {weekdays.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      selectedDay === day
                        ? "bg-pink-500/10 border-pink-500 text-pink-500 font-medium"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {!selectedDay && (
                <p className="text-xs text-amber-500">
                  Please select a day
                </p>
              )}
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label htmlFor="time">Time (ET)</Label>
              <select
                id="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              disabled={state === "submitting" || !selectedDay || !selectedTime || !phone}
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
        </CardContent>
      </Card>
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
