"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Users,
  MapPin,
  Clock,
  DollarSign,
  User,
  Building2,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";

// Service type labels (matching bookings route)
const SERVICE_LABELS: Record<string, string> = {
  photoshoot_hourly: "Photoshoot (Hourly)",
  photoshoot_half_day: "Photoshoot (Half-Day)",
  photoshoot_full_day: "Photoshoot (Full-Day)",
  promo: "Promo Modeling",
  brand_ambassador: "Brand Ambassador",
  private_event: "Private Event",
  social_companion: "Social Companion",
  meet_greet: "Meet & Greet",
  other: "Other",
};

// Gig type labels
const GIG_TYPE_LABELS: Record<string, string> = {
  show: "Show",
  photoshoot: "Photoshoot",
  travel: "Travel",
  campaign: "Campaign",
  content: "Content",
  hosting: "Hosting",
  fun: "Fun",
  other: "Other",
};

interface Gig {
  id: string;
  title: string;
  type: string;
  start_at: string;
  end_at: string | null;
  location_city: string | null;
  location_state: string | null;
  status: string;
  spots: number;
  spots_filled: number;
  compensation_type: string;
  compensation_amount: number;
}

interface Booking {
  id: string;
  booking_number: string;
  service_type: string;
  event_date: string;
  start_time: string | null;
  duration_hours: number | null;
  status: string;
  total_amount: number;
  location_city: string | null;
  location_state: string | null;
  model: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  client: {
    type: "fan" | "brand";
    display_name?: string;
    company_name?: string;
  } | null;
}

interface CalendarEvent {
  id: string;
  type: "gig" | "booking";
  title: string;
  date: Date;
  endDate?: Date;
  status: string;
  location?: string;
  details: Gig | Booking;
}

