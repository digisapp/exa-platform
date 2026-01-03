"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  Building2,
  RefreshCw,
} from "lucide-react";

interface Booking {
  id: string;
  booking_number: string;
  model_id: string;
  client_id: string;
  service_type: string;
  service_description: string | null;
  event_date: string;
  start_time: string | null;
  duration_hours: number | null;
  location_name: string | null;
  location_city: string | null;
  location_state: string | null;
  is_remote: boolean;
  quoted_rate: number;
  total_amount: number;
  counter_amount: number | null;
  counter_notes: string | null;
  status: string;
  client_notes: string | null;
  model_response_notes: string | null;
  created_at: string;
  model?: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    profile_photo_url: string | null;
    city: string | null;
    state: string | null;
  };
  client?: {
    display_name?: string;
    company_name?: string;
    contact_name?: string;
    email?: string;
    avatar_url?: string;
    logo_url?: string;
    type?: string;
  };
}

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

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  accepted: "bg-green-500/10 text-green-500 border-green-500/30",
  declined: "bg-red-500/10 text-red-500 border-red-500/30",
  counter: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  confirmed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  completed: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  cancelled: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  no_show: "bg-red-500/10 text-red-500 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  counter: "Counter Offer",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [userRole, setUserRole] = useState<"model" | "client">("client");
  const [responseModal, setResponseModal] = useState<{
    open: boolean;
    action: "accept" | "decline" | "counter" | null;
    booking: Booking | null;
  }>({ open: false, action: null, booking: null });
  const [responseNotes, setResponseNotes] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNotes, setCounterNotes] = useState("");

  // Determine user role on mount
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.actor?.type === "model") {
            setUserRole("model");
          } else {
            setUserRole("client");
          }
        }
      } catch (error) {
        console.error("Failed to check user role:", error);
      }
    };
    checkUserRole();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bookings?role=${userRole}&status=${activeTab}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setBookings(data.bookings || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load bookings";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userRole]);

  const handleAction = async (action: string, bookingId: string, additionalData?: any) => {
    try {
      setActionLoading(bookingId);
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          responseNotes,
          counterAmount: counterAmount ? parseInt(counterAmount) : undefined,
          counterNotes,
          ...additionalData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      toast.success(data.message || `Booking ${action}ed successfully`);
      setResponseModal({ open: false, action: null, booking: null });
      setResponseNotes("");
      setCounterAmount("");
      setCounterNotes("");
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} booking`);
    } finally {
      setActionLoading(null);
    }
  };

  const openResponseModal = (action: "accept" | "decline" | "counter", booking: Booking) => {
    setResponseModal({ open: true, action, booking });
    setCounterAmount(booking.total_amount.toString());
  };

  const pendingCount = bookings.filter((b) => ["pending", "counter"].includes(b.status)).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Bookings</h1>
        <Button variant="outline" onClick={fetchBookings} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : bookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No {activeTab} bookings</h3>
                <p className="text-muted-foreground">
                  {activeTab === "pending"
                    ? "You don't have any pending booking requests."
                    : activeTab === "upcoming"
                    ? "You don't have any upcoming bookings."
                    : "You don't have any past bookings."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Left: Booking Info */}
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm text-muted-foreground">
                                {booking.booking_number}
                              </span>
                              <Badge
                                variant="outline"
                                className={STATUS_COLORS[booking.status]}
                              >
                                {STATUS_LABELS[booking.status]}
                              </Badge>
                            </div>
                            <h3 className="text-lg font-semibold">
                              {SERVICE_LABELS[booking.service_type] || booking.service_type}
                            </h3>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-pink-500">
                              {(booking.status === "counter" && booking.counter_amount
                                ? booking.counter_amount
                                : booking.total_amount
                              ).toLocaleString()} coins
                            </p>
                            {booking.status === "counter" && booking.counter_amount && (
                              <p className="text-xs text-muted-foreground line-through">
                                Original: {booking.total_amount.toLocaleString()} coins
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Client Info */}
                        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/50">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center overflow-hidden">
                            {booking.client?.avatar_url || booking.client?.logo_url ? (
                              <Image
                                src={booking.client.avatar_url || booking.client.logo_url || ""}
                                alt="Client"
                                width={40}
                                height={40}
                                className="object-cover"
                              />
                            ) : booking.client?.type === "brand" ? (
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <User className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {booking.client?.company_name ||
                                booking.client?.display_name ||
                                "Unknown Client"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {booking.client?.email}
                            </p>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {new Date(booking.event_date).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          {booking.start_time && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{booking.start_time}</span>
                            </div>
                          )}
                          {booking.duration_hours && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{booking.duration_hours} hours</span>
                            </div>
                          )}
                          {(booking.location_city || booking.is_remote) && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {booking.is_remote
                                  ? "Remote"
                                  : `${booking.location_city}${
                                      booking.location_state ? `, ${booking.location_state}` : ""
                                    }`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Client Notes */}
                        {booking.client_notes && (
                          <div className="mt-4 p-3 rounded-lg bg-muted/30 border">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Client Notes:
                            </p>
                            <p className="text-sm">{booking.client_notes}</p>
                          </div>
                        )}

                        {/* Counter Offer Notes */}
                        {booking.status === "counter" && booking.counter_notes && (
                          <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                            <p className="text-xs font-medium text-blue-500 mb-1">
                              Your Counter Offer Notes:
                            </p>
                            <p className="text-sm">{booking.counter_notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-row md:flex-col gap-2 p-4 md:p-6 bg-muted/30 md:w-48 border-t md:border-t-0 md:border-l">
                        {booking.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              className="flex-1 bg-green-500 hover:bg-green-600"
                              onClick={() => openResponseModal("accept", booking)}
                              disabled={actionLoading === booking.id}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
                              onClick={() => openResponseModal("counter", booking)}
                              disabled={actionLoading === booking.id}
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              Counter
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-red-500/50 text-red-500 hover:bg-red-500/10"
                              onClick={() => openResponseModal("decline", booking)}
                              disabled={actionLoading === booking.id}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Decline
                            </Button>
                          </>
                        )}
                        {booking.status === "accepted" && (
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                            onClick={() => handleAction("confirm", booking.id)}
                            disabled={actionLoading === booking.id}
                          >
                            {actionLoading === booking.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Confirm
                              </>
                            )}
                          </Button>
                        )}
                        {booking.status === "confirmed" && (
                          <>
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleAction("complete", booking.id)}
                              disabled={actionLoading === booking.id}
                            >
                              {actionLoading === booking.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Mark Complete"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-red-500 border-red-500/50"
                              onClick={() => handleAction("no_show", booking.id)}
                              disabled={actionLoading === booking.id}
                            >
                              No Show
                            </Button>
                          </>
                        )}
                        {["pending", "accepted", "confirmed", "counter"].includes(booking.status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 text-muted-foreground"
                            onClick={() => handleAction("cancel", booking.id)}
                            disabled={actionLoading === booking.id}
                          >
                            Cancel
                          </Button>
                        )}
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          {new Date(booking.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Response Modal */}
      <Dialog
        open={responseModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setResponseModal({ open: false, action: null, booking: null });
            setResponseNotes("");
            setCounterAmount("");
            setCounterNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseModal.action === "accept" && "Accept Booking"}
              {responseModal.action === "decline" && "Decline Booking"}
              {responseModal.action === "counter" && "Send Counter Offer"}
            </DialogTitle>
            <DialogDescription>
              {responseModal.action === "accept" &&
                "You're accepting this booking request. The client will be notified."}
              {responseModal.action === "decline" &&
                "Are you sure you want to decline this booking?"}
              {responseModal.action === "counter" &&
                "Propose a different rate for this booking."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {responseModal.action === "counter" && (
              <>
                <div className="space-y-2">
                  <Label>Counter Amount (coins)</Label>
                  <Input
                    type="number"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    placeholder="Enter your counter offer"
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Original: {responseModal.booking?.total_amount?.toLocaleString()} coins
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Explain Your Counter (Optional)</Label>
                  <Textarea
                    value={counterNotes}
                    onChange={(e) => setCounterNotes(e.target.value)}
                    placeholder="e.g., Rate increased due to travel distance..."
                    rows={2}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>
                Message to Client{" "}
                {responseModal.action !== "counter" && "(Optional)"}
              </Label>
              <Textarea
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                placeholder={
                  responseModal.action === "accept"
                    ? "e.g., Looking forward to working with you!"
                    : responseModal.action === "decline"
                    ? "e.g., Unfortunately I'm not available on that date..."
                    : "Additional message for the client..."
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResponseModal({ open: false, action: null, booking: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (responseModal.booking && responseModal.action) {
                  handleAction(responseModal.action, responseModal.booking.id);
                }
              }}
              disabled={
                actionLoading === responseModal.booking?.id ||
                (responseModal.action === "counter" && !counterAmount)
              }
              className={
                responseModal.action === "accept"
                  ? "bg-green-500 hover:bg-green-600"
                  : responseModal.action === "decline"
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-blue-500 hover:bg-blue-600"
              }
            >
              {actionLoading === responseModal.booking?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : responseModal.action === "accept" ? (
                "Accept Booking"
              ) : responseModal.action === "decline" ? (
                "Decline Booking"
              ) : (
                "Send Counter Offer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
