"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import Image from "next/image";

interface StaffMember {
  id: string;
  name: string;
  pin: string;
  role: "cashier" | "manager" | "admin";
}

interface StaffLoginProps {
  onLogin: (staff: StaffMember) => void;
}

export function StaffLogin({ onLogin }: StaffLoginProps) {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);

      // Auto-submit when 4 digits entered
      if (newPin.length === 4) {
        handleLogin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin("");
    setError(null);
  };

  const handleLogin = async (enteredPin: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/pos/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: enteredPin }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Invalid PIN");
      }

      const { staff } = await res.json();
      toast.success(`Welcome, ${staff.name}!`);
      onLogin(staff);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed");
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= "0" && e.key <= "9") {
      handlePinInput(e.key);
    } else if (e.key === "Backspace") {
      handleBackspace();
    } else if (e.key === "Escape") {
      handleClear();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background p-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={(el) => el?.focus()}
    >
      <Card className="w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <Image
            src="/exa-logo-white.png"
            alt="EXA"
            width={100}
            height={40}
            className="h-10 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold">POS Login</h1>
          <p className="text-muted-foreground">Enter your 4-digit PIN</p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                pin.length > i
                  ? "border-green-500 bg-green-500/10"
                  : "border-muted"
              }`}
            >
              {pin.length > i ? "•" : ""}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-destructive text-center mb-4 text-sm">{error}</p>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              variant="outline"
              size="lg"
              className="h-14 text-xl font-bold"
              onClick={() => handlePinInput(num.toString())}
              disabled={isLoading || pin.length >= 4}
            >
              {num}
            </Button>
          ))}
          <Button
            variant="outline"
            size="lg"
            className="h-14 text-sm"
            onClick={handleClear}
            disabled={isLoading}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-14 text-xl font-bold"
            onClick={() => handlePinInput("0")}
            disabled={isLoading || pin.length >= 4}
          >
            0
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-14 text-sm"
            onClick={handleBackspace}
            disabled={isLoading || pin.length === 0}
          >
            ⌫
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center mt-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-6">
          <Lock className="h-3 w-3 inline mr-1" />
          Secure staff authentication
        </p>
      </Card>
    </div>
  );
}
