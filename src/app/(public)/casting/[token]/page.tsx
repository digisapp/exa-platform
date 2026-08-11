import { createServiceRoleClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { Metadata } from "next";
import CastingGrid, { type CastingCard } from "@/components/casting/CastingGrid";

// Hearts must always render fresh — this page is a live client-review surface.
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  params: Promise<{ token: string }>;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// The client must see only the models — never the gig title, dates, or
// location (owner call, 2026-08-11) — so the tab title / link preview stays
// generic too. Private share link: never index.
export async function generateMetadata(): Promise<Metadata> {
  return { title: "Available Models | EXA", robots: { index: false, follow: false } };
}

export default async function CastingPage({ params }: Props) {
  const { token } = await params;
  if (!UUID_RE.test(token)) notFound();

  const service = createServiceRoleClient() as any;

  const { data: link } = await service
    .from("gig_casting_links")
    .select("gig_id")
    .eq("token", token)
    .single();
  if (!link) notFound();

  const { data: gig } = await service
    .from("gigs")
    .select("id")
    .eq("id", link.gig_id)
    .single();
  if (!gig) notFound();

  // Privacy: username + photo + stats + social handles only — never real names
  // or ratings. Handles are deliberately included here (owner call): the whole
  // point of this token-gated page is letting a client vet the models, and
  // that means clicking through to their Instagram.
  const { data: rawApps } = await service
    .from("gig_applications")
    .select(
      "id, status, applied_at, instagram_handle, instagram_followers, model:models(id, username, profile_photo_url, height, instagram_name, instagram_followers, tiktok_username, tiktok_followers)"
    )
    .eq("gig_id", gig.id)
    .order("applied_at", { ascending: true });

  const apps = (rawApps || []).filter(
    (a: any) => a.model?.username && !["rejected", "cancelled"].includes(a.status)
  );

  // Models without a profile photo fall back to their first portfolio image
  // (same fallback the admin panel uses; portfolio bucket is public).
  const noPhotoModelIds = apps
    .filter((a: any) => !a.model.profile_photo_url)
    .map((a: any) => a.model.id);
  if (noPhotoModelIds.length > 0) {
    const fallbackByModel: Record<string, string> = {};
    for (const ids of chunk(noPhotoModelIds, 200)) {
      const { data: photos } = await service
        .from("content_items")
        .select("model_id, media_url")
        .in("model_id", ids)
        .eq("status", "portfolio")
        .eq("media_type", "image")
        .order("created_at", { ascending: false });
      for (const photo of photos || []) {
        if (!fallbackByModel[photo.model_id] && photo.media_url) {
          fallbackByModel[photo.model_id] = photo.media_url.startsWith("http")
            ? photo.media_url
            : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/${photo.media_url}`;
        }
      }
    }
    for (const app of apps) {
      if (!app.model.profile_photo_url && fallbackByModel[app.model.id]) {
        app.model.profile_photo_url = fallbackByModel[app.model.id];
      }
    }
  }

  const hearted = new Set<string>();
  for (const ids of chunk(apps.map((a: any) => a.id), 200)) {
    const { data: hearts } = await service
      .from("gig_casting_hearts")
      .select("application_id")
      .in("application_id", ids);
    for (const h of hearts || []) hearted.add(h.application_id);
  }

  // Handles can arrive as "@name" or full profile URLs — reduce to the bare handle
  const cleanHandle = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    const handle = raw
      .replace(/^https?:\/\/(www\.)?(instagram\.com|tiktok\.com)\//i, "")
      .replace(/^@/, "")
      .split(/[/?#]/)[0]
      .trim();
    return handle || null;
  };

  const cards: CastingCard[] = apps.map((a: any) => ({
    applicationId: a.id,
    username: a.model.username,
    photoUrl: a.model.profile_photo_url || null,
    height: a.model.height || null,
    instagramHandle: cleanHandle(a.instagram_handle) || cleanHandle(a.model.instagram_name),
    instagramFollowers: a.instagram_followers ?? a.model.instagram_followers ?? null,
    tiktokHandle: cleanHandle(a.model.tiktok_username),
    tiktokFollowers: a.model.tiktok_followers || null,
    liked: hearted.has(a.id),
  }));

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-white/[0.06]">
        <div className="container px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
            EXA
          </Link>
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">
            Model Selects
          </span>
        </div>
      </header>

      <main className="container px-4 md:px-8 py-8 max-w-6xl">
        {/* Deliberately no gig title, type, location, or dates — the client
            sees only the models (owner call, 2026-08-11). */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Available Models</h1>

        <div className="rounded-2xl border border-pink-500/20 bg-pink-500/[0.05] p-4 mb-6 flex items-start gap-3">
          <Heart className="h-5 w-5 text-pink-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-white/75">
            Tap the heart on the models you&apos;d like for this casting — your picks are
            saved instantly and shared with the EXA team. Tap a photo to view a
            model&apos;s full profile, or their Instagram handle to open it directly.
          </p>
        </div>

        {cards.length === 0 ? (
          <div className="text-center py-20 text-white/40">
            No applicants yet — check back soon.
          </div>
        ) : (
          <CastingGrid token={token} cards={cards} />
        )}
      </main>
    </div>
  );
}
