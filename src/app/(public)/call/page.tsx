"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker";
import {
  Phone,
  Instagram,
  User,
  Mail,
  MessageSquare,
  CheckCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

function CallRequestForm() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") || "website";
  const sourceDetail = searchParams.get("ref") || searchParams.get("campaign") || null;

  const [step, setStep] = useState<"info" | "calendar" | "time">("info");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    instagram_handle: "",
    phone: "",
    email: "",
    message: "",
  });

  // Fetch available slots on mount
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const startDate = format(new Date(), "yyyy-MM-dd");
        const endDate = format(addMonths(new Date(), 2), "yyyy-MM-dd");

        const response = await fetch(
          `/api/availability?start_date=${startDate}&end_date=${endDate}&only_available=true`
        );

        if (response.ok) {
          const data = await response.json();
          setSlots(data.slots || []);
        }
      } catch (error) {
        console.error("Failed to fetch slots:", error);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, []);

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Please enter your name and phone number");
      return;
    }

    if (!selectedSlotId) {
      toast.error("Please select a time slot");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/call-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          source,
          source_detail: sourceDetail,
          slot_id: selectedSlotId,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        toast.success("Call booked!");
      } else {
        const error = await response.json();
        if (error.error?.includes("no longer available")) {
          // Slot was taken, refresh slots
          toast.error("That time slot was just booked. Please select another.");
          setSelectedSlotId(null);
          setSelectedTime(null);
          setStep("time");
          // Refresh slots
          const startDate = format(new Date(), "yyyy-MM-dd");
          const endDate = format(addMonths(new Date(), 2), "yyyy-MM-dd");
          const slotsRes = await fetch(
            `/api/availability?start_date=${startDate}&end_date=${endDate}&only_available=true`
          );
          if (slotsRes.ok) {
            const data = await slotsRes.json();
            setSlots(data.slots || []);
          }
        } else {
          toast.error(error.error || "Failed to submit request");
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlotId(null);
    setSelectedTime(null);
    setStep("time");
  };

  const handleSlotSelect = (slotId: string, time: string) => {
    setSelectedSlotId(slotId);
    setSelectedTime(time);
  };

  const goBack = () => {
    if (step === "time") {
      setStep("calendar");
      setSelectedSlotId(null);
      setSelectedTime(null);
    } else if (step === "calendar") {
      setStep("info");
      setSelectedDate(null);
    }
  };

  // Check if any slots are available
  const hasAvailableSlots = slots.length > 0;

  if (submitted) {
    return (
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Call Booked!</h1>
          <p className="text-muted-foreground mb-2">
            Thanks for booking a call with EXA!
          </p>
          {selectedDate && selectedTime && (
            <div className="bg-pink-500/10 rounded-lg p-4 mb-6">
              <p className="font-medium text-pink-400">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-lg font-bold">{formatTime(selectedTime)}</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground mb-6">
            We&apos;ll call you at the scheduled time. Make sure your phone is nearby!
          </p>
          <div className="space-y-3">
            <Link href="/">
              <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
                Explore EXA
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/models">
              <Button variant="outline" className="w-full">
                Browse Models
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-md w-full">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-block">
          <Image
            src="/exa-logo-white.png"
            alt="EXA"
            width={80}
            height={80}
            className="mx-auto mb-4"
          />
        </Link>
      </div>

      <Card className="border-pink-500/20">
        <CardHeader className="text-center">
          {step !== "info" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="absolute left-4 top-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-pink-500" />
            <CardTitle>
              {step === "info" && "Request a Call"}
              {step === "calendar" && "Pick a Date"}
              {step === "time" && "Pick a Time"}
            </CardTitle>
          </div>
          <CardDescription>
            {step === "info" && "Interested in joining EXA? Let's chat!"}
            {step === "calendar" && "Select a date that works for you"}
            {step === "time" && selectedDate && `Available times for ${format(selectedDate, "MMMM d")}`}
          </CardDescription>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {["info", "calendar", "time"].map((s, i) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  step === s
                    ? "w-8 bg-pink-500"
                    : i < ["info", "calendar", "time"].indexOf(step)
                    ? "w-2 bg-pink-500"
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {/* Step 1: Contact Info */}
          {step === "info" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Your Name *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Smith"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  Instagram
                </label>
                <Input
                  value={form.instagram_handle}
                  onChange={(e) => setForm({ ...form, instagram_handle: e.target.value.replace("@", "") })}
                  placeholder="yourhandle"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Phone Number *
                </label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email (optional)
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jane@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Message (optional)
                </label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us a bit about yourself..."
                  rows={2}
                />
              </div>

              <Button
                onClick={() => {
                  if (!form.name.trim() || !form.phone.trim()) {
                    toast.error("Please enter your name and phone number");
                    return;
                  }
                  setStep("calendar");
                }}
                disabled={slotsLoading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              >
                {slotsLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    {hasAvailableSlots ? "Choose a Time" : "Continue"}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Calendar */}
          {step === "calendar" && (
            <div className="space-y-4">
              {hasAvailableSlots ? (
                <BookingCalendar
                  slots={slots}
                  selectedDate={selectedDate}
                  onSelectDate={handleDateSelect}
                />
              ) : (
                <div className="text-center py-8 space-y-4">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="font-medium">No Available Times</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      We&apos;re currently updating our availability. Submit your info and we&apos;ll call you soon!
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const response = await fetch("/api/call-requests", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            ...form,
                            source,
                            source_detail: sourceDetail,
                          }),
                        });
                        if (response.ok) {
                          setSubmitted(true);
                          toast.success("Request submitted!");
                        } else {
                          const error = await response.json();
                          toast.error(error.error || "Failed to submit");
                        }
                      } catch {
                        toast.error("Failed to submit");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Time Slots */}
          {step === "time" && selectedDate && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <TimeSlotPicker
                slots={slots}
                selectedDate={selectedDate}
                selectedSlotId={selectedSlotId}
                onSelectSlot={handleSlotSelect}
              />

              {selectedSlotId && (
                <div className="bg-green-500/10 rounded-lg p-3 text-center">
                  <p className="text-sm text-muted-foreground">Selected time:</p>
                  <p className="font-semibold text-green-400">
                    {format(selectedDate, "MMMM d")} at {selectedTime && formatTime(selectedTime)}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !selectedSlotId}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-4 w-4" />
                    Book Call
                  </>
                )}
              </Button>
            </form>
          )}

          <p className="text-xs text-muted-foreground text-center mt-4">
            By booking, you agree to receive a call from EXA Models.
          </p>
        </CardContent>
      </Card>

      {/* Already have an account */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        Already an EXA model?{" "}
        <Link href="/login" className="text-pink-500 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="max-w-md w-full">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full animate-pulse" />
      </div>
      <Card className="border-pink-500/20">
        <CardContent className="pt-8 pb-8">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CallRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-cyan-500/5">
      <Suspense fallback={<LoadingFallback />}>
        <CallRequestForm />
      </Suspense>
    </div>
  );
}
