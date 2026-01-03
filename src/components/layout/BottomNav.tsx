"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, MessageCircle, Coins, Users, Images, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  user: {
    avatar_url?: string;
    name?: string;
    email?: string;
  };
  actorType: "model" | "brand" | "admin" | "fan" | null;
  coinBalance: number;
  unreadCount?: number;
}

export function BottomNav({ user, actorType, coinBalance, unreadCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  // Determine home path based on actor type
  const homePath = actorType === "admin" ? "/admin" : "/dashboard";

  // Check if current path matches
  const isActive = (path: string) => {
    if (path === homePath) {
      return pathname === "/dashboard" || pathname === "/admin";
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border/40 safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {/* Home */}
        <Link
          href={homePath}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
            isActive(homePath) ? "text-pink-500" : "text-muted-foreground"
          )}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* Explore (for fans/brands) or Bookings (for models) */}
        {actorType === "fan" || actorType === "brand" ? (
          <Link
            href="/models"
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
              isActive("/models") ? "text-pink-500" : "text-muted-foreground"
            )}
          >
            <Users className="h-5 w-5" />
            <span className="text-[10px] font-medium">Explore</span>
          </Link>
        ) : actorType === "model" ? (
          <Link
            href="/bookings"
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
              isActive("/bookings") ? "text-pink-500" : "text-muted-foreground"
            )}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] font-medium">Bookings</span>
          </Link>
        ) : null}

        {/* Chats */}
        <Link
          href="/chats"
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
            isActive("/chats") ? "text-pink-500" : "text-muted-foreground"
          )}
        >
          <div className="relative">
            <MessageCircle className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-pink-500 text-white rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Chats</span>
        </Link>

        {/* Wallet */}
        <Link
          href="/wallet"
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
            isActive("/wallet") ? "text-pink-500" : "text-muted-foreground"
          )}
        >
          <div className="relative">
            <Coins className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium tabular-nums">
            {coinBalance.toLocaleString()}
          </span>
        </Link>

        {/* Profile */}
        <Link
          href="/profile"
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
            isActive("/profile") ? "text-pink-500" : "text-muted-foreground"
          )}
        >
          <Avatar className={cn(
            "h-6 w-6 ring-2 transition-all",
            isActive("/profile") ? "ring-pink-500" : "ring-transparent"
          )}>
            <AvatarImage src={user.avatar_url} alt={user.name || ""} />
            <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white text-xs">
              {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
