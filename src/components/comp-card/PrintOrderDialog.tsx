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
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Printer, Check } from "lucide-react";
import { toast } from "sonner";
import { PRINT_PACKAGES } from "@/lib/stripe-config";

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
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"select" | "details">("select");

  async function handleSubmit() {
    if (!selectedPackage) {
      toast.error("Please select a package");
      return;
    }
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    setSubmitting(true);
    try {
      toast.info("Generating your comp card PDF...");
      const pdfBase64 = await onGeneratePdf();

      const res = await fetch("/api/free-comp-card/print-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPackage,
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-pink-500" />
            Print & Pick Up
          </DialogTitle>
          <DialogDescription>
            Get professional comp cards printed on premium cardstock and pick
            them up at EXA Studio.
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <div className="grid gap-3">
              {PRINT_PACKAGES.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`cursor-pointer transition-all ${
                    selectedPackage === pkg.id
                      ? "border-pink-500 ring-2 ring-pink-500/30"
                      : "hover:border-muted-foreground/30"
                  }`}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{pkg.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {pkg.quantity} printed comp cards on premium cardstock
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">
                        {pkg.priceDisplay}
                      </span>
                      {selectedPackage === pkg.id && (
                        <Check className="h-5 w-5 text-pink-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
              disabled={!selectedPackage}
              onClick={() => setStep("details")}
            >
              Continue
            </Button>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
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
              <Label htmlFor="print-phone">
                Phone (for pickup notification)
              </Label>
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
              Pickup at: <strong>EXA Studio, Miami</strong>
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
                    Pay & Order Print
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
