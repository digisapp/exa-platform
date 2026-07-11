"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { MSWScheduleEntry } from "@/lib/msw-schedule";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar,
  Ticket,
  Plus,
  Trash2,
  Loader2,
  Edit,
  Users,
  MousePointerClick,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// Canonical schedule-entry shape lives in lib/msw-schedule (shared with the
// public show pages and the API validator).
type ScheduleEntry = MSWScheduleEntry;

interface Event {
  id: string;
  name: string;
  slug: string;
  short_name: string;
  start_date: string | null;
  end_date: string | null;
  tickets_enabled: boolean;
  ticket_price_cents: number | null;
  status: string;
  year?: number | null;
  description?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
  points_awarded?: number | null;
  // Show-setup capability fields (see events self-describing migration)
  ticket_url?: string | null;
  use_external_ticketing?: boolean | null;
  has_casting_call?: boolean | null;
  has_sponsor_pages?: boolean | null;
  has_venue_map?: boolean | null;
  countdown_at?: string | null;
  schedule?: ScheduleEntry[] | null;
  // 🎟️ Tickets toggle: approved models promote this show on their profile.
  promote_tickets_on_profiles?: boolean | null;
  // 🏅 Badges toggle: mirrors the event badge's is_active. Merged in by
  // fetchEvents (it lives on the badges table, not events).
  badges_enabled?: boolean;
}

const EMPTY_EVENT_FORM = {
  name: "",
  short_name: "",
  slug: "",
  year: String(new Date().getFullYear()),
  status: "upcoming",
  start_date: "",
  end_date: "",
  location_city: "",
  location_state: "",
  location_country: "US",
  description: "",
  badge_emoji: "",
  points_awarded: "500",
  // Show setup
  ticket_url: "",
  use_external_ticketing: false,
  has_casting_call: false,
  countdown_at: "",
  schedule: [] as ScheduleEntry[],
  // Approved models promote this show's ticket link on their profile.
  promote_tickets_on_profiles: false,
  // Award the show badge to accepted models when the show completes.
  badges_enabled: true,
};

interface TicketTier {
  id: string;
  event_id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  quantity_available: number | null;
  quantity_sold: number;
  sort_order: number;
  is_active: boolean;
}

interface TicketStats {
  total_sold: number;
  total_revenue: number;
  total_commissions: number;
}

interface TicketPurchase {
  id: string;
  ticket_tier_id: string;
  buyer_email: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  status: "pending" | "completed" | "refunded" | "cancelled";
  completed_at: string | null;
  created_at: string;
  affiliate_model_id: string | null;
  stripe_payment_intent_id: string | null;
  tier?: { name: string };
  affiliate_model?: { username: string; first_name: string | null; last_name: string | null } | null;
}

interface AffiliateCommission {
  id: string;
  model_id: string;
  event_id: string;
  order_id: string;
  sale_amount_cents: number;
  commission_rate: number;
  commission_amount_cents: number;
  status: "pending" | "confirmed" | "paid" | "cancelled";
  paid_at: string | null;
  payment_reference: string | null;
  created_at: string;
  model?: { first_name: string | null; last_name: string | null; username: string; profile_photo_url: string | null; affiliate_code: string };
}

