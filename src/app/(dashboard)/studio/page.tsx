"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  CalendarDays,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { StudioSlot, StudioBooking } from "@/types/studio";

type Tab = "book" | "my-bookings";

export default function StudioPage() {
  const [tab, setTab] = useState<Tab>("book");
  const [loading, setLoading] = useState(true);

  // Book tab state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<StudioSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<StudioSlot | null>(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [booking, setBooking] = useState(false);

  // My bookings state
  const [myBookings, setMyBookings] = useState<StudioBooking[]>([]);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Get month date range
  const getMonthRange = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
    };
  }, []);

  // Fetch slots for current month
  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const { start_date, end_date } = getMonthRange(currentMonth);
      const res = await fetch(`/api/studio/slots?start_date=${start_date}&end_date=${end_date}`);
      const data = await res.json();
      if (res.ok) {
        setSlots(data.slots || []);
      }
    } catch {
      toast.error("Failed to load studio availability");
    } finally {
      setLoading(false);
    }
  }, [currentMonth, getMonthRange]);

  // Fetch my bookings
  const fetchMyBookings = useCallback(async () => {
    try {
      const res = await fetch("/api/studio/my-bookings");
      const data = await res.json();
      if (res.ok) {
        setMyBookings(data.bookings || []);
      }
    } catch {
      toast.error("Failed to load your bookings");
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    if (tab === "my-bookings") {
      fetchMyBookings();
    }
  }, [tab, fetchMyBookings]);

  // Get available dates (dates that have at least one unboooked slot)
  const availableDates = new Set(
    slots
      .filter((s) => !s.booking || s.booking.status === "cancelled")
      .map((s) => s.date)
  );

  // Get slots for selected date
  const daySlots = selectedDate
    ? slots.filter((s) => s.date === selectedDate)
    : [];

  // Book a slot
  const handleBook = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    try {
      const res = await fetch("/api/studio/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          notes: bookingNotes || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Studio time booked!");
        setShowConfirm(false);
        setSelectedSlot(null);
        setBookingNotes("");
        fetchSlots();
        fetchMyBookings();
      } else {
        toast.error(data.error || "Failed to book slot");
      }
    } catch {
      toast.error("Failed to book slot");
    } finally {
      setBooking(false);
    }
  };

  // Cancel a booking
  const handleCancel = async (bookingId: string) => {
    setCancelling(bookingId);
    try {
      const res = await fetch(`/api/studio/book/${bookingId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Booking cancelled");
        fetchMyBookings();
        fetchSlots();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to cancel");
      }
    } catch {
      toast.error("Failed to cancel booking");
    } finally {
      setCancelling(null);
    }
  };

  // Calendar helpers
  const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const today = new Date().toISOString().split("T")[0];

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${m} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  // Separate bookings into upcoming and past
  const upcomingBookings = myBookings.filter(
    (b) => b.status === "confirmed" && b.slot && b.slot.date >= today
  );
  const pastBookings = myBookings.filter(
    (b) => b.status !== "confirmed" || (b.slot && b.slot.date < today)
  );

  return (
    <div className="container px-8 md:px-16 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="h-6 w-6 text-teal-500" />
            Studio
          </h1>
          <p className="text-muted-foreground mt-1">
            Book free 1-hour time slots in the EXA studio
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        <button
          onClick={() => setTab("book")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
            tab === "book"
              ? "border-teal-500 text-teal-500"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Book Studio Time
        </button>
        <button
          onClick={() => setTab("my-bookings")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
            tab === "my-bookings"
              ? "border-teal-500 text-teal-500"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          My Bookings
          {upcomingBookings.length > 0 && (
            <span className="ml-2 bg-teal-500/20 text-teal-500 text-xs px-1.5 py-0.5 rounded-full">
              {upcomingBookings.length}
            </span>
          )}
        </button>
      </div>

      {/* Book Tab */}
      {tab === "book" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Calendar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                    )
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold">{monthName}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                    )
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="text-center text-xs text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for offset */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentMonth.getFullYear()}-${String(
                    currentMonth.getMonth() + 1
                  ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isAvailable = availableDates.has(dateStr);
                  const isSelected = selectedDate === dateStr;
                  const isPast = dateStr < today;

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        if (isAvailable && !isPast) setSelectedDate(dateStr);
                      }}
                      disabled={!isAvailable || isPast}
                      className={cn(
                        "aspect-square flex items-center justify-center rounded-md text-sm transition-colors",
                        isSelected && "bg-teal-500 text-white font-bold",
                        !isSelected && isAvailable && !isPast && "bg-teal-500/15 text-teal-400 hover:bg-teal-500/30 font-medium",
                        isPast && "text-muted-foreground/30",
                        !isAvailable && !isPast && "text-muted-foreground/50"
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {loading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Slots */}
          <div>
            {selectedDate ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">{formatDate(selectedDate)}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {daySlots.map((slot) => {
                    const isBooked =
                      slot.booking && slot.booking.status !== "cancelled";
                    return (
                      <button
                        key={slot.id}
                        disabled={!!isBooked}
                        onClick={() => {
                          setSelectedSlot(slot);
                          setShowConfirm(true);
                        }}
                        className={cn(
                          "p-3 rounded-lg border text-center transition-colors",
                          isBooked
                            ? "border-border bg-muted/50 text-muted-foreground cursor-not-allowed"
                            : "border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-foreground cursor-pointer"
                        )}
                      >
                        <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <div className="text-sm font-medium">
                          {formatTime(slot.start_time)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isBooked ? "Booked" : "Available"}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {daySlots.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    No time slots available for this day.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                <CalendarDays className="h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">Select a date</p>
                <p className="text-sm mt-1">
                  Green dates have available studio time
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* My Bookings Tab */}
      {tab === "my-bookings" && (
        <div className="space-y-6">
          {/* Upcoming */}
          <div>
            <h3 className="font-semibold mb-3">Upcoming</h3>
            {upcomingBookings.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming bookings.</p>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((b) => (
                  <Card key={b.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {b.slot ? formatDate(b.slot.date) : "Unknown date"}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3.5 w-3.5" />
                            {b.slot
                              ? `${formatTime(b.slot.start_time)} - ${formatTime(b.slot.end_time)}`
                              : "Unknown time"}
                          </div>
                          {b.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {b.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-teal-500/20 text-teal-400">
                            Confirmed
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(b.id)}
                            disabled={cancelling === b.id}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            {cancelling === b.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Past */}
          {pastBookings.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-muted-foreground">Past</h3>
              <div className="space-y-2">
                {pastBookings.map((b) => (
                  <Card key={b.id} className="opacity-60">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">
                            {b.slot ? formatDate(b.slot.date) : "Unknown date"}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {b.slot
                              ? `${formatTime(b.slot.start_time)} - ${formatTime(b.slot.end_time)}`
                              : "Unknown time"}
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            b.status === "completed" && "bg-green-500/20 text-green-400",
                            b.status === "cancelled" && "bg-red-500/20 text-red-400",
                            b.status === "no_show" && "bg-yellow-500/20 text-yellow-400"
                          )}
                        >
                          {b.status === "no_show" ? "No Show" : b.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm Booking Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Studio Booking</DialogTitle>
            <DialogDescription>
              {selectedSlot && selectedDate && (
                <>
                  {formatDate(selectedDate)} at{" "}
                  {formatTime(selectedSlot.start_time)} -{" "}
                  {formatTime(selectedSlot.end_time)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">
                Notes <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="What will you be shooting? Any special setup needs?"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirm(false);
                setSelectedSlot(null);
                setBookingNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBook}
              disabled={booking}
              className="bg-teal-500 hover:bg-teal-600"
            >
              {booking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
