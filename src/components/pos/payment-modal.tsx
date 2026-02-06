"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  X,
  CreditCard,
  Banknote,
  Loader2,
  Check,
  DollarSign,
} from "lucide-react";
import type { CartItem, CompletedSale } from "@/types/pos";

interface PaymentModalProps {
  cart: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  onComplete: (sale: CompletedSale) => void;
  onClose: () => void;
}

export function PaymentModal({
  cart,
  subtotal,
  tax,
  total,
  onComplete,
  onClose,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | null>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const cashValue = parseFloat(cashAmount) || 0;
  const change = cashValue - total;

  // Quick cash amounts
  const quickAmounts = [20, 50, 100];
  const roundedTotal = Math.ceil(total);

  const handleCashPayment = async () => {
    if (cashValue < total) {
      toast.error("Insufficient amount");
      return;
    }

    setIsProcessing(true);

    try {
      // Create the order in the database
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            variant_id: item.variant.id,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal,
          tax,
          total,
          payment_method: "cash",
          amount_paid: cashValue,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Payment failed");
      }

      const data = await res.json();

      onComplete({
        orderNumber: data.orderNumber,
        items: cart,
        subtotal,
        tax,
        total,
        paymentMethod: "cash",
        amountPaid: cashValue,
        change,
        timestamp: new Date(),
      });

      toast.success("Payment complete!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    setIsProcessing(true);

    try {
      // For now, simulate card payment
      // In production, this would integrate with Stripe Terminal
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            variant_id: item.variant.id,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal,
          tax,
          total,
          payment_method: "card",
          amount_paid: total,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Payment failed");
      }

      const data = await res.json();

      onComplete({
        orderNumber: data.orderNumber,
        items: cart,
        subtotal,
        tax,
        total,
        paymentMethod: "card",
        amountPaid: total,
        change: 0,
        timestamp: new Date(),
      });

      toast.success("Payment complete!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Payment</h2>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isProcessing}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Total Display */}
        <div className="text-center mb-6 p-6 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Total Due</p>
          <p className="text-4xl font-bold text-green-500">${total.toFixed(2)}</p>
        </div>

        {!paymentMethod ? (
          /* Payment Method Selection */
          <div className="grid grid-cols-2 gap-4">
            <Button
              size="lg"
              variant="outline"
              onClick={() => setPaymentMethod("cash")}
              className="h-24 flex-col gap-2"
            >
              <Banknote className="h-8 w-8" />
              <span>Cash</span>
            </Button>
            <Button
              size="lg"
              onClick={() => setPaymentMethod("card")}
              className="h-24 flex-col gap-2 bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="h-8 w-8" />
              <span>Card</span>
            </Button>
          </div>
        ) : paymentMethod === "cash" ? (
          /* Cash Payment */
          <div className="space-y-4">
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                min={total}
                placeholder="Enter amount..."
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="pl-10 h-14 text-2xl text-center"
                autoFocus
              />
            </div>

            {/* Quick Amounts */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                onClick={() => setCashAmount(roundedTotal.toString())}
              >
                ${roundedTotal}
              </Button>
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  onClick={() => setCashAmount(amount.toString())}
                  disabled={amount < total}
                >
                  ${amount}
                </Button>
              ))}
            </div>

            {/* Change Display */}
            {cashValue >= total && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Change Due</p>
                <p className="text-2xl font-bold text-green-500">
                  ${change.toFixed(2)}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPaymentMethod(null)}
                disabled={isProcessing}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleCashPayment}
                disabled={cashValue < total || isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Complete
              </Button>
            </div>
          </div>
        ) : (
          /* Card Payment */
          <div className="space-y-4">
            <div className="p-8 bg-muted rounded-lg text-center">
              {isProcessing ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">Processing payment...</p>
                  <p className="text-sm text-muted-foreground">
                    Please wait for confirmation
                  </p>
                </>
              ) : (
                <>
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">Ready for Card</p>
                  <p className="text-sm text-muted-foreground">
                    Tap, insert, or swipe card
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPaymentMethod(null)}
                disabled={isProcessing}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleCardPayment}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Process Card
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
