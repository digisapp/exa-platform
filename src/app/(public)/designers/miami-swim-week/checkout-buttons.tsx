"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, Users, ShoppingBag, Building2 } from "lucide-react";
import { toast } from "sonner";

type PackageId = "opening-show" | "day-2" | "day-3" | "day-4" | "day-5" | "day-6" | "daytime-show" | "swim-shop" | "showroom-halfday" | "showroom-fullday" | "gifting-suite" | "lobby-display" | "beach-shoot-halfday" | "beach-shoot-fullday" | "model-ambassador" | "afterparty-standard" | "afterparty-premier" | "afterparty-presenting";

const PHOTO_VIDEO_PRICE = 700;
const PHOTO_VIDEO_INSTALLMENT = 234; // $234 × 3 = $702 ≈ $700

const EXTRA_MODELS_PRICE = 500;
const EXTRA_MODELS_INSTALLMENT = 167; // $167 × 3 = $501 ≈ $500

interface CheckoutButtonsProps {
  pkg: PackageId;
  fullPrice: number;
  installmentPrice: number;
}

interface AddOnToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  priceLabel: string;
}

function AddOnToggle({ checked, onChange, icon, label, sublabel, priceLabel }: AddOnToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
        checked
          ? "border-pink-500/60 bg-pink-500/10 text-foreground"
          : "border-white/10 bg-muted/30 text-muted-foreground hover:border-pink-500/30 hover:text-foreground"
      }`}
    >
      <div
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          checked ? "border-pink-500 bg-pink-500" : "border-white/30"
        }`}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-pink-400 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
      </div>
      <span className="text-sm font-bold text-pink-400 flex-shrink-0">{priceLabel}</span>
    </button>
  );
}

export function SwimShopButton() {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/brands/msw-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: "swim-shop", paymentType: "full", addPhotoVideo: false, addExtraModels: false }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout. Please try again.");
        setLoading(false);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Button
      className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold py-6 rounded-xl text-base shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30 hover:scale-[1.01]"
      onClick={handleCheckout}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
      ) : (
        <ShoppingBag className="h-5 w-5 mr-2" />
      )}
      Reserve Your Spot — $500
    </Button>
  );
}

const SHOWROOM_OPTIONS = [
  { id: "showroom-halfday" as const, label: "Half Day", duration: "4 hours", price: 1200 },
  { id: "showroom-fullday" as const, label: "Full Day", duration: "All day", price: 2000 },
];

export function ShowroomButton() {
  const [selected, setSelected] = useState<"showroom-halfday" | "showroom-fullday">("showroom-fullday");
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/brands/msw-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: selected, paymentType: "full", addPhotoVideo: false, addExtraModels: false }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout. Please try again.");
        setLoading(false);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const selectedOption = SHOWROOM_OPTIONS.find((o) => o.id === selected)!;

  return (
    <div className="space-y-3">
      {/* Option selector */}
      <div className="grid grid-cols-2 gap-3">
        {SHOWROOM_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt.id)}
            className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center ${
              selected === opt.id
                ? "border-amber-500 bg-amber-500/10 text-foreground"
                : "border-white/10 bg-muted/30 text-muted-foreground hover:border-amber-500/40 hover:text-foreground"
            }`}
          >
            <p className="font-bold text-lg">${opt.price.toLocaleString()}</p>
            <p className="font-semibold text-sm mt-0.5">{opt.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{opt.duration}</p>
          </button>
        ))}
      </div>

      <Button
        className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-semibold py-6 rounded-xl text-base shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:scale-[1.01]"
        onClick={handleCheckout}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Building2 className="h-5 w-5 mr-2" />
        )}
        Book {selectedOption.label} — ${selectedOption.price.toLocaleString()}
      </Button>
    </div>
  );
}

// ─── Simple fixed-price checkout button ───────────────────────────────────────

interface SimpleCheckoutButtonProps {
  packageId: PackageId;
  price: number;
  label: string;
  colorClass: string;
}

export function SimpleCheckoutButton({ packageId, price, label, colorClass }: SimpleCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/brands/msw-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: packageId, paymentType: "full", addPhotoVideo: false, addExtraModels: false }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout. Please try again.");
        setLoading(false);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-3xl font-bold">${price.toLocaleString()}</p>
      <Button
        className={`flex-1 bg-gradient-to-r ${colorClass} text-white font-semibold py-5 rounded-xl text-sm shadow-lg transition-all hover:scale-[1.01]`}
        onClick={handleCheckout}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {label}
      </Button>
    </div>
  );
}

// ─── Beach Shoot (half-day / full-day toggle) ─────────────────────────────────

const BEACH_SHOOT_OPTIONS = [
  { id: "beach-shoot-halfday" as const, label: "Half Day", duration: "~4 hours", price: 1500 },
  { id: "beach-shoot-fullday" as const, label: "Full Day", duration: "~8 hours", price: 2500 },
];

export function BeachShootButton() {
  const [selected, setSelected] = useState<"beach-shoot-halfday" | "beach-shoot-fullday">("beach-shoot-halfday");
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/brands/msw-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: selected, paymentType: "full", addPhotoVideo: false, addExtraModels: false }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout. Please try again.");
        setLoading(false);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const selectedOption = BEACH_SHOOT_OPTIONS.find((o) => o.id === selected)!;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {BEACH_SHOOT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt.id)}
            className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center ${
              selected === opt.id
                ? "border-sky-500 bg-sky-500/10 text-foreground"
                : "border-white/10 bg-muted/30 text-muted-foreground hover:border-sky-500/40 hover:text-foreground"
            }`}
          >
            <p className="font-bold">${opt.price.toLocaleString()}</p>
            <p className="text-sm font-semibold">{opt.label}</p>
            <p className="text-xs text-muted-foreground">{opt.duration}</p>
          </button>
        ))}
      </div>
      <Button
        className="w-full bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-semibold py-5 rounded-xl shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.01]"
        onClick={handleCheckout}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
        Book {selectedOption.label} Shoot — ${selectedOption.price.toLocaleString()}
      </Button>
    </div>
  );
}

