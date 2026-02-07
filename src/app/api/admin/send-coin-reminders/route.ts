import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendCoinBalanceReminderEmail } from "@/lib/email";

const MINIMUM_COIN_BALANCE = 500; // $50 USD minimum (500 coins * $0.10)

export async function POST() {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use service role client to bypass RLS
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all models with coin_balance >= 500
    const { data: models, error: modelsError } = await adminClient
      .from("models")
      .select("id, first_name, username, user_id")
      .gte("coin_balance", MINIMUM_COIN_BALANCE);

    if (modelsError) {
      console.error("Error fetching models:", modelsError);
      return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
    }

    if (!models || models.length === 0) {
      return NextResponse.json({
        message: "No models with 500+ coins found",
        sent: 0,
        total: 0
      });
    }

    // Get model coin balances from actors table
    const userIds = models.map(m => m.user_id).filter(Boolean);
    const { data: actors } = await adminClient
      .from("actors")
      .select("user_id, coin_balance")
      .in("user_id", userIds);

    const actorBalances = new Map(actors?.map(a => [a.user_id, a.coin_balance]) || []);

    // Get user emails
    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const userEmails = new Map(
      usersData?.users
        ?.filter(u => userIds.includes(u.id))
        .map(u => [u.id, u.email]) || []
    );

    let sentCount = 0;
    const errors: string[] = [];
    const skipped: string[] = [];

    // Send emails to each qualifying model
    for (const model of models) {
      const email = model.user_id ? userEmails.get(model.user_id) : null;
      const coinBalance = model.user_id ? actorBalances.get(model.user_id) : 0;

      if (!email) {
        skipped.push(`${model.username} (no email)`);
        continue;
      }

      if (!coinBalance || coinBalance < MINIMUM_COIN_BALANCE) {
        skipped.push(`${model.username} (actor balance below minimum)`);
        continue;
      }

      try {
        const result = await sendCoinBalanceReminderEmail({
          to: email,
          modelName: model.first_name || model.username,
          coinBalance,
        });

        if (result.success) {
          sentCount++;
          console.log(`Sent coin reminder to ${model.username} (${coinBalance} coins)`);
        } else {
          errors.push(`${model.username}: ${result.error}`);
        }
      } catch (err) {
        console.error(`Failed to send to ${model.username}:`, err);
        errors.push(`${model.username}: ${err}`);
      }
    }

    return NextResponse.json({
      message: `Sent ${sentCount} coin balance reminder emails`,
      sent: sentCount,
      total: models.length,
      skipped: skipped.length > 0 ? skipped : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Send coin reminders error:", error);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}

// GET endpoint to preview which models would receive the email
export async function GET() {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use service role client to bypass RLS
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all models with coin_balance >= 500
    const { data: models } = await adminClient
      .from("models")
      .select("id, first_name, last_name, username, coin_balance, user_id")
      .gte("coin_balance", MINIMUM_COIN_BALANCE)
      .order("coin_balance", { ascending: false });

    if (!models || models.length === 0) {
      return NextResponse.json({
        models: [],
        total: 0,
        totalCoins: 0,
        totalUSD: "$0.00"
      });
    }

    // Get actor coin balances (the authoritative source)
    const userIds = models.map(m => m.user_id).filter(Boolean);
    const { data: actors } = await adminClient
      .from("actors")
      .select("user_id, coin_balance")
      .in("user_id", userIds);

    const actorBalances = new Map(actors?.map(a => [a.user_id, a.coin_balance]) || []);

    const modelsWithBalance = models.map(m => ({
      id: m.id,
      name: `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.username,
      username: m.username,
      coinBalance: m.user_id ? actorBalances.get(m.user_id) || 0 : 0,
      usdValue: `$${((m.user_id ? actorBalances.get(m.user_id) || 0 : 0) * 0.10).toFixed(2)}`,
    })).filter(m => m.coinBalance >= MINIMUM_COIN_BALANCE);

    const totalCoins = modelsWithBalance.reduce((sum, m) => sum + m.coinBalance, 0);

    return NextResponse.json({
      models: modelsWithBalance,
      total: modelsWithBalance.length,
      totalCoins,
      totalUSD: `$${(totalCoins * 0.10).toFixed(2)}`,
    });
  } catch (error) {
    console.error("Get coin reminder preview error:", error);
    return NextResponse.json({ error: "Failed to get preview" }, { status: 500 });
  }
}
