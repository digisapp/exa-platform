"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  Scan,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  X,
  Package,
  ShoppingCart,
  Loader2,
  User,
  LogOut,
  Upload,
  Settings,
} from "lucide-react";
import { BarcodeScanner } from "@/components/pos/barcode-scanner";
import { PaymentModal } from "@/components/pos/payment-modal";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import { StaffLogin } from "@/components/pos/staff-login";
import { CashDrawer } from "@/components/pos/cash-drawer";
import { LowStockAlert, LowStockBadge } from "@/components/pos/low-stock-alert";
import { CSVImport } from "@/components/pos/csv-import";
import type { Product, ProductVariant, CartItem, CompletedSale } from "@/types/pos";

interface Staff {
  id: string;
  name: string;
  role: "cashier" | "manager" | "admin";
}

interface DrawerSession {
  id: string;
  opened_at: string;
  opening_cash: number;
  total_cash_sales: number;
  total_card_sales: number;
  total_transactions: number;
  expected_cash: number;
}

export default function POSPage() {
  // Auth & Session
  const [staff, setStaff] = useState<Staff | null>(null);
  const [drawerSession, setDrawerSession] = useState<DrawerSession | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Modals
  const [showScanner, setShowScanner] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = 0.07; // 7% Florida sales tax
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Search products
  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/pos/products/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.products || []);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchProducts]);

  // Handle barcode scan
  const handleBarcodeScan = async (barcode: string) => {
    setShowScanner(false);
    toast.info(`Scanned: ${barcode}`);

    try {
      const res = await fetch(`/api/pos/products/sku/${encodeURIComponent(barcode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.product && data.variant) {
          addToCart(data.product, data.variant);
          toast.success(`Added ${data.product.name}`);
        }
      } else {
        toast.error("Product not found");
      }
    } catch {
      toast.error("Error looking up product");
    }
  };

  // Add to cart
  const addToCart = (product: Product, variant: ProductVariant) => {
    const existingIndex = cart.findIndex(
      (item) => item.variant.id === variant.id
    );

    if (existingIndex >= 0) {
      if (cart[existingIndex].quantity >= variant.stock_quantity) {
        toast.error("Not enough stock");
        return;
      }
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      if (variant.stock_quantity < 1) {
        toast.error("Out of stock");
        return;
      }
      const price = variant.price_override || product.retail_price;
      setCart([
        ...cart,
        {
          id: `${product.id}-${variant.id}`,
          product,
          variant,
          quantity: 1,
          price,
        },
      ]);
    }

    setSearchQuery("");
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  // Update quantity
  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const newQuantity = item.quantity + delta;
            if (newQuantity <= 0) return null;
            if (newQuantity > item.variant.stock_quantity) {
              toast.error("Not enough stock");
              return item;
            }
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Remove from cart
  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Clear cart
  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm("Clear all items from cart?")) {
      setCart([]);
    }
  };

  // Handle payment complete
  const handlePaymentComplete = (sale: CompletedSale) => {
    setCompletedSale(sale);
    setShowPayment(false);
    setShowReceipt(true);
    setCart([]);

    // Update drawer session totals
    if (drawerSession) {
      setDrawerSession({
        ...drawerSession,
        total_transactions: drawerSession.total_transactions + 1,
        total_cash_sales:
          sale.paymentMethod === "cash"
            ? drawerSession.total_cash_sales + sale.total
            : drawerSession.total_cash_sales,
        total_card_sales:
          sale.paymentMethod === "card"
            ? drawerSession.total_card_sales + sale.total
            : drawerSession.total_card_sales,
        expected_cash:
          sale.paymentMethod === "cash"
            ? drawerSession.expected_cash + sale.total
            : drawerSession.expected_cash,
      });
    }
  };

  // Close receipt and reset
  const handleReceiptClose = () => {
    setShowReceipt(false);
    setCompletedSale(null);
    searchInputRef.current?.focus();
  };

  // Handle logout
  const handleLogout = () => {
    if (drawerSession) {
      toast.error("Please close the cash drawer before logging out");
      setShowDrawer(true);
      return;
    }
    setStaff(null);
  };

  // If not logged in, show login screen
  if (!staff) {
    return <StaffLogin onLogin={(s) => setStaff(s)} />;
  }

  // If drawer not opened, show drawer screen
  if (!drawerSession && !showDrawer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Image
              src="/exa-logo-white.png"
              alt="EXA"
              width={100}
              height={40}
              className="h-10 w-auto mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold">Welcome, {staff.name}</h1>
            <p className="text-muted-foreground">Open cash drawer to start selling</p>
          </div>
          <CashDrawer
            staffId={staff.id}
            staffName={staff.name}
            currentSession={null}
            onSessionStart={(session) => setDrawerSession(session)}
            onSessionEnd={() => setDrawerSession(null)}
          />
          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => setStaff(null)}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Switch Staff
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <Image
            src="/exa-logo-white.png"
            alt="EXA"
            width={80}
            height={32}
            className="h-8 w-auto"
          />
          <Badge variant="outline" className="text-green-500 border-green-500">
            POS Terminal
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Low Stock Alert */}
          <LowStockBadge onClick={() => setShowLowStock(true)} />

          {/* Import Button (manager/admin only) */}
          {(staff.role === "manager" || staff.role === "admin") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImport(true)}
            >
              <Upload className="h-4 w-4" />
            </Button>
          )}

          {/* Drawer Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDrawer(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* Staff Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
            <User className="h-4 w-4" />
            <span>{staff.name}</span>
          </div>

          {/* Logout */}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Product Search & Results */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Search Bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
              )}
            </div>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowScanner(true)}
              className="h-12 px-4"
            >
              <Scan className="h-5 w-5 mr-2" />
              Scan
            </Button>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-auto">
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {searchResults.map((product) => (
                  <Card
                    key={product.id}
                    className="p-3 cursor-pointer hover:border-primary transition-colors"
                  >
                    <div className="aspect-square bg-muted rounded-lg mb-2 overflow-hidden relative">
                      {product.images?.[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {product.brand_name}
                    </p>
                    <p className="font-bold text-green-500">
                      ${product.retail_price.toFixed(2)}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {product.variants.map((variant) => (
                        <Button
                          key={variant.id}
                          size="sm"
                          variant={variant.stock_quantity > 0 ? "outline" : "ghost"}
                          disabled={variant.stock_quantity < 1}
                          onClick={() => addToCart(product, variant)}
                          className="text-xs h-7 px-2"
                        >
                          {variant.size || variant.color || "Add"}
                          {variant.stock_quantity < 1 && " (Out)"}
                        </Button>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Package className="h-12 w-12 mb-4" />
                <p>No products found</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Scan className="h-12 w-12 mb-4" />
                <p>Scan a barcode or search for products</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-96 border-l flex flex-col bg-card">
          {/* Cart Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span className="font-bold">Cart</span>
              {cart.length > 0 && (
                <Badge variant="secondary">{cart.length}</Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mb-4" />
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="flex gap-3">
                    <div className="relative w-12 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                      {item.product.images?.[0] ? (
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {item.variant.size && `Size: ${item.variant.size}`}
                        {item.variant.color && ` / ${item.variant.color}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {item.variant.sku}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-bold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Cart Footer - Totals & Payment */}
          <div className="border-t p-4 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (7%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-green-500">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                variant="outline"
                disabled={cart.length === 0}
                onClick={() => setShowPayment(true)}
                className="h-14"
              >
                <Banknote className="h-5 w-5 mr-2" />
                Cash
              </Button>
              <Button
                size="lg"
                disabled={cart.length === 0}
                onClick={() => setShowPayment(true)}
                className="h-14 bg-green-600 hover:bg-green-700"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Card
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showPayment && (
        <PaymentModal
          cart={cart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          onComplete={handlePaymentComplete}
          onClose={() => setShowPayment(false)}
        />
      )}

      {showReceipt && completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={handleReceiptClose}
        />
      )}

      {showLowStock && (
        <LowStockAlert onClose={() => setShowLowStock(false)} />
      )}

      {showImport && (
        <CSVImport
          onClose={() => setShowImport(false)}
          onComplete={() => {
            setShowImport(false);
            toast.success("Products imported!");
          }}
        />
      )}

      {showDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <CashDrawer
              staffId={staff.id}
              staffName={staff.name}
              currentSession={drawerSession}
              onSessionStart={(session) => {
                setDrawerSession(session);
                setShowDrawer(false);
              }}
              onSessionEnd={() => {
                setDrawerSession(null);
                setShowDrawer(false);
              }}
            />
            <Button
              variant="ghost"
              className="w-full mt-4 text-white"
              onClick={() => setShowDrawer(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
