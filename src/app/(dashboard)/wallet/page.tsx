"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Coins,
  Wallet,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Heart,
  Lock,
  MessageCircle,
  Plus,
  Building,
  Banknote,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Receipt,
  ExternalLink,
  Download,
  Crown,
  BarChart3,
  Phone,
  Gift,
  Briefcase,
  Eye,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COIN_PACKAGES } from "@/lib/stripe-config";
import { COIN_USD_RATE, MIN_WITHDRAWAL_COINS, coinsToUsd, formatUsd } from "@/lib/coin-config";
import { PAYONEER_PREFERRED_COUNTRIES, DUAL_PAYOUT_COUNTRIES, shouldUsePayoneer, supportsBothPayoutMethods } from "@/lib/payoneer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { Globe } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  action: string;
  created_at: string;
}

interface BankAccount {
  id: string;
  account_holder_name: string;
  bank_name: string;
  account_number_last4: string;
  routing_number: string;
  account_type: string;
  is_primary: boolean;
}

interface WithdrawalRequest {
  id: string;
  coins: number;
  usd_amount: string;
  status: string;
  requested_at: string;
  failure_reason: string | null;
  payout_method: string | null;
}

interface PayoneerAccount {
  id: string;
  payee_id: string;
  status: string;
  can_receive_payments: boolean;
  registration_link: string | null;
  country: string;
}

interface BrandPayment {
  id: string;
  amount: number;
  status: string;
  created: number;
  period_start: number;
  period_end: number;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  description: string;
}

interface BrandSubscription {
  tier: string;
  status: string;
  billing_cycle: string;
  coins_granted_at: string | null;
}

const EARNING_TYPE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  tip_received: { label: "Tips", icon: Gift, color: "text-pink-500" },
  video_call: { label: "Video Calls", icon: Phone, color: "text-blue-500" },
  voice_call: { label: "Voice Calls", icon: Phone, color: "text-green-500" },
  message_received: { label: "Messages", icon: MessageCircle, color: "text-purple-500" },
  content_sale: { label: "Content Sales", icon: Eye, color: "text-orange-500" },
  booking_payment: { label: "Bookings", icon: Briefcase, color: "text-cyan-500" },
};

