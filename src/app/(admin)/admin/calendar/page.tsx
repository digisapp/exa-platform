"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  GraduationCap,
  Eye,
  EyeOff,
  FileEdit,
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

interface Workshop {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location_city: string | null;
  location_state: string | null;
  location_address: string | null;
  price_cents: number;
  original_price_cents: number | null;
  max_attendees: number | null;
  status: string;
}

interface CalendarEvent {
  id: string;
  type: "gig" | "workshop";
  title: string;
  date: Date;
  endDate?: Date;
  status: string;
  location?: string;
  details: Gig | Workshop;
}

export default function AdminCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter state
  const [showGigs, setShowGigs] = useState(true);
  const [showWorkshops, setShowWorkshops] = useState(true);
  const [showDrafts, setShowDrafts] = useState(true);
  const [showOpen, setShowOpen] = useState(true);
  const [showClosed, setShowClosed] = useState(true);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);

    // Fetch gigs and workshops in parallel
    const [gigsResult, workshopsResult] = await Promise.all([
      (supabase.from("gigs") as any)
        .select("id, title, type, start_at, end_at, location_city, location_state, status, spots, spots_filled, compensation_type, compensation_amount")
        .order("start_at", { ascending: true }),
      (supabase as any).from("workshops")
        .select("id, title, subtitle, slug, date, start_time, end_time, location_city, location_state, location_address, price_cents, original_price_cents, max_attendees, status")
        .order("date", { ascending: true }),
    ]);

    setGigs(gigsResult.data || []);
    setWorkshops(workshopsResult.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Check if an event should be shown based on filters
  const shouldShowEvent = (event: CalendarEvent) => {
    // Type filter
    if (event.type === "gig" && !showGigs) return false;
    if (event.type === "workshop" && !showWorkshops) return false;

    // Status filter
    const status = event.status;
    if (event.type === "gig") {
      if (status === "draft" && !showDrafts) return false;
      if (status === "open" && !showOpen) return false;
      if (status === "closed" && !showClosed) return false;
    } else {
      // Workshop statuses
      if (status === "draft" && !showDrafts) return false;
      if (status === "published" && !showOpen) return false;
      if ((status === "completed" || status === "cancelled") && !showClosed) return false;
    }

    return true;
  };

  // Convert gigs and workshops to calendar events
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Add gigs
    for (const gig of gigs) {
      if (gig.start_at) {
        const event: CalendarEvent = {
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
        };
        if (shouldShowEvent(event)) {
          events.push(event);
        }
      }
    }

    // Add workshops
    for (const workshop of workshops) {
      if (workshop.date) {
        const event: CalendarEvent = {
          id: `workshop-${workshop.id}`,
          type: "workshop",
          title: workshop.title,
          date: new Date(workshop.date),
          status: workshop.status,
          location: workshop.location_city && workshop.location_state
            ? `${workshop.location_city}, ${workshop.location_state}`
            : undefined,
          details: workshop,
        };
        if (shouldShowEvent(event)) {
          events.push(event);
        }
      }
    }

    return events;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gigs, workshops, showGigs, showWorkshops, showDrafts, showOpen, showClosed]);

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Get events for a specific day (including multi-day events)
  const getEventsForDay = (day: Date) => {
    return calendarEvents.filter((event) => {
      // Check if day falls within the event's date range
      const eventStart = event.date;
      const eventEnd = event.endDate || event.date;

      // Normalize dates to compare just the date part (ignore time)
      const dayTime = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
      const startTime = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
      const endTime = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate()).getTime();

      return dayTime >= startTime && dayTime <= endTime;
    });
  };

  // Check if this is a continuation of a multi-day event
  const isEventContinuation = (event: CalendarEvent, day: Date) => {
    return event.endDate && !isSameDay(event.date, day);
  };

  // Check if event is a draft
  const isDraft = (event: CalendarEvent) => {
    return event.status === "draft";
  };

  // Status badge color for gigs
  const getGigStatusColor = (status: string) => {
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
  };

  // Status badge color for workshops
  const getWorkshopStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-500";
      case "draft":
        return "bg-amber-500";
      case "cancelled":
        return "bg-red-500";
      case "completed":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  // Get event classes for calendar display
  const getEventClasses = (event: CalendarEvent) => {
    const draft = isDraft(event);

    if (event.type === "gig") {
      if (draft) {
        return "bg-violet-500/10 text-violet-400/70 border-l-2 border-dashed border-violet-500/50";
      }
      if (event.status === "closed") {
        return "bg-gray-500/20 text-gray-400 border-l-2 border-gray-500";
      }
      return "bg-violet-500/20 text-violet-400 border-l-2 border-violet-500";
    } else {
      if (draft) {
        return "bg-pink-500/10 text-pink-400/70 border-l-2 border-dashed border-pink-500/50";
      }
      if (event.status === "completed" || event.status === "cancelled") {
        return "bg-gray-500/20 text-gray-400 border-l-2 border-gray-500";
      }
      return "bg-pink-500/20 text-pink-400 border-l-2 border-pink-500";
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  // Count stats
  const draftGigsCount = gigs.filter(g => g.status === "draft").length;
  const openGigsCount = gigs.filter(g => g.status === "open").length;
  const closedGigsCount = gigs.filter(g => g.status === "closed").length;
  const draftWorkshopsCount = workshops.filter(w => w.status === "draft").length;
  const publishedWorkshopsCount = workshops.filter(w => w.status === "published").length;

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
              View and plan all gigs and workshops
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start gap-8">
            {/* Type Filters */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Event Types</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-gigs"
                    checked={showGigs}
                    onCheckedChange={(checked) => setShowGigs(checked as boolean)}
                  />
                  <Label htmlFor="show-gigs" className="flex items-center gap-2 cursor-pointer">
                    <div className="w-3 h-3 rounded-full bg-violet-500" />
                    <span>Gigs</span>
                    <span className="text-xs text-muted-foreground">({gigs.length})</span>
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-workshops"
                    checked={showWorkshops}
                    onCheckedChange={(checked) => setShowWorkshops(checked as boolean)}
                  />
                  <Label htmlFor="show-workshops" className="flex items-center gap-2 cursor-pointer">
                    <div className="w-3 h-3 rounded-full bg-pink-500" />
                    <span>Workshops</span>
                    <span className="text-xs text-muted-foreground">({workshops.length})</span>
                  </Label>
                </div>
              </div>
            </div>

            {/* Status Filters */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-drafts"
                    checked={showDrafts}
                    onCheckedChange={(checked) => setShowDrafts(checked as boolean)}
                  />
                  <Label htmlFor="show-drafts" className="flex items-center gap-2 cursor-pointer">
                    <FileEdit className="h-3 w-3 text-amber-500" />
                    <span>Drafts</span>
                    <span className="text-xs text-muted-foreground">({draftGigsCount + draftWorkshopsCount})</span>
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-open"
                    checked={showOpen}
                    onCheckedChange={(checked) => setShowOpen(checked as boolean)}
                  />
                  <Label htmlFor="show-open" className="flex items-center gap-2 cursor-pointer">
                    <Eye className="h-3 w-3 text-green-500" />
                    <span>Open / Published</span>
                    <span className="text-xs text-muted-foreground">({openGigsCount + publishedWorkshopsCount})</span>
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-closed"
                    checked={showClosed}
                    onCheckedChange={(checked) => setShowClosed(checked as boolean)}
                  />
                  <Label htmlFor="show-closed" className="flex items-center gap-2 cursor-pointer">
                    <EyeOff className="h-3 w-3 text-gray-500" />
                    <span>Closed / Completed</span>
                    <span className="text-xs text-muted-foreground">({closedGigsCount})</span>
                  </Label>
                </div>
              </div>
            </div>

            {/* Visual Legend */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Visual Guide</p>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-5 rounded bg-violet-500/20 border-l-2 border-violet-500" />
                  <span className="text-muted-foreground">Open Gig</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-5 rounded bg-violet-500/10 border-l-2 border-dashed border-violet-500/50" />
                  <span className="text-muted-foreground">Draft Gig</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-5 rounded bg-pink-500/20 border-l-2 border-pink-500" />
                  <span className="text-muted-foreground">Published Workshop</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-5 rounded bg-pink-500/10 border-l-2 border-dashed border-pink-500/50" />
                  <span className="text-muted-foreground">Draft Workshop</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                    {dayEvents.slice(0, 3).map((event) => {
                      const isContinuation = isEventContinuation(event, day);
                      const draft = isDraft(event);
                      return (
                        <button
                          key={event.id}
                          onClick={() => handleEventClick(event)}
                          className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate transition-opacity hover:opacity-80 ${getEventClasses(event)} ${isContinuation ? "opacity-70" : ""}`}
                        >
                          <span className="flex items-center gap-1">
                            {event.type === "gig" ? (
                              <Sparkles className={`h-3 w-3 flex-shrink-0 ${draft ? "opacity-50" : ""}`} />
                            ) : (
                              <GraduationCap className={`h-3 w-3 flex-shrink-0 ${draft ? "opacity-50" : ""}`} />
                            )}
                            <span className="truncate">
                              {draft && !isContinuation && "(Draft) "}
                              {isContinuation ? `↳ ${event.title}` : event.title}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <button
                        onClick={() => {
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-amber-500/10">
                <FileEdit className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{draftGigsCount}</p>
                <p className="text-sm text-muted-foreground">Draft Gigs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-violet-500/10">
                <Sparkles className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openGigsCount}</p>
                <p className="text-sm text-muted-foreground">Open Gigs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-gray-500/10">
                <Sparkles className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{closedGigsCount}</p>
                <p className="text-sm text-muted-foreground">Closed Gigs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-pink-500/10">
                <GraduationCap className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{publishedWorkshopsCount}</p>
                <p className="text-sm text-muted-foreground">Published Workshops</p>
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
                <p className="text-2xl font-bold">{gigs.reduce((sum, g) => sum + (g.spots_filled || 0), 0)}</p>
                <p className="text-sm text-muted-foreground">Total Spots Filled</p>
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
                    <GraduationCap className="h-5 w-5 text-pink-500" />
                  )}
                  {selectedEvent.type === "gig" ? "Gig Details" : "Workshop Details"}
                  {isDraft(selectedEvent) && (
                    <Badge variant="outline" className="ml-2 text-amber-500 border-amber-500">
                      Draft
                    </Badge>
                  )}
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
                            <Badge className={getGigStatusColor(gig.status)}>
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
                  // Workshop details
                  (() => {
                    const workshop = selectedEvent.details as Workshop;
                    return (
                      <>
                        <div>
                          <h3 className="font-semibold text-lg">{workshop.title}</h3>
                          {workshop.subtitle && (
                            <p className="text-sm text-muted-foreground">{workshop.subtitle}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">Workshop</Badge>
                            <Badge className={getWorkshopStatusColor(workshop.status)}>
                              {workshop.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarIcon className="h-4 w-4" />
                            <span>
                              {format(new Date(workshop.date), "EEEE, MMMM d, yyyy")}
                            </span>
                          </div>

                          {(workshop.start_time || workshop.end_time) && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                {workshop.start_time && workshop.start_time}
                                {workshop.start_time && workshop.end_time && " - "}
                                {workshop.end_time && workshop.end_time}
                              </span>
                            </div>
                          )}

                          {selectedEvent.location && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{selectedEvent.location}</span>
                            </div>
                          )}

                          {workshop.location_address && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4 opacity-0" />
                              <span className="text-xs">{workshop.location_address}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>
                              ${(workshop.price_cents / 100).toLocaleString()}
                              {workshop.original_price_cents && workshop.original_price_cents > workshop.price_cents && (
                                <span className="line-through ml-2 text-muted-foreground/60">
                                  ${(workshop.original_price_cents / 100).toLocaleString()}
                                </span>
                              )}
                            </span>
                          </div>

                          {workshop.max_attendees && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>Max {workshop.max_attendees} attendees</span>
                            </div>
                          )}
                        </div>

                        <Button asChild className="w-full">
                          <Link href="/admin/gigs">Manage Workshop</Link>
                        </Button>
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
