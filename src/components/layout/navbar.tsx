"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Home,
  Users,
  MessageCircle,
  Settings,
  Coins,
  Images,
  Crown,
  Heart,
  Megaphone,
  BarChart3,
  FolderHeart,
  FolderDown,
  Flame,
  Camera,
  FileText,
  Gavel,
  Calendar,
  ArrowUpRight,
  Loader2,
  Gift,
  Briefcase,
  Gem,
} from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";
import { useCoinBalanceOptional } from "@/contexts/CoinBalanceContext";
import { useUnreadCount } from "@/components/layout/UnreadCountProvider";
import { useTranslation } from "@/i18n";
import { coinsToUsd, formatUsd } from "@/lib/coin-config";
import { COIN_PACKAGES } from "@/lib/stripe-config";

// All tiers visible at once (owner call 2026-07-22: whale packs must be one
// click away, never behind a "more options" step) — a divider before this
// index splits the list into quick top-ups and big packs.
const BIG_PACKS_START_INDEX = 5;

interface NavbarProps {
  user?: {
    id: string;
    email: string;
    avatar_url?: string;
    name?: string;
    username?: string;
  } | null;
  actorType?: "model" | "brand" | "admin" | "fan" | null;
  unreadCount?: number;
  notificationCount?: number;
  bellCount?: number;
}

const publicLinks: { href: string; label: string; icon: any }[] = [];

const adminLinks = [
  { href: "/admin", label: "Home", icon: Home },
  { href: "/chats", label: "Chats", icon: MessageCircle },
];

// Shared dark/glass dropdown content styling — matches dashboard aesthetic
const DROPDOWN_GLASS_CLASS =
  "w-60 p-1.5 bg-[#120a24]/95 backdrop-blur-xl border-violet-500/30 text-white shadow-2xl shadow-violet-500/10";

const DROPDOWN_ITEM_CLASS =
  "cursor-pointer rounded-lg px-2.5 py-2 text-sm text-white/80 focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white";