interface ModelReferralSummary {
  model_id: string;
  model_name: string;
  username: string;
  affiliate_code: string;
  photo_url: string | null;
  clicks: number;
  tickets_sold: number;
  revenue_cents: number;
  commission_cents: number;
  pending_cents: number;
  confirmed_cents: number;
  paid_cents: number;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTier, setSavingTier] = useState(false);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<TicketTier | null>(null);
  const [referralSummaries, setReferralSummaries] = useState<ModelReferralSummary[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [showCommissions, setShowCommissions] = useState(false);
  const [ticketPurchases, setTicketPurchases] = useState<TicketPurchase[]>([]);
  const [showSales, setShowSales] = useState(false);

  // Tier form state
  const [tierForm, setTierForm] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    quantity: "",
    is_active: true,
  });

  // Event create/edit form state
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ ...EMPTY_EVENT_FORM });

  const supabase = createClient();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("events")
      .select("*")
      .order("start_date", { ascending: false }) as { data: Event[] | null; error: any };

    if (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events");
    } else {
      const evts = data || [];
      // The 🏅 Badges toggle reflects the event badge's is_active, which lives on
      // the badges table. Fetch it for all events and merge onto each row so the
      // edit dialog can seed the switch without an extra per-open query.
      const eventIds = evts.map((e) => e.id);
      let activeMap = new Map<string, boolean>();
      if (eventIds.length) {
        const { data: badgeRows } = await (supabase as any)
          .from("badges")
          .select("event_id, is_active")
          .eq("badge_type", "event")
          .in("event_id", eventIds) as { data: { event_id: string; is_active: boolean }[] | null };
        activeMap = new Map((badgeRows || []).map((b) => [b.event_id, b.is_active]));
      }
      setEvents(
        evts.map((e) => ({
          ...e,
          badges_enabled: activeMap.has(e.id) ? activeMap.get(e.id) : true,
        }))
      );
    }
    setLoading(false);
  }, [supabase]);

  const fetchTiers = useCallback(async (eventId: string) => {
    const { data, error } = await (supabase as any)
      .from("ticket_tiers")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }) as { data: TicketTier[] | null; error: any };

    if (error) {
      console.error("Error fetching tiers:", error);
    } else {
      setTiers(data || []);
    }
  }, [supabase]);

  const fetchStats = useCallback(async (eventId: string) => {
    // Get ticket purchases stats
    const { data: purchases } = await (supabase as any)
      .from("ticket_purchases")
      .select("quantity, total_price_cents")
      .eq("event_id", eventId)
      .eq("status", "completed") as { data: { quantity: number; total_price_cents: number }[] | null };

    const { data: commissions } = await (supabase as any)
      .from("affiliate_commissions")
      .select("commission_amount_cents")
      .eq("event_id", eventId)
      .eq("status", "confirmed") as { data: { commission_amount_cents: number }[] | null };

    const total_sold = purchases?.reduce((sum, p) => sum + p.quantity, 0) || 0;
    const total_revenue =
      purchases?.reduce((sum, p) => sum + p.total_price_cents, 0) || 0;
    const total_commissions =
      commissions?.reduce((sum, c) => sum + c.commission_amount_cents, 0) || 0;

    setStats({ total_sold, total_revenue, total_commissions });
  }, [supabase]);

  const fetchReferrals = useCallback(async (eventId: string) => {
    // Get all commissions with model info
    const { data: comms } = await (supabase as any)
      .from("affiliate_commissions")
      .select("*, model:models(first_name, last_name, username, profile_photo_url, affiliate_code)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }) as { data: AffiliateCommission[] | null };

    setCommissions(comms || []);

    // Get clicks per model
    const { data: clicks } = await (supabase as any)
      .from("affiliate_clicks")
      .select("model_id")
      .eq("event_id", eventId) as { data: { model_id: string }[] | null };

    // Get purchases with affiliate info
    const { data: purchases } = await (supabase as any)
      .from("ticket_purchases")
      .select("affiliate_model_id, quantity, total_price_cents")
      .eq("event_id", eventId)
      .eq("status", "completed")
      .not("affiliate_model_id", "is", null) as { data: { affiliate_model_id: string; quantity: number; total_price_cents: number }[] | null };

    // Build per-model summaries
    const modelMap = new Map<string, ModelReferralSummary>();

    // Seed from commissions (has model info)
    for (const c of comms || []) {
      if (!modelMap.has(c.model_id)) {
        const m = c.model as any;
        modelMap.set(c.model_id, {
          model_id: c.model_id,
          model_name: m ? `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.username : "Unknown",
          username: m?.username || "",
          affiliate_code: m?.affiliate_code || "",
          photo_url: m?.profile_photo_url || null,
          clicks: 0, tickets_sold: 0, revenue_cents: 0,
          commission_cents: 0, pending_cents: 0, confirmed_cents: 0, paid_cents: 0,
        });
      }
      const s = modelMap.get(c.model_id)!;
      s.commission_cents += c.commission_amount_cents;
      if (c.status === "pending") s.pending_cents += c.commission_amount_cents;
      if (c.status === "confirmed") s.confirmed_cents += c.commission_amount_cents;
      if (c.status === "paid") s.paid_cents += c.commission_amount_cents;
    }

    // Add click counts
    for (const click of clicks || []) {
      const s = modelMap.get(click.model_id);
      if (s) s.clicks++;
    }

    // Add purchase stats
    for (const p of purchases || []) {
      const s = modelMap.get(p.affiliate_model_id);
      if (s) {
        s.tickets_sold += p.quantity;
        s.revenue_cents += p.total_price_cents;
      }
    }

    // Sort by commission descending
    const summaries = Array.from(modelMap.values()).sort((a, b) => b.commission_cents - a.commission_cents);
    setReferralSummaries(summaries);
  }, [supabase]);

  const fetchTicketPurchases = useCallback(async (eventId: string) => {
    const { data } = await (supabase as any)
      .from("ticket_purchases")
      .select("*, tier:ticket_tiers(name), affiliate_model:models!affiliate_model_id(username, first_name, last_name)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }) as { data: TicketPurchase[] | null };
    setTicketPurchases(data || []);
  }, [supabase]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (selectedEvent) {
      fetchTiers(selectedEvent.id);
      fetchStats(selectedEvent.id);
      fetchReferrals(selectedEvent.id);
      fetchTicketPurchases(selectedEvent.id);
    }
  }, [selectedEvent, fetchTiers, fetchStats, fetchReferrals, fetchTicketPurchases]);

  async function toggleTicketsEnabled(event: Event) {
    const { error } = await (supabase as any)
      .from("events")
      .update({ tickets_enabled: !event.tickets_enabled })
      .eq("id", event.id);

    if (error) {
      toast.error("Failed to update event");
    } else {
      setEvents(
        events.map((e) =>
          e.id === event.id ? { ...e, tickets_enabled: !e.tickets_enabled } : e
        )
      );
      if (selectedEvent?.id === event.id) {
        setSelectedEvent({ ...event, tickets_enabled: !event.tickets_enabled });
      }
      toast.success(
        event.tickets_enabled ? "Tickets disabled" : "Tickets enabled"
      );
    }
  }

  function openTierDialog(tier?: TicketTier) {
    if (tier) {
      setEditingTier(tier);
      setTierForm({
        name: tier.name,
        slug: tier.slug,
        description: tier.description || "",
        price: (tier.price_cents / 100).toString(),
        quantity: tier.quantity_available?.toString() || "",
        is_active: tier.is_active,
      });
    } else {
      setEditingTier(null);
      setTierForm({
        name: "",
        slug: "",
        description: "",
        price: "",
        quantity: "",
        is_active: true,
      });
    }
    setTierDialogOpen(true);
  }

  async function saveTier() {
    if (!selectedEvent) return;
    if (!tierForm.name || !tierForm.price) {
      toast.error("Name and price are required");
      return;
    }

    setSavingTier(true);

    const tierData = {
      event_id: selectedEvent.id,
      name: tierForm.name,
      slug: tierForm.slug || tierForm.name.toLowerCase().replace(/\s+/g, "-"),
      description: tierForm.description || null,
      price_cents: Math.round(parseFloat(tierForm.price) * 100),
      quantity_available: tierForm.quantity
        ? parseInt(tierForm.quantity)
        : null,
      is_active: tierForm.is_active,
      sort_order: editingTier?.sort_order || tiers.length,
    };

    if (editingTier) {
      const { error } = await (supabase as any)
        .from("ticket_tiers")
        .update(tierData)
        .eq("id", editingTier.id);

      if (error) {
        toast.error("Failed to update tier");
      } else {
        toast.success("Tier updated");
        fetchTiers(selectedEvent.id);
      }
    } else {
      const { error } = await (supabase as any).from("ticket_tiers").insert(tierData);

      if (error) {
        toast.error("Failed to create tier");
      } else {
        toast.success("Tier created");
        fetchTiers(selectedEvent.id);
      }
    }

    setSavingTier(false);
    setTierDialogOpen(false);
  }

  function openEventDialog(event?: Event) {
    if (event) {
      setEditingEvent(event);
      setEventForm({
        name: event.name || "",
        short_name: event.short_name || "",
        slug: event.slug || "",
        year: String(event.year ?? new Date().getFullYear()),
        status: event.status || "upcoming",
        start_date: event.start_date || "",
        end_date: event.end_date || "",
        location_city: event.location_city || "",
        location_state: event.location_state || "",
        location_country: event.location_country || "US",
        description: event.description || "",
        badge_emoji: "",
        points_awarded: String(event.points_awarded ?? 500),
        ticket_url: event.ticket_url || "",
        use_external_ticketing: event.use_external_ticketing ?? false,
        has_casting_call: event.has_casting_call ?? false,
        countdown_at: event.countdown_at || "",
        schedule: event.schedule ?? [],
        promote_tickets_on_profiles: event.promote_tickets_on_profiles ?? false,
        badges_enabled: event.badges_enabled ?? true,
      });
    } else {
      setEditingEvent(null);
      setEventForm({ ...EMPTY_EVENT_FORM });
    }
    setEventDialogOpen(true);
  }

  // --- Schedule repeater helpers (drives events.schedule / Digis ticket links) ---
  const newRowId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `row-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  function addScheduleRow() {
    setEventForm((f) => ({
      ...f,
      schedule: [
        ...f.schedule,
        { id: newRowId(), day: "", dayShort: "", date: "", dateNum: "", title: "", description: "", highlight: false, badge: null, digisEventId: "" },
      ],
    }));
  }
  function updateScheduleRow(index: number, patch: Partial<ScheduleEntry>) {
    setEventForm((f) => ({
      ...f,
      schedule: f.schedule.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }
  function removeScheduleRow(index: number) {
    setEventForm((f) => ({ ...f, schedule: f.schedule.filter((_, i) => i !== index) }));
  }

  async function saveEvent() {
    if (!eventForm.name || !eventForm.short_name) {
      toast.error("Name and short name are required");
      return;
    }
    setSavingEvent(true);
    const res = await fetch("/api/admin/events", {
      method: editingEvent ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingEvent ? { id: editingEvent.id, ...eventForm } : eventForm),
    });
    const json = await res.json().catch(() => ({}));
    setSavingEvent(false);

    if (!res.ok && res.status !== 207) {
      toast.error(json.error || "Failed to save event");
      return;
    }
    if (json.warning) toast.warning(json.warning);
    else toast.success(editingEvent ? "Event updated" : "Event created");

    setEventDialogOpen(false);
    await fetchEvents();
    // Reflect edits in the currently-selected event panel
    if (json.event) setSelectedEvent((prev) => (prev && prev.id === json.event.id ? json.event : prev));
  }

  async function updateCommissionStatus(commissionId: string, newStatus: "confirmed" | "paid" | "cancelled") {
    const updateData: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "paid") updateData.paid_at = new Date().toISOString();

    const { error } = await (supabase as any)
      .from("affiliate_commissions")
      .update(updateData)
      .eq("id", commissionId);

    if (error) {
      toast.error("Failed to update commission");
    } else {
      toast.success(`Commission marked as ${newStatus}`);
      if (selectedEvent) {
        fetchReferrals(selectedEvent.id);
        fetchStats(selectedEvent.id);
      }
    }
  }

  async function deleteTier(tier: TicketTier) {
    if (!confirm(`Delete "${tier.name}"?`)) return;

    const { error } = await (supabase as any)
      .from("ticket_tiers")
      .delete()
      .eq("id", tier.id);

    if (error) {
      toast.error("Failed to delete tier");
    } else {
      toast.success("Tier deleted");
      setTiers(tiers.filter((t) => t.id !== tier.id));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Events & Tickets</h1>
          <p className="text-muted-foreground">
            Manage events and ticket sales
          </p>
        </div>
      </div>

      {/* Create / edit event */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "New Event"}</DialogTitle>
            <DialogDescription>
              {editingEvent
                ? "Update event details. Name/short-name/year changes also update this event's badge label."
                : "Creating an event also creates its “confirmed to walk” badge, so models are badged automatically when accepted."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="EXA's Miami Swim Week 2027"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Short name *</Label>
                <Input
                  placeholder="MSW"
                  value={eventForm.short_name}
                  onChange={(e) => setEventForm({ ...eventForm, short_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Year *</Label>
                <Input
                  type="number"
                  placeholder="2027"
                  value={eventForm.year}
                  onChange={(e) => setEventForm({ ...eventForm, year: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  placeholder="auto from name"
                  value={eventForm.slug}
                  onChange={(e) => setEventForm({ ...eventForm, slug: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={eventForm.status}
                  onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={eventForm.start_date}
                  onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={eventForm.end_date}
                  onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  placeholder="Miami"
                  value={eventForm.location_city}
                  onChange={(e) => setEventForm({ ...eventForm, location_city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  placeholder="FL"
                  value={eventForm.location_state}
                  onChange={(e) => setEventForm({ ...eventForm, location_state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  placeholder="US"
                  value={eventForm.location_country}
                  onChange={(e) => setEventForm({ ...eventForm, location_country: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="The premier swimwear fashion event…"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Badge emoji</Label>
                <Input
                  placeholder="🏖️ (auto by short name)"
                  value={eventForm.badge_emoji}
                  onChange={(e) => setEventForm({ ...eventForm, badge_emoji: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Points awarded</Label>
                <Input
                  type="number"
                  value={eventForm.points_awarded}
                  onChange={(e) => setEventForm({ ...eventForm, points_awarded: e.target.value })}
                />
              </div>
            </div>

            {/* ---------------- Show setup ---------------- */}
            <div className="pt-2 border-t border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-3 mb-1">Show setup</p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Controls the public show page: ticketing, feature sections, and the schedule of Digis ticket links. No code needed to launch a new show.
              </p>

              {/* Ticketing */}
              <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 mb-2">
                <div>
                  <Label className="text-sm">Sell tickets on an external site</Label>
                  <p className="text-[11px] text-muted-foreground">e.g. Digis — hides EXA’s internal ticket flow</p>
                </div>
                <Switch
                  checked={eventForm.use_external_ticketing}
                  onCheckedChange={(v) => setEventForm({ ...eventForm, use_external_ticketing: v })}
                />
              </div>
              <div className="space-y-2 mb-3">
                <Label>Ticket / “Get Tickets” URL</Label>
                <Input
                  placeholder="https://digis.cc/events"
                  value={eventForm.ticket_url}
                  onChange={(e) => setEventForm({ ...eventForm, ticket_url: e.target.value })}
                />
              </div>

              {/* 🎟️ Tickets on model profiles */}
              <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 mb-3">
                <div>
                  <Label className="text-sm">🎟️ Promote tickets on model profiles</Label>
                  <p className="text-[11px] text-muted-foreground">
                    {eventForm.promote_tickets_on_profiles
                      ? "ON — approved models show this show’s “Get Tickets” link (with their affiliate code) until the show is over."
                      : "OFF — approved models won’t show a ticket link for this show."}
                  </p>
                </div>
                <Switch
                  checked={eventForm.promote_tickets_on_profiles}
                  onCheckedChange={(v) => setEventForm({ ...eventForm, promote_tickets_on_profiles: v })}
                />
              </div>

              {/* Feature toggles */}
              <div className="grid grid-cols-1 gap-2 mb-3">
                {/* 🏅 Runway badges */}
                <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                  <div>
                    <Label className="text-sm">🏅 Award runway badge on completion</Label>
                    <p className="text-[11px] text-muted-foreground">
                      {eventForm.badges_enabled
                        ? "ON — accepted models earn this show’s badge when you mark the show “completed”."
                        : "OFF — no badge is awarded (already-earned badges are kept)."}
                    </p>
                  </div>
                  <Switch
                    checked={eventForm.badges_enabled}
                    onCheckedChange={(v) => setEventForm({ ...eventForm, badges_enabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                  <div>
                    <Label className="text-sm">Casting-call CTA</Label>
                    <p className="text-[11px] text-muted-foreground">Shows an “Apply Now” button linking to this event’s gig</p>
                  </div>
                  <Switch
                    checked={eventForm.has_casting_call}
                    onCheckedChange={(v) => setEventForm({ ...eventForm, has_casting_call: v })}
                  />
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <Label>Countdown target (optional)</Label>
                <Input
                  placeholder="2027-05-26T17:00:00-04:00"
                  value={eventForm.countdown_at}
                  onChange={(e) => setEventForm({ ...eventForm, countdown_at: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">ISO 8601 with timezone. Defaults to the start date if blank.</p>
              </div>

              {/* Schedule repeater */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Schedule (Digis ticket links)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addScheduleRow}>+ Add show</Button>
                </div>
                {eventForm.schedule.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">No shows yet. Each row becomes a clickable Digis ticket link on the schedule.</p>
                )}
                {eventForm.schedule.map((row, i) => (
                  <div key={row.id} className="rounded-lg border border-white/10 p-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Day (Mon)" value={row.dayShort} onChange={(e) => updateScheduleRow(i, { dayShort: e.target.value })} />
                      <Input placeholder="Date # (26)" value={row.dateNum} onChange={(e) => updateScheduleRow(i, { dateNum: e.target.value })} />
                      <Input placeholder="Date (May 26)" value={row.date} onChange={(e) => updateScheduleRow(i, { date: e.target.value, day: e.target.value })} />
                    </div>
                    <Input placeholder="Title (Opening Show)" value={row.title} onChange={(e) => updateScheduleRow(i, { title: e.target.value })} />
                    <Input placeholder="Details (Doors 6pm · Show 7pm)" value={row.description} onChange={(e) => updateScheduleRow(i, { description: e.target.value })} />
                    <Input placeholder="Digis event ID (uuid from digis.cc/events/…)" value={row.digisEventId} onChange={(e) => updateScheduleRow(i, { digisEventId: e.target.value })} />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch checked={row.highlight} onCheckedChange={(v) => updateScheduleRow(i, { highlight: v })} />
                        Highlight (marquee night)
                      </label>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeScheduleRow(i)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEventDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEvent} disabled={savingEvent}>
              {savingEvent ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingEvent ? (
                "Save changes"
              ) : (
                "Create event"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Events
                </CardTitle>
                <CardDescription>Select an event to manage tickets</CardDescription>
              </div>
              <Button size="sm" onClick={() => openEventDialog()}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No events yet. Create one to start awarding badges and selling tickets.
              </p>
            )}
            {events.map((event) => (
              <div key={event.id} className="relative">
                <button
                  onClick={() => setSelectedEvent(event)}
                  className={`w-full text-left p-3 pr-10 rounded-lg border transition-colors ${
                    selectedEvent?.id === event.id
                      ? "border-pink-500 bg-pink-500/10"
                      : "border-border hover:border-pink-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{event.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.short_name} &bull;{" "}
                        {event.start_date
                          ? format(new Date(event.start_date), "MMM d, yyyy")
                          : "TBA"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {event.tickets_enabled && (
                        <Ticket className="h-4 w-4 text-pink-500" />
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] capitalize ${
                          event.status === "active"
                            ? "bg-green-500/10 text-green-500"
                            : event.status === "upcoming"
                            ? "bg-blue-500/10 text-blue-500"
                            : event.status === "completed"
                            ? "bg-muted text-muted-foreground"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-2 h-7 w-7 opacity-60 hover:opacity-100"
                  onClick={() => openEventDialog(event)}
                  title="Edit event"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Event Details & Tiers */}
        <div className="lg:col-span-2 space-y-6">
          {selectedEvent ? (
            <>
              {/* Event Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>{selectedEvent.name}</CardTitle>
                  <CardDescription>
                    Configure ticket sales for this event
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Enable Tickets Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Internal Ticket Sales</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow purchasing tickets directly on examodels.com
                      </p>
                    </div>
                    <Switch
                      checked={selectedEvent.tickets_enabled}
                      onCheckedChange={() => toggleTicketsEnabled(selectedEvent)}
                    />
                  </div>

                  {/* Stats */}
                  {stats && selectedEvent.tickets_enabled && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">
                          Tickets Sold
                        </p>
                        <p className="text-2xl font-bold">{stats.total_sold}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="text-2xl font-bold">
                          ${(stats.total_revenue / 100).toFixed(2)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">
                          Commissions
                        </p>
                        <p className="text-2xl font-bold">
                          ${(stats.total_commissions / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ticket Sales */}
              {selectedEvent.tickets_enabled && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Ticket className="h-5 w-5" />
                          Ticket Sales
                        </CardTitle>
                        <CardDescription>
                          {ticketPurchases.filter(p => p.status === "completed").length} completed purchases
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowSales(!showSales)}>
                        {showSales ? "Hide" : "View All"}
                      </Button>
                    </div>
                  </CardHeader>
                  {showSales && (
                    <CardContent>
                      {ticketPurchases.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No ticket purchases yet.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Buyer</TableHead>
                              <TableHead>Tier</TableHead>
                              <TableHead className="text-center">Qty</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead>Referred By</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ticketPurchases.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell>
                                  <p className="font-medium text-sm">{p.buyer_name || "—"}</p>
                                  <p className="text-xs text-muted-foreground">{p.buyer_email}</p>
                                </TableCell>
                                <TableCell className="text-sm">{(p.tier as any)?.name || "—"}</TableCell>
                                <TableCell className="text-center">{p.quantity}</TableCell>
                                <TableCell className="text-right">${(p.total_price_cents / 100).toFixed(2)}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {p.affiliate_model
                                    ? `@${(p.affiliate_model as any).username}`
                                    : <span className="text-xs opacity-50">Direct</span>}
                                </TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    p.status === "completed" ? "bg-green-500/10 text-green-500" :
                                    p.status === "refunded" ? "bg-red-500/10 text-red-500" :
                                    p.status === "cancelled" ? "bg-red-500/10 text-red-500" :
                                    "bg-amber-500/10 text-amber-500"
                                  }`}>
                                    {p.status}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {format(new Date(p.created_at), "MMM d, yyyy")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Ticket Tiers */}
              {selectedEvent.tickets_enabled && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Ticket className="h-5 w-5" />
                          Ticket Tiers
                        </CardTitle>
                        <CardDescription>
                          Configure pricing and availability
                        </CardDescription>
                      </div>
                      <Dialog
                        open={tierDialogOpen}
                        onOpenChange={setTierDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button onClick={() => openTierDialog()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Tier
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              {editingTier ? "Edit Tier" : "Add Ticket Tier"}
                            </DialogTitle>
                            <DialogDescription>
                              Configure the ticket tier details
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Name *</Label>
                              <Input
                                placeholder="General Admission"
                                value={tierForm.name}
                                onChange={(e) =>
                                  setTierForm({
                                    ...tierForm,
                                    name: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Input
                                placeholder="Access to all main events"
                                value={tierForm.description}
                                onChange={(e) =>
                                  setTierForm({
                                    ...tierForm,
                                    description: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Price ($) *</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="99.00"
                                  value={tierForm.price}
                                  onChange={(e) =>
                                    setTierForm({
                                      ...tierForm,
                                      price: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Quantity (leave empty for unlimited)</Label>
                                <Input
                                  type="number"
                                  placeholder="100"
                                  value={tierForm.quantity}
                                  onChange={(e) =>
                                    setTierForm({
                                      ...tierForm,
                                      quantity: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <Label>Active</Label>
                              <Switch
                                checked={tierForm.is_active}
                                onCheckedChange={(checked) =>
                                  setTierForm({ ...tierForm, is_active: checked })
                                }
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setTierDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={saveTier} disabled={savingTier}>
                              {savingTier ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : editingTier ? (
                                "Update"
                              ) : (
                                "Create"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {tiers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No ticket tiers yet. Add one to start selling tickets.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tier</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Sold</TableHead>
                            <TableHead>Available</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tiers.map((tier) => (
                            <TableRow key={tier.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{tier.name}</p>
                                  {tier.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {tier.description}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                ${(tier.price_cents / 100).toFixed(2)}
                              </TableCell>
                              <TableCell>{tier.quantity_sold}</TableCell>
                              <TableCell>
                                {tier.quantity_available !== null
                                  ? tier.quantity_available - tier.quantity_sold
                                  : "Unlimited"}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    tier.is_active
                                      ? "bg-green-500/10 text-green-500"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {tier.is_active ? "Active" : "Inactive"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openTierDialog(tier)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteTier(tier)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
              {/* Commissions & Referrals */}
              {selectedEvent.tickets_enabled && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Commissions & Referrals
                        </CardTitle>
                        <CardDescription>
                          Model affiliate performance — 20% commission on referred ticket sales
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCommissions(!showCommissions)}
                      >
                        {showCommissions ? "Show Summary" : "Show All Orders"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Summary Stats */}
                    {referralSummaries.length > 0 && (
                      <div className="grid grid-cols-4 gap-3 mb-6">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Affiliates</p>
                          </div>
                          <p className="text-xl font-bold">{referralSummaries.length}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Total Clicks</p>
                          </div>
                          <p className="text-xl font-bold">{referralSummaries.reduce((s, r) => s + r.clicks, 0)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Referred Sales</p>
                          </div>
                          <p className="text-xl font-bold">{referralSummaries.reduce((s, r) => s + r.tickets_sold, 0)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Total Commissions</p>
                          </div>
                          <p className="text-xl font-bold">${(referralSummaries.reduce((s, r) => s + r.commission_cents, 0) / 100).toFixed(2)}</p>
                        </div>
                      </div>
                    )}

                    {!showCommissions ? (
                      /* Per-Model Summary View */
                      referralSummaries.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No affiliate referrals yet. Models share their link to earn 20% commission.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Model</TableHead>
                              <TableHead>Code</TableHead>
                              <TableHead className="text-center">Clicks</TableHead>
                              <TableHead className="text-center">Sales</TableHead>
                              <TableHead className="text-right">Revenue</TableHead>
                              <TableHead className="text-right">Commission</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {referralSummaries.map((r) => (
                              <TableRow key={r.model_id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {r.photo_url ? (
                                      <img src={r.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-pink-500/20 flex items-center justify-center text-xs font-bold text-pink-400">
                                        {r.model_name.charAt(0)}
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-medium text-sm">{r.model_name}</p>
                                      <p className="text-xs text-muted-foreground">@{r.username}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.affiliate_code}</code>
                                </TableCell>
                                <TableCell className="text-center">{r.clicks}</TableCell>
                                <TableCell className="text-center">{r.tickets_sold}</TableCell>
                                <TableCell className="text-right">${(r.revenue_cents / 100).toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium">${(r.commission_cents / 100).toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end gap-0.5">
                                    {r.pending_cents > 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500">
                                        ${(r.pending_cents / 100).toFixed(2)} pending
                                      </span>
                                    )}
                                    {r.confirmed_cents > 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/10 text-green-500">
                                        ${(r.confirmed_cents / 100).toFixed(2)} confirmed
                                      </span>
                                    )}
                                    {r.paid_cents > 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-500">
                                        ${(r.paid_cents / 100).toFixed(2)} paid
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )
                    ) : (
                      /* All Orders View */
                      commissions.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No commission orders yet.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Model</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Sale</TableHead>
                              <TableHead className="text-right">Commission</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {commissions.map((c) => {
                              const m = c.model as any;
                              const name = m ? `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.username : "Unknown";
                              return (
                                <TableRow key={c.id}>
                                  <TableCell>
                                    <p className="font-medium text-sm">{name}</p>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {format(new Date(c.created_at), "MMM d, yyyy")}
                                  </TableCell>
                                  <TableCell className="text-right">${(c.sale_amount_cents / 100).toFixed(2)}</TableCell>
                                  <TableCell className="text-right font-medium">${(c.commission_amount_cents / 100).toFixed(2)}</TableCell>
                                  <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      c.status === "paid" ? "bg-blue-500/10 text-blue-500" :
                                      c.status === "confirmed" ? "bg-green-500/10 text-green-500" :
                                      c.status === "cancelled" ? "bg-red-500/10 text-red-500" :
                                      "bg-amber-500/10 text-amber-500"
                                    }`}>
                                      {c.status}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      {c.status === "pending" && (
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => updateCommissionStatus(c.id, "confirmed")}>
                                          Confirm
                                        </Button>
                                      )}
                                      {c.status === "confirmed" && (
                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-green-500" onClick={() => updateCommissionStatus(c.id, "paid")}>
                                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                          Mark Paid
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select an event to manage tickets</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
