"use client";

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
  Plus,
  Flame,
  Camera,
  FileText,
  Gavel,
  Calendar,
  ArrowUpRight,
  CircleDollarSign,
  Share2,
  Eye,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";
import { useCoinBalanceOptional } from "@/contexts/CoinBalanceContext";
import { useTranslation } from "@/i18n";
import { coinsToUsd, formatUsd } from "@/lib/coin-config";

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

export function Navbar({ user, actorType, unreadCount = 0, notificationCount = 0 }: NavbarProps) {
  const pathname = usePathname();
  const coinBalanceContext = useCoinBalanceOptional();
  const coinBalance = coinBalanceContext?.balance ?? 0;
  const { t } = useTranslation();

  // Notification destination by actor type
  // Models: dashboard's Priority Inbox shows offers/bookings/auctions
  // Fans: bids page shows their auction status
  // Brands: dashboard shows pending campaigns + responses + upcoming bookings
  // Admins: admin dashboard
  const notificationHref =
    actorType === "fan" ? "/bids" : actorType === "admin" ? "/admin" : "/dashboard";

  // Translated nav links
  // Models now get Bookings + Bids promoted to the top nav (revenue-critical)
  const translatedModelLinks = [
    { href: "/dashboard", label: t.nav.home, icon: Home },
    { href: "/chats", label: t.nav.chats, icon: MessageCircle },
    { href: "/content", label: t.nav.content, icon: Images },
  ];
  const translatedFanLinks = [
    { href: "/dashboard", label: t.nav.home, icon: Home },
    { href: "/models", label: t.nav.explore, icon: Users },
    { href: "/chats", label: t.nav.chats, icon: MessageCircle },
    { href: "/bids", label: t.nav.bids, icon: Gavel },
  ];
  const translatedBrandLinks = [
    { href: "/dashboard", label: t.nav.home, icon: Home },
    { href: "/models", label: t.nav.explore, icon: Users },
    { href: "/favorites", label: t.nav.favorites, icon: Heart },
    { href: "/chats", label: t.nav.chats, icon: MessageCircle },
    { href: "/campaigns", label: t.nav.campaigns, icon: Megaphone },
    { href: "/brands/content", label: t.nav.content, icon: FolderDown },
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
  const usdValue = coinsToUsd(coinBalance);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-violet-500/10 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
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
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full transition-all",
                  active
                    ? "text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <div className="relative">
                  <link.icon className={cn("h-4 w-4", active && "text-pink-400")} />
                  {link.href === "/chats" && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-pink-500 text-white rounded-full shadow-[0_0_8px_rgba(236,72,153,0.7)]">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                <span>{link.label}</span>
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
          {user ? (
            <>
              {/* ───────── Wallet / Earnings pill ───────── */}
              {isCreator ? (
                // Creators: "ready to withdraw" — emerald→pink gradient, USD primary
                <Link
                  href="/wallet"
                  className="group flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gradient-to-r from-emerald-500/15 to-pink-500/15 border border-emerald-500/30 hover:border-emerald-500/60 hover:from-emerald-500/25 hover:to-pink-500/25 transition-all shadow-[0_0_12px_rgba(52,211,153,0.15)] hover:shadow-[0_0_20px_rgba(52,211,153,0.35)]"
                >
                  <CircleDollarSign className="h-4 w-4 text-emerald-400" />
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-white">
                      {formatUsd(usdValue)}
                    </span>
                    <span className="hidden sm:inline text-[10px] text-white/40 font-medium">
                      {coinBalance.toLocaleString()}c
                    </span>
                  </div>
                  <ArrowUpRight className="hidden md:inline h-3 w-3 text-emerald-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </Link>
              ) : actorType === "fan" ? (
                // Fans: "coins to spend" — keep amber palette but improve dropdown
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 hover:border-amber-500/60 hover:from-amber-500/25 hover:to-orange-500/25 transition-all shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]">
                      <Coins className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-bold text-white">
                        {coinBalance.toLocaleString()}
                      </span>
                      <span className="hidden sm:inline text-[10px] text-white/40 font-medium">
                        {formatUsd(usdValue)}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className={cn(DROPDOWN_GLASS_CLASS, "w-56")}
                  >
                    <div className="px-3 py-3 text-center rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-1">
                      <p className="text-[10px] uppercase tracking-wider text-white/50">
                        {t.nav.availableBalance}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-amber-300">
                        {coinBalance.toLocaleString()}
                      </p>
                      <p className="text-xs text-white/50 mt-0.5">
                        {formatUsd(usdValue)}
                      </p>
                    </div>
                    <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                      <Link href="/wallet?amount=100" className="w-full">
                        <Plus className="mr-2 h-4 w-4 text-amber-400" />
                        {t.nav.topUpCoins.replace("{amount}", "100")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                      <Link href="/wallet?amount=500" className="w-full">
                        <Plus className="mr-2 h-4 w-4 text-amber-400" />
                        {t.nav.topUpCoins.replace("{amount}", "500")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                      <Link href="/wallet" className="w-full">
                        <Coins className="mr-2 h-4 w-4 text-amber-400" />
                        {t.nav.buyCoins}
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                  <span className="hidden sm:inline text-[10px] text-white/40 font-medium">
                    {formatUsd(usdValue)}
                  </span>
                </Link>
              )}

              {/* ───────── Notification bell ───────── */}
              {actorType !== "admin" && (
                <Link
                  href={notificationHref}
                  aria-label={`${t.nav.notifications}${notificationCount > 0 ? ` (${notificationCount})` : ""}`}
                  className="relative flex items-center justify-center h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/40 text-white/60 hover:text-pink-300 transition-all"
                >
                  <Bell className={cn(
                    "h-4 w-4 transition-colors",
                    notificationCount > 0 && "text-pink-300"
                  )} />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 px-1 flex items-center justify-center text-[10px] font-bold bg-pink-500 text-white rounded-full shadow-[0_0_10px_rgba(236,72,153,0.8)]">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </Link>
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
                            className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 truncate"
                          >
                            examodels.com/{user.username}
                            <ArrowUpRight className="h-3 w-3 shrink-0" />
                          </Link>
                        ) : user.username ? (
                          <p className="text-[11px] text-white/50 truncate">
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

                  {/* Featured actions — creators */}
                  {isCreator && (
                    <>
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <Link
                          href="/wallet"
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 border border-emerald-500/25 hover:from-emerald-500/25 hover:to-emerald-500/10 hover:border-emerald-500/50 transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <CircleDollarSign className="h-4 w-4 text-emerald-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{t.nav.withdraw}</p>
                            <p className="text-[11px] text-emerald-300">
                              {formatUsd(usdValue)} {t.nav.ready}
                            </p>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-emerald-400 shrink-0" />
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent mt-1">
                        <Link
                          href="/boost"
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
                              {t.nav.boostVisibility}
                            </p>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-orange-400 shrink-0" />
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-white/10 my-1.5" />

                      {/* Revenue-critical links */}
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/bookings" className="w-full">
                          <Calendar className="mr-2 h-4 w-4 text-pink-400" />
                          {t.nav.bookings}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/bids/manage" className="w-full">
                          <Gavel className="mr-2 h-4 w-4 text-violet-400" />
                          {t.nav.bids}
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-white/10 my-1.5" />

                      {/* Secondary creator links */}
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/analytics" className="w-full">
                          <BarChart3 className="mr-2 h-4 w-4 text-cyan-400" />
                          {t.nav.analytics}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/comp-card" className="w-full">
                          <Camera className="mr-2 h-4 w-4 text-pink-400" />
                          {t.nav.compCard}
                        </Link>
                      </DropdownMenuItem>
                      {user.username && (
                        <>
                          <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                            <Link href={`/${user.username}`} className="w-full">
                              <Eye className="mr-2 h-4 w-4 text-violet-400" />
                              {t.nav.viewAsFan}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                            <Link
                              href={`/${user.username}?share=1`}
                              className="w-full"
                            >
                              <Share2 className="mr-2 h-4 w-4 text-cyan-400" />
                              {t.nav.shareProfile}
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                    </>
                  )}

                  {/* Fan-specific items */}
                  {actorType === "fan" && (
                    <>
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/bids" className="w-full">
                          <Gavel className="mr-2 h-4 w-4 text-violet-400" />
                          {t.nav.bids}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASS}>
                        <Link href="/my-content" className="w-full">
                          <FolderHeart className="mr-2 h-4 w-4 text-pink-400" />
                          {t.nav.myContent}
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-white/10 my-1.5" />

                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <Link
                          href="/boost"
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-orange-500/15 to-pink-500/10 border border-orange-500/25 hover:from-orange-500/25 hover:to-pink-500/15 hover:border-orange-500/50 transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                            <Flame className="h-4 w-4 text-orange-300" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">
                              {t.nav.exaBoost}
                            </p>
                            <p className="text-[11px] text-orange-300">
                              {t.nav.priorityInFeeds}
                            </p>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-orange-400 shrink-0" />
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
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/signin">{t.nav.signIn}</Link>
              </Button>
              <Button
                asChild
                className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 shadow-[0_0_16px_rgba(236,72,153,0.4)]"
              >
                <Link href="/signup">{t.nav.signUp}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
