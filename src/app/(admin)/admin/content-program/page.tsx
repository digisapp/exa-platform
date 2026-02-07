"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Camera,
  DollarSign,
  Clock,
  CheckCircle,
  Calendar,
  Globe,
  Instagram,
  Phone,
  Mail,
  Loader2,
  Waves,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  ContentProgramApplication,
  ContentProgramEnrollment,
  ContentProgramPayment,
} from "@/types/content-program";

type EnrollmentWithPayments = ContentProgramEnrollment & {
  payments: ContentProgramPayment[];
};

export default function ContentProgramPage() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<ContentProgramApplication[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentWithPayments[]>([]);
  const [selectedApp, setSelectedApp] = useState<ContentProgramApplication | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Auth check
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/signin");
        return;
      }

      // Admin check
      const { data: actor } = await supabase
        .from("actors")
        .select("id, type")
        .eq("user_id", user.id)
        .single() as { data: { id: string; type: string } | null };

      if (!actor || actor.type !== "admin") {
        router.push("/dashboard");
        return;
      }

      // Fetch applications
      const { data: apps, error: appsError } = await (supabase as any)
        .from("content_program_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (appsError) {
        console.error("Error fetching applications:", appsError);
      } else {
        setApplications(apps || []);
      }

      // Fetch enrollments with payments
      const { data: enrolls, error: enrollsError } = await (supabase as any)
        .from("content_program_enrollments")
        .select(`
          *,
          payments:content_program_payments(*)
        `)
        .order("created_at", { ascending: false });

      if (enrollsError) {
        console.error("Error fetching enrollments:", enrollsError);
      } else {
        setEnrollments(enrolls || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (app: ContentProgramApplication) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/content-program/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      if (!res.ok) throw new Error("Failed to approve");

      toast.success(`${app.brand_name} approved and enrolled!`);
      fetchData();
    } catch {
      toast.error("Failed to approve application");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/content-program/applications/${selectedApp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          rejection_reason: rejectReason || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to reject");

      toast.success(`${selectedApp.brand_name} rejected`);
      setShowRejectDialog(false);
      setSelectedApp(null);
      setRejectReason("");
      fetchData();
    } catch {
      toast.error("Failed to reject application");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    setActionLoading(true);
    try {
      const { error: updateError } = await (supabase as any)
        .from("content_program_payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "manual",
        })
        .eq("id", paymentId);

      if (updateError) throw updateError;

      toast.success("Payment marked as paid");
      fetchData();
    } catch {
      toast.error("Failed to update payment");
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate stats
  const pendingApps = applications.filter(a => a.status === "pending");
  const activeEnrollments = enrollments.filter(e => e.status === "active");

  const totalPaymentsReceived = enrollments.reduce((sum, e) => {
    const paidPayments = e.payments?.filter(p => p.status === "paid") || [];
    return sum + paidPayments.reduce((s, p) => s + Number(p.amount), 0);
  }, 0);

  const totalSwimWeekCredits = enrollments.reduce((sum, e) => {
    const paidPayments = e.payments?.filter(p => p.status === "paid") || [];
    return sum + paidPayments.reduce((s, p) => s + Number(p.credits_toward_swim_week), 0);
  }, 0);

  if (loading) {
    return (
      <div className="container px-8 md:px-16 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container px-8 md:px-16 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Camera className="h-8 w-8 text-pink-500" />
          Swimwear Content Program
        </h1>
        <p className="text-muted-foreground">
          Manage designer applications, enrollments, and payments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{pendingApps.length}</p>
                <p className="text-xs text-muted-foreground">Pending Apps</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{activeEnrollments.length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-pink-500" />
              <div>
                <p className="text-2xl font-bold">${totalPaymentsReceived.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Received</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Waves className="h-8 w-8 text-cyan-500" />
              <div>
                <p className="text-2xl font-bold">${totalSwimWeekCredits.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Swim Week Credits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="applications" className="space-y-6">
        <TabsList>
          <TabsTrigger value="applications">
            Applications ({applications.length})
          </TabsTrigger>
          <TabsTrigger value="enrollments">
            Enrollments ({enrollments.length})
          </TabsTrigger>
        </TabsList>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          {applications.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No applications yet</p>
            </Card>
          ) : (
            applications.map((app) => (
              <Card key={app.id} className="overflow-hidden">
                <div className="flex items-start gap-4 p-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold">{app.brand_name}</h3>
                      <StatusBadge status={app.status} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{app.email}</span>
                      </div>
                      {app.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{app.phone}</span>
                        </div>
                      )}
                      {app.website_url && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4" />
                          <a
                            href={app.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary"
                          >
                            Website
                          </a>
                        </div>
                      )}
                      {app.instagram_handle && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Instagram className="h-4 w-4 text-pink-500" />
                          <a
                            href={`https://instagram.com/${app.instagram_handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary"
                          >
                            @{app.instagram_handle}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Applied {new Date(app.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Contact: {app.contact_name}</span>
                    </div>

                    {app.collection_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {app.collection_description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {app.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(app)}
                        disabled={actionLoading}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedApp(app);
                          setShowRejectDialog(true);
                        }}
                        disabled={actionLoading}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Enrollments Tab */}
        <TabsContent value="enrollments" className="space-y-4">
          {enrollments.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No enrollments yet</p>
            </Card>
          ) : (
            enrollments.map((enrollment) => {
              const paidPayments = enrollment.payments?.filter(p => p.status === "paid") || [];
              const totalCredits = paidPayments.reduce((s, p) => s + Number(p.credits_toward_swim_week), 0);
              const progressPercent = Math.round((totalCredits / 3000) * 100);

              return (
                <Card key={enrollment.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {enrollment.brand_name}
                          <StatusBadge status={enrollment.status} />
                        </CardTitle>
                        <CardDescription>{enrollment.contact_email}</CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-cyan-500">${totalCredits}</p>
                        <p className="text-xs text-muted-foreground">of $3,000 credited</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Swim Week Progress</span>
                        <span className="font-medium">{progressPercent}%</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 rounded-full transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Payments */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Payments</p>
                      <div className="grid gap-2">
                        {enrollment.payments?.sort((a, b) => a.payment_month - b.payment_month).map((payment) => (
                          <div
                            key={payment.id}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              payment.status === "paid"
                                ? "bg-green-500/10"
                                : payment.status === "due"
                                ? "bg-amber-500/10"
                                : "bg-muted/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <PaymentStatusBadge status={payment.status} />
                              <span className="font-medium">Month {payment.payment_month}</span>
                              <span className="text-muted-foreground">${Number(payment.amount)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">
                                Due: {new Date(payment.due_date).toLocaleDateString()}
                              </span>
                              {payment.status !== "paid" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkPaid(payment.id)}
                                  disabled={actionLoading}
                                >
                                  Mark Paid
                                </Button>
                              )}
                              {payment.status === "paid" && payment.paid_at && (
                                <span className="text-xs text-green-500">
                                  Paid {new Date(payment.paid_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Reject {selectedApp?.brand_name}&apos;s application. Optionally provide a reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Rejection reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>;
    case "reviewing":
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Reviewing</Badge>;
    case "approved":
      return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Approved</Badge>;
    case "rejected":
      return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Rejected</Badge>;
    case "enrolled":
      return <Badge variant="outline" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20">Enrolled</Badge>;
    case "active":
      return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
    case "completed":
      return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">Completed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-400 border-gray-500/20">Pending</Badge>;
    case "due":
      return <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">Due</Badge>;
    case "paid":
      return <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">Paid</Badge>;
    case "overdue":
      return <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/20">Overdue</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}
