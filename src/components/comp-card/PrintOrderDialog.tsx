"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { PRINT_PRICE_PER_CARD, PRINT_MIN_QUANTITY } from "@/lib/stripe-config";

interface PrintOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  onGeneratePdf: () => Promise<string>;
}

export default function PrintOrderDialog({
  open,
  onOpenChange,
  email: initialEmail,
  firstName,
  lastName,
  phone: initialPhone,
  onGeneratePdf,
}: PrintOrderDialogProps) {
  const [quantity, setQuantity] = useState(PRINT_MIN_QUANTITY);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"select" | "details">("select");

  const totalCents = quantity * PRINT_PRICE_PER_CARD;
  const totalDisplay = `$${(totalCents / 100).toFixed(2)}`;

  const adjust = (delta: number) => {
    setQuantity((q) => Math.max(PRINT_MIN_QUANTITY, q + delta));
  };

  async function handleSubmit() {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    setSubmitting(true);
    try {
      toast.info("Generating your comp card PDF...");
      const pdfBase64 = await onGeneratePdf();

      const res = await fetch("/api/comp-card-creator/print-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity,
          email: email.trim(),
          firstName,
          lastName: lastName || undefined,
          phone: phone?.trim() || undefined,
          pdfBase64,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Something went wrong");
        return;
      }

      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl;
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-pink-500" />
            Print & Pick Up
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1">
              <p>Professional comp cards on premium cardstock. Be prepared for Miami Swim Week — order in advance and pick up at EXA Models HQ in Miami any day from <strong>May 24–28</strong>.</p>
              <p>Questions? Email <a href="mailto:team@examodels.com" className="underline">team@examodels.com</a></p>
            </div>
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-6">
            {/* Quantity selector */}
            <div className="space-y-2">
              <Label>How many cards?</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => adjust(-10)}
                  disabled={quantity <= PRINT_MIN_QUANTITY}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={PRINT_MIN_QUANTITY}
                  step={1}
                  value={quantity}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    if (!isNaN(v)) setQuantity(Math.max(PRINT_MIN_QUANTITY, v));
                  }}
                  className="text-center text-lg font-bold w-24"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => adjust(10)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Minimum {PRINT_MIN_QUANTITY} cards</p>
            </div>

            {/* Price summary */}
            <div className="rounded-lg bg-muted/50 p-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {quantity} cards × $3.00 each
              </div>
              <div className="text-xl font-bold">{totalDisplay}</div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
              onClick={() => setStep("details")}
            >
              Continue — {totalDisplay}
            </Button>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{quantity} cards</span>
              <span className="font-bold">{totalDisplay}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="print-email">Email *</Label>
              <Input
                id="print-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={submitting}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="print-phone">Phone (for pickup notification)</Label>
              <Input
                id="print-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                disabled={submitting}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Pickup at: <strong>EXA Models HQ, Miami</strong>
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("select")}
                disabled={submitting}
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                onClick={handleSubmit}
                disabled={submitting || !email}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Printer className="mr-2 h-4 w-4" />
                    Pay {totalDisplay} & Order
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Secure payment via Stripe
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
