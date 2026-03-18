"use client";

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
  Loader2,
  Plus,
  Building,
  Banknote,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Globe,
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
}

export default function PayoutsTab({
  coinBalance,
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
}: PayoutsTabProps) {
  return (
    <div className="space-y-6">
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
                    onClick={onSaveBank}
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
                      <p className="font-medium">{bank.bank_name} &bull;&bull;&bull;&bull; {bank.account_number_last4}</p>
                      <p className="text-xs text-muted-foreground">{bank.account_holder_name} &middot; {bank.account_type}</p>
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
                      onClick={onRegisterPayoneer}
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
              <Button variant="outline" size="sm" onClick={onRefreshPayoneerStatus}>
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
                Minimum ${MIN_WITHDRAWAL_COINS * COIN_USD_RATE} ({MIN_WITHDRAWAL_COINS} coins) &middot; 1 coin = ${COIN_USD_RATE.toFixed(2)}
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
                                <span>Bank Transfer ({bankAccounts[0]?.bank_name} &bull;&bull;&bull;&bull; {bankAccounts[0]?.account_number_last4})</span>
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
                    onClick={onRequestWithdraw}
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
    </div>
  );
}
