"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Search,
  RefreshCw,
  Users,
  DollarSign,
  Sparkles,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface Booking {
  id: string;
  name: string;
  email: string;
  instagram: string | null;
  is_digis_creator: boolean;
  amount_cents: number;
  status: string;
  stripe_session_id: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  paid: number;
  pending: number;
  digisCreators: number;
  totalRevenue: number;
}

export default function AdminDigitalsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    paid: 0,
    pending: 0,
    digisCreators: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fresh-digitals");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBookings(data.bookings || []);
      setStats(data.stats || {});
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const filtered = bookings.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.email.toLowerCase().includes(search.toLowerCase()) ||
      (b.instagram || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="h-6 w-6 text-pink-500" />
            Miami Digitals — May 24th
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bookings for EXA Digitals in Miami Beach
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadBookings}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              Total Bookings
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              Revenue
            </div>
            <p className="text-2xl font-bold mt-1">${stats.totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Sparkles className="h-4 w-4" />
              Digis.cc Creators
            </div>
            <p className="text-2xl font-bold mt-1">{stats.digisCreators}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              Pending
            </div>
            <p className="text-2xl font-bold mt-1">{stats.pending}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or Instagram..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {search ? "No bookings match your search" : "No bookings yet"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Email</th>
                    <th className="p-3 font-medium">Instagram</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Booked</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((booking) => (
                    <tr
                      key={booking.id}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="p-3 font-medium">{booking.name}</td>
                      <td className="p-3 text-muted-foreground">{booking.email}</td>
                      <td className="p-3 text-muted-foreground">
                        {booking.instagram ? (
                          <a
                            href={`https://instagram.com/${booking.instagram.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-400 hover:text-pink-300"
                          >
                            {booking.instagram}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">
                        {booking.is_digis_creator ? (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                            Digis.cc
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Paid
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 font-medium">
                        {booking.is_digis_creator
                          ? "FREE"
                          : `$${(booking.amount_cents / 100).toFixed(0)}`}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={booking.status === "paid" ? "default" : "secondary"}
                          className={
                            booking.status === "paid"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : ""
                          }
                        >
                          {booking.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(booking.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