export default function AdminCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);

    // Fetch gigs and bookings in parallel
    const [gigsResult, bookingsResult] = await Promise.all([
      (supabase.from("gigs") as any)
        .select("id, title, type, start_at, end_at, location_city, location_state, status, spots, spots_filled, compensation_type, compensation_amount")
        .order("start_at", { ascending: true }),
      (supabase.from("bookings") as any)
        .select("id, booking_number, service_type, event_date, start_time, duration_hours, status, total_amount, location_city, location_state, model_id, client_id")
        .order("event_date", { ascending: true }),
    ]);

    setGigs(gigsResult.data || []);

    // Enrich bookings with model and client info
    const bookingsData = bookingsResult.data || [];
    if (bookingsData.length > 0) {
      const modelIds = [...new Set(bookingsData.map((b: any) => b.model_id).filter(Boolean))] as string[];
      const clientIds = [...new Set(bookingsData.map((b: any) => b.client_id).filter(Boolean))] as string[];

      // Batch fetch models
      const modelsMap = new Map<string, any>();
      if (modelIds.length > 0) {
        const { data: models } = await (supabase.from("models") as any)
          .select("id, username, first_name, last_name")
          .in("id", modelIds);
        (models || []).forEach((m: any) => modelsMap.set(m.id, m));
      }

      // Batch fetch actors for clients
      const actorsMap = new Map<string, any>();
      if (clientIds.length > 0) {
        const { data: actors } = await (supabase.from("actors") as any)
          .select("id, type")
          .in("id", clientIds);
        (actors || []).forEach((a: any) => actorsMap.set(a.id, a));
      }

      // Fetch fan and brand info
      const fanIds = clientIds.filter((id: string) => actorsMap.get(id)?.type === "fan");
      const brandIds = clientIds.filter((id: string) => actorsMap.get(id)?.type === "brand");

      const fansMap = new Map<string, any>();
      const brandsMap = new Map<string, any>();

      if (fanIds.length > 0) {
        const { data: fans } = await (supabase.from("fans") as any)
          .select("id, display_name")
          .in("id", fanIds);
        (fans || []).forEach((f: any) => fansMap.set(f.id, f));
      }

      if (brandIds.length > 0) {
        const { data: brands } = await (supabase.from("brands") as any)
          .select("id, company_name")
          .in("id", brandIds);
        (brands || []).forEach((b: any) => brandsMap.set(b.id, b));
      }

      // Map back to bookings
      for (const booking of bookingsData) {
        booking.model = modelsMap.get(booking.model_id) || null;
        const clientActor = actorsMap.get(booking.client_id);
        if (clientActor?.type === "fan") {
          const fan = fansMap.get(booking.client_id);
          booking.client = fan ? { ...fan, type: "fan" } : null;
        } else if (clientActor?.type === "brand") {
          const brand = brandsMap.get(booking.client_id);
          booking.client = brand ? { ...brand, type: "brand" } : null;
        }
      }
    }

    setBookings(bookingsData);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Convert gigs and bookings to calendar events
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Add gigs
    for (const gig of gigs) {
      if (gig.start_at) {
        events.push({
          id: `gig-${gig.id}`,
          type: "gig",
          title: gig.title,
          date: new Date(gig.start_at),
          endDate: gig.end_at ? new Date(gig.end_at) : undefined,
          status: gig.status,
          location: gig.location_city && gig.location_state
            ? `${gig.location_city}, ${gig.location_state}`
            : undefined,
          details: gig,
        });
      }
    }

    // Add bookings
    for (const booking of bookings) {
      if (booking.event_date) {
        events.push({
          id: `booking-${booking.id}`,
          type: "booking",
          title: `Booking #${booking.booking_number}`,
          date: new Date(booking.event_date),
          status: booking.status,
          location: booking.location_city && booking.location_state
            ? `${booking.location_city}, ${booking.location_state}`
            : undefined,
          details: booking,
        });
      }
    }

    return events;
  }, [gigs, bookings]);

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return calendarEvents.filter((event) => isSameDay(event.date, day));
  };

  // Status badge color
  const getStatusColor = (status: string, type: "gig" | "booking") => {
    if (type === "gig") {
      switch (status) {
        case "open":
          return "bg-green-500";
        case "draft":
          return "bg-amber-500";
        case "closed":
          return "bg-gray-500";
        default:
          return "bg-gray-500";
      }
    } else {
      switch (status) {
        case "pending":
        case "counter":
          return "bg-amber-500";
        case "accepted":
        case "confirmed":
          return "bg-green-500";
        case "completed":
          return "bg-blue-500";
        case "cancelled":
        case "declined":
          return "bg-red-500";
        default:
          return "bg-gray-500";
      }
    }
  };

  // Get booking event classes for calendar display
  const getBookingEventClasses = (booking: Booking) => {
    if (["pending", "counter"].includes(booking.status)) {
      return "bg-amber-500/20 text-amber-400 border-l-2 border-amber-500";
    } else if (["accepted", "confirmed"].includes(booking.status)) {
      return "bg-green-500/20 text-green-400 border-l-2 border-green-500";
    } else if (booking.status === "completed") {
      return "bg-blue-500/20 text-blue-400 border-l-2 border-blue-500";
    } else {
      return "bg-gray-400/20 text-gray-400 border-l-2 border-gray-400";
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container px-8 md:px-16 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
            <p className="text-muted-foreground">
              View all gigs and bookings across the platform
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-muted-foreground">Gig</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Pending Booking</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Confirmed Booking</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Completed Booking</span>
        </div>
      </div>

      {/* Calendar Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(currentDate, "MMMM yyyy")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
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
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] p-2 bg-background ${
                    !isCurrentMonth ? "opacity-40" : ""
                  }`}
                >
                  <div
                    className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                      isTodayDate
                        ? "bg-pink-500 text-white"
                        : ""
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate transition-opacity hover:opacity-80 ${
                          event.type === "gig"
                            ? "bg-violet-500/20 text-violet-400 border-l-2 border-violet-500"
                            : getBookingEventClasses(event.details as Booking)
                        }`}
                      >
                        {event.type === "gig" ? (
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{event.title}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {(event.details as Booking).model?.first_name || (event.details as Booking).model?.username || "Booking"}
                            </span>
                          </span>
                        )}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <button
                        onClick={() => {
                          // Show all events for this day in a modal
                          setSelectedEvent(dayEvents[0]);
                          setDialogOpen(true);
                        }}
                        className="w-full text-left px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        +{dayEvents.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-violet-500/10">
                <Sparkles className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{gigs.filter(g => g.status === "open").length}</p>
                <p className="text-sm text-muted-foreground">Active Gigs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {bookings.filter(b => ["pending", "counter"].includes(b.status)).length}
                </p>
                <p className="text-sm text-muted-foreground">Pending Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-green-500/10">
                <CalendarIcon className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {bookings.filter(b => ["accepted", "confirmed"].includes(b.status)).length}
                </p>
                <p className="text-sm text-muted-foreground">Confirmed Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{bookings.filter(b => b.status === "completed").length}</p>
                <p className="text-sm text-muted-foreground">Completed Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedEvent.type === "gig" ? (
                    <Sparkles className="h-5 w-5 text-violet-500" />
                  ) : (
                    <Users className="h-5 w-5 text-blue-500" />
                  )}
                  {selectedEvent.type === "gig" ? "Gig Details" : "Booking Details"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {selectedEvent.type === "gig" ? (
                  // Gig details
                  (() => {
                    const gig = selectedEvent.details as Gig;
                    return (
                      <>
                        <div>
                          <h3 className="font-semibold text-lg">{gig.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="capitalize">
                              {GIG_TYPE_LABELS[gig.type] || gig.type}
                            </Badge>
                            <Badge className={getStatusColor(gig.status, "gig")}>
                              {gig.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarIcon className="h-4 w-4" />
                            <span>
                              {format(new Date(gig.start_at), "EEEE, MMMM d, yyyy")}
                              {gig.end_at && ` - ${format(new Date(gig.end_at), "MMMM d, yyyy")}`}
                            </span>
                          </div>

                          {selectedEvent.location && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{selectedEvent.location}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{gig.spots_filled || 0} / {gig.spots} spots filled</span>
                          </div>

                          {gig.compensation_amount > 0 && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <DollarSign className="h-4 w-4" />
                              <span>
                                ${(gig.compensation_amount / 100).toLocaleString()} ({gig.compensation_type})
                              </span>
                            </div>
                          )}
                        </div>

                        <Button asChild className="w-full">
                          <Link href="/admin/gigs">Manage Gig</Link>
                        </Button>
                      </>
                    );
                  })()
                ) : (
                  // Booking details
                  (() => {
                    const booking = selectedEvent.details as Booking;
                    return (
                      <>
                        <div>
                          <h3 className="font-semibold text-lg">
                            Booking #{booking.booking_number}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">
                              {SERVICE_LABELS[booking.service_type] || booking.service_type}
                            </Badge>
                            <Badge className={getStatusColor(booking.status, "booking")}>
                              {booking.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarIcon className="h-4 w-4" />
                            <span>
                              {format(new Date(booking.event_date), "EEEE, MMMM d, yyyy")}
                              {booking.start_time && ` at ${booking.start_time}`}
                            </span>
                          </div>

                          {booking.duration_hours && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{booking.duration_hours} hour(s)</span>
                            </div>
                          )}

                          {selectedEvent.location && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{selectedEvent.location}</span>
                            </div>
                          )}

                          {booking.model && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span>
                                Model: {booking.model.first_name || ""} {booking.model.last_name || ""} (@{booking.model.username})
                              </span>
                            </div>
                          )}

                          {booking.client && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              {booking.client.type === "brand" ? (
                                <Building2 className="h-4 w-4" />
                              ) : (
                                <User className="h-4 w-4" />
                              )}
                              <span>
                                Client: {booking.client.company_name || booking.client.display_name || "Unknown"} ({booking.client.type})
                              </span>
                            </div>
                          )}

                          {booking.total_amount > 0 && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <DollarSign className="h-4 w-4" />
                              <span>{booking.total_amount.toLocaleString()} coins</span>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