export function Navbar({ user, actorType, unreadCount: unreadCountProp = 0, notificationCount = 0, bellCount = 0 }: NavbarProps) {
  const pathname = usePathname();
  const unreadCount = useUnreadCount(unreadCountProp);
  const coinBalanceContext = useCoinBalanceOptional();
  const coinBalance = coinBalanceContext?.balance ?? 0;
  const { t } = useTranslation();
  const [purchasing, setPurchasing] = useState<number | null>(null);

  const handleCoinPurchase = async (coins: number) => {
    setPurchasing(coins);
    try {
      const response = await fetch("/api/coins/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coins }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // silent
    } finally {
      setPurchasing(null);
    }
  };

  // Translated nav links
  // Models: Gigs stays top-level — it's the activation-critical demand loop.
  // Offers is low-frequency (~unused) and lives in the avatar dropdown instead.
  const translatedModelLinks = [
    { href: "/dashboard", label: t.nav.home, icon: Home },
    { href: "/gigs", label: t.nav.gigs, icon: Briefcase },
    { href: "/chats", label: t.nav.chats, icon: MessageCircle },
    { href: "/studio", label: t.nav.studio, icon: Images },
  ];
  // Fans: keep the top nav to the daily loop (browse → chat). Bids + Favorites
  // are secondary and live in the avatar dropdown to avoid a cluttered bar.
  const translatedFanLinks = [
    { href: "/dashboard", label: t.nav.home, icon: Home },
    { href: "/models", label: t.nav.explore, icon: Users },
    { href: "/chats", label: t.nav.chats, icon: MessageCircle },
  ];
  const translatedBrandLinks = [
    { href: "/dashboard", label: t.nav.home, icon: Home },
    { href: "/models", label: t.nav.explore, icon: Users },
    { href: "/chats", label: t.nav.chats, icon: MessageCircle },
    { href: "/campaigns", label: t.nav.campaigns, icon: Megaphone },
  ];

  const links =
    actorType === "admin"
      ? adminLinks
      : actorType === "model"
        ? translatedModelLinks
        : actorType === "fan"
          ? translatedFanLinks
          : actorType === "brand"
            ? translatedBrandLinks
            : publicLinks;

  const isLinkActive = (href: string) => {
    if (href === "/dashboard" || href === "/admin") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Creators (model/admin) earn coins → show as withdrawable USD.
  // Fans/brands spend coins → show coin balance.
  const isCreator = actorType === "model" || actorType === "admin";
  // Brands are cyan-coded everywhere else — keep the active accent consistent
  const activeIconClass = actorType === "brand" ? "text-cyan-400" : "text-pink-400";
  const usdValue = coinsToUsd(coinBalance);

  return (
    // Mobile gets a solid fill: a full-width backdrop-blur bar re-rasterizes
    // on every scroll frame on iOS (worst with the fixed gradient behind it).
    <header className="sticky top-0 z-50 w-full border-b border-violet-500/10 bg-[#0d0018]/95 md:bg-background/80 md:backdrop-blur-xl md:supports-[backdrop-filter]:bg-background/60">
      <div className="container px-4 md:px-8 lg:px-16 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/exa-logo-white.png"
            alt="EXA"
            width={80}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {links.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full transition-all",
                  active
                    ? "text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <div className="relative">
                  <link.icon className={cn("h-4 w-4", active && activeIconClass)} />
                  {link.href === "/chats" && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-pink-500 text-white rounded-full shadow-[0_0_8px_rgba(236,72,153,0.7)]">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                {/* Icon-only below lg so five links never overflow on tablets */}
                <span className="hidden lg:inline">{link.label}</span>
                {/* Active glow underbar */}
                {active && (
                  <span className="absolute left-3 right-3 -bottom-[1px] h-0.5 bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 rounded-full shadow-[0_0_10px_rgba(255,105,180,0.7)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Language globe — always visible logged-out (the discovery case);
              md+ only when logged in, where the bar is already tight on
              phones and Settings carries the same toggle. Admin is EN-only. */}
          {actorType !== "admin" && (
            <div className={cn(user && "hidden md:block")}>
              <LanguageSwitcher />
            </div>
          )}
          {user ? (
            <>
              {/* ───────── Wallet / Earnings pill ───────── */}
              {isCreator ? (
                // Creators: coins + USD — the pill is the model's ONLY
                // /wallet surface (top-nav-OR-dropdown-never-both), so the
                // dollar value rides along to make money visible everywhere
                <Link
                  href="/wallet"
                  className="group flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gradient-to-r from-emerald-500/15 to-pink-500/15 border border-emerald-500/30 hover:border-emerald-500/60 hover:from-emerald-500/25 hover:to-pink-500/25 transition-all shadow-[0_0_12px_rgba(52,211,153,0.15)] hover:shadow-[0_0_20px_rgba(52,211,153,0.35)]"
                >
                  <Coins className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">
                    {coinBalance.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-emerald-300/90">
                    {formatUsd(usdValue)}
                  </span>
                  <ArrowUpRight className="hidden md:inline h-3 w-3 text-emerald-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </Link>
              ) : actorType === "fan" ? (
                // Fans: coins pill → inline buy popover (no redirect to /wallet)
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 hover:border-amber-500/60 hover:from-amber-500/25 hover:to-orange-500/25 transition-all shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]">
                      <Coins className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-bold text-white">
                        {coinBalance.toLocaleString()}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    className="w-64 p-3 bg-[#120a24]/95 backdrop-blur-xl border-violet-500/30 text-white shadow-2xl shadow-violet-500/10"
                  >
                    {/* Balance header */}
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/40">{t.nav.availableBalance}</p>
                        {/* No USD equivalent here: fan coins aren't redeemable and
                            coinsToUsd is the model payout rate, not what fans paid */}
                        <p className="text-xl font-bold text-amber-300 leading-tight">{coinBalance.toLocaleString()} <span className="text-xs font-normal text-white/40">coins</span></p>
                      </div>
                      <Coins className="h-7 w-7 text-amber-400/40" />
                    </div>
                    {/* Coin packages — every tier visible, big packs below the divider */}
                    <div className="space-y-1">
                      {COIN_PACKAGES.map((pack, i) => (
                        <Fragment key={pack.coins}>
                          {i === BIG_PACKS_START_INDEX && (
                            <div className="flex items-center gap-2 pt-2 pb-0.5 px-1">
                              <Gem className="h-3 w-3 text-violet-400 shrink-0" />
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Big packs</span>
                              <div className="flex-1 h-px bg-white/10" />
                            </div>
                          )}
                          <button
                            onClick={() => handleCoinPurchase(pack.coins)}
                            disabled={purchasing !== null}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/8 transition-colors group disabled:opacity-60"
                          >
                            <div className="flex items-center gap-2">
                              <Coins className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                              <span className="text-sm font-semibold text-white">{pack.coins.toLocaleString()}</span>
                              <span className="text-[10px] text-white/40">coins</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-amber-300">{pack.priceDisplay}</span>
                              {purchasing === pack.coins ? (
                                <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                              ) : (
                                <span className="text-[10px] text-white/30 group-hover:text-amber-400 transition-colors">Buy →</span>
                              )}
                            </div>
                          </button>
                        </Fragment>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                // Brands: coin balance — cyan accent to match brand nav color
                <Link
                  href="/wallet"
                  className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 hover:border-cyan-500/60 transition-all shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                >
                  <Coins className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-bold text-white">
                    {coinBalance.toLocaleString()}
                  </span>
                </Link>
              )}

              {/* ───────── Notification Bell (models only) ───────── */}
              {actorType === "model" && (
                <NotificationBell initialUnreadCount={bellCount} />
              )}

              {/* ───────── Profile dropdown ───────── */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    aria-label="User menu"
                    className="relative h-10 w-10 rounded-full p-0 ring-2 ring-pink-500/50 hover:ring-pink-500 hover:shadow-[0_0_16px_rgba(236,72,153,0.5)] transition-all"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url} alt={user.name || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white">
                        {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {/* Action-needed badge (fans: outbid/winning count; Bids now lives inside this menu) */}
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white rounded-full z-10 bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]">
                        {notificationCount > 9 ? "9+" : notificationCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  forceMount
                  className={DROPDOWN_GLASS_CLASS}
                >
                  {/* Header card — avatar + name + public profile link */}
                  <div className="p-3 rounded-lg bg-gradient-to-br from-pink-500/10 via-violet-500/5 to-cyan-500/10 border border-white/10 mb-1.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-1 ring-pink-500/40">
                        <AvatarImage src={user.avatar_url} alt={user.name || ""} />
                        <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white text-sm">
                          {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">
                          {user.name || "User"}
                        </p>
                        {user.username && actorType === "model" ? (
                          <Link
                            href={`/${user.username}`}
                            className="notranslate text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 truncate"
                          >
                            examodels.com/{user.username}
                            <ArrowUpRight className="h-3 w-3 shrink-0" />
                          </Link>
                        ) : user.username && actorType === "brand" ? (
                          <Link
                            href={`/brand/${user.username}`}
                            className="notranslate text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 truncate"
                          >
                            examodels.com/brand/{user.username}
                            <ArrowUpRight className="h-3 w-3 shrink-0" />
                          </Link>
                        ) : user.username ? (
                          <p className="notranslate text-[11px] text-white/50 truncate">
                            @{user.username}
                          </p>
                        ) : (
                          <p className="text-[11px] text-white/50 truncate">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Featured actions — creators. Gigs lives in the top nav; Offers is below */}
                  {isCreator && (
                    <>
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <Link
                          href="/comp-card"
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-pink-500/15 to-violet-500/10 border border-pink-500/25 hover:from-pink-500/25 hover:to-violet-500/15 hover:border-pink-500/50 transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center shrink-0">
                            <Camera className="h-4 w-4 text-pink-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{t.nav.compCard}</p>
                            <p className="text-[11px] text-pink-300">
                              Your digital portfolio
                            </p>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-pink-400 shrink-0" />
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent mt-1">
                        <Link
                          href="/spotlight"
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-orange-500/15 to-pink-500/10 border border-orange-500/25 hover:from-orange-500/25 hover:to-pink-500/15 hover:border-orange-500/50 transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                            <Flame className="h-4 w-4 text-orange-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">
                              {t.nav.exaBoost}
                            </p>
                            <p className="text-[11px] text-orange-300">
                              {t.nav.boostRanking}
                            </p>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-orange-400 shrink-0" />
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-white/10 my-1.5" />

                      {/* Secondary creator links */}
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/bookings" className="w-full">
                          <Calendar className="mr-2 h-4 w-4 text-cyan-400" />
                          {t.nav.bookings}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/offers" className="w-full">
                          <Gift className="mr-2 h-4 w-4 text-pink-400" />
                          {t.nav.offers}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/bids/manage" className="w-full">
                          <Gavel className="mr-2 h-4 w-4 text-violet-400" />
                          {t.nav.bids}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/analytics" className="w-full">
                          <BarChart3 className="mr-2 h-4 w-4 text-cyan-400" />
                          {t.nav.analytics}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* Fan-specific items — Bids + Favorites moved here to keep the top nav lean */}
                  {actorType === "fan" && (
                    <>
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <Link
                          href="/spotlight"
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-orange-500/15 to-pink-500/10 border border-orange-500/25 hover:from-orange-500/25 hover:to-pink-500/15 hover:border-orange-500/50 transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                            <Flame className="h-4 w-4 text-orange-300" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">
                              {t.nav.exaBoost}
                            </p>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-orange-400 shrink-0" />
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-white/10 my-1.5" />

                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/favorites" className="w-full">
                          <Heart className="mr-2 h-4 w-4 text-pink-400" />
                          {t.nav.favorites}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/bids" className="w-full flex items-center">
                          <Gavel className="mr-2 h-4 w-4 text-amber-400" />
                          {t.nav.bids}
                          {notificationCount > 0 && (
                            <span className="ml-auto min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-amber-500 text-white rounded-full">
                              {notificationCount > 9 ? "9+" : notificationCount}
                            </span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/my-content" className="w-full">
                          <FolderHeart className="mr-2 h-4 w-4 text-pink-400" />
                          {t.nav.myLibrary}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* Brand-specific items */}
                  {actorType === "brand" && (
                    <>
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/wallet" className="w-full">
                          <Coins className="mr-2 h-4 w-4 text-cyan-400" />
                          {t.nav.wallet}
                          <span className="ml-auto text-xs text-white/50">
                            {coinBalance.toLocaleString()}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/brands/offers" className="w-full">
                          <Gift className="mr-2 h-4 w-4 text-cyan-400" />
                          Offers
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/contracts" className="w-full">
                          <FileText className="mr-2 h-4 w-4 text-cyan-400" />
                          {t.nav.contracts}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/brands/content" className="w-full">
                          <FolderDown className="mr-2 h-4 w-4 text-cyan-400" />
                          {t.nav.content}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/brands/analytics" className="w-full">
                          <BarChart3 className="mr-2 h-4 w-4 text-cyan-400" />
                          {t.nav.analytics}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/brands/subscription" className="w-full">
                          <Crown className="mr-2 h-4 w-4 text-amber-400" />
                          {t.nav.subscription}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* Settings (all non-admin) */}
                  {actorType !== "admin" && (
                    <>
                      <DropdownMenuSeparator className="bg-white/10 my-1.5" />
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/settings" className="w-full">
                          <Settings className="mr-2 h-4 w-4 text-white/60" />
                          {t.nav.settings}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator className="bg-white/10 my-1" />
                  <DropdownMenuItem
                    className="p-0 focus:bg-rose-500/10 rounded-lg"
                  >
                    <LogoutButton className="cursor-pointer text-rose-400 hover:text-rose-300 flex items-center w-full px-2.5 py-2 rounded-lg" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              asChild
              className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 shadow-[0_0_16px_rgba(236,72,153,0.4)]"
            >
              <Link href="/signin">{t.nav.signIn}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
