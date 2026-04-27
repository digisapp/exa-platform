"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Coins,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  Loader2,
  Lock,
  Plus,
  Banknote,
  Clock,
  Crown,
  BarChart3,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COIN_PACKAGES } from "@/lib/stripe-config";
import { MIN_WITHDRAWAL_COINS, coinsToUsd, formatUsd } from "@/lib/coin-config";
import { toast } from "sonner";
import Link from "next/link";

import EarningsTab from "@/components/wallet/EarningsTab";
import PayoutsTab from "@/components/wallet/PayoutsTab";
import BrandWalletSection from "@/components/wallet/BrandWalletSection";
import AffiliateTab from "@/components/wallet/AffiliateTab";

export interface Transaction {
  id: string;
  amount: number;
  action: string;
  created_at: string;
}

export interface BankAccount {
  id: string;
  account_holder_name: string;
  bank_name: string;
  account_number_last4: string;
  routing_number: string;
  account_type: string;
  is_primary: boolean;
}

export interface WithdrawalRequest {
  id: string;
  coins: number;
  usd_amount: string;
  status: string;
  requested_at: string;
  failure_reason: string | null;
  payout_method: string | null;
  bank_account_id: string | null;
}

export interface PayoneerAccount {
  id: string;
  payee_id: string;
  status: string;
  can_receive_payments: boolean;
  registration_link: string | null;
  country: string;
}

export interface BrandPayment {
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

export interface BrandSubscription {
  tier: string;
  status: string;
  billing_cycle: string;
  coins_granted_at: string | null;
}

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
  const [actorId, setActorId] = useState<string | null>(null);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Brand state
  const [brandPayments, setBrandPayments] = useState<BrandPayment[]>([]);
  const [brandSubscription, setBrandSubscription] = useState<BrandSubscription | null>(null);

  // Payout state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [hasMoreWithdrawals, setHasMoreWithdrawals] = useState(false);
  const [loadingMoreWithdrawals, setLoadingMoreWithdrawals] = useState(false);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [requestingWithdraw, setRequestingWithdraw] = useState(false);

  // Zelle state
  const [zelleInfo, setZelleInfo] = useState("");
  const [zelleInput, setZelleInput] = useState("");
  const [savingZelle, setSavingZelle] = useState(false);
  const [showZelleDialog, setShowZelleDialog] = useState(false);

  // Payoneer state
  const [payoneerAccount, setPayoneerAccount] = useState<PayoneerAccount | null>(null);
  const [, setModelCountryCode] = useState<string | null>(null);
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
      setActorId(actor.id);

