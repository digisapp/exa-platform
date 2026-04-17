import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Sparkles,
  Building2,
  Coins,
  CreditCard,
  Heart,
  BarChart3,
  Banknote,
  AtSign,
  Send,
  Calendar,
  GraduationCap,
  Phone,
  Flame,
  MessageCircle,
  Camera,
  FolderOpen,
  Printer,
  ShoppingBag,
  Plane,
  Megaphone,
  Mail,
  ListOrdered,
  Ticket,
  Image as ImageIcon,
} from "lucide-react";

type Color =
  | "pink"
  | "violet"
  | "cyan"
  | "amber"
  | "emerald"
  | "rose"
  | "blue"
  | "purple"
  | "orange"
  | "indigo"
  | "teal";

const COLOR_RGB: Record<Color, string> = {
  pink: "236,72,153",
  violet: "167,139,250",
  cyan: "34,211,238",
  amber: "245,158,11",
  emerald: "52,211,153",
  rose: "244,63,94",
  blue: "59,130,246",
  purple: "168,85,247",
  orange: "249,115,22",
  indigo: "99,102,241",
  teal: "20,184,166",
};

type QuickAction = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: Color;
  subtitle?: string;
  featured?: boolean;
};

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Check if admin
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "admin") {
    redirect("/dashboard");
  }

  // Get stats
  const { count: totalModels } = await (supabase.from("models") as any).select("*", { count: "exact", head: true }).not("user_id", "is", null);
  const { count: totalFans } = await supabase.from("fans").select("*", { count: "exact", head: true });
  const { count: totalTransactions } = await supabase.from("coin_transactions").select("*", { count: "exact", head: true });
  const { count: pendingModelApps } = await (supabase.from("model_applications") as any).select("*", { count: "exact", head: true }).eq("status", "pending");
  const { count: pendingBrands } = await (supabase.from("brands") as any).select("*", { count: "exact", head: true }).eq("is_verified", false);
  const { count: pendingCalls } = await (supabase.from("call_requests") as any).select("*", { count: "exact", head: true }).eq("status", "pending");

  const { data: modelBalances } = await supabase.from("models").select("coin_balance") as { data: { coin_balance: number }[] | null };
  const { data: fanBalances } = await supabase.from("fans").select("coin_balance") as { data: { coin_balance: number }[] | null };

  const totalCoins = (modelBalances?.reduce((sum, m) => sum + (m.coin_balance || 0), 0) || 0) +
                     (fanBalances?.reduce((sum, f) => sum + (f.coin_balance || 0), 0) || 0);

  const pendingTotal = (pendingModelApps || 0) + (pendingBrands || 0);

  const quickActions: QuickAction[] = [
    {
      href: "/admin/community",
      label: "Community",
      icon: Users,
      color: "pink",
      subtitle: pendingTotal > 0 ? `${pendingTotal} pending` : undefined,
    },
    { href: "/admin/traffic", label: "Traffic", icon: BarChart3, color: "blue" },
    { href: "/admin/transactions", label: "Purchases", icon: Coins, color: "amber" },
    { href: "/admin/payouts", label: "Payouts", icon: Banknote, color: "emerald" },
    { href: "/admin/usernames", label: "Usernames", icon: AtSign, color: "purple" },
    { href: "/admin/gigs", label: "Manage Gigs", icon: Sparkles, color: "violet" },
    { href: "/admin/shows", label: "Show Lineups", icon: ListOrdered, color: "pink", featured: true },
    { href: "/admin/flyers", label: "Model Flyers", icon: ImageIcon, color: "rose", featured: true },
    { href: "/admin/events", label: "Events & Tickets", icon: Ticket, color: "pink", featured: true },
    {
      href: "/admin/brands",
      label: "Brands",
      icon: Building2,
      color: "violet",
      subtitle: (pendingBrands || 0) > 0 ? `${pendingBrands} unverified` : undefined,
    },
    { href: "/admin/crm?tab=brands", label: "Brand Outreach", icon: Megaphone, color: "pink" },
    { href: "/admin/offers", label: "Brand Offers", icon: Send, color: "cyan" },
    { href: "/admin/calendar", label: "Calendar", icon: Calendar, color: "orange" },
    { href: "/admin/workshops", label: "Workshops", icon: GraduationCap, color: "rose" },
    {
      href: "/admin/crm",
      label: "Call Queue",
      icon: Phone,
      color: "pink",
      subtitle: (pendingCalls || 0) > 0 ? `${pendingCalls} pending` : undefined,
    },
    { href: "/admin/travel", label: "EXA Travel", icon: Plane, color: "violet", featured: true },
    { href: "/admin/boost", label: "EXA Boost", icon: Flame, color: "orange", featured: true },
    { href: "/admin/exa-dolls", label: "EXA Dolls", icon: Sparkles, color: "pink", featured: true },
    { href: "/admin/messages", label: "Messages", icon: MessageCircle, color: "indigo" },
    { href: "/admin/email", label: "Email", icon: Mail, color: "blue" },
    { href: "/admin/studio", label: "Studio", icon: Camera, color: "teal" },
    { href: "/admin/media-hub", label: "Media Hub", icon: FolderOpen, color: "amber" },
    { href: "/admin/comp-card-leads", label: "Comp Cards", icon: Camera, color: "rose" },
    { href: "/admin/print-queue", label: "Print Queue", icon: Printer, color: "purple" },
    { href: "/admin/shop", label: "Shop", icon: ShoppingBag, color: "emerald" },
  ];

  return (
    <div className="container px-4 md:px-8 lg:px-16 py-8 space-y-6">
      {/* ───── Hero ───── */}
      <section
        className="relative overflow-hidden rounded-3xl border border-white/10 p-5 md:p-7"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,105,180,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(0,191,255,0.12) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-pink-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">Admin</p>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
            <span className="exa-gradient-text">Control Center</span>
          </h1>
          <p className="text-xs md:text-sm text-white/60 mt-1">
            Platform overview and operational shortcuts.
          </p>
        </div>
      </section>

      {/* ───── Stat KPIs ───── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 ring-1 ring-blue-500/30">
              <Users className="h-5 w-5 text-blue-300" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Models</p>
              <p className="text-2xl font-bold text-white">{totalModels?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-pink-500/25 bg-gradient-to-br from-pink-500/10 to-pink-500/5 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-pink-500/20 ring-1 ring-pink-500/30">
              <Heart className="h-5 w-5 text-pink-300 fill-pink-300/40" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Fans</p>
              <p className="text-2xl font-bold text-white">{totalFans?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 ring-1 ring-amber-500/30">
              <Coins className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Coins</p>
              <p className="text-2xl font-bold text-white">{totalCoins.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/30">
              <CreditCard className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Transactions</p>
              <p className="text-2xl font-bold text-white">{totalTransactions?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Quick actions grid ───── */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {quickActions.map((action) => {
          const rgb = COLOR_RGB[action.color];
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm hover:bg-white/[0.06] transition-all p-4 flex flex-col items-center gap-2 text-center"
              style={{
                boxShadow: `0 0 0 1px rgba(${rgb}, 0)`,
                transition: "all 0.2s",
              } as React.CSSProperties}
            >
              {/* Hover glow backdrop */}
              <div
                className="pointer-events-none absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity"
                style={{ background: `rgba(${rgb}, 0.4)` }}
              />
              <div
                className="relative p-2 rounded-xl ring-1 transition-all group-hover:scale-110"
                style={{
                  background: `rgba(${rgb}, 0.15)`,
                  boxShadow: `inset 0 0 0 1px rgba(${rgb}, 0.3)`,
                  color: `rgba(${rgb}, 1)`,
                }}
              >
                <action.icon className="h-5 w-5" />
              </div>
              <span
                className={`relative text-sm font-semibold ${
                  action.featured
                    ? "bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent"
                    : "text-white/90 group-hover:text-white"
                }`}
              >
                {action.label}
              </span>
              {action.subtitle && (
                <span className="relative text-[10px] text-white/50 group-hover:text-white/70 transition-colors">
                  {action.subtitle}
                </span>
              )}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
