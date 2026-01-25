"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface CoinBalanceContextType {
  balance: number;
  setBalance: (balance: number) => void;
  deductCoins: (amount: number) => void;
  addCoins: (amount: number) => void;
  refreshBalance: () => Promise<void>;
}

const CoinBalanceContext = createContext<CoinBalanceContextType | undefined>(undefined);

interface CoinBalanceProviderProps {
  children: ReactNode;
  initialBalance: number;
}

export function CoinBalanceProvider({ children, initialBalance }: CoinBalanceProviderProps) {
  const [balance, setBalance] = useState(initialBalance);

  const deductCoins = useCallback((amount: number) => {
    setBalance((prev) => Math.max(0, prev - amount));
  }, []);

  const addCoins = useCallback((amount: number) => {
    setBalance((prev) => prev + amount);
  }, []);

  const refreshBalance = useCallback(async () => {
    try {
      const response = await fetch("/api/wallet/balance");
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance ?? 0);
      }
    } catch (error) {
      console.error("Failed to refresh balance:", error);
    }
  }, []);

  return (
    <CoinBalanceContext.Provider
      value={{ balance, setBalance, deductCoins, addCoins, refreshBalance }}
    >
      {children}
    </CoinBalanceContext.Provider>
  );
}

export function useCoinBalance() {
  const context = useContext(CoinBalanceContext);
  if (context === undefined) {
    throw new Error("useCoinBalance must be used within a CoinBalanceProvider");
  }
  return context;
}

// Optional hook that returns undefined if not in provider (for components that may be outside the provider)
export function useCoinBalanceOptional() {
  return useContext(CoinBalanceContext);
}
