"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Plus,
  Trash2,
  Check,
  X,
  Copy,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  isBefore,
  startOfDay,
  addDays,
} from "date-fns";
import { toast } from "sonner";

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  notes: string | null;
}

// Standard time slots for quick add (30-min increments)
const STANDARD_SLOTS = [
  { time: "09:00", label: "9:00 AM" },
  { time: "09:30", label: "9:30 AM" },
  { time: "10:00", label: "10:00 AM" },
  { time: "10:30", label: "10:30 AM" },
  { time: "11:00", label: "11:00 AM" },
  { time: "11:30", label: "11:30 AM" },
  { time: "12:00", label: "12:00 PM" },
  { time: "12:30", label: "12:30 PM" },
  { time: "13:00", label: "1:00 PM" },
  { time: "13:30", label: "1:30 PM" },
  { time: "14:00", label: "2:00 PM" },
  { time: "14:30", label: "2:30 PM" },
  { time: "15:00", label: "3:00 PM" },
  { time: "15:30", label: "3:30 PM" },
  { time: "16:00", label: "4:00 PM" },
  { time: "16:30", label: "4:30 PM" },
  { time: "17:00", label: "5:00 PM" },
];

export default function AvailabilityPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customTime, setCustomTime] = useState("");

  // Selected slots for the dialog
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  const loadSlots = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);

    // Fetch slots for current month view (+/- buffer)
    const startDate = format(subMonths(startOfMonth(currentDate), 1), "yyyy-MM-dd");
    const endDate = format(addMonths(endOfMonth(currentDate), 1), "yyyy-MM-dd");

    const { data, error } = await (supabase as any)
      .from("availability_slots")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Failed to load slots:", error);
      toast.error("Failed to load availability");
    } else {
      setSlots(data || []);
    }

    setLoading(false);
  }, [currentDate]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Get slots for a specific day
  const getSlotsForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return slots.filter(slot => slot.date === dateStr);
  };

  // Check if day has any available slots
  const hasAvailableSlots = (day: Date) => {
    return getSlotsForDay(day).some(slot => slot.is_available);
  };

  // Check if day has any booked slots
  const hasBookedSlots = (day: Date) => {
    return getSlotsForDay(day).some(slot => !slot.is_available);
  };

  // Handle day click
  const handleDayClick = (day: Date) => {
    if (isBefore(startOfDay(day), startOfDay(new Date()))) {
      return; // Don't allow editing past dates
    }
    setSelectedDate(day);
    const daySlots = getSlotsForDay(day);
    setSelectedSlots(daySlots.map(s => s.start_time));
    setDialogOpen(true);
  };

  // Toggle slot selection
  const toggleSlot = (time: string) => {
    setSelectedSlots(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  // Add custom time slot
  const addCustomTime = () => {
    if (!customTime) return;
    if (!selectedSlots.includes(customTime)) {
      setSelectedSlots(prev => [...prev, customTime].sort());
    }
    setCustomTime("");
  };

  // Save slots for selected date
  const saveSlots = async () => {
    if (!selectedDate) return;

    setSaving(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      // First, delete existing slots for this date
      const deleteRes = await fetch(`/api/availability?date=${dateStr}`, {
        method: "DELETE",
      });

      if (!deleteRes.ok) {
        throw new Error("Failed to clear existing slots");
      }

      // Then create new slots
      if (selectedSlots.length > 0) {
        const newSlots = selectedSlots.map(time => ({
          date: dateStr,
          start_time: time,
        }));

        const createRes = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slots: newSlots }),
        });

        if (!createRes.ok) {
          throw new Error("Failed to create slots");
        }
      }

      toast.success("Availability saved");
      setDialogOpen(false);
      loadSlots();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  // Copy slots to next week
  const copyToNextWeek = async () => {
    if (!selectedDate || selectedSlots.length === 0) return;

    setSaving(true);
    const nextWeekDate = addDays(selectedDate, 7);
    const dateStr = format(nextWeekDate, "yyyy-MM-dd");

    try {
      const newSlots = selectedSlots.map(time => ({
        date: dateStr,
        start_time: time,
      }));

      const createRes = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: newSlots }),
      });

      if (!createRes.ok) {
        throw new Error("Failed to copy slots");
      }

      toast.success(`Copied to ${format(nextWeekDate, "MMM d")}`);
      loadSlots();
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Failed to copy slots");
    } finally {
      setSaving(false);
    }
  };

  // Add standard business hours
  const addStandardHours = () => {
    const standardTimes = STANDARD_SLOTS.map(s => s.time);
    setSelectedSlots(prev => {
      const combined = new Set([...prev, ...standardTimes]);
      return Array.from(combined).sort();
    });
  };

  // Clear all slots
  const clearAllSlots = () => {
    setSelectedSlots([]);
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="container px-4 md:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/crm">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-3">
              <CalendarIcon className="h-6 w-6 text-pink-500" />
              Manage Availability
            </h1>
            <p className="text-sm text-muted-foreground">
              Set available time slots for call bookings
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500/30 border border-green-500" />
          <span>Available slots</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-pink-500/30 border border-pink-500" />
          <span>Booked slots</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted border border-border" />
          <span>No slots</span>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{format(currentDate, "MMMM yyyy")}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
              const isCurrentMonth = isSameMonth(day, currentDate);
              const daySlots = getSlotsForDay(day);
              const hasAvailable = hasAvailableSlots(day);
              const hasBooked = hasBookedSlots(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  disabled={isPast}
                  className={`
                    min-h-[80px] p-2 rounded-lg border text-left transition-colors
                    ${!isCurrentMonth ? "opacity-40" : ""}
                    ${isPast ? "opacity-30 cursor-not-allowed" : "hover:bg-accent cursor-pointer"}
                    ${isToday(day) ? "border-pink-500" : "border-border"}
                    ${hasAvailable && !hasBooked ? "bg-green-500/10" : ""}
                    ${hasBooked ? "bg-pink-500/10" : ""}
                  `}
                >
                  <div className={`text-sm font-medium ${isToday(day) ? "text-pink-500" : ""}`}>
                    {format(day, "d")}
                  </div>
                  {daySlots.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {daySlots.slice(0, 3).map((slot) => (
                        <div
                          key={slot.id}
                          className={`text-xs px-1 py-0.5 rounded truncate ${
                            slot.is_available
                              ? "bg-green-500/20 text-green-400"
                              : "bg-pink-500/20 text-pink-400"
                          }`}
                        >
                          {formatTime(slot.start_time)}
                        </div>
                      ))}
                      {daySlots.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{daySlots.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Day Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-pink-500" />
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
            <DialogDescription>
              Select available time slots for this day
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={addStandardHours}
              >
                <Plus className="h-4 w-4 mr-1" />
                Standard Hours
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToNextWeek}
                disabled={saving || selectedSlots.length === 0}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy to Next Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllSlots}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>

            {/* Standard time slots */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Slots</label>
              <div className="grid grid-cols-3 gap-2">
                {STANDARD_SLOTS.map((slot) => {
                  const isSelected = selectedSlots.includes(slot.time);
                  return (
                    <button
                      key={slot.time}
                      onClick={() => toggleSlot(slot.time)}
                      className={`
                        p-2 text-sm rounded-lg border transition-colors
                        ${isSelected
                          ? "bg-green-500/20 border-green-500 text-green-400"
                          : "bg-background border-border hover:bg-accent"
                        }
                      `}
                    >
                      {slot.label}
                      {isSelected && <Check className="h-3 w-3 inline ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom time */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Add Custom Time</label>
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={addCustomTime} disabled={!customTime}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Selected slots summary */}
            {selectedSlots.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Selected ({selectedSlots.length} slots)
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedSlots.sort().map((time) => (
                    <Badge
                      key={time}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {formatTime(time)}
                      <button
                        onClick={() => toggleSlot(time)}
                        className="ml-1 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Save button */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                onClick={saveSlots}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Availability
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