export default function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [withheldBalance, setWithheldBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [thisMonthEarnings, setThisMonthEarnings] = useState(0);
  const [earningsByMonth, setEarningsByMonth] = useState<Record<string, number>>({});
  const [earningsByType, setEarningsByType] = useState<Record<string, number>>({});
  const [modelId, setModelId] = useState<string | null>(null);
  const [actorType, setActorType] = useState<string | null>(null);

  // Brand state
  const [brandPayments, setBrandPayments] = useState<BrandPayment[]>([]);
  const [brandSubscription, setBrandSubscription] = useState<BrandSubscription | null>(null);

  // Payout state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [requestingWithdraw, setRequestingWithdraw] = useState(false);

  // Payoneer state
  const [payoneerAccount, setPayoneerAccount] = useState<PayoneerAccount | null>(null);
  const [modelCountryCode, setModelCountryCode] = useState<string | null>(null);
  const [showPayoneerDialog, setShowPayoneerDialog] = useState(false);
  const [registeringPayoneer, setRegisteringPayoneer] = useState(false);
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<'bank' | 'payoneer'>('bank');
  const [payoneerCountry, setPayoneerCountry] = useState('');

  // Bank form
  const [bankForm, setBankForm] = useState({
    accountHolderName: "",
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    accountType: "checking",
  });

  // Withdraw form
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function loadWallet() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get actor
      const { data: actor } = await supabase
        .from("actors")
        .select("id, type")
        .eq("user_id", user.id)
        .single() as { data: { id: string; type: string } | null };

      if (!actor) return;

      setActorType(actor.type);

      // Get coin balance based on actor type
      if (actor.type === "model" || actor.type === "admin") {
        // Models are linked via user_id, not actor.id
        const { data: model } = await supabase
          .from("models")
          .select("id, coin_balance, withheld_balance, country_code")
          .eq("user_id", user.id)
          .single() as { data: { id: string; coin_balance: number; withheld_balance: number; country_code: string | null } | null };
        setCoinBalance(model?.coin_balance || 0);
        setWithheldBalance(model?.withheld_balance || 0);
        setModelCountryCode(model?.country_code || null);
        if (model) {
          setModelId(model.id);

          // Load bank accounts
          const { data: banks } = await supabase
            .from("bank_accounts")
            .select("*")
            .eq("model_id", model.id) as { data: BankAccount[] | null };
          setBankAccounts(banks || []);

          // Load Payoneer account
          const { data: payoneer } = await supabase
            .from("payoneer_accounts")
            .select("id, payee_id, status, can_receive_payments, registration_link, country")
            .eq("model_id", model.id)
            .single() as { data: PayoneerAccount | null };
          setPayoneerAccount(payoneer);

          // Load withdrawal requests
          const { data: withdrawalData } = await supabase
            .from("withdrawal_requests")
            .select("*")
            .eq("model_id", model.id)
            .order("requested_at", { ascending: false })
            .limit(10) as { data: WithdrawalRequest[] | null };
          setWithdrawals(withdrawalData || []);
        }
      } else if (actor.type === "fan") {
        // Fans use actor.id as their id
        const { data: fan } = await supabase
          .from("fans")
          .select("coin_balance")
          .eq("id", actor.id)
          .single() as { data: { coin_balance: number } | null };
        setCoinBalance(fan?.coin_balance || 0);
      } else if (actor.type === "brand") {
        // Brands use actor.id as their id
        const { data: brand } = await (supabase
          .from("brands") as any)
          .select("coin_balance")
          .eq("id", actor.id)
          .single() as { data: { coin_balance: number } | null };
        setCoinBalance(brand?.coin_balance || 0);

        // Fetch brand payment history
        try {
          const response = await fetch("/api/brands/payments");
          if (response.ok) {
            const data = await response.json();
            setBrandPayments(data.payments || []);
            setBrandSubscription(data.subscription);
          }
        } catch (error) {
          console.error("Error fetching brand payments:", error);
        }
      }

      // Get transactions - fetch more for models to show analytics
      const txLimit = actor.type === "model" ? 500 : 20;
      const { data: txs } = await supabase
        .from("coin_transactions")
        .select("*")
        .eq("actor_id", actor.id)
        .order("created_at", { ascending: false })
        .limit(txLimit) as { data: Transaction[] | null };

      // For display, only show recent 20
      setTransactions((txs || []).slice(0, 20));

      // Calculate earnings (positive amounts)
      const earnings = (txs || []).filter(t => t.amount > 0);
      const total = earnings.reduce((sum, t) => sum + t.amount, 0);
      setTotalEarnings(total);

      // This month
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const thisMonth = earnings
        .filter(t => new Date(t.created_at) >= oneMonthAgo)
        .reduce((sum, t) => sum + t.amount, 0);
      setThisMonthEarnings(thisMonth);

      // For models: calculate earnings by month and type for analytics
      if (actor.type === "model") {
        // Group earnings by month
        const byMonth: Record<string, number> = {};
        earnings.forEach((t) => {
          const month = new Date(t.created_at).toISOString().slice(0, 7); // YYYY-MM
          byMonth[month] = (byMonth[month] || 0) + t.amount;
        });
        setEarningsByMonth(byMonth);

        // Group earnings by type
        const byType: Record<string, number> = {};
        earnings.forEach((t) => {
          const type = t.action || "other";
          byType[type] = (byType[type] || 0) + t.amount;
        });
        setEarningsByType(byType);
      }

      setLoading(false);
    }

    loadWallet();
  }, [supabase]);

  const handlePurchase = async (coins: number) => {
    setPurchasing(coins);
    try {
      const response = await fetch("/api/coins/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coins }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setPurchasing(null);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "tip_received":
      case "tip_sent":
        return <Heart className="h-4 w-4 text-pink-500" />;
      case "content_sale":
      case "content_unlock":
        return <Lock className="h-4 w-4 text-violet-500" />;
      case "message_received":
      case "message_sent":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "purchase":
        return <CreditCard className="h-4 w-4 text-green-500" />;
      default:
        return <Coins className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "tip_received": return "Tip Received";
      case "tip_sent": return "Tip Sent";
      case "content_sale": return "Content Sale";
      case "content_unlock": return "Content Unlock";
      case "message_received": return "Message Payment";
      case "message_sent": return "Message";
      case "purchase": return "Coin Purchase";
      default: return action.replace(/_/g, " ");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-gradient-to-r from-pink-500/20 to-violet-500/20">
          <Wallet className="h-6 w-6 text-pink-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Wallet</h1>
        </div>
      </div>

      {/* Check if brand is on free tier */}
      {(() => {
        const isFreeBrand = actorType === "brand" && (!brandSubscription?.status || brandSubscription?.status === "paused" || brandSubscription?.tier === "free");
        const canBuyCoins = !isFreeBrand;

        return (
          <>
            {/* Balance Card */}
            <Card className="bg-gradient-to-br from-pink-500/10 to-violet-500/10 border-pink-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                    <div className="flex items-center gap-2">
                      <Coins className="h-8 w-8 text-pink-500" />
                      <span className="text-4xl font-bold">{coinBalance.toLocaleString()}</span>
                      <span className="text-muted-foreground">coins</span>
                    </div>
                    {/* Only show USD value to models - fans/brands should not see the payout rate */}
                    {(actorType === "model" || actorType === "admin") && (
                      <>
                        <p className="text-sm text-green-500 mt-1">${(coinBalance * 0.10).toFixed(2)} USD</p>
                        {withheldBalance > 0 && (
                          <p className="text-xs text-yellow-500 mt-2 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {withheldBalance.toLocaleString()} coins pending payout (${(withheldBalance * 0.10).toFixed(2)})
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  {canBuyCoins ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-pink-500 to-violet-500">
                          <Plus className="mr-2 h-4 w-4" />
                          Buy Coins
                        </Button>
                      </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Buy Coins</DialogTitle>
                  <DialogDescription>
                    Choose a package to add coins to your wallet
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {COIN_PACKAGES.map((pack, index) => {
                    const isPopular = index === 2;
                    return (
                      <div
                        key={pack.coins}
                        className={cn(
                          "relative p-4 rounded-lg border transition-all hover:shadow-md",
                          isPopular && "border-pink-500 ring-2 ring-pink-500/20"
                        )}
                      >
                        {isPopular && (
                          <Badge className="absolute -top-2 right-2 bg-gradient-to-r from-pink-500 to-violet-500">
                            Popular
                          </Badge>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <Coins className="h-5 w-5 text-pink-500" />
                          <span className="text-xl font-bold">{pack.coins.toLocaleString()}</span>
                        </div>
                        <p className="text-xl font-bold mb-3">{pack.priceDisplay}</p>
                        <Button
                          onClick={() => handlePurchase(pack.coins)}
                          disabled={purchasing !== null}
                          className={cn("w-full", isPopular && "bg-gradient-to-r from-pink-500 to-violet-500")}
                          variant={isPopular ? "default" : "outline"}
                        >
                          {purchasing === pack.coins ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Buy"
                          )}
                        </Button>
                      </div>
                    );
                  })}
                    </div>
                  </DialogContent>
                </Dialog>
                  ) : (
                    <Link href="/brands/pricing">
                      <Button className="bg-gradient-to-r from-cyan-500 to-blue-500">
                        <Crown className="mr-2 h-4 w-4" />
                        Subscribe to Buy
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upgrade Prompt for Free Brands */}
            {isFreeBrand && (
              <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="p-3 rounded-full bg-cyan-500/10">
                      <Lock className="h-6 w-6 text-cyan-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Subscribe to Purchase Coins</h3>
                      <p className="text-sm text-muted-foreground">
                        Upgrade to a paid plan to buy coins, message models, and send booking requests.
                        Your subscription includes monthly coins!
                      </p>
                    </div>
                    <Link href="/brands/pricing">
                      <Button className="bg-gradient-to-r from-cyan-500 to-blue-500">
                        View Plans
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        );
      })()}

      {/* Model Tabs - Earnings & Payouts */}
      {(actorType === "model" || actorType === "admin") && (
        <Tabs defaultValue="earnings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="earnings" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Payouts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earnings" className="space-y-6">
            {/* Earnings Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{totalEarnings.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Earned</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{thisMonthEarnings.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-pink-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {transactions.filter(t => t.action === "tip_received").reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">From Tips</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-violet-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {transactions.filter(t => t.action === "content_sale").reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Content Sales</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

            {/* Monthly Earnings Chart */}
          {Object.keys(earningsByMonth).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Monthly Earnings
                </CardTitle>
                <CardDescription>Coins earned over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const months = Object.keys(earningsByMonth).sort().slice(-6);
                  const maxEarning = Math.max(...months.map(m => earningsByMonth[m] || 0), 1);

                  return (
                    <div className="flex items-end gap-2 h-40">
                      {months.map((month) => {
                        const earning = earningsByMonth[month] || 0;
                        const height = (earning / maxEarning) * 100;
                        const [year, m] = month.split("-");
                        const monthLabel = new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString("en-US", { month: "short" });

                        return (
                          <div key={month} className="flex-1 flex flex-col items-center gap-2">
                            <div className="w-full bg-muted rounded-t relative" style={{ height: `${Math.max(height, 5)}%` }}>
                              <div
                                className="absolute inset-0 bg-gradient-to-t from-pink-500 to-violet-500 rounded-t"
                                style={{ height: "100%" }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{monthLabel}</span>
                            <span className="text-xs font-medium">{earning.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Earnings Breakdown */}
          {Object.keys(earningsByType).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Earnings Breakdown
                </CardTitle>
                <CardDescription>Where your coins come from</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const earningTypes = Object.entries(earningsByType)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5);
                  const totalFromTypes = earningTypes.reduce((sum, [, amount]) => sum + amount, 0);

                  return (
                    <div className="space-y-4">
                      {earningTypes.map(([type, amount]) => {
                        const typeInfo = EARNING_TYPE_LABELS[type] || { label: type.replace(/_/g, " "), icon: Coins, color: "text-gray-500" };
                        const Icon = typeInfo.icon;
                        const percentage = totalFromTypes > 0 ? Math.round((amount / totalFromTypes) * 100) : 0;

                        return (
                          <div key={type} className="flex items-center gap-4">
                            <div className={`p-2 rounded-full bg-muted ${typeInfo.color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium capitalize">{typeInfo.label}</span>
                                <span className="text-sm text-muted-foreground">{amount.toLocaleString()} coins</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

            {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your coin activity</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-background">
                      {getActionIcon(tx.action)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{getActionLabel(tx.action)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "font-bold flex items-center gap-1",
                    tx.amount >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {tx.amount >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {tx.amount >= 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
          </TabsContent>

          <TabsContent value="payouts" className="space-y-6">
            {/* Payouts Section Header */}
            <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20">
              <Banknote className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Payouts</h2>
              <p className="text-sm text-muted-foreground">Manage your payout methods and request withdrawals</p>
            </div>
          </div>

          {/* Bank Account */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Bank Account
                  </CardTitle>
                  <CardDescription>Your payout destination</CardDescription>
                </div>
                <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      {bankAccounts.length > 0 ? "Update" : "Add Bank"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Bank Account</DialogTitle>
                      <DialogDescription>
                        Enter your bank details to receive payouts
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountHolderName">Account Holder Name</Label>
                        <Input
                          id="accountHolderName"
                          placeholder="John Doe"
                          value={bankForm.accountHolderName}
                          onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          placeholder="Chase, Bank of America, etc."
                          value={bankForm.bankName}
                          onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="routingNumber">Routing Number</Label>
                          <Input
                            id="routingNumber"
                            placeholder="9 digits"
                            maxLength={9}
                            value={bankForm.routingNumber}
                            onChange={(e) => setBankForm({ ...bankForm, routingNumber: e.target.value.replace(/\D/g, "") })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accountNumber">Account Number</Label>
                          <Input
                            id="accountNumber"
                            placeholder="Account number"
                            value={bankForm.accountNumber}
                            onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\D/g, "") })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountType">Account Type</Label>
                        <Select
                          value={bankForm.accountType}
                          onValueChange={(value) => setBankForm({ ...bankForm, accountType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="checking">Checking</SelectItem>
                            <SelectItem value="savings">Savings</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowBankDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveBank}
                        disabled={savingBank}
                        className="bg-gradient-to-r from-pink-500 to-violet-500"
                      >
                        {savingBank ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Bank Account"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {bankAccounts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Building className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No bank account added yet</p>
                  <p className="text-xs mt-1">Add a bank account to request payouts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bankAccounts.map((bank) => (
                    <div key={bank.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{bank.bank_name} •••• {bank.account_number_last4}</p>
                          <p className="text-xs text-muted-foreground">{bank.account_holder_name} · {bank.account_type}</p>
                        </div>
                      </div>
                      {bank.is_primary && <Badge variant="secondary">Primary</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payoneer Account - For International Models */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Payoneer (International)
                  </CardTitle>
                  <CardDescription>For models outside the US</CardDescription>
                </div>
                {!payoneerAccount && (
                  <Dialog open={showPayoneerDialog} onOpenChange={setShowPayoneerDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Set Up Payoneer
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Set Up Payoneer</DialogTitle>
                        <DialogDescription>
                          Connect your Payoneer account to receive international payouts
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="payoneerCountry">Your Country</Label>
                          <Select
                            value={payoneerCountry}
                            onValueChange={setPayoneerCountry}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select your country" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...PAYONEER_PREFERRED_COUNTRIES, ...DUAL_PAYOUT_COUNTRIES].sort().map((code) => (
                                <SelectItem key={code} value={code}>
                                  {code === 'AR' ? 'Argentina' :
                                   code === 'BR' ? 'Brazil' :
                                   code === 'TH' ? 'Thailand' :
                                   code === 'GH' ? 'Ghana' :
                                   code === 'NG' ? 'Nigeria' :
                                   code === 'KE' ? 'Kenya' :
                                   code === 'ZA' ? 'South Africa' :
                                   code === 'PH' ? 'Philippines' :
                                   code === 'VN' ? 'Vietnam' :
                                   code === 'BD' ? 'Bangladesh' :
                                   code === 'PK' ? 'Pakistan' :
                                   code === 'EG' ? 'Egypt' :
                                   code === 'MA' ? 'Morocco' :
                                   code === 'TN' ? 'Tunisia' :
                                   code === 'CO' ? 'Colombia' :
                                   code === 'PE' ? 'Peru' :
                                   code === 'CL' ? 'Chile' :
                                   code === 'UA' ? 'Ukraine' :
                                   code === 'MY' ? 'Malaysia' :
                                   code === 'ID' ? 'Indonesia' :
                                   code === 'MX' ? 'Mexico' :
                                   code === 'IN' ? 'India' :
                                   code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <Globe className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-blue-500">
                            You&apos;ll be redirected to Payoneer to complete your account setup
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPayoneerDialog(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleRegisterPayoneer}
                          disabled={registeringPayoneer || !payoneerCountry}
                          className="bg-gradient-to-r from-orange-500 to-red-500"
                        >
                          {registeringPayoneer ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue to Payoneer"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                {payoneerAccount?.status === 'pending' && (
                  <Button variant="outline" size="sm" onClick={refreshPayoneerStatus}>
                    <Loader2 className="h-4 w-4 mr-1" />
                    Refresh Status
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!payoneerAccount ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Globe className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No Payoneer account connected</p>
                  <p className="text-xs mt-1">Set up Payoneer to receive international payouts</p>
                </div>
              ) : payoneerAccount.status === 'pending' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="font-medium text-yellow-500">Registration Pending</p>
                        <p className="text-xs text-muted-foreground">Complete your Payoneer account setup</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500">Pending</Badge>
                  </div>
                  {payoneerAccount.registration_link && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(payoneerAccount.registration_link!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Complete Setup on Payoneer
                    </Button>
                  )}
                </div>
              ) : payoneerAccount.can_receive_payments ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-green-500">Payoneer Connected</p>
                      <p className="text-xs text-muted-foreground">Country: {payoneerAccount.country}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-500 border-green-500">Active</Badge>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium text-red-500">Account Inactive</p>
                      <p className="text-xs text-muted-foreground">Please contact support</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-red-500 border-red-500">{payoneerAccount.status}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Payout */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    Request Payout
                  </CardTitle>
                  <CardDescription>
                    Minimum ${MIN_WITHDRAWAL_COINS * COIN_USD_RATE} ({MIN_WITHDRAWAL_COINS} coins) · 1 coin = ${COIN_USD_RATE.toFixed(2)}
                  </CardDescription>
                </div>
                <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
                  <DialogTrigger asChild>
                    <Button
                      disabled={coinBalance < MIN_WITHDRAWAL_COINS || (bankAccounts.length === 0 && (!payoneerAccount || !payoneerAccount.can_receive_payments))}
                      className="bg-gradient-to-r from-green-500 to-emerald-500"
                    >
                      <Banknote className="h-4 w-4 mr-1" />
                      Withdraw
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Payout</DialogTitle>
                      <DialogDescription>
                        Enter the amount you want to withdraw
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <div className="flex justify-between mb-2">
                          <span className="text-muted-foreground">Available Balance</span>
                          <span className="font-bold">{coinBalance.toLocaleString()} coins</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">USD Value</span>
                          <span className="font-bold text-green-500">{formatUsd(coinsToUsd(coinBalance))}</span>
                        </div>
                      </div>

                      {/* Payout Method Selection */}
                      {(bankAccounts.length > 0 || (payoneerAccount && payoneerAccount.can_receive_payments)) && (
                        <div className="space-y-2">
                          <Label>Payout Method</Label>
                          <Select
                            value={selectedPayoutMethod}
                            onValueChange={(v) => setSelectedPayoutMethod(v as 'bank' | 'payoneer')}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {bankAccounts.length > 0 && (
                                <SelectItem value="bank">
                                  <div className="flex items-center gap-2">
                                    <Building className="h-4 w-4" />
                                    <span>Bank Transfer ({bankAccounts[0]?.bank_name} •••• {bankAccounts[0]?.account_number_last4})</span>
                                  </div>
                                </SelectItem>
                              )}
                              {payoneerAccount && payoneerAccount.can_receive_payments && (
                                <SelectItem value="payoneer">
                                  <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4" />
                                    <span>Payoneer ({payoneerAccount.country})</span>
                                  </div>
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="withdrawAmount">Amount (coins)</Label>
                        <Input
                          id="withdrawAmount"
                          type="number"
                          min={MIN_WITHDRAWAL_COINS}
                          max={coinBalance}
                          placeholder={`Minimum ${MIN_WITHDRAWAL_COINS} coins`}
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                        />
                        {withdrawAmount && (
                          <p className="text-sm text-green-500">
                            You&apos;ll receive: {formatUsd(coinsToUsd(parseInt(withdrawAmount) || 0))} USD
                          </p>
                        )}
                      </div>
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-500">
                          Payouts are processed within 2-5 business days
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleRequestWithdraw}
                        disabled={requestingWithdraw || !withdrawAmount || parseInt(withdrawAmount) < MIN_WITHDRAWAL_COINS}
                        className="bg-gradient-to-r from-green-500 to-emerald-500"
                      >
                        {requestingWithdraw ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request Payout"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {coinBalance < MIN_WITHDRAWAL_COINS ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Coins className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">You need at least {MIN_WITHDRAWAL_COINS} coins ({formatUsd(coinsToUsd(MIN_WITHDRAWAL_COINS))}) to request a payout</p>
                  <p className="text-xs mt-1">Current balance: {coinBalance} coins ({formatUsd(coinsToUsd(coinBalance))})</p>
                </div>
              ) : bankAccounts.length === 0 && (!payoneerAccount || !payoneerAccount.can_receive_payments) ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Building className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Add a bank account or set up Payoneer to request payouts</p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-2xl font-bold text-green-500 mb-1">
                    {formatUsd(coinsToUsd(coinBalance))}
                  </p>
                  <p className="text-muted-foreground text-sm">Available for withdrawal</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Withdrawal History */}
          {withdrawals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Payout History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {withdrawals.map((w) => (
                    <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        {w.status === "completed" && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {w.status === "pending" && <Clock className="h-5 w-5 text-yellow-500" />}
                        {w.status === "processing" && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                        {w.status === "failed" && <XCircle className="h-5 w-5 text-red-500" />}
                        {w.status === "cancelled" && <XCircle className="h-5 w-5 text-gray-500" />}
                        <div>
                          <p className="font-medium">${parseFloat(w.usd_amount).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(w.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            w.status === "completed" && "bg-green-500/10 text-green-500 border-green-500/50",
                            w.status === "pending" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/50",
                            w.status === "processing" && "bg-blue-500/10 text-blue-500 border-blue-500/50",
                            w.status === "failed" && "bg-red-500/10 text-red-500 border-red-500/50",
                            w.status === "cancelled" && "bg-gray-500/10 text-gray-500 border-gray-500/50"
                          )}
                        >
                          {w.status}
                        </Badge>
                        {w.failure_reason && (
                          <p className="text-xs text-red-400 mt-1">{w.failure_reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </TabsContent>
        </Tabs>
      )}

      {/* Brand Subscription & Payment History */}
      {actorType === "brand" && (
        <>
          {/* Subscription Status */}
          {brandSubscription && (
            <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-cyan-500" />
                      Subscription
                    </CardTitle>
                    <CardDescription>Your current plan</CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      brandSubscription.status === "active" && "bg-green-500/10 text-green-500 border-green-500/50",
                      brandSubscription.status === "past_due" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/50",
                      brandSubscription.status === "canceled" && "bg-red-500/10 text-red-500 border-red-500/50",
                      brandSubscription.status === "paused" && "bg-gray-500/10 text-gray-500 border-gray-500/50"
                    )}
                  >
                    {brandSubscription.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="font-semibold capitalize">{brandSubscription.tier}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Billing</p>
                    <p className="font-semibold capitalize">{brandSubscription.billing_cycle || "Monthly"}</p>
                  </div>
                  {brandSubscription.coins_granted_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Last Coins Added</p>
                      <p className="font-semibold">
                        {new Date(brandSubscription.coins_granted_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <Link href="/brands/pricing">
                    <Button variant="outline" size="sm">
                      Manage Subscription
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription>Your subscription payments</CardDescription>
            </CardHeader>
            <CardContent>
              {brandPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payment history yet</p>
                  <p className="text-sm mt-1">Subscribe to a plan to see your payments here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {brandPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-background">
                          {payment.status === "paid" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : payment.status === "open" ? (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{payment.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payment.created * 1000).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-green-500">
                          ${(payment.amount / 100).toFixed(2)}
                        </span>
                        <div className="flex gap-1">
                          {payment.hosted_invoice_url && (
                            <a
                              href={payment.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded hover:bg-muted transition-colors"
                              title="View Invoice"
                            >
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </a>
                          )}
                          {payment.invoice_pdf && (
                            <a
                              href={payment.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded hover:bg-muted transition-colors"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4 text-muted-foreground" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  // Handler functions
  async function handleSaveBank() {
    if (!modelId) return;

    if (!bankForm.accountHolderName || !bankForm.bankName || !bankForm.routingNumber || !bankForm.accountNumber) {
      toast.error("Please fill in all fields");
      return;
    }

    if (bankForm.routingNumber.length !== 9) {
      toast.error("Routing number must be 9 digits");
      return;
    }

    setSavingBank(true);
    try {
      const response = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountHolderName: bankForm.accountHolderName,
          bankName: bankForm.bankName,
          routingNumber: bankForm.routingNumber,
          accountNumber: bankForm.accountNumber,
          accountType: bankForm.accountType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save bank account");
      }

      const newBankAccount = await response.json();

      toast.success("Bank account added!");
      setShowBankDialog(false);
      setBankForm({
        accountHolderName: "",
        bankName: "",
        routingNumber: "",
        accountNumber: "",
        accountType: "checking",
      });

      // Add new bank account to state
      setBankAccounts([...bankAccounts, newBankAccount]);
    } catch (error) {
      console.error("Error saving bank:", error);
      const message = error instanceof Error ? error.message : "Failed to save bank account";
      toast.error(message);
    } finally {
      setSavingBank(false);
    }
  }

  async function handleRegisterPayoneer() {
    if (!payoneerCountry) {
      toast.error("Please select your country");
      return;
    }

    setRegisteringPayoneer(true);
    try {
      const response = await fetch("/api/payoneer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country_code: payoneerCountry }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register with Payoneer");
      }

      toast.success("Payoneer registration started!");
      setShowPayoneerDialog(false);
      setPayoneerCountry('');

      // Update Payoneer account state
      if (data.registration_link) {
        setPayoneerAccount({
          id: data.id || '',
          payee_id: data.payee_id || '',
          status: 'pending',
          can_receive_payments: false,
          registration_link: data.registration_link,
          country: payoneerCountry,
        });
        // Open registration link in new tab
        window.open(data.registration_link, '_blank');
      }
    } catch (error) {
      console.error("Error registering Payoneer:", error);
      const message = error instanceof Error ? error.message : "Failed to register with Payoneer";
      toast.error(message);
    } finally {
      setRegisteringPayoneer(false);
    }
  }

  async function refreshPayoneerStatus() {
    try {
      const response = await fetch("/api/payoneer/register", {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.payoneer_account) {
          setPayoneerAccount(data.payoneer_account);
        }
      }
    } catch (error) {
      console.error("Error refreshing Payoneer status:", error);
    }
  }

  async function handleRequestWithdraw() {
    if (!modelId || !withdrawAmount) return;

    const coins = parseInt(withdrawAmount);
    if (coins < MIN_WITHDRAWAL_COINS) {
      toast.error(`Minimum withdrawal is ${MIN_WITHDRAWAL_COINS} coins (${formatUsd(coinsToUsd(MIN_WITHDRAWAL_COINS))})`);
      return;
    }

    if (coins > coinBalance) {
      toast.error("Insufficient balance");
      return;
    }

    // Validate payout method
    if (selectedPayoutMethod === 'bank' && bankAccounts.length === 0) {
      toast.error("Please add a bank account first");
      return;
    }

    if (selectedPayoutMethod === 'payoneer' && (!payoneerAccount || !payoneerAccount.can_receive_payments)) {
      toast.error("Please complete Payoneer registration first");
      return;
    }

    setRequestingWithdraw(true);
    try {
      // Use different RPC based on payout method
      if (selectedPayoutMethod === 'payoneer') {
        const { error } = await (supabase.rpc as any)("create_payoneer_withdrawal_request", {
          p_model_id: modelId,
          p_coins: coins,
          p_payoneer_account_id: payoneerAccount?.id,
        });
        if (error) throw error;
      } else {
        const { error } = await (supabase.rpc as any)("create_withdrawal_request", {
          p_model_id: modelId,
          p_coins: coins,
        });
        if (error) throw error;
      }

      toast.success("Withdrawal requested!");
      setShowWithdrawDialog(false);
      setWithdrawAmount("");

      // Reload data
      const { data: model } = await supabase
        .from("models")
        .select("coin_balance, withheld_balance")
        .eq("id", modelId)
        .single() as { data: { coin_balance: number; withheld_balance: number } | null };
      if (model) {
        setCoinBalance(model.coin_balance);
        setWithheldBalance(model.withheld_balance || 0);
      }

      const { data: withdrawalData } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("model_id", modelId)
        .order("requested_at", { ascending: false })
        .limit(10) as { data: WithdrawalRequest[] | null };
      setWithdrawals(withdrawalData || []);
    } catch (error: unknown) {
      console.error("Error requesting withdrawal:", error);
      const message = error instanceof Error ? error.message : "Failed to request withdrawal";
      toast.error(message);
    } finally {
      setRequestingWithdraw(false);
    }
  }
}
