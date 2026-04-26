"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, MessageCircle, Users, Images, Megaphone, Heart, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

interface BottomNavProps {
  user: {
    avatar_url?: string;
    name?: string;
    email?: string;
  };
  actorType: "model" | "brand" | "admin" | "fan" | null;
  unreadCount?: number;
  notificationCount?: number;
}

function NavItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all",
        active ? "text-white" : "text-white/50 hover:text-white/80"
      )}
    >
      {children}
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 shadow-[0_0_10px_rgba(236,72,153,0.7)]" />
      )}
    </Link>
  );
}

export function BottomNav({ user, actorType, unreadCount = 0, notificationCount = 0 }: BottomNavProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const homePath = actorType === "admin" ? "/admin" : "/dashboard";

  const isActive = (path: string) => {
    if (path === homePath) {
      return pathname === "/dashboard" || pathname === "/admin";
    }
    return pathname.startsWith(path);
  };

  // Admin: minimal 3-tab layout
  if (actorType === "admin") {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0a0014]/90 backdrop-blur-xl border-t border-violet-500/15 safe-area-pb shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-around h-16 px-2">
          <NavItem href="/admin" active={isActive("/admin")}>
            <div className="relative">
              <Home className={cn("transition-all", isActive("/admin") ? "h-[22px] w-[22px] text-pink-400" : "h-5 w-5")} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-pink-500 text-white rounded-full shadow-[0_0_8px_rgba(236,72,153,0.7)]">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{t.nav.home}</span>
          </NavItem>

          <NavItem href="/chats" active={isActive("/chats")}>
            <div className="relative">
              <MessageCircle className={cn("transition-all", isActive("/chats") ? "h-[22px] w-[22px] text-pink-400" : "h-5 w-5")} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-pink-500 text-white rounded-full shadow-[0_0_8px_rgba(236,72,153,0.7)]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{t.nav.chats}</span>
          </NavItem>

          <NavItem href="/settings" active={isActive("/settings")}>
            <Avatar className={cn("h-6 w-6 ring-2 transition-all", isActive("/settings") ? "ring-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.6)]" : "ring-white/15")}>
              <AvatarImage src={user.avatar_url} alt={user.name || ""} />
              <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white text-xs">
                {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] font-medium">Me</span>
          </NavItem>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0a0014]/90 backdrop-blur-xl border-t border-violet-500/15 safe-area-pb shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-around h-16 px-2">

        {/* Home — notification badge for models/brands (replaces top bar bell) */}
        <NavItem href={homePath} active={isActive(homePath)}>
          <div className="relative">
            <Home className={cn("transition-all", isActive(homePath) ? "h-[22px] w-[22px] text-pink-400" : "h-5 w-5")} />
            {actorType !== "fan" && notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-pink-500 text-white rounded-full shadow-[0_0_8px_rgba(236,72,153,0.7)]">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">{t.nav.home}</span>
        </NavItem>

        {/* Content (model) or Explore (fan/brand) */}
        {actorType === "model" ? (
          <NavItem href="/content" active={isActive("/content")}>
            <Images className={cn("transition-all", isActive("/content") ? "h-[22px] w-[22px] text-pink-400" : "h-5 w-5")} />
            <span className="text-[10px] font-medium">{t.nav.content}</span>
          </NavItem>
        ) : (
          <NavItem href="/models" active={isActive("/models")}>
            <Users className={cn("transition-all", isActive("/models") ? "h-[22px] w-[22px] text-pink-400" : "h-5 w-5")} />
            <span className="text-[10px] font-medium">{t.nav.explore}</span>
          </NavItem>
        )}

        {/* Chats */}
        <NavItem href="/chats" active={isActive("/chats")}>
          <div className="relative">
            <MessageCircle className={cn("transition-all", isActive("/chats") ? "h-[22px] w-[22px] text-pink-400" : "h-5 w-5")} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-pink-500 text-white rounded-full shadow-[0_0_8px_rgba(236,72,153,0.7)]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">{t.nav.chats}</span>
        </NavItem>

        {/* 4th slot: Bookings (model) | Favorites (fan) | Campaigns (brand) */}
        {actorType === "model" ? (
          <NavItem href="/bookings" active={isActive("/bookings")}>
            <Calendar className={cn("transition-all", isActive("/bookings") ? "h-[22px] w-[22px] text-cyan-400" : "h-5 w-5")} />
            <span className="text-[10px] font-medium">{t.nav.bookings}</span>
          </NavItem>
        ) : actorType === "fan" ? (
          <NavItem href="/favorites" active={isActive("/favorites")}>
            <Heart className={cn("transition-all", isActive("/favorites") ? "h-[22px] w-[22px] text-pink-400 fill-pink-400" : "h-5 w-5")} />
            <span className="text-[10px] font-medium">Favs</span>
          </NavItem>
        ) : (
          <NavItem href="/campaigns" active={isActive("/campaigns")}>
            <Megaphone className={cn("transition-all", isActive("/campaigns") ? "h-[22px] w-[22px] text-pink-400" : "h-5 w-5")} />
            <span className="text-[10px] font-medium">{t.nav.campaigns}</span>
          </NavItem>
        )}

        {/* Me — avatar tab. Bids notification badge for fans (bids moved to profile menu) */}
        <NavItem href="/settings" active={isActive("/settings")}>
          <div className="relative">
            <Avatar
              className={cn(
                "h-6 w-6 ring-2 transition-all",
                isActive("/settings")
                  ? "ring-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.6)]"
                  : "ring-white/15"
              )}
            >
              <AvatarImage src={user.avatar_url} alt={user.name || ""} />
              <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white text-xs">
                {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            {actorType === "fan" && notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-amber-500 text-white rounded-full shadow-[0_0_8px_rgba(245,158,11,0.7)]">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Me</span>
        </NavItem>

      </div>
    </nav>
  );
}
