"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Loader2,
  Plus,
  Building,
  Banknote,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Globe,
  Zap,
  Pencil,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { COIN_USD_RATE, MIN_WITHDRAWAL_COINS, coinsToUsd, formatUsd } from "@/lib/coin-config";
import { PAYONEER_PREFERRED_COUNTRIES, DUAL_PAYOUT_COUNTRIES } from "@/lib/payoneer";
import { cn } from "@/lib/utils";

import type { BankAccount, WithdrawalRequest, PayoneerAccount } from "@/app/(dashboard)/wallet/page";

interface BankForm {
  accountHolderName: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: string;
}

interface PayoutsTabProps {
  coinBalance: number;
  zelleInfo: string;
  zelleInput: string;
  setZelleInput: (value: string) => void;
  showZelleDialog: boolean;
  setShowZelleDialog: (open: boolean) => void;
  savingZelle: boolean;
  onSaveZelle: () => void;
  bankAccounts: BankAccount[];
  withdrawals: WithdrawalRequest[];
  payoneerAccount: PayoneerAccount | null;
  showBankDialog: boolean;
  setShowBankDialog: (open: boolean) => void;
  showWithdrawDialog: boolean;
  setShowWithdrawDialog: (open: boolean) => void;
  showPayoneerDialog: boolean;
  setShowPayoneerDialog: (open: boolean) => void;
  savingBank: boolean;
  requestingWithdraw: boolean;
  registeringPayoneer: boolean;
  bankForm: BankForm;
  setBankForm: (form: BankForm) => void;
  withdrawAmount: string;
  setWithdrawAmount: (amount: string) => void;
  selectedPayoutMethod: "bank" | "payoneer";
  setSelectedPayoutMethod: (method: "bank" | "payoneer") => void;
  payoneerCountry: string;
  setPayoneerCountry: (country: string) => void;
  onSaveBank: () => void;
  onRequestWithdraw: () => void;
  onRegisterPayoneer: () => void;
  onRefreshPayoneerStatus: () => void;
  hasMoreWithdrawals?: boolean;
  loadingMoreWithdrawals?: boolean;
  onLoadMoreWithdrawals?: () => void;
}

const COUNTRY_NAMES: Record<string, string> = {
  AR: 'Argentina', BR: 'Brazil', TH: 'Thailand', GH: 'Ghana', NG: 'Nigeria',
  KE: 'Kenya', ZA: 'South Africa', PH: 'Philippines', VN: 'Vietnam', BD: 'Bangladesh',
  PK: 'Pakistan', EG: 'Egypt', MA: 'Morocco', TN: 'Tunisia', CO: 'Colombia',
  PE: 'Peru', CL: 'Chile', UA: 'Ukraine', MY: 'Malaysia', ID: 'Indonesia',
  MX: 'Mexico', IN: 'India',
};

