import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { MODEL_EARNING_ACTIONS } from "@/lib/coin-config";
import { batchQuery, fetchPaged } from "@/lib/supabase/batch";

const MAX_MODELS = 10000;
const TOP_N = 30;

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createServiceRoleClient();

    // All claimed, active models (same population as /admin/models)
    const { rows: models } = await fetchPaged<any>((from, to) =>
      adminClient.from("models")
        .select("id, user_id, username, first_name, last_name, profile_photo_url, profile_views")
        .not("user_id", "is", null)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
      MAX_MODELS
    );

    if (models.length === 0) {
      return NextResponse.json({ leaderboards: {}, modelCount: 0 });
    }

    const modelIds = models.map((m: any) => m.id);
    const userIds = models.map((m: any) => m.user_id).filter(Boolean);

    const actors = userIds.length > 0
      ? await batchQuery<any>(userIds, async (batch, from, to) =>
          adminClient.from("actors").select("id, user_id").in("user_id", batch).order("id", { ascending: true }).range(from, to)
        )
      : [];
    const userToActor = new Map(actors.map((a: any) => [a.user_id, a.id]));
    const actorIds = actors.map((a: any) => a.id);

    const [paidData, picsData, vidsData, followData, earningsData, referralData] = await Promise.all([
      batchQuery<any>(modelIds, async (batch, from, to) =>
        (adminClient as any).from("content_items").select("model_id").in("model_id", batch).eq("status", "exclusive").order("id", { ascending: true }).range(from, to)
      ),
      batchQuery<any>(modelIds, async (batch, from, to) =>
        (adminClient as any).from("content_items").select("model_id").in("model_id", batch).eq("status", "portfolio").eq("media_type", "image").order("id", { ascending: true }).range(from, to)
      ),
      batchQuery<any>(modelIds, async (batch, from, to) =>
        (adminClient as any).from("content_items").select("model_id").in("model_id", batch).eq("status", "portfolio").eq("media_type", "video").order("id", { ascending: true }).range(from, to)
      ),
      actorIds.length > 0
        ? batchQuery<any>(actorIds, async (batch, from, to) =>
            adminClient.from("follows").select("following_id").in("following_id", batch).order("follower_id", { ascending: true }).order("following_id", { ascending: true }).range(from, to)
          )
        : Promise.resolve([]),
      actorIds.length > 0
        ? batchQuery<any>(actorIds, async (batch, from, to) =>
            adminClient.from("coin_transactions")
              .select("actor_id, amount")
              .in("actor_id", batch)
              .in("action", [...MODEL_EARNING_ACTIONS])
              .order("id", { ascending: true })
              .range(from, to)
          )
        : Promise.resolve([]),
      batchQuery<any>(modelIds, async (batch, from, to) =>
        adminClient.from("fans").select("referred_by_model_id").in("referred_by_model_id", batch).order("id", { ascending: true }).range(from, to)
      ),
    ]);

    const countBy = (rows: any[], key: string) => {
      const map = new Map<string, number>();
      rows.forEach((r: any) => map.set(r[key], (map.get(r[key]) || 0) + 1));
      return map;
    };
    const paidMap = countBy(paidData, "model_id");
    const picsMap = countBy(picsData, "model_id");
    const vidsMap = countBy(vidsData, "model_id");
    const followMap = countBy(followData, "following_id");
    const referralMap = countBy(referralData, "referred_by_model_id");
    const earningsMap = new Map<string, number>();
    earningsData.forEach((tx: any) => {
      earningsMap.set(tx.actor_id, (earningsMap.get(tx.actor_id) || 0) + tx.amount);
    });

    const scored = models.map((m: any) => {
      const actorId = userToActor.get(m.user_id);
      return {
        id: m.id,
        username: m.username,
        name: m.first_name ? `${m.first_name} ${m.last_name || ""}`.trim() : m.username,
        profile_photo_url: m.profile_photo_url,
        paid: paidMap.get(m.id) || 0,
        pics: picsMap.get(m.id) || 0,
        vids: vidsMap.get(m.id) || 0,
        views: m.profile_views || 0,
        favorites: actorId ? (followMap.get(actorId as string) || 0) : 0,
        earned: actorId ? (earningsMap.get(actorId as string) || 0) : 0,
        referrals: referralMap.get(m.id) || 0,
      };
    });

    // Top N per metric, zero-value rows excluded (a rank of zeros isn't a leaderboard)
    const top = (metric: string) =>
      [...scored]
        .filter((m: any) => m[metric] > 0)
        .sort((a: any, b: any) => b[metric] - a[metric])
        .slice(0, TOP_N)
        .map((m: any) => ({
          id: m.id,
          username: m.username,
          name: m.name,
          profile_photo_url: m.profile_photo_url,
          value: m[metric],
        }));

    return NextResponse.json(
      {
        leaderboards: {
          paid: top("paid"),
          pics: top("pics"),
          vids: top("vids"),
          views: top("views"),
          favorites: top("favorites"),
          earned: top("earned"),
          referrals: top("referrals"),
        },
        modelCount: models.length,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load leaderboards";
    console.error("Admin leaderboards error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
