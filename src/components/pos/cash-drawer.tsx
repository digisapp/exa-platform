"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DollarSign,
  Loader2,
  Check,
  X,
  Clock,
  Banknote,
  CreditCard,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface DrawerSession {
  id: string;
  opened_at: string;
  opening_cash: number;
  total_cash_sales: number;
  total_card_sales: number;
  total_transactions: number;
  expected_cash: number;
}

interface CashDrawerProps {
  staffId: string;
  staffName: string;
  onSessionStart: (session: DrawerSession) => void;
  onSessionEnd: () => void;
  currentSession: DrawerSession | null;
}

export function CashDrawer({
  staffId,
  staffName,
  onSessionStart,
  onSessionEnd,
  currentSession,
}: CashDrawerProps) {
  const [mode, setMode] = useState<"open" | "close" | "view">(
    currentSession ? "view" : "open"
  );
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");

  // Denomination counting for accuracy
  const [denominations, setDenominations] = useState({
    hundreds: 0,
    fifties: 0,
    twenties: 0,
    tens: 0,
    fives: 0,
    ones: 0,
    quarters: 0,
    dimes: 0,
    nickels: 0,
    pennies: 0,
  });

  const calculateTotal = () => {
    return (
      denominations.hundreds * 100 +
      denominations.fifties * 50 +
      denominations.twenties * 20 +
      denominations.tens * 10 +
      denominations.fives * 5 +
      denominations.ones * 1 +
      denominations.quarters * 0.25 +
      denominations.dimes * 0.1 +
      denominations.nickels * 0.05 +
      denominations.pennies * 0.01
    );
  };

  const handleOpenDrawer = async () => {
    const amount = parseFloat(openingCash) || calculateTotal();
    if (amount <= 0) {
      toast.error("Please enter opening cash amount");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/pos/drawer/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: staffId,
          staff_name: staffName,
          opening_cash: amount,
        }),
      });

      if (!res.ok) throw new Error("Failed to open drawer");

      const { session } = await res.json();
      toast.success("Cash drawer opened");
      onSessionStart(session);
    } catch {
      toast.error("Failed to open drawer");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDrawer = async () => {
    if (!currentSession) return;

    const amount = parseFloat(closingCash) || calculateTotal();
    if (amount < 0) {
      toast.error("Please count closing cash");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/pos/drawer/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: currentSession.id,
          closing_cash: amount,
          notes,
        }),
      });

      if (!res.ok) throw new Error("Failed to close drawer");

      await res.json();

      const difference = amount - currentSession.expected_cash;
      if (Math.abs(difference) > 0.01) {
        if (difference > 0) {
          toast.warning(`Drawer is OVER by $${difference.toFixed(2)}`);
        } else {
          toast.error(`Drawer is SHORT by $${Math.abs(difference).toFixed(2)}`);
        }
      } else {
        toast.success("Drawer balanced perfectly!");
      }

      onSessionEnd();
    } catch {
      toast.error("Failed to close drawer");
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "view" && currentSession) {
    const expectedCash =
      currentSession.opening_cash + currentSession.total_cash_sales;

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Banknote className="h-5 w-5 text-green-500" />
            Current Shift
          </h2>
          <Badge variant="outline" className="text-green-500 border-green-500">
            Active
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Started
            </p>
            <p className="font-bold">
              {new Date(currentSession.opened_at).toLocaleTimeString()}
            </p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Opening Cash</p>
            <p className="font-bold text-green-500">
              ${currentSession.opening_cash.toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Banknote className="h-3 w-3" />
              Cash Sales
            </p>
            <p className="font-bold">${currentSession.total_cash_sales.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              Card Sales
            </p>
            <p className="font-bold">${currentSession.total_card_sales.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg col-span-2">
            <p className="text-sm text-muted-foreground">Expected in Drawer</p>
            <p className="text-2xl font-bold text-green-500">
              ${expectedCash.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setMode("close")}
          >
            Close Drawer
          </Button>
        </div>
      </Card>
    );
  }

  if (mode === "close" && currentSession) {
    const expectedCash =
      currentSession.opening_cash + currentSession.total_cash_sales;
    const countedCash = parseFloat(closingCash) || calculateTotal();
    const difference = countedCash - expectedCash;

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Close Cash Drawer</h2>
          <Button variant="ghost" size="sm" onClick={() => setMode("view")}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 bg-muted rounded-lg mb-4">
          <p className="text-sm text-muted-foreground">Expected Cash</p>
          <p className="text-2xl font-bold">${expectedCash.toFixed(2)}</p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <Label>Count Cash (quick entry)</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                placeholder="Enter total cash..."
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Denomination Counter (collapsible) */}
          <details className="border rounded-lg p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Count by Denomination
            </summary>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { key: "hundreds", label: "$100", multiplier: 100 },
                { key: "fifties", label: "$50", multiplier: 50 },
                { key: "twenties", label: "$20", multiplier: 20 },
                { key: "tens", label: "$10", multiplier: 10 },
                { key: "fives", label: "$5", multiplier: 5 },
                { key: "ones", label: "$1", multiplier: 1 },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Label className="w-12">{label}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={denominations[key as keyof typeof denominations] || ""}
                    onChange={(e) =>
                      setDenominations((prev) => ({
                        ...prev,
                        [key]: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
            <p className="mt-4 text-right font-bold">
              Counted: ${calculateTotal().toFixed(2)}
            </p>
          </details>

          {countedCash > 0 && (
            <div
              className={`p-4 rounded-lg ${
                Math.abs(difference) < 0.01
                  ? "bg-green-500/10 border border-green-500/20"
                  : difference > 0
                  ? "bg-amber-500/10 border border-amber-500/20"
                  : "bg-red-500/10 border border-red-500/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">Difference</span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    Math.abs(difference) < 0.01
                      ? "text-green-500"
                      : difference > 0
                      ? "text-amber-500"
                      : "text-red-500"
                  }`}
                >
                  {Math.abs(difference) < 0.01 ? (
                    <>
                      <Check className="h-4 w-4" /> Balanced
                    </>
                  ) : difference > 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4" /> +${difference.toFixed(2)} Over
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4" /> -$
                      {Math.abs(difference).toFixed(2)} Short
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          <div>
            <Label>Notes (optional)</Label>
            <Input
              placeholder="Any discrepancies or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleCloseDrawer}
          disabled={isLoading || countedCash <= 0}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Close & Reconcile
        </Button>
      </Card>
    );
  }

  // Open drawer mode
  return (
    <Card className="p-6">
      <div className="text-center mb-6">
        <Banknote className="h-12 w-12 mx-auto mb-4 text-green-500" />
        <h2 className="text-xl font-bold">Open Cash Drawer</h2>
        <p className="text-muted-foreground">Enter starting cash amount</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Opening Cash</Label>
          <div className="relative mt-1">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              step="0.01"
              placeholder="100.00"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="pl-8 text-lg"
              autoFocus
            />
          </div>
        </div>

        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={handleOpenDrawer}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Start Shift
        </Button>
      </div>
    </Card>
  );
}
