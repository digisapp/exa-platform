"use client";

import { Clock } from "lucide-react";
import { format } from "date-fns";

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface TimeSlotPickerProps {
  slots: AvailabilitySlot[];
  selectedDate: Date;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string, time: string) => void;
}

export function TimeSlotPicker({
  slots,
  selectedDate,
  selectedSlotId,
  onSelectSlot,
}: TimeSlotPickerProps) {
  // Filter slots for the selected date
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const availableSlots = slots
    .filter(slot => slot.date === dateStr && slot.is_available)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No available times for this date
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4 text-pink-500" />
        <span>Available Times for {format(selectedDate, "MMMM d")}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {availableSlots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;

          return (
            <button
              key={slot.id}
              onClick={() => onSelectSlot(slot.id, slot.start_time)}
              className={`
                p-3 text-sm rounded-lg border transition-all
                ${isSelected
                  ? "bg-pink-500 border-pink-500 text-white"
                  : "bg-background border-border hover:border-pink-500/50 hover:bg-pink-500/10"
                }
              `}
            >
              {formatTime(slot.start_time)}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        All calls are 15 minutes
      </p>
    </div>
  );
}
