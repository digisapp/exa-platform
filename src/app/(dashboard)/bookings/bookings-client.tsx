"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableSkeleton } from "@/components/ui/page-skeleton";
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
  Upload,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { DeliveryUploadDialog } from "@/components/deliveries/DeliveryUploadDialog";
import { ContractSendDialog } from "@/components/contracts/ContractSendDialog";

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
  total_amount: number;
  counter_amount: number | null;
  counter_notes: string | null;
  status: string;
  client_notes: string | null;
  created_at: string;
  model?: {
    id: string;
    username: string;
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

interface BookingCounts {
  pending: number;
  upcoming: number;
  past: number;
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

// Neon status palette — colored bg + border + glow shadow
const STATUS_STYLES: Record<string, string> = {
  pending:
    "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(251,191,36,0.3)]",
  accepted:
    "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(52,211,153,0.3)]",
  declined:
    "bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]",
  counter:
    "bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(34,211,238,0.3)]",
  confirmed:
    "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_16px_rgba(52,211,153,0.4)]",
  completed:
    "bg-white/10 text-white/70 border-white/20",
  cancelled:
    "bg-white/5 text-white/50 border-white/10",
  no_show:
    "bg-rose-500/15 text-rose-300 border-rose-500/40",
};

// Left-edge accent bar per status
const STATUS_ACCENT_BAR: Record<string, string> = {
  pending: "bg-gradient-to-b from-amber-400 to-orange-500",
  accepted: "bg-gradient-to-b from-emerald-400 to-teal-500",
  declined: "bg-gradient-to-b from-rose-400 to-pink-500",
  counter: "bg-gradient-to-b from-cyan-400 to-blue-500",
  confirmed: "bg-gradient-to-b from-emerald-400 via-teal-400 to-cyan-500",
  completed: "bg-gradient-to-b from-white/30 to-white/10",
  cancelled: "bg-gradient-to-b from-white/20 to-white/5",
  no_show: "bg-gradient-to-b from-rose-400 to-rose-600",
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

const ACTION_SUCCESS_MESSAGES: Record<string, string> = {
  accept: "Booking accepted",
  decline: "Booking declined",
  counter: "Counter offer sent",
  accept_counter: "Counter offer accepted",
  confirm: "Booking confirmed",
  cancel: "Booking cancelled",
  complete: "Booking marked complete",
  no_show: "Booking marked as no-show",
};

const ACTION_ERROR_MESSAGES: Record<string, string> = {
  accept: "Failed to accept booking",
  decline: "Failed to decline booking",
  counter: "Failed to send counter offer",
  accept_counter: "Failed to accept counter offer",
  confirm: "Failed to confirm booking",
  cancel: "Failed to cancel booking",
  complete: "Failed to mark booking complete",
  no_show: "Failed to mark booking as no-show",
};

// Parse YYYY-MM-DD as a LOCAL date — new Date("2026-07-07") parses as UTC
// midnight and renders the previous day in US timezones
const parseLocalDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const localTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

// "14:00:00" → "2:00 PM"
const formatStartTime = (time: string) => {
  const [h, m] = time.split(":");
  const hour = Number(h);
  if (Number.isNaN(hour)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m || "00"} ${suffix}`;
};

interface BookingsClientProps {
  userRole: "model" | "client";
  username: string | null;
}

export function BookingsClient({ userRole, username }: BookingsClientProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [counts, setCounts] = useState<BookingCounts>({ pending: 0, upcoming: 0, past: 0 });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [responseModal, setResponseModal] = useState<{
    open: boolean;
    action: "accept" | "decline" | "counter" | null;
    booking: Booking | null;
  }>({ open: false, action: null, booking: null });
  const [responseNotes, setResponseNotes] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNotes, setCounterNotes] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    action: "complete" | "no_show" | "cancel";
    booking: Booking;
  } | null>(null);
  const [deliveryDialogBookingId, setDeliveryDialogBookingId] = useState<string | null>(null);
  const [contractDialog, setContractDialog] = useState<{ bookingId: string; modelId: string; modelName: string } | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const response = await fetch(`/api/bookings?role=${userRole}&status=${activeTab}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setBookings(data.bookings || []);
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load bookings";
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

      toast.success(data.message || ACTION_SUCCESS_MESSAGES[action] || "Booking updated");
      setResponseModal({ open: false, action: null, booking: null });
      setResponseNotes("");
      setCounterAmount("");
      setCounterNotes("");
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || ACTION_ERROR_MESSAGES[action] || "Failed to update booking");
    } finally {
      setActionLoading(null);
    }
  };

  const openResponseModal = (action: "accept" | "decline" | "counter", booking: Booking) => {
    setResponseModal({ open: true, action, booking });
    setCounterAmount(booking.total_amount.toString());
  };

  const todayStr = localTodayString();
  const isPastEvent = (b: Booking) =>
    ["accepted", "confirmed"].includes(b.status) && b.event_date < todayStr;

  const needsActionBookings = activeTab === "upcoming" ? bookings.filter(isPastEvent) : [];
  const currentBookings =
    activeTab === "upcoming" ? bookings.filter((b) => !isPastEvent(b)) : bookings;

  const isWithdraw =
    responseModal.action === "decline" && responseModal.booking?.status === "counter";

  const confirmAmount = confirmDialog?.booking.total_amount || 0;
  const confirmEscrowed = ["accepted", "confirmed"].includes(confirmDialog?.booking.status || "");
  const confirmCopy = confirmDialog
    ? {
        complete: {
          title: "Mark booking complete?",
          description:
            userRole === "model"
              ? `This confirms the booking took place and releases the ${confirmAmount.toLocaleString()} escrowed coins to you. This can't be undone.`
              : `This confirms the booking took place and releases the ${confirmAmount.toLocaleString()} escrowed coins to the model. This can't be undone.`,
          actionLabel: "Mark Complete",
          actionClass:
            "bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white shadow-[0_0_16px_rgba(236,72,153,0.4)] border-0",
        },
        no_show: {
          title: "Report a no-show?",
          description:
            "This permanently marks the booking as a no-show and closes it. This can't be undone.",
          actionLabel: "Report No Show",
          actionClass:
            "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white shadow-[0_0_16px_rgba(244,63,94,0.4)] border-0",
        },
        cancel: {
          title: "Cancel this booking?",
          description: confirmEscrowed
            ? userRole === "client"
              ? `Your ${confirmAmount.toLocaleString()} escrowed coins will be refunded to you. This can't be undone.`
              : `The ${confirmAmount.toLocaleString()} escrowed coins will be refunded to the client. This can't be undone.`
            : "This closes the booking request. This can't be undone.",
          actionLabel: "Cancel Booking",
          actionClass:
            "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white shadow-[0_0_16px_rgba(244,63,94,0.4)] border-0",
        },
      }[confirmDialog.action]
    : null;

  const renderBookingCard = (booking: Booking) => {
    const displayAmount =
      booking.status === "counter" && booking.counter_amount
        ? booking.counter_amount
        : booking.total_amount;
    const needsAction = isPastEvent(booking);
    return (
      <div
        key={booking.id}
        className={`relative overflow-hidden rounded-2xl border bg-white/[0.03] backdrop-blur-sm transition-all ${
          needsAction
            ? "border-amber-500/40 shadow-[0_0_20px_rgba(251,191,36,0.12)] hover:border-amber-500/60"
            : "border-white/10 hover:border-white/20"
        }`}
      >
        {/* Left accent bar per status */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 ${STATUS_ACCENT_BAR[booking.status] || "bg-white/10"}`}
        />

        <div className="flex flex-col md:flex-row">
          {/* Left: Booking Info */}
          <div className="flex-1 p-6 pl-7">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-mono text-white/40">
                    {booking.booking_number}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 ${STATUS_STYLES[booking.status]}`}
                  >
                    {STATUS_LABELS[booking.status]}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-white truncate">
                  {SERVICE_LABELS[booking.service_type] || booking.service_type}
                </h3>
                {booking.service_description && (
                  <p className="text-sm text-white/60 mt-1">{booking.service_description}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
                  {displayAmount.toLocaleString()}
                  <span className="text-xs text-white/50 ml-1">coins</span>
                </p>
                {booking.status === "counter" && booking.counter_amount && (
                  <p className="text-[11px] text-white/40 line-through">
                    Was {booking.total_amount.toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Past-event nudge — booking still needs completion */}
            {needsAction && (
              <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-[0_0_16px_rgba(251,191,36,0.15)]">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-200">
                  {userRole === "model"
                    ? booking.status === "confirmed"
                      ? "The event date has passed — mark this booking complete to release your coins."
                      : "The event date has passed — confirm and complete this booking to release your coins."
                    : "The event date has passed. This booking is awaiting completion."}
                </p>
              </div>
            )}

            {/* Client Info card */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/[0.04] border border-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/30 to-violet-500/30 ring-1 ring-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {booking.client?.avatar_url || booking.client?.logo_url ? (
                  <Image
                    src={booking.client.avatar_url || booking.client.logo_url || ""}
                    alt="Client"
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                ) : booking.client?.type === "brand" ? (
                  <Building2 className="h-5 w-5 text-violet-300" />
                ) : (
                  <User className="h-5 w-5 text-pink-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white text-sm truncate">
                  {booking.client?.company_name ||
                    booking.client?.display_name ||
                    "Unknown Client"}
                </p>
                {booking.client?.email && (
                  <p className="text-xs text-white/50 truncate">
                    {booking.client.email}
                  </p>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-2 text-white/80">
                <Calendar className="h-4 w-4 text-pink-400" />
                <span>
                  {parseLocalDate(booking.event_date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              {booking.start_time && (
                <div className="flex items-center gap-2 text-white/80">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  <span>{formatStartTime(booking.start_time)}</span>
                </div>
              )}
              {booking.duration_hours && (
                <div className="flex items-center gap-2 text-white/80">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  <span>{booking.duration_hours}h duration</span>
                </div>
              )}
              {(booking.location_name || booking.location_city || booking.is_remote) && (
                <div className="flex items-center gap-2 text-white/80">
                  <MapPin className="h-4 w-4 text-violet-400" />
                  <span>
                    {booking.is_remote
                      ? "Remote"
                      : [
                          booking.location_name,
                          booking.location_city
                            ? `${booking.location_city}${
                                booking.location_state ? `, ${booking.location_state}` : ""
                              }`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                  </span>
                </div>
              )}
            </div>

            {/* Client Notes */}
            {booking.client_notes && (
              <div className="mt-4 p-3 rounded-xl bg-white/[0.04] border border-white/5">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40 mb-1">
                  Client Notes
                </p>
                <p className="text-sm text-white/80">{booking.client_notes}</p>
              </div>
            )}

            {/* Counter Offer Notes */}
            {booking.status === "counter" && booking.counter_notes && (
              <div className="mt-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_16px_rgba(34,211,238,0.15)]">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-cyan-300 mb-1">
                  Your Counter Offer Note
                </p>
                <p className="text-sm text-white/90">{booking.counter_notes}</p>
              </div>
            )}
          </div>

          {/* Right: Actions panel */}
          <div className="flex flex-row flex-wrap md:flex-col gap-2 p-4 md:p-5 bg-black/20 md:w-52 border-t md:border-t-0 md:border-l border-white/5">
            {/* Model actions for pending bookings */}
            {booking.status === "pending" && userRole === "model" && (
              <>
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-[0_0_16px_rgba(52,211,153,0.4)] border-0"
                  onClick={() => openResponseModal("accept", booking)}
                  disabled={actionLoading === booking.id}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-[0_0_16px_rgba(34,211,238,0.35)] border-0"
                  onClick={() => openResponseModal("counter", booking)}
                  disabled={actionLoading === booking.id}
                >
                  <DollarSign className="h-4 w-4 mr-1.5" />
                  Counter
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 bg-transparent border-rose-500/40 text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/60"
                  onClick={() => openResponseModal("decline", booking)}
                  disabled={actionLoading === booking.id}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Decline
                </Button>
              </>
            )}

            {/* Model actions for counter status */}
            {booking.status === "counter" && userRole === "model" && (
              <>
                <p className="text-[11px] text-white/50 text-center mb-1">
                  Waiting for client response
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 bg-transparent border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                  onClick={() => openResponseModal("decline", booking)}
                  disabled={actionLoading === booking.id}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Withdraw
                </Button>
              </>
            )}

            {/* Client actions for counter status */}
            {booking.status === "counter" && userRole === "client" && (
              <Button
                size="sm"
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-[0_0_16px_rgba(52,211,153,0.4)] border-0"
                onClick={() => handleAction("accept_counter", booking.id)}
                disabled={actionLoading === booking.id}
              >
                {actionLoading === booking.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Accept {booking.counter_amount?.toLocaleString()}
                  </>
                )}
              </Button>
            )}

            {booking.status === "accepted" && (
              <Button
                size="sm"
                className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-[0_0_16px_rgba(52,211,153,0.4)] border-0"
                onClick={() => handleAction("confirm", booking.id)}
                disabled={actionLoading === booking.id}
              >
                {actionLoading === booking.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Confirm
                  </>
                )}
              </Button>
            )}

            {booking.status === "confirmed" && (
              <>
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white shadow-[0_0_16px_rgba(236,72,153,0.4)] border-0"
                  onClick={() => setConfirmDialog({ action: "complete", booking })}
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
                  className="flex-1 bg-transparent text-rose-300 border-rose-500/40 hover:bg-rose-500/10"
                  onClick={() => setConfirmDialog({ action: "no_show", booking })}
                  disabled={actionLoading === booking.id}
                >
                  No Show
                </Button>
              </>
            )}

            {/* Upload Deliverables */}
            {["confirmed", "completed"].includes(booking.status) && userRole === "model" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 bg-pink-500/10 border-pink-500/40 text-pink-300 hover:bg-pink-500/20 hover:border-pink-500/60"
                onClick={() => setDeliveryDialogBookingId(booking.id)}
              >
                <Upload className="h-4 w-4 mr-1.5" />
                Deliverables
              </Button>
            )}

            {/* Send Contract */}
            {["accepted", "confirmed"].includes(booking.status) && userRole === "client" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 bg-cyan-500/10 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/60"
                onClick={() => setContractDialog({
                  bookingId: booking.id,
                  modelId: booking.model_id,
                  modelName: booking.model?.username || "Model",
                })}
              >
                <FileText className="h-4 w-4 mr-1.5" />
                Send Contract
              </Button>
            )}

            {/* Cancel */}
            {(
              (["accepted", "confirmed"].includes(booking.status)) ||
              (["pending", "counter"].includes(booking.status) && userRole === "client")
            ) && (
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 text-white/50 hover:text-white/80 hover:bg-white/5"
                onClick={() => setConfirmDialog({ action: "cancel", booking })}
                disabled={actionLoading === booking.id}
              >
                Cancel
              </Button>
            )}

            <p className="text-[10px] text-white/40 text-center mt-1 w-full">
              {new Date(booking.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ──────────────────────────────────────────────
          Hero header with gradient text
         ────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-3xl border border-white/10 p-5 md:p-7"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,105,180,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(0,191,255,0.12) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-pink-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-cyan-500/25 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">Bookings</p>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
              <span className="exa-gradient-text">Your bookings</span>
            </h1>
            <p className="text-xs md:text-sm text-white/60 mt-1">
              Review, accept, counter, or decline incoming booking requests.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={fetchBookings}
            disabled={loading}
            className="shrink-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          Tabs — custom neon underbar
         ────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-white/[0.03] border border-white/10 rounded-2xl p-1 h-auto">
          <TabsTrigger
            value="pending"
            className="relative rounded-xl py-2.5 text-sm font-medium text-white/60 data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-500/20 data-[state=active]:to-violet-500/20 data-[state=active]:text-white data-[state=active]:shadow-[0_0_16px_rgba(236,72,153,0.2)] transition-all"
          >
            Pending
            {counts.pending > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 flex items-center justify-center text-[10px] font-bold bg-pink-500 text-white rounded-full shadow-[0_0_8px_rgba(236,72,153,0.8)]">
                {counts.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="upcoming"
            className="rounded-xl py-2.5 text-sm font-medium text-white/60 data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-500/20 data-[state=active]:to-violet-500/20 data-[state=active]:text-white data-[state=active]:shadow-[0_0_16px_rgba(236,72,153,0.2)] transition-all"
          >
            Upcoming
          </TabsTrigger>
          <TabsTrigger
            value="past"
            className="rounded-xl py-2.5 text-sm font-medium text-white/60 data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-500/20 data-[state=active]:to-violet-500/20 data-[state=active]:text-white data-[state=active]:shadow-[0_0_16px_rgba(236,72,153,0.2)] transition-all"
          >
            Past
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <TableSkeleton rows={4} />
          ) : fetchError ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] backdrop-blur-sm p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/15 ring-1 ring-rose-500/30 mb-4">
                <AlertTriangle className="h-8 w-8 text-rose-300" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Couldn&apos;t load bookings</h3>
              <p className="text-sm text-white/50 max-w-sm mx-auto mb-6">{fetchError}</p>
              <Button
                onClick={fetchBookings}
                className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white shadow-[0_0_16px_rgba(236,72,153,0.4)] border-0"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 ring-1 ring-pink-500/30 mb-4">
                <Calendar className="h-8 w-8 text-pink-300" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">No {activeTab} bookings</h3>
              <p className="text-sm text-white/50 max-w-sm mx-auto">
                {activeTab === "pending"
                  ? "You don't have any pending booking requests. New ones will appear here."
                  : activeTab === "upcoming"
                    ? "No upcoming bookings yet — once a request is accepted it'll show here."
                    : "No past bookings in your history."}
              </p>
              <p className="text-sm text-white/50 max-w-md mx-auto mt-2">
                {userRole === "model"
                  ? "Clients book you from your profile — you accept, their coins are held in escrow, and they're released to you once the booking is complete."
                  : "Request a booking from any model's profile — your coins are held in escrow and released once the booking is complete."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                {userRole === "model" ? (
                  <>
                    <Button
                      asChild
                      className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white shadow-[0_0_16px_rgba(236,72,153,0.4)] border-0"
                    >
                      <Link href="/settings">
                        <DollarSign className="h-4 w-4 mr-1.5" />
                        Set your booking rates
                      </Link>
                    </Button>
                    {username && (
                      <Button
                        asChild
                        variant="outline"
                        className="bg-transparent border-white/20 text-white hover:bg-white/10"
                      >
                        <Link href={`/${username}`}>View your public profile</Link>
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    asChild
                    className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white shadow-[0_0_16px_rgba(236,72,153,0.4)] border-0"
                  >
                    <Link href="/models">Browse models</Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {needsActionBookings.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                      Needs action
                    </h2>
                  </div>
                  {needsActionBookings.map(renderBookingCard)}
                  {currentBookings.length > 0 && <div className="h-px bg-white/10" />}
                </>
              )}
              {currentBookings.map(renderBookingCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ──────────────────────────────────────────────
          Response Dialog — dark glass
         ────────────────────────────────────────────── */}
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
        <DialogContent className="bg-[#120a24]/95 backdrop-blur-xl border-violet-500/30 shadow-2xl shadow-violet-500/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              {responseModal.action === "accept" && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Accept Booking
                </>
              )}
              {responseModal.action === "decline" && (
                <>
                  <XCircle className="h-5 w-5 text-rose-400" />
                  {isWithdraw ? "Withdraw Counter Offer" : "Decline Booking"}
                </>
              )}
              {responseModal.action === "counter" && (
                <>
                  <DollarSign className="h-5 w-5 text-cyan-400" />
                  Send Counter Offer
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {responseModal.action === "accept" &&
                "You're accepting this booking request. The client will be notified."}
              {responseModal.action === "decline" &&
                (isWithdraw
                  ? "This withdraws your counter offer and declines the booking. The client will be notified."
                  : "Are you sure you want to decline this booking?")}
              {responseModal.action === "counter" &&
                "Propose a different rate for this booking."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {responseModal.action === "counter" && (
              <>
                <div className="space-y-2">
                  <Label className="text-white/80">Counter Amount (coins)</Label>
                  <Input
                    type="number"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    placeholder="Enter your counter offer"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-500/20"
                  />
                  <p className="text-xs text-white/50">
                    Original: {responseModal.booking?.total_amount?.toLocaleString()} coins
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Explain Your Counter (Optional)</Label>
                  <Textarea
                    value={counterNotes}
                    onChange={(e) => setCounterNotes(e.target.value)}
                    placeholder="e.g., Rate increased due to travel distance..."
                    rows={2}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-500/20"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label className="text-white/80">
                Message to Client{" "}
                {responseModal.action !== "counter" && (
                  <span className="text-white/40 text-xs">(Optional)</span>
                )}
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
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:border-pink-400/60 focus-visible:ring-pink-500/20"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setResponseModal({ open: false, action: null, booking: null })}
              className="bg-transparent border-white/20 text-white hover:bg-white/10"
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
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-[0_0_16px_rgba(52,211,153,0.4)] border-0"
                  : responseModal.action === "decline"
                    ? "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white shadow-[0_0_16px_rgba(244,63,94,0.4)] border-0"
                    : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-[0_0_16px_rgba(34,211,238,0.4)] border-0"
              }
            >
              {actionLoading === responseModal.booking?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : responseModal.action === "accept" ? (
                "Accept Booking"
              ) : responseModal.action === "decline" ? (
                isWithdraw ? "Withdraw Offer" : "Decline Booking"
              ) : (
                "Send Counter Offer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────────────────────────────
          Irreversible-action confirmation — dark glass
         ────────────────────────────────────────────── */}
      <AlertDialog
        open={confirmDialog !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null);
        }}
      >
        <AlertDialogContent className="bg-[#120a24]/95 backdrop-blur-xl border-violet-500/30 shadow-2xl shadow-violet-500/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{confirmCopy?.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {confirmCopy?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog) {
                  handleAction(confirmDialog.action, confirmDialog.booking.id);
                }
              }}
              className={confirmCopy?.actionClass}
            >
              {confirmCopy?.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delivery Upload Dialog */}
      <DeliveryUploadDialog
        open={deliveryDialogBookingId !== null}
        onOpenChange={(open) => {
          if (!open) setDeliveryDialogBookingId(null);
        }}
        bookingId={deliveryDialogBookingId || undefined}
        onDeliveryCreated={fetchBookings}
      />

      {/* Contract Send Dialog */}
      <ContractSendDialog
        open={contractDialog !== null}
        onOpenChange={(open) => {
          if (!open) setContractDialog(null);
        }}
        bookingId={contractDialog?.bookingId}
        modelId={contractDialog?.modelId}
        modelName={contractDialog?.modelName}
      />
    </div>
  );
}
