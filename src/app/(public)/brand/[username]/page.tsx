import { createServiceRoleClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Globe, CheckCircle, Building2, Crown, ArrowLeft, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const revalidate = 60;

interface Props {
  params: Promise<{ username: string }>;
}

async function getBrand(username: string) {
  const db = createServiceRoleClient();
  const { data } = await (db.from("brands") as any)
    .select("id, company_name, contact_name, bio, website, logo_url, is_verified, subscription_tier, username, created_at")
    .eq("username", username)
    .single();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const brand = await getBrand(username);
  if (!brand) return { title: "Brand Not Found" };
  return {
    title: `${brand.company_name} | EXA Models`,
    description: brand.bio || `${brand.company_name} on EXA Models`,
    openGraph: {
      title: brand.company_name,
      description: brand.bio || `${brand.company_name} on EXA Models`,
      images: brand.logo_url ? [brand.logo_url] : [],
    },
  };
}

const TIER_LABELS: Record<string, string> = {
  free: "Partner",
  discovery: "Discovery",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default async function BrandPublicProfile({ params }: Props) {
  const { username } = await params;
  const brand = await getBrand(username);

  if (!brand) notFound();

  const showBadge = brand.subscription_tier === "pro" || brand.subscription_tier === "enterprise";
  const joinedYear = new Date(brand.created_at).getFullYear();

  return (
    <div className="min-h-screen bg-background">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute top-64 right-1/4 w-80 h-80 rounded-full bg-blue-500/6 blur-3xl" />
      </div>

      <div className="relative container max-w-2xl px-4 py-12 mx-auto space-y-8">
        {/* Back link */}
        <Link
          href="/models"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Browse Models
        </Link>

        {/* Profile card */}
        <div
          className="rounded-2xl border border-white/10 p-8"
          style={{
            background:
              "linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(59,130,246,0.05) 50%, rgba(139,92,246,0.08) 100%)",
          }}
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Logo */}
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center shrink-0">
              {brand.logo_url ? (
                <Image
                  src={brand.logo_url}
                  alt={brand.company_name}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="h-10 w-10 text-cyan-400/60" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <h1 className="text-2xl font-bold text-white">{brand.company_name}</h1>
                {brand.is_verified && (
                  <CheckCircle className="h-5 w-5 text-cyan-400 shrink-0" />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-4">
                {showBadge && (
                  <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    {TIER_LABELS[brand.subscription_tier]}
                  </Badge>
                )}
                {brand.is_verified && (
                  <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-xs">
                    Verified Brand
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">Partner since {joinedYear}</span>
              </div>

              {brand.bio && (
                <p className="text-sm text-white/70 leading-relaxed max-w-prose">{brand.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3">
          {brand.website && (
            <a
              href={brand.website.startsWith("http") ? brand.website : `https://${brand.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-cyan-500/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                <Globe className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Website</p>
                <p className="text-sm text-cyan-400 group-hover:text-cyan-300 truncate transition-colors">
                  {brand.website.replace(/^https?:\/\/(www\.)?/, "")}
                </p>
              </div>
            </a>
          )}

          {brand.contact_name && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-white/8 bg-white/[0.02]">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contact</p>
                <p className="text-sm text-white/80">{brand.contact_name}</p>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            asChild
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            <Link href="/models">Browse Models on EXA</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 border-white/10 hover:border-white/20">
            <Link href="/signup">Join EXA</Link>
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground">
          This brand profile is on{" "}
          <Link href="/" className="text-cyan-500 hover:text-cyan-400">
            EXA Models
          </Link>{" "}
          — the platform connecting brands with professional models.
        </p>
      </div>
    </div>
  );
}