export default function PayoutsTab({
  coinBalance,
  zelleInfo,
  zelleInput,
  setZelleInput,
  showZelleDialog,
  setShowZelleDialog,
  savingZelle,
  onSaveZelle,
  bankAccounts,
  withdrawals,
  payoneerAccount,
  showBankDialog,
  setShowBankDialog,
  showWithdrawDialog,
  setShowWithdrawDialog,
  showPayoneerDialog,
  setShowPayoneerDialog,
  savingBank,
  requestingWithdraw,
  registeringPayoneer,
  bankForm,
  setBankForm,
  withdrawAmount,
  setWithdrawAmount,
  selectedPayoutMethod,
  setSelectedPayoutMethod,
  payoneerCountry,
  setPayoneerCountry,
  onSaveBank,
  onRequestWithdraw,
  onRegisterPayoneer,
  onRefreshPayoneerStatus,
  hasMoreWithdrawals = false,
  loadingMoreWithdrawals = false,
  onLoadMoreWithdrawals,
}: PayoutsTabProps) {
  // Show all methods by default if no method is set up yet
  const noMethodSetup = !zelleInfo && bankAccounts.length === 0 && !payoneerAccount;
  const [showAllMethods, setShowAllMethods] = useState(noMethodSetup);

  const hasAnyMethod = Boolean(zelleInfo) || bankAccounts.length > 0 || (payoneerAccount?.can_receive_payments === true);
  const canWithdraw = coinBalance >= MIN_WITHDRAWAL_COINS && hasAnyMethod;

  // Determine the active/primary method for display
  const activeMethodLabel = zelleInfo
    ? `Zelle · ${zelleInfo}`
    : bankAccounts.length > 0
      ? `Bank · ${bankAccounts[0].bank_name} ••${bankAccounts[0].account_number_last4}`
      : payoneerAccount?.can_receive_payments
        ? `Payoneer · ${payoneerAccount.country}`
        : null;

  // Quick amount helpers
  const setPercentAmount = (percent: number) => {
    const amount = Math.floor(coinBalance * percent);
    if (amount >= MIN_WITHDRAWAL_COINS) {
      setWithdrawAmount(amount.toString());
    }
  };
  const setMaxAmount = () => setWithdrawAmount(coinBalance.toString());

  return (
    <div className="space-y-4">
      {/* HERO: Available to Withdraw + Big CTA */}
      <Card className="bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-green-500/5 border-green-500/30 overflow-hidden">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-5">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Available to Withdraw</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl md:text-6xl font-bold text-green-500">
                  {formatUsd(coinsToUsd(coinBalance))}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
                <Coins className="h-4 w-4" />
                {coinBalance.toLocaleString()} coins
              </p>
            </div>

            <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
              <DialogTrigger asChild>
                <Button
                  disabled={!canWithdraw}
                  size="lg"
                  className="w-full max-w-sm h-14 text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/20"
                >
                  <Banknote className="h-5 w-5 mr-2" />
                  {canWithdraw ? `Withdraw ${formatUsd(coinsToUsd(coinBalance))}` : "Withdraw"}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Withdraw Coins</DialogTitle>
                  <DialogDescription>
                    Processed within 2-5 business days
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {/* Balance summary */}
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Balance</span>
                      <div className="text-right">
                        <div className="font-bold text-lg">{formatUsd(coinsToUsd(coinBalance))}</div>
                        <div className="text-xs text-muted-foreground">{coinBalance.toLocaleString()} coins</div>
                      </div>
                    </div>
                  </div>

                  {/* Amount input with quick buttons */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="withdrawAmount">Withdraw Amount (coins)</Label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setPercentAmount(0.25)}
                          className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/70 transition-colors"
                        >
                          25%
                        </button>
                        <button
                          type="button"
                          onClick={() => setPercentAmount(0.5)}
                          className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/70 transition-colors"
                        >
                          50%
                        </button>
                        <button
                          type="button"
                          onClick={setMaxAmount}
                          className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-500 hover:bg-green-500/30 transition-colors font-medium"
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                    <Input
                      id="withdrawAmount"
                      type="number"
                      min={MIN_WITHDRAWAL_COINS}
                      max={coinBalance}
                      placeholder={`Minimum ${MIN_WITHDRAWAL_COINS} coins`}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="text-lg h-12"
                    />
                    {withdrawAmount && parseInt(withdrawAmount) >= MIN_WITHDRAWAL_COINS && (
                      <p className="text-sm text-green-500 font-medium">
                        You&apos;ll receive {formatUsd(coinsToUsd(parseInt(withdrawAmount) || 0))} USD
                      </p>
                    )}
                    {withdrawAmount && parseInt(withdrawAmount) < MIN_WITHDRAWAL_COINS && (
                      <p className="text-sm text-yellow-500">
                        Minimum {MIN_WITHDRAWAL_COINS} coins ({formatUsd(coinsToUsd(MIN_WITHDRAWAL_COINS))})
                      </p>
                    )}
                  </div>

                  {/* Payout Method — only show dropdown if more than one available */}
                  {((zelleInfo || bankAccounts.length > 0) && payoneerAccount?.can_receive_payments) ? (
                    <div className="space-y-2">
                      <Label>Send via</Label>
                      <Select
                        value={selectedPayoutMethod}
                        onValueChange={(v) => setSelectedPayoutMethod(v as 'bank' | 'payoneer')}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {zelleInfo && (
                            <SelectItem value="bank">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-purple-500" />
                                <span>Zelle ({zelleInfo})</span>
                              </div>
                            </SelectItem>
                          )}
                          {!zelleInfo && bankAccounts.length > 0 && (
                            <SelectItem value="bank">
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                <span>Bank ({bankAccounts[0]?.bank_name} ••{bankAccounts[0]?.account_number_last4})</span>
                              </div>
                            </SelectItem>
                          )}
                          {payoneerAccount && payoneerAccount.can_receive_payments && (
                            <SelectItem value="payoneer">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-orange-500" />
                                <span>Payoneer ({payoneerAccount.country})</span>
                              </div>
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : activeMethodLabel && (
                    <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                      <span className="text-muted-foreground">Send via </span>
                      <span className="font-medium">{activeMethodLabel}</span>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={onRequestWithdraw}
                    disabled={requestingWithdraw || !withdrawAmount || parseInt(withdrawAmount) < MIN_WITHDRAWAL_COINS || parseInt(withdrawAmount) > coinBalance}
                    className="bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    {requestingWithdraw ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" />Requesting...</>
                    ) : (
                      <>Request {withdrawAmount ? formatUsd(coinsToUsd(parseInt(withdrawAmount) || 0)) : "Payout"}</>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Helpful context below button */}
            {coinBalance < MIN_WITHDRAWAL_COINS ? (
              <p className="text-sm text-muted-foreground">
                Earn {(MIN_WITHDRAWAL_COINS - coinBalance).toLocaleString()} more coins ({formatUsd(coinsToUsd(MIN_WITHDRAWAL_COINS - coinBalance))}) to reach the {formatUsd(coinsToUsd(MIN_WITHDRAWAL_COINS))} minimum
              </p>
            ) : !hasAnyMethod ? (
              <p className="text-sm text-yellow-500">
                ↓ Add a payout method below to enable withdrawal
              </p>
            ) : activeMethodLabel ? (
              <p className="text-sm text-muted-foreground">
                Sending to <span className="font-medium text-foreground">{activeMethodLabel}</span> · Minimum {formatUsd(coinsToUsd(MIN_WITHDRAWAL_COINS))}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Minimum {formatUsd(coinsToUsd(MIN_WITHDRAWAL_COINS))} · Processed in 2-5 business days
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PAYOUT METHODS — consolidated, compact */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Payout Methods
            </h3>
            {!showAllMethods && hasAnyMethod && (
              <button
                onClick={() => setShowAllMethods(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                Show all <ChevronDown className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Zelle — always prominent */}
          <div className={cn(
            "flex items-center justify-between p-4 rounded-xl transition-colors",
            zelleInfo
              ? "bg-purple-500/10 border border-purple-500/30"
              : "bg-muted/50 border border-dashed"
          )}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                zelleInfo ? "bg-purple-500/20" : "bg-muted"
              )}>
                <Zap className={cn("h-5 w-5", zelleInfo ? "text-purple-400" : "text-muted-foreground")} />
              </div>
              <div className="min-w-0">
                <p className="font-medium">Zelle</p>
                {zelleInfo ? (
                  <p className="text-sm text-muted-foreground truncate">{zelleInfo}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Recommended · Instant payouts</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {zelleInfo && <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/50 hidden sm:inline-flex">Active</Badge>}
              <Dialog open={showZelleDialog} onOpenChange={setShowZelleDialog}>
                <DialogTrigger asChild>
                  <Button variant={zelleInfo ? "ghost" : "default"} size="sm" className={!zelleInfo ? "bg-gradient-to-r from-purple-500 to-pink-500" : ""}>
                    {zelleInfo ? <Pencil className="h-3.5 w-3.5" /> : <><Plus className="h-3.5 w-3.5 mr-1" />Add</>}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{zelleInfo ? "Update" : "Add"} Zelle</DialogTitle>
                    <DialogDescription>
                      Email or phone linked to your bank&apos;s Zelle service
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <Input
                      id="zelleInfo"
                      placeholder="you@email.com or (555) 123-4567"
                      value={zelleInput}
                      onChange={(e) => setZelleInput(e.target.value)}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Make sure this matches the email or phone registered with your bank&apos;s Zelle service. Payouts sent to the wrong address cannot be recovered.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowZelleDialog(false)}>Cancel</Button>
                    <Button
                      onClick={onSaveZelle}
                      disabled={savingZelle || !zelleInput.trim()}
                      className="bg-gradient-to-r from-purple-500 to-pink-500"
                    >
                      {savingZelle ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Alternate methods — collapsed by default when Zelle is set up */}
          {showAllMethods && (
            <>
              {/* Bank Account */}
              <div className={cn(
                "flex items-center justify-between p-4 rounded-xl",
                bankAccounts.length > 0
                  ? "bg-muted/50 border"
                  : "bg-muted/30 border border-dashed"
              )}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("p-2 rounded-lg shrink-0", bankAccounts.length > 0 ? "bg-blue-500/20" : "bg-muted")}>
                    <Building className={cn("h-5 w-5", bankAccounts.length > 0 ? "text-blue-400" : "text-muted-foreground")} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">Bank Transfer</p>
                    {bankAccounts.length > 0 ? (
                      <p className="text-sm text-muted-foreground truncate">
                        {bankAccounts[0].bank_name} ••{bankAccounts[0].account_number_last4}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">ACH to US bank account</p>
                    )}
                  </div>
                </div>
                <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {bankAccounts.length > 0 ? <Pencil className="h-3.5 w-3.5" /> : <><Plus className="h-3.5 w-3.5 mr-1" />Add</>}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{bankAccounts.length > 0 ? "Update" : "Add"} Bank Account</DialogTitle>
                      <DialogDescription>Enter your US bank details</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="accountHolderName">Account Holder Name</Label>
                        <Input
                          id="accountHolderName"
                          placeholder="John Doe"
                          value={bankForm.accountHolderName}
                          onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          placeholder="Chase, Bank of America, etc."
                          value={bankForm.bankName}
                          onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="routingNumber">Routing #</Label>
                          <Input
                            id="routingNumber"
                            placeholder="9 digits"
                            maxLength={9}
                            value={bankForm.routingNumber}
                            onChange={(e) => setBankForm({ ...bankForm, routingNumber: e.target.value.replace(/\D/g, "") })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="accountNumber">Account #</Label>
                          <Input
                            id="accountNumber"
                            placeholder="Account number"
                            value={bankForm.accountNumber}
                            onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\D/g, "") })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
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
                      <Button variant="outline" onClick={() => setShowBankDialog(false)}>Cancel</Button>
                      <Button
                        onClick={onSaveBank}
                        disabled={savingBank}
                        className="bg-gradient-to-r from-pink-500 to-violet-500"
                      >
                        {savingBank ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Payoneer - International */}
              <div className={cn(
                "flex items-center justify-between p-4 rounded-xl",
                payoneerAccount?.can_receive_payments
                  ? "bg-muted/50 border"
                  : "bg-muted/30 border border-dashed"
              )}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("p-2 rounded-lg shrink-0", payoneerAccount?.can_receive_payments ? "bg-orange-500/20" : "bg-muted")}>
                    <Globe className={cn("h-5 w-5", payoneerAccount?.can_receive_payments ? "text-orange-400" : "text-muted-foreground")} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">Payoneer</p>
                    {payoneerAccount?.can_receive_payments ? (
                      <p className="text-sm text-muted-foreground truncate">
                        {COUNTRY_NAMES[payoneerAccount.country] || payoneerAccount.country}
                      </p>
                    ) : payoneerAccount?.status === 'pending' ? (
                      <p className="text-sm text-yellow-500">Registration pending</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">For international models</p>
                    )}
                  </div>
                </div>
                {!payoneerAccount ? (
                  <Dialog open={showPayoneerDialog} onOpenChange={setShowPayoneerDialog}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Set Up Payoneer</DialogTitle>
                        <DialogDescription>Connect Payoneer to receive international payouts</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="payoneerCountry">Your Country</Label>
                          <Select value={payoneerCountry} onValueChange={setPayoneerCountry}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your country" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...PAYONEER_PREFERRED_COUNTRIES, ...DUAL_PAYOUT_COUNTRIES].sort().map((code) => (
                                <SelectItem key={code} value={code}>
                                  {COUNTRY_NAMES[code] || code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          You&apos;ll be redirected to Payoneer to complete your account setup
                        </p>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPayoneerDialog(false)}>Cancel</Button>
                        <Button
                          onClick={onRegisterPayoneer}
                          disabled={registeringPayoneer || !payoneerCountry}
                          className="bg-gradient-to-r from-orange-500 to-red-500"
                        >
                          {registeringPayoneer ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : payoneerAccount.status === 'pending' ? (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={onRefreshPayoneerStatus}>
                      <Loader2 className="h-3.5 w-3.5" />
                    </Button>
                    {payoneerAccount.registration_link && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(payoneerAccount.registration_link!, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                ) : (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/50">Active</Badge>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* PAYOUT HISTORY */}
      {withdrawals.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4" />
              Payout History
            </h3>
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-1.5 rounded",
                      w.status === "completed" && "bg-green-500/10",
                      w.status === "pending" && "bg-yellow-500/10",
                      w.status === "processing" && "bg-blue-500/10",
                      (w.status === "failed" || w.status === "cancelled") && "bg-red-500/10",
                    )}>
                      {w.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {w.status === "pending" && <Clock className="h-4 w-4 text-yellow-500" />}
                      {w.status === "processing" && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />}
                      {w.status === "failed" && <XCircle className="h-4 w-4 text-red-500" />}
                      {w.status === "cancelled" && <XCircle className="h-4 w-4 text-gray-500" />}
                    </div>
                    <div>
                      <p className="font-medium">${parseFloat(w.usd_amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(w.requested_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {w.payout_method && (
                          <span> · {w.payout_method === "payoneer" ? "Payoneer" : (zelleInfo && !w.bank_account_id ? "Zelle" : "Bank")}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
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
                      <p className="text-xs text-red-400 mt-1 max-w-[200px] truncate" title={w.failure_reason}>
                        {w.failure_reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {hasMoreWithdrawals && onLoadMoreWithdrawals && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={onLoadMoreWithdrawals}
                  disabled={loadingMoreWithdrawals}
                >
                  {loadingMoreWithdrawals ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Show more
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info footer */}
      <p className="text-xs text-muted-foreground text-center">
        1 coin = {formatUsd(COIN_USD_RATE)} · Minimum payout {formatUsd(MIN_WITHDRAWAL_COINS * COIN_USD_RATE)} · Processed 2-5 business days
      </p>
    </div>
  );
}

