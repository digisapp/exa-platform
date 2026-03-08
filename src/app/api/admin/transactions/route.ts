import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface TransactionRow {
  id: string;
  actor_id: string;
  amount: number;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin check
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(Math.max(1, parseInt(searchParams.get("pageSize") || "20")), 100);
  const action = searchParams.get("action") || null;
  const cursor = searchParams.get("cursor") || null; // created_at cursor for Load More

  // Build query
  let query = supabase
    .from("coin_transactions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (action) {
    query = query.eq("action", action);
  }

  if (cursor) {
    // Cursor-based: load items older than cursor
    query = query.lt("created_at", cursor);
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
    ? ((await supabase
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
}
