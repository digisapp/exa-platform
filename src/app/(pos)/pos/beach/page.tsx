"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "qrcode";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  QrCode,
  X,
  Loader2,
  Package,
} from "lucide-react";
import { toast } from "sonner";

interface ShopProduct {
  id: string;
  name: string;
  price: number; // cents (integer)
  images: string[];
  brand: { name: string } | null;
  inStock: boolean;
}

interface CartItem {
  uid: string;
  productId: string | null;
  name: string;
  price: number; // cents
  quantity: number;
  image?: string;
  isCustom: boolean;
}

const TAX_RATE = 0.07;

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function BeachPOS() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [staffId, setStaffId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  // ── Products ──────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // ── Cart ──────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [editingPriceUid, setEditingPriceUid] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");

  // ── Quick Charge (inline on main screen) ─────────────────────────────────
  const [quickName, setQuickName] = useState("");
  const [quickPrice, setQuickPrice] = useState("");

  // ── Active charge total (for QR/success display) ──────────────────────────
  const [activeTotal, setActiveTotal] = useState(0);

  // ── QR / Checkout ─────────────────────────────────────────────────────────
  const [qrOpen, setQrOpen] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate QR code locally whenever the checkout URL changes
  useEffect(() => {
    if (!checkoutUrl) { setQrDataUrl(null); return; }
    QRCode.toDataURL(checkoutUrl, { width: 280, margin: 2, color: { dark: "#000000", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [checkoutUrl]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // ── PIN Auth ──────────────────────────────────────────────────────────────
  const handlePinDigit = async (digit: number | "⌫") => {
    if (pinLoading) return;
    if (digit === "⌫") {
      setPin(p => p.slice(0, -1));
      return;
    }
    if (pin.length >= 4) return;
    const newPin = pin + String(digit);
    setPin(newPin);

    if (newPin.length === 4) {
      setPinLoading(true);
      try {
        const res = await fetch("/api/pos/staff/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: newPin }),
        });
        if (res.ok) {
          const data = await res.json();
          setStaffId(data.staff.id);
          setPin("");
        } else {
          setPinError(true);
          setTimeout(() => { setPin(""); setPinError(false); }, 1200);
        }
      } catch {
        setPinError(true);
        setTimeout(() => { setPin(""); setPinError(false); }, 1200);
      } finally {
        setPinLoading(false);
      }
    }
  };

  // ── Product search ────────────────────────────────────────────────────────
  const searchProducts = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const url = q.trim()
        ? `/api/shop/products?q=${encodeURIComponent(q)}&limit=12`
        : `/api/shop/products?featured=true&limit=12`;
      const res = await fetch(url);
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      setProducts([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!staffId) return;
    const t = setTimeout(() => searchProducts(query), 300);
    return () => clearTimeout(t);
  }, [query, staffId, searchProducts]);

  useEffect(() => {
    if (staffId) searchProducts("");
  }, [staffId, searchProducts]);

  // ── Cart actions ──────────────────────────────────────────────────────────
  const addToCart = (product: ShopProduct) => {
    if (!product.inStock) { toast.error("Out of stock"); return; }
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        uid: `p-${product.id}`,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.images?.[0],
        isCustom: false,
      }];
    });
    toast.success(`Added: ${product.name}`);
  };

  const addQuickToCart = () => {
    const name = quickName.trim() || "Item";
    const priceFloat = parseFloat(quickPrice);
    if (isNaN(priceFloat) || priceFloat <= 0) return;
    const priceCents = Math.round(priceFloat * 100);
    setCart(prev => [...prev, {
      uid: `c-${Date.now()}`,
      productId: null,
      name,
      price: priceCents,
      quantity: 1,
      isCustom: true,
    }]);
    setQuickName("");
    setQuickPrice("");
    toast.success(`Added: ${name}`);
  };

  const updateQty = (uid: string, delta: number) => {
    setCart(prev =>
      prev.map(i => i.uid === uid ? { ...i, quantity: i.quantity + delta } : i)
          .filter(i => i.quantity > 0)
    );
  };

  const removeItem = (uid: string) =>
    setCart(prev => prev.filter(i => i.uid !== uid));

  const startEditPrice = (item: CartItem) => {
    setEditingPriceUid(item.uid);
    setEditingPriceValue((item.price / 100).toFixed(2));
  };

  const commitEditPrice = (uid: string) => {
    const val = parseFloat(editingPriceValue);
    if (!isNaN(val) && val > 0) {
      const cents = Math.round(val * 100);
      setCart(prev => prev.map(i => i.uid === uid ? { ...i, price: cents } : i));
    }
    setEditingPriceUid(null);
  };

  // ── Core QR creator (shared by cart checkout and quick charge) ───────────
  const createQR = async (items: CartItem[], closeCart = false) => {
    if (items.length === 0 || generating) return;
    setGenerating(true);
    const itemsSubtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const itemsTax = Math.round(itemsSubtotal * TAX_RATE);
    setActiveTotal(itemsSubtotal + itemsTax);
    try {
      const res = await fetch("/api/pos/beach-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, image: i.image })),
          tax: itemsTax,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      setCheckoutUrl(data.checkoutUrl);
      setSessionId(data.sessionId);
      setPaymentDone(false);
      if (closeCart) setCartOpen(false);
      setQrOpen(true);
      startPolling(data.sessionId);
    } catch (err: any) {
      toast.error(err.message || "Failed to create payment");
    } finally {
      setGenerating(false);
    }
  };

  // ── Cart checkout ──────────────────────────────────────────────────────────
  const generateQR = () => createQR(cart, true);

  // ── Quick charge: skip cart entirely ─────────────────────────────────────
  const chargeNow = () => {
    const name = quickName.trim() || "Item";
    const priceFloat = parseFloat(quickPrice);
    if (isNaN(priceFloat) || priceFloat <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    const priceCents = Math.round(priceFloat * 100);
    createQR([{ uid: "quick", productId: null, name, price: priceCents, quantity: 1, isCustom: true }]);
    setQuickName("");
    setQuickPrice("");
  };

  const startPolling = (sid: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pos/beach-status?sessionId=${sid}`);
        const data = await res.json();
        if (data.status === "complete" || data.paymentStatus === "paid") {
          clearInterval(pollRef.current!);
          setPaymentDone(true);
        } else if (data.status === "expired") {
          clearInterval(pollRef.current!);
          setQrOpen(false);
          setCheckoutUrl(null);
          toast.error("Payment link expired — please try again.");
        }
      } catch {
        // network blip, keep polling
      }
    }, 2000);
  };

  const cancelQR = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setQrOpen(false);
    setCheckoutUrl(null);
    setQrDataUrl(null);
    setSessionId(null);
  };

  const newSale = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setQrOpen(false);
    setPaymentDone(false);
    setCheckoutUrl(null);
    setQrDataUrl(null);
    setSessionId(null);
    setCart([]);
    toast.success("Ready for next sale! 🏖️");
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── PIN Screen ────────────────────────────────────────────────────────────
  if (!staffId) {
    const NUMPAD = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "⌫"] as const;
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
        <div className="text-center w-full max-w-xs">
          <div className="text-7xl mb-4">🏖️</div>
          <h1 className="text-3xl font-bold text-white mb-1">Beach POS</h1>
          <p className="text-white/50 mb-8 text-sm">Enter staff PIN to begin</p>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            {/* PIN dots */}
            <div className="flex justify-center gap-4 mb-6">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                    pinError
                      ? "bg-red-500 border-red-500 scale-125"
                      : pin.length > i
                        ? "bg-white border-white scale-110"
                        : "border-white/30"
                  }`}
                />
              ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3">
              {NUMPAD.map((d, idx) =>
                d === null ? (
                  <div key={idx} />
                ) : (
                  <button
                    key={idx}
                    onClick={() => handlePinDigit(d as number | "⌫")}
                    disabled={pinLoading}
                    className="h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 active:bg-white/25 text-white text-2xl font-semibold transition-all disabled:opacity-40 select-none"
                  >
                    {d}
                  </button>
                )
              )}
            </div>

            {pinLoading && (
              <div className="flex justify-center mt-4">
                <Loader2 className="h-5 w-5 text-white/50 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main POS ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-950 via-blue-950 to-indigo-950">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏖️</span>
            <span className="font-bold text-white text-sm">Beach POS</span>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 rounded-full text-white transition-all active:scale-95"
          >
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="bg-pink-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-tight">
                {cartCount}
              </span>
            )}
            <span className="font-semibold text-sm">{fmt(total)}</span>
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">

        {/* ── Quick Charge panel ─────────────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 mb-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Quick Charge</p>
          <div className="space-y-2 mb-3">
            <input
              value={quickName}
              onChange={e => setQuickName(e.target.value)}
              placeholder="Item name (optional)"
              className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-sky-400/60 text-sm"
            />
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-semibold pointer-events-none">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quickPrice}
                onChange={e => setQuickPrice(e.target.value)}
                onKeyDown={e => e.key === "Enter" && chargeNow()}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-sky-400/60 text-sm font-semibold"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addQuickToCart}
              disabled={!quickPrice}
              className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-30 flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add to Cart
            </button>
            <button
              onClick={chargeNow}
              disabled={!quickPrice || generating}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-30 flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/20"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              Charge Now
            </button>
          </div>
        </div>

        {/* ── Shop catalog ───────────────────────────────────────────────────── */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search shop products…"
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-sky-400/60 transition-all text-sm"
          />
        </div>

        {searching ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 text-white/40 animate-spin" />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {products.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={!product.inStock}
                className="text-left rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {product.images?.[0] ? (
                  <div className="aspect-square overflow-hidden">
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-square bg-white/5 flex items-center justify-center">
                    <Package className="h-10 w-10 text-white/20" />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-white text-sm font-medium leading-tight line-clamp-2 mb-1">{product.name}</p>
                  {product.brand?.name && <p className="text-white/40 text-xs mb-1">{product.brand.name}</p>}
                  <p className="text-sky-300 font-bold">{fmt(product.price)}</p>
                  {!product.inStock && <p className="text-red-400 text-xs mt-1">Out of stock</p>}
                </div>
              </button>
            ))}
          </div>
        ) : (
          !query && (
            <p className="text-center text-white/20 text-sm py-4">
              Search above to browse the shop catalog
            </p>
          )
        )}
      </div>

      {/* ── Cart Sheet ────────────────────────────────────────────────────────── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="relative bg-slate-900 border-t border-white/15 rounded-t-3xl w-full max-w-lg max-h-[88vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <h3 className="text-white font-bold">
                Cart{" "}
                <span className="text-white/40 text-sm font-normal">({cartCount})</span>
              </h3>
              <button onClick={() => setCartOpen(false)} className="text-white/40 hover:text-white p-1 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.length === 0 ? (
                <p className="text-center text-white/30 py-10 text-sm">Cart is empty</p>
              ) : cart.map(item => (
                <div key={item.uid} className="flex items-center gap-3 bg-white/5 rounded-2xl p-3">
                  {item.image ? (
                    <img src={item.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                      {item.isCustom ? <span className="text-xl">✨</span> : <Package className="h-6 w-6 text-white/30" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.name}</p>
                    {editingPriceUid === item.uid ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-white/40 text-sm">$</span>
                        <input
                          autoFocus
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editingPriceValue}
                          onChange={e => setEditingPriceValue(e.target.value)}
                          onBlur={() => commitEditPrice(item.uid)}
                          onKeyDown={e => { if (e.key === "Enter") commitEditPrice(item.uid); if (e.key === "Escape") setEditingPriceUid(null); }}
                          className="w-20 bg-white/10 border border-sky-400/60 rounded-lg px-2 py-0.5 text-sky-300 text-sm font-bold focus:outline-none"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditPrice(item)}
                        className="text-sky-300 text-sm font-medium underline underline-offset-2 decoration-dashed hover:text-sky-200 transition-colors"
                        title="Tap to change price"
                      >
                        {fmt(item.price)}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => updateQty(item.uid, -1)}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-90 transition-all"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-white w-5 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.uid, 1)}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-90 transition-all"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => removeItem(item.uid)}
                      className="w-8 h-8 rounded-full text-red-400/60 hover:text-red-400 hover:bg-red-400/10 flex items-center justify-center ml-1 active:scale-90 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals + charge button */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-white/10">
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-sm text-white/50">
                    <span>Subtotal</span>
                    <span>{fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-white/50">
                    <span>Tax (7%)</span>
                    <span>{fmt(tax)}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-xl pt-2 border-t border-white/10">
                    <span>Total</span>
                    <span className="text-sky-300">{fmt(total)}</span>
                  </div>
                </div>
                <button
                  onClick={generateQR}
                  disabled={generating}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-base transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-sky-500/25"
                >
                  {generating ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Generating…</>
                  ) : (
                    <><QrCode className="h-5 w-5" /> Generate QR · {fmt(total)}</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── QR Code Modal ──────────────────────────────────────────────────────── */}
      {qrOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-sm text-center">
            {paymentDone ? (
              /* ── Success state ── */
              <div className="py-2">
                <div className="text-7xl mb-4" style={{ animation: "bounce 1s infinite" }}>🎉</div>
                <h2 className="text-white text-2xl font-bold mb-1">Payment Complete!</h2>
                <p className="text-white/50 text-sm mb-3">Total received</p>
                <p className="text-sky-300 text-5xl font-bold mb-8">{fmt(activeTotal)}</p>
                <button
                  onClick={newSale}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold text-lg transition-all active:scale-[0.98] shadow-lg shadow-green-500/20"
                >
                  New Sale 🏖️
                </button>
              </div>
            ) : (
              /* ── QR display state ── */
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-white font-bold text-lg">Scan to Pay</h2>
                  <button
                    onClick={cancelQR}
                    className="text-white/40 hover:text-white p-1 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sky-300 text-4xl font-bold mb-5">{fmt(activeTotal)}</p>

                {qrDataUrl ? (
                  <div className="bg-white rounded-2xl p-3 mx-auto inline-block mb-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt="Scan to pay"
                      width={260}
                      height={260}
                      className="block rounded-xl"
                    />
                  </div>
                ) : checkoutUrl ? (
                  <div className="flex justify-center items-center h-[280px] mb-5">
                    <Loader2 className="h-8 w-8 text-white/40 animate-spin" />
                  </div>
                ) : null}

                <div className="flex items-center justify-center gap-2 text-white/50 text-sm mb-1">
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  <span>Waiting for payment…</span>
                </div>
                <p className="text-white/30 text-xs">Ask customer to scan with their phone camera</p>

                <button
                  onClick={cancelQR}
                  className="mt-5 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-sm transition-all"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
