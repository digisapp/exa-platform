"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Printer,
  Search,
  Download,
  RefreshCw,
  DollarSign,
  Package,
  CheckCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface PrintOrder {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  pdf_url: string | null;
  quantity: number;
  package_name: string;
  amount_cents: number;
  status: string;
  pickup_location: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-amber-500",
  paid: "bg-cyan-500",
  printing: "bg-purple-500",
  ready: "bg-blue-500",
  picked_up: "bg-green-500",
  cancelled: "bg-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending Payment",
  paid: "Paid",
  printing: "Printing",
  ready: "Ready for Pickup",
  picked_up: "Picked Up",
  cancelled: "Cancelled",
};

export default function PrintQueuePage() {
  const [orders, setOrders] = useState<PrintOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/print-queue");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      toast.error("Failed to load print queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/print-queue/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
      loadOrders();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const filtered = orders.filter((o) => {
    const matchesSearch =
      !search ||
      o.email.toLowerCase().includes(search.toLowerCase()) ||
      o.first_name.toLowerCase().includes(search.toLowerCase()) ||
      (o.last_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.phone || "").includes(search);
    const matchesStatus =
      statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pendingPrint: orders.filter(
      (o) => o.status === "paid" || o.status === "printing"
    ).length,
    ready: orders.filter((o) => o.status === "ready").length,
    revenue: orders
      .filter((o) => o.status !== "pending_payment" && o.status !== "cancelled")
      .reduce((sum, o) => sum + o.amount_cents, 0),
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Printer className="h-6 w-6" />
          Print Queue
        </h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Printer className="h-6 w-6" />
          Print Queue
        </h1>
        <Button variant="outline" size="sm" onClick={loadOrders}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Printer className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{stats.pendingPrint}</p>
              <p className="text-xs text-muted-foreground">Need Printing</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.ready}</p>
              <p className="text-xs text-muted-foreground">Ready for Pickup</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">
                ${(stats.revenue / 100).toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="printing">Printing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="picked_up">Picked Up</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No orders found
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[order.status] || "bg-gray-500"}`}
                      />
                      <p className="font-semibold">
                        {order.first_name}{" "}
                        {order.last_name || ""}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {order.package_name} — $
                        {(order.amount_cents / 100).toFixed(0)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{order.email}</span>
                      {order.phone && <span>{order.phone}</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(order.created_at).toLocaleDateString()}{" "}
                        {new Date(order.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {order.notes && (
                      <p className="text-xs text-muted-foreground italic">
                        Note: {order.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {order.pdf_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={order.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </a>
                      </Button>
                    )}
                    <Select
                      value={order.status}
                      onValueChange={(v) => updateStatus(order.id, v)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="printing">Printing</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="picked_up">Picked Up</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
