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
  MessageCircle,
  Settings,
  Coins,
  Images,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";

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
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/content", label: "Content", icon: Images },
];

const fanLinks = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/models", label: "Explore", icon: Users },
  { href: "/chats", label: "Chats", icon: MessageCircle },
];

const brandLinks = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/models", label: "Explore", icon: Users },
  { href: "/chats", label: "Chats", icon: MessageCircle },
];

const adminLinks = [
  { href: "/admin", label: "Home", icon: Home },
  { href: "/chats", label: "Chats", icon: MessageCircle },
];

export function Navbar({ user, actorType, coinBalance = 0 }: NavbarProps) {
  const pathname = usePathname();
  const links = actorType === "admin"
    ? adminLinks
    : actorType === "model"
      ? modelLinks
      : actorType === "fan"
        ? fanLinks
        : actorType === "brand"
          ? brandLinks
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
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Coin Balance */}
              <Link
                href="/wallet"
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 hover:border-yellow-500/50 hover:from-yellow-500/30 hover:to-orange-500/30 transition-all shadow-sm"
              >
                <Coins className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-semibold">{coinBalance.toLocaleString()}</span>
              </Link>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 ring-2 ring-pink-500/50 hover:ring-pink-500 transition-all">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url} alt={user.name || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white">
                        {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  {user.username ? (
                    <Link href={`/${user.username}`} className="block">
                      <DropdownMenuLabel className="font-normal cursor-pointer hover:bg-accent rounded-sm">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
                          <p className="text-xs leading-none text-pink-500 hover:text-pink-600">
                            examodels.com/{user.username}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                    </Link>
                  ) : (
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/wallet" className="cursor-pointer">
                      <Coins className="mr-2 h-4 w-4" />
                      Wallet
                      <span className="ml-auto text-xs text-muted-foreground">
                        {coinBalance.toLocaleString()}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                  {actorType === "brand" && (
                    <DropdownMenuItem asChild>
                      <Link href="/brands/subscription" className="cursor-pointer">
                        <Crown className="mr-2 h-4 w-4" />
                        Subscription
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {actorType !== "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="p-0">
                    <LogoutButton className="cursor-pointer text-red-500 flex items-center w-full px-2 py-1.5" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/signin">Sign In</Link>
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
                  href="/wallet"
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
