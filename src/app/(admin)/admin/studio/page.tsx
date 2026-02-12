"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { StudioSlot, StudioBooking } from "@/types/studio";

type Tab = "availability" | "bookings";

const HOUR_SLOTS = [
  { start: "09:00:00", end: "10:00:00", label: "9 AM" },
  { start: "10:00:00", end: "11:00:00", label: "10 AM" },
  { start: "11:00:00", end: "12:00:00", label: "11 AM" },
  { start: "12:00:00", end: "13:00:00", label: "12 PM" },
  { start: "13:00:00", end: "14:00:00", label: "1 PM" },
  { start: "14:00:00", end: "15:00:00", label: "2 PM" },
  { start: "15:00:00", end: "16:00:00", label: "3 PM" },
  { start: "16:00:00", end: "17:00:00", label: "4 PM" },
  { start: "17:00:00", end: "18:00:00", label: "5 PM" },
];

export default function AdminStudioPage() {
  const [tab, setTab] = useState<Tab>("availability");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Availability tab state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [slots, setSlots] = useState<StudioSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [daySlotToggles, setDaySlotToggles] = useState<Record<string, boolean>>({});

  // Bookings tab state
  const [bookings, setBookings] = useState<StudioBooking[]>([]);
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);

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

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const { start_date, end_date } = getMonthRange(currentMonth);
      const res = await fetch(
        `/api/admin/studio/slots?start_date=${start_date}&end_date=${end_date}`
      );
      const data = await res.json();
      if (res.ok) {
        setSlots(data.slots || []);
      }
    } catch {
      toast.error("Failed to load slots");
    } finally {
      setLoading(false);
    }
  }, [currentMonth, getMonthRange]);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/studio/bookings");
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
      }
    } catch {
      toast.error("Failed to load bookings");
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    if (tab === "bookings") {
      fetchBookings();
    }
  }, [tab, fetchBookings]);

  // Open day editor dialog
  const openDayEditor = (dateStr: string) => {
    setSelectedDate(dateStr);
    // Initialize toggles from existing slots
    const existing = slots.filter((s) => s.date === dateStr);
    const toggles: Record<string, boolean> = {};
    HOUR_SLOTS.forEach((h) => {
      toggles[h.start] = existing.some((s) => s.start_time === h.start);
    });
    setDaySlotToggles(toggles);
    setShowDayDialog(true);
  };

  // Save day slots
  const saveDaySlots = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const enabledSlots = HOUR_SLOTS.filter((h) => daySlotToggles[h.start]).map((h) => ({
        start_time: h.start,
        end_time: h.end,
      }));

      // First delete existing slots for the day (that aren't booked)
      await fetch("/api/admin/studio/slots", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate }),
      });

      // Then create new ones if any
      if (enabledSlots.length > 0) {
        const res = await fetch("/api/admin/studio/slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: selectedDate, slots: enabledSlots }),
        });
        if (!res.ok) {
          throw new Error("Failed to save");
        }
      }

      toast.success("Availability updated");
      setShowDayDialog(false);
      fetchSlots();
    } catch {
      toast.error("Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  // Standard hours quick action
  const setStandardHours = () => {
    const toggles: Record<string, boolean> = {};
    HOUR_SLOTS.forEach((h) => {
      toggles[h.start] = true;
    });
    setDaySlotToggles(toggles);
  };

  // Copy to next week
  const copyToNextWeek = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const currentDaySlots = HOUR_SLOTS.filter((h) => daySlotToggles[h.start]);
      if (currentDaySlots.length === 0) {
        toast.error("No slots to copy");
        setSaving(false);
        return;
      }

      const nextWeekDate = new Date(selectedDate + "T00:00:00");
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      const nextDateStr = nextWeekDate.toISOString().split("T")[0];

      const res = await fetch("/api/admin/studio/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: nextDateStr,
          slots: currentDaySlots.map((h) => ({
            start_time: h.start,
            end_time: h.end,
          })),
        }),
      });

      if (res.ok) {
        toast.success(`Copied to ${nextDateStr}`);
        fetchSlots();
      } else {
        toast.error("Failed to copy");
      }
    } catch {
      toast.error("Failed to copy to next week");
    } finally {
      setSaving(false);
    }
  };

  // Clear day
  const clearDay = () => {
    const toggles: Record<string, boolean> = {};
    HOUR_SLOTS.forEach((h) => {
      toggles[h.start] = false;
    });
    setDaySlotToggles(toggles);
  };

  // Update booking status
  const updateBookingStatus = async (
    bookingId: string,
    status: "cancelled" | "completed" | "no_show"
  ) => {
    setUpdatingBooking(bookingId);
    try {
      const res = await fetch(`/api/admin/studio/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Booking ${status === "no_show" ? "marked as no-show" : status}`);
        fetchBookings();
        fetchSlots();
      } else {
        toast.error("Failed to update booking");
      }
    } catch {
      toast.error("Failed to update booking");
    } finally {
      setUpdatingBooking(null);
    }
  };

  // Calendar helpers
  const monthName = currentMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfWeek = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();
  // Get slots per date and total booking capacity/counts
  const slotsPerDate = new Map<string, number>();
  const bookedPerDate = new Map<string, number>();
  const capacityPerDate = new Map<string, number>();
  slots.forEach((s) => {
    slotsPerDate.set(s.date, (slotsPerDate.get(s.date) || 0) + 1);
    const maxBookings = s.max_bookings ?? 3;
    capacityPerDate.set(s.date, (capacityPerDate.get(s.date) || 0) + maxBookings);
    const confirmedCount = s.bookings?.length ?? (s.booking && s.booking.status === "confirmed" ? 1 : 0);
    bookedPerDate.set(s.date, (bookedPerDate.get(s.date) || 0) + confirmedCount);
  });

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${m} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Stats
  const thisMonthSlots = slots.length;
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const totalCapacity = slots.reduce((sum, s) => sum + (s.max_bookings ?? 3), 0);
  const totalBooked = slots.reduce((sum, s) => {
    const count = s.bookings?.length ?? (s.booking && s.booking.status === "confirmed" ? 1 : 0);
    return sum + count;
  }, 0);
  const utilization = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

  return (
    <div className="container px-8 md:px-16 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Camera className="h-6 w-6 text-teal-500" />
          Studio Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage studio availability and view bookings
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        <button
          onClick={() => setTab("availability")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
            tab === "availability"
              ? "border-teal-500 text-teal-500"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <CalendarDays className="h-4 w-4 inline mr-1.5" />
          Availability
        </button>
        <button
          onClick={() => setTab("bookings")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
            tab === "bookings"
              ? "border-teal-500 text-teal-500"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="h-4 w-4 inline mr-1.5" />
          Bookings
        </button>
      </div>

      {/* Availability Tab */}
      {tab === "availability" && (
        <div>
          {/* Calendar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() - 1,
                        1
                      )
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
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() + 1,
                        1
                      )
                    )
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs text-muted-foreground py-1 font-medium"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentMonth.getFullYear()}-${String(
                    currentMonth.getMonth() + 1
                  ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const slotCount = slotsPerDate.get(dateStr) || 0;
                  const bookedCount = bookedPerDate.get(dateStr) || 0;
                  const hasSlots = slotCount > 0;

                  return (
                    <button
                      key={day}
                      onClick={() => openDayEditor(dateStr)}
                      className={cn(
                        "aspect-square flex flex-col items-center justify-center rounded-lg text-sm border transition-colors relative",
                        hasSlots
                          ? "border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20"
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                      )}
                    >
                      <span className={cn("font-medium", hasSlots && "text-teal-400")}>
                        {day}
                      </span>
                      {hasSlots && (
                        <span className="text-[10px] text-muted-foreground">
                          {bookedCount}/{slotCount}
                        </span>
                      )}
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
        </div>
      )}

      {/* Bookings Tab */}
      {tab === "bookings" && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold">{thisMonthSlots}</div>
                <div className="text-sm text-muted-foreground">Slots This Month</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold">{confirmedBookings.length}</div>
                <div className="text-sm text-muted-foreground">Upcoming Bookings</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold">{utilization}%</div>
                <div className="text-sm text-muted-foreground">Utilization</div>
              </CardContent>
            </Card>
          </div>

          {/* Bookings list */}
          {bookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No studio bookings yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <Card key={b.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={b.model?.profile_photo_url || undefined} />
                          <AvatarFallback className="bg-teal-500/20 text-teal-400 text-xs">
                            {b.model?.first_name?.[0] || "M"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">
                            {b.model?.first_name} {b.model?.last_name}
                            {b.model?.username && (
                              <span className="text-muted-foreground ml-1">
                                @{b.model.username}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{b.slot ? formatDate(b.slot.date) : "—"}</span>
                            <span>
                              {b.slot
                                ? `${formatTime(b.slot.start_time)} - ${formatTime(b.slot.end_time)}`
                                : "—"}
                            </span>
                          </div>
                          {b.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {b.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          className={cn(
                            b.status === "confirmed" && "bg-teal-500/20 text-teal-400",
                            b.status === "completed" && "bg-green-500/20 text-green-400",
                            b.status === "cancelled" && "bg-red-500/20 text-red-400",
                            b.status === "no_show" && "bg-yellow-500/20 text-yellow-400"
                          )}
                        >
                          {b.status === "no_show" ? "No Show" : b.status}
                        </Badge>

                        {b.status === "confirmed" && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                              onClick={() => updateBookingStatus(b.id, "completed")}
                              disabled={updatingBooking === b.id}
                              title="Complete"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10"
                              onClick={() => updateBookingStatus(b.id, "no_show")}
                              disabled={updatingBooking === b.id}
                              title="No Show"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              onClick={() => updateBookingStatus(b.id, "cancelled")}
                              disabled={updatingBooking === b.id}
                              title="Cancel"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Day Editor Dialog */}
      <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate
                ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Edit Day"}
            </DialogTitle>
            <DialogDescription>
              Toggle available time slots for this day
            </DialogDescription>
          </DialogHeader>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={setStandardHours}>
              <Zap className="h-3.5 w-3.5 mr-1" />
              Standard Hours
            </Button>
            <Button variant="outline" size="sm" onClick={copyToNextWeek} disabled={saving}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy to Next Week
            </Button>
            <Button variant="outline" size="sm" onClick={clearDay}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear Day
            </Button>
          </div>

          {/* Slot toggles */}
          <div className="grid grid-cols-3 gap-2">
            {HOUR_SLOTS.map((h) => {
              const existingSlot = slots.find(
                (s) => s.date === selectedDate && s.start_time === h.start
              );
              const confirmedCount = existingSlot?.bookings?.length ?? (existingSlot?.booking && existingSlot.booking.status === "confirmed" ? 1 : 0);
              const hasBookings = confirmedCount > 0;
              const maxBookings = existingSlot?.max_bookings ?? 3;
              const isEnabled = daySlotToggles[h.start] || false;

              return (
                <button
                  key={h.start}
                  onClick={() => {
                    if (hasBookings) {
                      toast.error("Cannot disable a slot with active bookings");
                      return;
                    }
                    setDaySlotToggles((prev) => ({
                      ...prev,
                      [h.start]: !prev[h.start],
                    }));
                  }}
                  className={cn(
                    "p-3 rounded-lg border text-center transition-colors",
                    hasBookings
                      ? "border-orange-500/30 bg-orange-500/10 cursor-not-allowed"
                      : isEnabled
                        ? "border-teal-500/50 bg-teal-500/20 hover:bg-teal-500/30"
                        : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className="text-sm font-medium">{h.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {hasBookings ? `${confirmedCount}/${maxBookings} booked` : isEnabled ? "Available" : "Off"}
                  </div>
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDayDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveDaySlots}
              disabled={saving}
              className="bg-teal-500 hover:bg-teal-600"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Availability
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