// ─── After-Party Sponsorship (3 tiers) ───────────────────────────────────────

const AFTERPARTY_TIERS = [
  { id: "afterparty-standard" as const, label: "Standard", price: 2000, perks: "Logo on materials, branded presence" },
  { id: "afterparty-premier" as const, label: "Premier", price: 3500, perks: "Featured logo, product moment, social feature" },
  { id: "afterparty-presenting" as const, label: "Presenting Sponsor", price: 5000, perks: "Top billing, exclusive activation, VIP table" },
];

export function AfterPartyButton() {
  const [selected, setSelected] = useState<"afterparty-standard" | "afterparty-premier" | "afterparty-presenting">("afterparty-standard");
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/brands/msw-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: selected, paymentType: "full", addPhotoVideo: false, addExtraModels: false }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout. Please try again.");
        setLoading(false);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const selectedTier = AFTERPARTY_TIERS.find((t) => t.id === selected)!;

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        {AFTERPARTY_TIERS.map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => setSelected(tier.id)}
            className={`flex flex-col p-4 rounded-xl border-2 transition-all text-left ${
              selected === tier.id
                ? "border-orange-500 bg-orange-500/10 text-foreground"
                : "border-white/10 bg-muted/30 text-muted-foreground hover:border-orange-500/40 hover:text-foreground"
            }`}
          >
            <p className="text-xl font-bold">${tier.price.toLocaleString()}</p>
            <p className="font-semibold text-sm mt-0.5">{tier.label}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tier.perks}</p>
          </button>
        ))}
      </div>
      <Button
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-6 rounded-xl text-base shadow-lg shadow-orange-500/20 transition-all hover:shadow-orange-500/30 hover:scale-[1.01]"
        onClick={handleCheckout}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
        Secure {selectedTier.label} — ${selectedTier.price.toLocaleString()}
      </Button>
    </div>
  );
}

export function CheckoutButtons({ pkg, fullPrice, installmentPrice }: CheckoutButtonsProps) {
  const [loading, setLoading] = useState<"full" | "installment" | null>(null);
  const [addPhotoVideo, setAddPhotoVideo] = useState(false);
  const [addExtraModels, setAddExtraModels] = useState(false);

  const totalFull =
    fullPrice +
    (addPhotoVideo ? PHOTO_VIDEO_PRICE : 0) +
    (addExtraModels ? EXTRA_MODELS_PRICE : 0);

  const totalInstallment =
    installmentPrice +
    (addPhotoVideo ? PHOTO_VIDEO_INSTALLMENT : 0) +
    (addExtraModels ? EXTRA_MODELS_INSTALLMENT : 0);

  async function handleCheckout(paymentType: "full" | "installment") {
    setLoading(paymentType);
    try {
      const res = await fetch("/api/brands/msw-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: pkg, paymentType, addPhotoVideo, addExtraModels }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout. Please try again.");
        setLoading(null);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Pricing Display */}
      <div className="flex items-end justify-between mb-4 pb-4 border-b border-white/10">
        <div>
          <p className="text-4xl font-bold">${totalFull.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Pay in full</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-pink-400">
            ${totalInstallment.toLocaleString()}
            <span className="text-base font-normal text-muted-foreground">/mo</span>
          </p>
          <p className="text-sm text-muted-foreground">× 3 months</p>
        </div>
      </div>

      {/* Add-ons */}
      <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold pb-1">
        Optional Add-ons
      </p>

      <AddOnToggle
        checked={addExtraModels}
        onChange={setAddExtraModels}
        icon={<Users className="h-4 w-4" />}
        label="Upgrade to 20 Models"
        sublabel="5 additional models — more looks, more coverage"
        priceLabel="+$500"
      />

      <AddOnToggle
        checked={addPhotoVideo}
        onChange={setAddPhotoVideo}
        icon={<Camera className="h-4 w-4" />}
        label="Photo & Video Documentation"
        sublabel="Every walk + full show professionally documented"
        priceLabel="+$700"
      />

      {/* Full Payment Button */}
      <Button
        className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold py-6 rounded-xl text-base shadow-lg shadow-pink-500/20 transition-all hover:shadow-pink-500/30 hover:scale-[1.01] mt-1"
        onClick={() => handleCheckout("full")}
        disabled={loading !== null}
      >
        {loading === "full" && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
        Book Now — Pay in Full
      </Button>

      {/* Installment Button */}
      <Button
        variant="outline"
        className="w-full border-pink-500/30 hover:border-pink-500 hover:bg-pink-500/5 hover:text-pink-400 font-semibold py-6 rounded-xl text-base transition-all"
        onClick={() => handleCheckout("installment")}
        disabled={loading !== null}
      >
        {loading === "installment" && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
        3-Month Plan — ${totalInstallment.toLocaleString()}/mo
      </Button>
    </div>
  );
}
