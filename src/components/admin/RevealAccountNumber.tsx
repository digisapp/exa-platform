"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface RevealAccountNumberProps {
  bankAccountId: string;
  last4: string;
}

export function RevealAccountNumber({ bankAccountId, last4 }: RevealAccountNumberProps) {
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [accountNumber, setAccountNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReveal = async () => {
    if (revealed) {
      setRevealed(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/bank-accounts/${bankAccountId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch account number");
      }

      const data = await response.json();
      setAccountNumber(data.account_number);
      setRevealed(true);
    } catch (error) {
      console.error("Error revealing account:", error);
      const message = error instanceof Error ? error.message : "Failed to reveal account number";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!accountNumber) return;

    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      toast.success("Account number copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (revealed && accountNumber) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm bg-green-500/10 text-green-500 px-2 py-1 rounded">
          {accountNumber}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setRevealed(false)}
        >
          <EyeOff className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleReveal}
      disabled={loading}
      className="text-xs"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
      ) : (
        <Eye className="h-3 w-3 mr-1" />
      )}
      •••• {last4}
    </Button>
  );
}
