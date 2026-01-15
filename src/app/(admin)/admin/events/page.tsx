"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
}

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

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTier, setSavingTier] = useState(false);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<TicketTier | null>(null);

  // Tier form state
  const [tierForm, setTierForm] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    quantity: "",
    is_active: true,
  });

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
      setEvents(data || []);
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (selectedEvent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTiers(selectedEvent.id);
      fetchStats(selectedEvent.id);
    }
  }, [selectedEvent, fetchTiers, fetchStats]);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Events
            </CardTitle>
            <CardDescription>Select an event to manage tickets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedEvent?.id === event.id
                    ? "border-pink-500 bg-pink-500/10"
                    : "border-border hover:border-pink-500/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{event.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.short_name} &bull;{" "}
                      {event.start_date
                        ? format(new Date(event.start_date), "MMM d, yyyy")
                        : "TBA"}
                    </p>
                  </div>
                  {event.tickets_enabled && (
                    <Ticket className="h-4 w-4 text-pink-500" />
                  )}
                </div>
              </button>
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
