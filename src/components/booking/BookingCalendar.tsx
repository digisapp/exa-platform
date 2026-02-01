"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface BookingCalendarProps {
  slots: AvailabilitySlot[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

export function BookingCalendar({
  slots,
  selectedDate,
  onSelectDate,
}: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Get available slots for a specific day
  const getAvailableSlotsForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return slots.filter(slot => slot.date === dateStr && slot.is_available);
  };

  // Check if day has any available slots
  const hasAvailableSlots = (day: Date) => {
    return getAvailableSlotsForDay(day).length > 0;
  };

  // Limit to 2 months ahead
  const canGoNext = () => {
    const twoMonthsAhead = addMonths(new Date(), 2);
    return isBefore(currentDate, startOfMonth(twoMonthsAhead));
  };

  const canGoPrev = () => {
    return !isBefore(startOfMonth(currentDate), startOfMonth(new Date()));
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{format(currentDate, "MMMM yyyy")}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(prev => addMonths(prev, -1))}
            disabled={!canGoPrev()}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
            disabled={!canGoNext()}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
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
          const hasSlots = hasAvailableSlots(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isClickable = !isPast && hasSlots && isCurrentMonth;

          return (
            <button
              key={day.toISOString()}
              onClick={() => isClickable && onSelectDate(day)}
              disabled={!isClickable}
              className={`
                aspect-square p-1 rounded-lg text-sm transition-all
                ${!isCurrentMonth ? "opacity-30" : ""}
                ${isPast ? "opacity-30 cursor-not-allowed" : ""}
                ${!hasSlots && !isPast && isCurrentMonth ? "opacity-50 cursor-not-allowed" : ""}
                ${isClickable ? "hover:bg-pink-500/20 cursor-pointer" : ""}
                ${isSelected ? "bg-pink-500 text-white hover:bg-pink-600" : ""}
                ${hasSlots && !isSelected && isCurrentMonth ? "bg-green-500/10 text-green-400 font-medium" : ""}
                ${isToday(day) && !isSelected ? "ring-1 ring-pink-500" : ""}
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-pink-500" />
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}
