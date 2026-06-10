import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { RosterGallery, type RosterModel } from "@/components/roster/RosterGallery";

interface PageProps {
  params: Promise<{ token: string }>;
}

const MODEL_FIELDS = `
  id, username, first_name, last_name, profile_photo_url,
  height, hair_color, eye_color, bust, waist, hips, dress_size, shoe_size,
  city, state, focus_tags, is_verified,
  instagram_name, instagram_followers, tiktok_username, tiktok_followers
`;

const resolveMediaUrl = (url: string | null) =>
  !url ? null : url.startsWith("http")
    ? url
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/${url}`;

async function getRoster(token: string) {
  // Cast to any: model_rosters / roster_models are newer than the generated DB types.
  const admin = createServiceRoleClient() as any;
  const { data: roster } = await admin
    .from("model_rosters")
    .select("id, title, client_name, note, expires_at, revoked_at")
    .eq("share_token", token)
    .single();
  return { admin, roster };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const { roster } = await getRoster(token);
  if (!roster) return { title: "Roster Not Found | EXA Models" };
  return {
    title: `${roster.title} | EXA Models`,
    description: "A curated model roster from EXA Models.",
    robots: { index: false, follow: false }, // private share link — keep out of search
  };
}

export default async function RosterPage({ params }: PageProps) {
  const { token } = await params;
  const { admin, roster } = await getRoster(token);

  if (!roster) notFound();

  const isRevoked = !!roster.revoked_at;
  const isExpired = !!roster.expires_at && new Date(roster.expires_at) < new Date();

  if (isRevoked || isExpired) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-6 text-center">
        <Link href="/" className="mb-5" aria-label="EXA Models home">
          <Image src="/exa-logo-white.png" alt="EXA Models" width={120} height={48} className="h-10 w-auto" priority />
        </Link>
        <p className="text-white/70 max-w-sm">
          This roster link is no longer active. Please reach out to your EXA contact for an updated link.
        </p>
      </div>
    );
  }

  // Ordered model ids for this roster
  const { data: links } = await admin
    .from("roster_models")
    .select("model_id, position")
    .eq("roster_id", roster.id)
    .order("position", { ascending: true });

  const orderedIds = (links || []).map((l: { model_id: string }) => l.model_id);

  let models: RosterModel[] = [];
  if (orderedIds.length > 0) {
    const { data: modelRows, error: modelErr } = await admin
      .from("models")
      .select(MODEL_FIELDS)
      .in("id", orderedIds);
    if (modelErr) console.error("Roster models fetch failed:", modelErr);

    // Portfolio images for all models in one query
    const { data: photos } = await admin
      .from("content_items")
      .select("model_id, media_url, is_primary, created_at")
      .in("model_id", orderedIds)
      .eq("status", "portfolio")
      .eq("media_type", "image")
      .order("created_at", { ascending: false });

    const photoMap = new Map<string, string[]>();
    (photos || []).forEach((p: { model_id: string; media_url: string | null; is_primary: boolean }) => {
      const url = resolveMediaUrl(p.media_url);
      if (!url) return;
      const arr = photoMap.get(p.model_id) || [];
      if (p.is_primary) arr.unshift(url); else arr.push(url);
      photoMap.set(p.model_id, arr.slice(0, 12));
    });

    const byId = new Map<string, any>((modelRows || []).map((m: any) => [m.id, m]));
    models = orderedIds
      .map((id: string) => byId.get(id))
      .filter(Boolean)
      .map((m: any): RosterModel => ({ ...m, photos: photoMap.get(m.id) || [] }));
  }

  // Best-effort view counter — await so it reliably runs before the response is sent
  // (un-awaited promises in a server component may be cancelled). Swallow errors.
  try {
    await admin.rpc("increment_roster_view", { p_token: token });
  } catch {
    // counting is non-critical
  }

  return (
    <RosterGallery
      title={roster.title}
      clientName={roster.client_name}
      note={roster.note}
      models={models}
    />
  );
}
