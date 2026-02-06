"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Package,
  X,
  RefreshCw,
  Loader2,
  Bell,
} from "lucide-react";

interface LowStockItem {
  id: string;
  sku: string;
  product_name: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
}

interface LowStockAlertProps {
  onClose: () => void;
}

export function LowStockAlert({ onClose }: LowStockAlertProps) {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLowStock = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/pos/inventory/low-stock");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching low stock:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStock();
  }, []);

  const outOfStock = items.filter((i) => i.stock_quantity === 0);
  const lowStock = items.filter((i) => i.stock_quantity > 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold">Inventory Alerts</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchLowStock}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>All inventory levels are healthy!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Out of Stock */}
              {outOfStock.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-red-500 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Out of Stock ({outOfStock.length})
                  </h3>
                  <div className="space-y-2">
                    {outOfStock.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            SKU: {item.sku}
                            {item.size && ` • ${item.size}`}
                            {item.color && ` • ${item.color}`}
                          </p>
                        </div>
                        <Badge variant="destructive">0</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Low Stock */}
              {lowStock.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-amber-500 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Low Stock ({lowStock.length})
                  </h3>
                  <div className="space-y-2">
                    {lowStock.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            SKU: {item.sku}
                            {item.size && ` • ${item.size}`}
                            {item.color && ` • ${item.color}`}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-amber-500 border-amber-500"
                        >
                          {item.stock_quantity} left
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Items below threshold of 5 units are shown
          </p>
        </div>
      </Card>
    </div>
  );
}

// Small notification badge for the POS header
export function LowStockBadge({ onClick }: { onClick: () => void }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/pos/inventory/low-stock?count_only=true");
        if (res.ok) {
          const data = await res.json();
          setCount(data.count || 0);
        }
      } catch (error) {
        console.error("Error fetching low stock count:", error);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="relative"
    >
      <Bell className="h-4 w-4" />
      <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
        {count > 9 ? "9+" : count}
      </span>
    </Button>
  );
}
