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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  Home,
  Users,
  Sparkles,
  MessageCircle,
  Bell,
  Settings,
  LogOut,
  User,
  Trophy,
  Coins,
  TrendingUp,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  user?: {
    id: string;
    email: string;
    avatar_url?: string;
    name?: string;
    username?: string;
  } | null;
  actorType?: "model" | "brand" | "admin" | "fan" | null;
  coinBalance?: number;
}

const publicLinks: { href: string; label: string; icon: any }[] = [];

const modelLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/models", label: "Browse", icon: Users },
  { href: "/opportunities", label: "Opportunities", icon: Sparkles },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/content", label: "Content", icon: Lock },
  { href: "/earnings", label: "Earnings", icon: TrendingUp },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const fanLinks = [
  { href: "/models", label: "Browse Models", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/coins", label: "Buy Coins", icon: Coins },
];

const adminLinks = [
  { href: "/admin", label: "Admin", icon: Settings },
  ...modelLinks,
];

export function Navbar({ user, actorType, coinBalance = 0 }: NavbarProps) {
  const pathname = usePathname();
  const links = actorType === "admin"
    ? adminLinks
    : actorType === "model"
      ? modelLinks
      : actorType === "fan"
        ? fanLinks
        : publicLinks;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-8 md:px-16 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/exa-logo-white.png"
            alt="EXA"
            width={80}
            height={32}
            className="h-8 w-auto"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* Coin Balance */}
              <Link
                href="/coins"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500/10 to-violet-500/10 hover:from-pink-500/20 hover:to-violet-500/20 transition-colors"
              >
                <Coins className="h-4 w-4 text-pink-500" />
                <span className="text-sm font-medium">{coinBalance.toLocaleString()}</span>
              </Link>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="hidden md:flex">
                <Bell className="h-5 w-5" />
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar_url} alt={user.name || ""} />
                      <AvatarFallback>
                        {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/coins" className="cursor-pointer">
                      <Coins className="mr-2 h-4 w-4" />
                      Buy Coins
                      <span className="ml-auto text-xs text-muted-foreground">
                        {coinBalance.toLocaleString()}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                  {(actorType === "model" || actorType === "admin") && (
                    <DropdownMenuItem asChild>
                      <Link href="/earnings" className="cursor-pointer">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Earnings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/auth/logout" className="cursor-pointer text-red-500">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
                <Link href="/signup">Join EXA</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              {/* Mobile Coin Balance */}
              {user && (
                <Link
                  href="/coins"
                  className="flex items-center gap-2 px-4 py-3 mt-4 rounded-lg bg-gradient-to-r from-pink-500/10 to-violet-500/10"
                >
                  <Coins className="h-5 w-5 text-pink-500" />
                  <span className="font-medium">{coinBalance.toLocaleString()} Coins</span>
                </Link>
              )}
              <nav className="flex flex-col gap-4 mt-8">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 text-lg font-medium transition-colors hover:text-primary p-2 rounded-lg",
                      pathname === link.href
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground"
                    )}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