      // Get coin balance based on actor type
      if (actor.type === "model" || actor.type === "admin") {
        // Models are linked via user_id, not actor.id
        const { data: model } = await supabase
          .from("models")
          .select("id, coin_balance, withheld_balance, country_code, zelle_info")
          .eq("user_id", user.id)
          .single() as { data: { id: string; coin_balance: number; withheld_balance: number; country_code: string | null; zelle_info: string | null } | null };
        setCoinBalance(model?.coin_balance || 0);
        setWithheldBalance(model?.withheld_balance || 0);
        setModelCountryCode(model?.country_code || null);
        if (model?.zelle_info) {
          setZelleInfo(model.zelle_info);
          setZelleInput(model.zelle_info);
        }
        if (model) {
          setModelId(model.id);

          // Load bank accounts, Payoneer account, and withdrawal requests in parallel
          const [{ data: banks }, { data: payoneer }, { data: withdrawalData }] = await Promise.all([
            supabase
              .from("bank_accounts")
              .select("*")
              .eq("model_id", model.id) as unknown as Promise<{ data: BankAccount[] | null }>,
            supabase
              .from("payoneer_accounts")
              .select("id, payee_id, status, can_receive_payments, registration_link, country")
              .eq("model_id", model.id)
              .single() as unknown as Promise<{ data: PayoneerAccount | null }>,
            supabase
              .from("withdrawal_requests")
              .select("*")
              .eq("model_id", model.id)
              .order("requested_at", { ascending: false })
              .limit(10) as unknown as Promise<{ data: WithdrawalRequest[] | null }>,
          ]);
          setBankAccounts(banks || []);
          setPayoneerAccount(payoneer);
          setWithdrawals(withdrawalData || []);
          setHasMoreWithdrawals((withdrawalData || []).length >= 10);
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

      // Fetch transactions (20 for display) + RPC aggregates for models (in parallel)
      const txPromise = supabase
        .from("coin_transactions")
        .select("*")
        .eq("actor_id", actor.id)
        .order("created_at", { ascending: false })
        .limit(20) as unknown as Promise<{ data: Transaction[] | null }>;

      const summaryPromise = actor.type === "model"
        ? (supabase.rpc as any)("get_earnings_summary", { p_actor_id: actor.id })
        : Promise.resolve({ data: null });

      const monthlyPromise = actor.type === "model"
        ? (supabase.rpc as any)("get_earnings_by_month", { p_actor_id: actor.id, p_months: 6 })
        : Promise.resolve({ data: null });

      const [{ data: txs }, { data: summaryData }, { data: monthlyData }] = await Promise.all([
        txPromise, summaryPromise, monthlyPromise
      ]);

      setTransactions(txs || []);
      setHasMoreTransactions((txs || []).length >= 20);

      // Derive analytics from RPC results (replaces loading 500 rows)
      if (summaryData && Array.isArray(summaryData)) {
        const total = summaryData.reduce((sum: number, s: any) => sum + Number(s.total_amount), 0);
        setTotalEarnings(total);
        const monthly = summaryData.reduce((sum: number, s: any) => sum + Number(s.this_month_amount), 0);
        setThisMonthEarnings(monthly);

        const byType: Record<string, number> = {};
        summaryData.forEach((s: any) => { byType[s.action] = Number(s.total_amount); });
        setEarningsByType(byType);
      } else {
        // For non-models, compute from the 20 displayed transactions
        const earnings = (txs || []).filter(t => t.amount > 0);
        setTotalEarnings(earnings.reduce((sum, t) => sum + t.amount, 0));
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        setThisMonthEarnings(
          earnings.filter(t => new Date(t.created_at) >= oneMonthAgo).reduce((sum, t) => sum + t.amount, 0)
        );
      }

      if (monthlyData && Array.isArray(monthlyData)) {
        const byMonth: Record<string, number> = {};
        monthlyData.forEach((m: any) => { byMonth[m.month] = Number(m.total_amount); });
        setEarningsByMonth(byMonth);
      }

      setLoading(false);
    }

    loadWallet();
  }, [supabase]);

  const loadMoreTransactions = async () => {
    if (loadingMore || !hasMoreTransactions || transactions.length === 0 || !actorId) return;
    setLoadingMore(true);
    const lastTx = transactions[transactions.length - 1];
    const { data: moreTxs } = await supabase
      .from("coin_transactions")
      .select("*")
      .eq("actor_id", actorId)
      .lt("created_at", lastTx.created_at)
      .order("created_at", { ascending: false })
      .limit(20) as { data: Transaction[] | null };
    if (moreTxs && moreTxs.length > 0) {
      setTransactions(prev => [...prev, ...moreTxs]);
      setHasMoreTransactions(moreTxs.length >= 20);
    } else {
      setHasMoreTransactions(false);
    }
    setLoadingMore(false);
  };

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

  async function loadMoreWithdrawals() {
    if (loadingMoreWithdrawals || !hasMoreWithdrawals || withdrawals.length === 0 || !modelId) return;
    setLoadingMoreWithdrawals(true);
    const lastW = withdrawals[withdrawals.length - 1];
    const { data: moreWithdrawals } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("model_id", modelId)
      .lt("requested_at", lastW.requested_at)
      .order("requested_at", { ascending: false })
      .limit(10) as { data: WithdrawalRequest[] | null };
    if (moreWithdrawals && moreWithdrawals.length > 0) {
      setWithdrawals(prev => [...prev, ...moreWithdrawals]);
      setHasMoreWithdrawals(moreWithdrawals.length >= 10);
    } else {
      setHasMoreWithdrawals(false);
    }
    setLoadingMoreWithdrawals(false);
  }

  async function handleSaveZelle() {
    if (!zelleInput.trim()) {
      toast.error("Please enter your Zelle email or phone number");
      return;
    }
    setSavingZelle(true);
    try {
      const response = await fetch("/api/models/zelle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zelle_info: zelleInput.trim() }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save Zelle info");
      }
      setZelleInfo(zelleInput.trim());
      setShowZelleDialog(false);
      toast.success(zelleInfo ? "Zelle info updated!" : "Zelle info saved!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save Zelle info";
      toast.error(message);
    } finally {
      setSavingZelle(false);
    }
  }

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

      toast.success(bankAccounts.length > 0 ? "Bank account updated!" : "Bank account added!");
      setShowBankDialog(false);
      setBankForm({
        accountHolderName: "",
        bankName: "",
        routingNumber: "",
        accountNumber: "",
        accountType: "checking",
      });

      // Replace existing bank account or add new one
      if (bankAccounts.length > 0) {
        setBankAccounts([newBankAccount]);
      } else {
        setBankAccounts([newBankAccount]);
      }
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
    if (selectedPayoutMethod === 'bank' && !zelleInfo && bankAccounts.length === 0) {
      toast.error("Please add your Zelle info or a bank account first");
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
        // Pass bank account ID if available, null for Zelle-only withdrawals
        const primaryBank = bankAccounts.find(b => b.is_primary) || bankAccounts[0];
        const { error } = await (supabase.rpc as any)("create_withdrawal_request", {
          p_model_id: modelId,
          p_coins: coins,
          p_bank_account_id: primaryBank?.id || null,
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
      setHasMoreWithdrawals((withdrawalData || []).length >= 10);
    } catch (error: unknown) {
      console.error("Error requesting withdrawal:", error);
      const message = error instanceof Error ? error.message : "Failed to request withdrawal";
      toast.error(message);
    } finally {
      setRequestingWithdraw(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isFreeBrand = actorType === "brand" && (!brandSubscription?.status || brandSubscription?.status === "paused" || brandSubscription?.tier === "free");
  const canBuyCoins = !isFreeBrand;

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
                  <Link href="/wallet" className="inline-flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 mt-2 transition-colors">
                    <BarChart3 className="h-3 w-3" />
                    View Earnings Breakdown
                  </Link>
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
                    {COIN_PACKAGES.map((pack) => {
                      return (
                        <div
                          key={pack.coins}
                          className="relative p-4 rounded-lg border transition-all hover:shadow-md"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Coins className="h-5 w-5 text-pink-500" />
                            <span className="text-xl font-bold">{pack.coins.toLocaleString()}</span>
                          </div>
                          <p className="text-xl font-bold mb-3">{pack.priceDisplay}</p>
                          <Button
                            onClick={() => handlePurchase(pack.coins)}
                            disabled={purchasing !== null}
                            className="w-full"
                            variant="outline"
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

      {/* Model Tabs - Earnings, Payouts & Affiliate */}
      {(actorType === "model" || actorType === "admin") && (
        <Tabs defaultValue="earnings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="earnings" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Payouts
            </TabsTrigger>
            <TabsTrigger value="affiliate" className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Affiliate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earnings">
            <EarningsTab
              totalEarnings={totalEarnings}
              thisMonthEarnings={thisMonthEarnings}
              earningsByMonth={earningsByMonth}
              earningsByType={earningsByType}
              transactions={transactions}
              hasMoreTransactions={hasMoreTransactions}
              loadingMore={loadingMore}
              onLoadMore={loadMoreTransactions}
            />
          </TabsContent>

          <TabsContent value="payouts">
            <PayoutsTab
              coinBalance={coinBalance}
              zelleInfo={zelleInfo}
              zelleInput={zelleInput}
              setZelleInput={setZelleInput}
              showZelleDialog={showZelleDialog}
              setShowZelleDialog={setShowZelleDialog}
              savingZelle={savingZelle}
              onSaveZelle={handleSaveZelle}
              bankAccounts={bankAccounts}
              withdrawals={withdrawals}
              payoneerAccount={payoneerAccount}
              showBankDialog={showBankDialog}
              setShowBankDialog={setShowBankDialog}
              showWithdrawDialog={showWithdrawDialog}
              setShowWithdrawDialog={setShowWithdrawDialog}
              showPayoneerDialog={showPayoneerDialog}
              setShowPayoneerDialog={setShowPayoneerDialog}
              savingBank={savingBank}
              requestingWithdraw={requestingWithdraw}
              registeringPayoneer={registeringPayoneer}
              bankForm={bankForm}
              setBankForm={setBankForm}
              withdrawAmount={withdrawAmount}
              setWithdrawAmount={setWithdrawAmount}
              selectedPayoutMethod={selectedPayoutMethod}
              setSelectedPayoutMethod={setSelectedPayoutMethod}
              payoneerCountry={payoneerCountry}
              setPayoneerCountry={setPayoneerCountry}
              onSaveBank={handleSaveBank}
              onRequestWithdraw={handleRequestWithdraw}
              onRegisterPayoneer={handleRegisterPayoneer}
              onRefreshPayoneerStatus={refreshPayoneerStatus}
              hasMoreWithdrawals={hasMoreWithdrawals}
              loadingMoreWithdrawals={loadingMoreWithdrawals}
              onLoadMoreWithdrawals={loadMoreWithdrawals}
            />
          </TabsContent>

          <TabsContent value="affiliate">
            {modelId && <AffiliateTab modelId={modelId} />}
          </TabsContent>
        </Tabs>
      )}

      {/* Brand Subscription & Payment History */}
      {actorType === "brand" && (
        <BrandWalletSection
          brandSubscription={brandSubscription}
          brandPayments={brandPayments}
        />
      )}
    </div>
  );
}
