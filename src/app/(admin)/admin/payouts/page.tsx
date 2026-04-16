import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PayoutActions } from "@/components/admin/PayoutActions";
import { RevealAccountNumber, RevealRoutingNumber } from "@/components/admin/RevealAccountNumber";
import {
  ArrowLeft,
  Wallet,
  Clock,
  CheckCircle,
  DollarSign,
  Coins,
  Building2,
  Globe,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";

interface WithdrawalRequest {
  id: string;
  model_id: string;
  bank_account_id: string | null;
  payoneer_account_id: string | null;
  payout_method: string | null;
  coins: number;
  usd_amount: string;
  status: string;
  admin_notes: string | null;
  failure_reason: string | null;
  requested_at: string;
  completed_at: string | null;
  models: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    profile_photo_url: string | null;
    coin_balance: number;
    zelle_info: string | null;
  };
  bank_accounts: {
    id: string;
    account_holder_name: string;
    bank_name: string;
    account_number_last4: string;
    account_type: string;
  } | null;
  payoneer_accounts: {
    id: string;
    payee_id: string;
    email: string | null;
    country: string | null;
    status: string;
  } | null;
}

const PAGE_SIZE = 50;

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Check if admin
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "admin") {
    redirect("/dashboard");
  }

  // Get withdrawal requests with model, bank, and payoneer info (paginated)
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: withdrawals, count } = await supabase
    .from("withdrawal_requests")
    .select(`
      *,
      models (
        id,
        username,
        first_name,
        last_name,
        email,
        profile_photo_url,
        coin_balance,
        zelle_info
      ),
      bank_accounts (
        id,
        account_holder_name,
        bank_name,
        account_number_last4,
        account_type
      ),
      payoneer_accounts (
        id,
        payee_id,
        email,
        country,
        status
      )
    `, { count: "exact" })
    .order("requested_at", { ascending: false })
    .range(from, to) as { data: WithdrawalRequest[] | null; count: number | null };

  const allWithdrawals = withdrawals || [];
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Calculate stats from current page (pending/processing counts are most relevant)
  const pending = allWithdrawals.filter(w => w.status === "pending");
  const processing = allWithdrawals.filter(w => w.status === "processing");
  const completed = allWithdrawals.filter(w => w.status === "completed");
  const pendingAmount = pending.reduce((sum, w) => sum + parseFloat(w.usd_amount), 0);
  const processingAmount = processing.reduce((sum, w) => sum + parseFloat(w.usd_amount), 0);
  const completedAmount = completed.reduce((sum, w) => sum + parseFloat(w.usd_amount), 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/50">Pending</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/50">Processing</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/50">Completed</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/50">Failed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/50">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPayoutMethodBadge = (withdrawal: WithdrawalRequest) => {
    if (withdrawal.payout_method === "payoneer") {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/50">Payoneer</Badge>;
    }
    // Show Zelle badge when model has Zelle info and no bank account linked
    if (withdrawal.models?.zelle_info && !withdrawal.bank_account_id) {
      return <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/50">Zelle</Badge>;
    }
    return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/50">Bank</Badge>;
  };

  const renderWithdrawalCard = (withdrawal: WithdrawalRequest) => {
    const model = withdrawal.models;
    const bank = withdrawal.bank_accounts;
    const payoneer = withdrawal.payoneer_accounts;
    const displayName = model?.first_name
      ? `${model.first_name} ${model.last_name || ""}`.trim()
      : model?.username || "Unknown";

    return (
      <div
        key={withdrawal.id}
        className="p-5 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors space-y-4"
      >
        {/* Header: Model info + Amount */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
              {model?.profile_photo_url ? (
                <Image src={model.profile_photo_url} alt={displayName} width={48} height={48} className="w-full h-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="font-semibold text-lg">{displayName}</p>
              <p className="text-sm text-muted-foreground">@{model?.username}</p>
              {model?.email && (
                <p className="text-xs text-muted-foreground">{model.email}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-500">${parseFloat(withdrawal.usd_amount).toFixed(2)}</p>
            <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
              <Coins className="h-3 w-3" />
              {withdrawal.coins.toLocaleString()} coins
            </p>
            <div className="mt-1">
              {getPayoutMethodBadge(withdrawal)}
            </div>
          </div>
        </div>

        {/* Zelle Info */}
        {model?.zelle_info && (
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Zelle</p>
                  <p className="text-sm font-medium text-purple-400">{model.zelle_info}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/50">Zelle</Badge>
            </div>
          </div>
        )}

        {/* Bank Account Info */}
        {bank && (
          <div className="p-3 rounded-lg bg-background/50 space-y-2">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{bank.bank_name}</p>
                <p className="text-xs text-muted-foreground">
                  {bank.account_holder_name} · {bank.account_type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pl-8">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Account:</span>
                <RevealAccountNumber
                  bankAccountId={bank.id}
                  last4={bank.account_number_last4}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Routing:</span>
                <RevealRoutingNumber bankAccountId={bank.id} />
              </div>
            </div>
          </div>
        )}

        {/* Payoneer Account Info */}
        {payoneer && (
          <div className="p-3 rounded-lg bg-background/50 space-y-2">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-orange-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Payoneer</p>
                <p className="text-xs text-muted-foreground">
                  Payee: {payoneer.payee_id}
                  {payoneer.email && ` · ${payoneer.email}`}
                  {payoneer.country && ` · ${payoneer.country}`}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  payoneer.status === "active"
                    ? "bg-green-500/10 text-green-500 border-green-500/50"
                    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/50"
                }
              >
                {payoneer.status}
              </Badge>
            </div>
          </div>
        )}

        {/* No payout destination */}
        {!bank && !payoneer && !model?.zelle_info && (
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="text-sm text-red-400">No payout destination found</p>
          </div>
        )}

        {/* Status + Date + Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            {getStatusBadge(withdrawal.status)}
            <span className="text-xs text-muted-foreground">
              {formatDate(withdrawal.requested_at)}
            </span>
          </div>

          {(withdrawal.status === "pending" || withdrawal.status === "processing") && (
            <PayoutActions
              id={withdrawal.id}
              status={withdrawal.status}
              modelName={displayName}
              coins={withdrawal.coins}
              modelId={withdrawal.model_id}
            />
          )}
        </div>

        {/* Notes/Failure reason */}
        {withdrawal.failure_reason && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">
              <strong>Rejection reason:</strong> {withdrawal.failure_reason}
            </p>
          </div>
        )}
        {withdrawal.admin_notes && (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-400">
              <strong>Notes:</strong> {withdrawal.admin_notes}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-4 pt-4">
        <Button variant="outline" size="sm" asChild disabled={currentPage <= 1}>
          <Link href={`/admin/payouts?page=${currentPage - 1}`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages} ({totalCount} total)
        </span>
        <Button variant="outline" size="sm" asChild disabled={currentPage >= totalPages}>
          <Link href={`/admin/payouts?page=${currentPage + 1}`}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    );
  };

  return (
    <div className="container px-8 md:px-16 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Payouts</h1>
          <p className="text-muted-foreground">Manage model withdrawal requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{pending.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-sm font-semibold text-yellow-500">${pendingAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{processing.length}</p>
                <p className="text-xs text-muted-foreground">Processing</p>
                <p className="text-sm font-semibold text-blue-500">${processingAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completed.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-sm font-semibold text-green-500">${completedAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-pink-500" />
              <div>
                <p className="text-2xl font-bold">${completedAmount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-sm text-muted-foreground">This page</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="processing" className="gap-2">
            <Wallet className="h-4 w-4" />
            Processing ({processing.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed ({completed.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({allWithdrawals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Withdrawals</CardTitle>
              <CardDescription>Review and process new withdrawal requests</CardDescription>
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending withdrawals - all caught up!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pending.map(renderWithdrawalCard)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing">
          <Card>
            <CardHeader>
              <CardTitle>Processing</CardTitle>
              <CardDescription>Withdrawals being processed</CardDescription>
            </CardHeader>
            <CardContent>
              {processing.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No withdrawals in progress</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {processing.map(renderWithdrawalCard)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed</CardTitle>
              <CardDescription>Successfully paid out withdrawals</CardDescription>
            </CardHeader>
            <CardContent>
              {completed.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed withdrawals yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {completed.map(renderWithdrawalCard)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Withdrawals</CardTitle>
              <CardDescription>Complete withdrawal history</CardDescription>
            </CardHeader>
            <CardContent>
              {allWithdrawals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No withdrawal requests yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allWithdrawals.map(renderWithdrawalCard)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
}
