import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";
import { createServiceRoleClient } from "@/lib/supabase/service";

interface TransactionRow {
  id: string;
  actor_id: string;
  amount: number;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const GET = withAuth(
  async ({ request, supabase }) => {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(Math.max(1, parseInt(searchParams.get("pageSize") || "20")), 100);
  const action = searchParams.get("action") || null;
  const cursor = searchParams.get("cursor") || null; // created_at cursor for Load More
  const cursorId = searchParams.get("cursorId") || null; // tie-breaker for equal timestamps
  const q = (searchParams.get("q") || "").trim();

  // Service client: models email/first_name/last_name not column-granted to client roles (Phase B2 lockdown)
  const serviceClient = createServiceRoleClient();

  // User search: resolve email/name/username matches to actor ids first
  let searchActorIds: string[] | null = null;
  if (q) {
    // strip chars that break PostgREST or() syntax, escape ilike wildcards
    const pattern = `%${q.replace(/[,()]/g, " ").replace(/[%_]/g, "\\$&").trim()}%`;
    const [{ data: qFans }, { data: qModels }] = await Promise.all([
      supabase
        .from("fans")
        .select("user_id")
        .or(`email.ilike.${pattern},display_name.ilike.${pattern}`)
        .limit(100) as unknown as Promise<{ data: { user_id: string }[] | null }>,
      serviceClient
        .from("models")
        .select("user_id")
        .or(`email.ilike.${pattern},username.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`)
        .limit(100) as unknown as Promise<{ data: { user_id: string }[] | null }>,
    ]);

    const userIds = [...new Set([...(qFans || []), ...(qModels || [])].map((r) => r.user_id))];
    if (userIds.length === 0) {
      return NextResponse.json({ transactions: [], total: 0, page, pageSize });
    }

    const { data: qActors } = (await supabase
      .from("actors")
      .select("id")
      .in("user_id", userIds)) as { data: { id: string }[] | null };

    searchActorIds = (qActors || []).map((a) => a.id);
    if (searchActorIds.length === 0) {
      return NextResponse.json({ transactions: [], total: 0, page, pageSize });
    }
  }

  // Build query — secondary id ordering makes the cursor stable when several
  // rows share a created_at (the double-entry ledger writes pairs at the same
  // instant, so lt(created_at) alone skips rows)
  let query = supabase
    .from("coin_transactions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (action) {
    query = query.eq("action", action);
  }

  if (searchActorIds) {
    query = query.in("actor_id", searchActorIds);
  }

  if (cursor) {
    // Cursor-based: load items strictly after the (created_at, id) cursor
    if (cursorId) {
      query = query.or(`created_at.lt.${cursor},and(created_at.eq.${cursor},id.lt.${cursorId})`);
    } else {
      query = query.lt("created_at", cursor);
    }
    query = query.limit(pageSize);
  } else {
    // Offset-based fallback
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  const { data: transactions, count } = (await query) as {
    data: TransactionRow[] | null;
    count: number | null;
  };

  const txs = transactions || [];

  // Get user info for these transactions
  const actorIds = [...new Set(txs.map((t) => t.actor_id))];
  if (actorIds.length === 0) {
    return NextResponse.json({
      transactions: [],
      total: count || 0,
      page,
      pageSize,
    });
  }

  const { data: actors } = (await supabase
    .from("actors")
    .select("id, user_id, type")
    .in("id", actorIds)) as {
    data: { id: string; user_id: string; type: string }[] | null;
  };

  const actorMap = new Map((actors || []).map((a) => [a.id, a]));

  // Get fan info
  const fanUserIds =
    (actors || []).filter((a) => a.type === "fan").map((a) => a.user_id) || [];
  const { data: fans } = fanUserIds.length > 0
    ? ((await supabase
        .from("fans")
        .select("user_id, email, display_name")
        .in("user_id", fanUserIds)) as {
        data: { user_id: string; email: string; display_name: string | null }[] | null;
      })
    : { data: [] as { user_id: string; email: string; display_name: string | null }[] };

  const fanMap = new Map((fans || []).map((f) => [f.user_id, f]));

  // Get model info
  const modelUserIds =
    (actors || [])
      .filter((a) => a.type === "model" || a.type === "admin")
      .map((a) => a.user_id) || [];
  const { data: models } = modelUserIds.length > 0
    ? ((await serviceClient
        .from("models")
        .select("user_id, email, first_name, last_name, username")
        .in("user_id", modelUserIds)) as {
        data: {
          user_id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          username: string | null;
        }[] | null;
      })
    : { data: [] as { user_id: string; email: string; first_name: string | null; last_name: string | null; username: string | null }[] };

  const modelMap = new Map((models || []).map((m) => [m.user_id, m]));

  // Enrich transactions with user info
  const enriched = txs.map((tx) => {
    const txActor = actorMap.get(tx.actor_id);
    let name = "";
    let email = "";

    if (txActor?.type === "fan") {
      const fan = fanMap.get(txActor.user_id);
      email = fan?.email || "";
      name = fan?.display_name || email.split("@")[0];
    } else if (txActor?.type === "model" || txActor?.type === "admin") {
      const model = modelMap.get(txActor.user_id);
      email = model?.email || "";
      name =
        [model?.first_name, model?.last_name].filter(Boolean).join(" ") ||
        model?.username ||
        email.split("@")[0];
    }

    return {
      ...tx,
      user_name: name,
      user_email: email,
      user_type: txActor?.type || "unknown",
    };
  });

  return NextResponse.json({
    transactions: enriched,
    total: count || 0,
    page,
    pageSize,
  });
  },
  { requireType: "admin" }
);
