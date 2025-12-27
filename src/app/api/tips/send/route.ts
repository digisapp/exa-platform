import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { recipientUsername, amount } = body;

    // Validate inputs
    if (!recipientUsername) {
      return NextResponse.json(
        { error: "Recipient username required" },
        { status: 400 }
      );
    }

    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: "Invalid tip amount" },
        { status: 400 }
      );
    }

    // Get sender's actor info and balance
    const { data: sender } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 400 });
    }

    // Get sender's coin balance
    let senderBalance = 0;
    if (sender.type === "fan") {
      const { data: fan } = await supabase
        .from("fans")
        .select("coin_balance")
        .eq("id", sender.id)
        .single() as { data: { coin_balance: number } | null };
      senderBalance = fan?.coin_balance || 0;
    } else if (sender.type === "model") {
      const { data: model } = await supabase
        .from("models")
        .select("coin_balance")
        .eq("user_id", user.id)
        .single() as { data: { coin_balance: number } | null };
      senderBalance = model?.coin_balance || 0;
    }

    if (senderBalance < amount) {
      return NextResponse.json(
        { error: `Insufficient balance. You have ${senderBalance} coins.` },
        { status: 402 }
      );
    }

    // Get recipient model by username
    const { data: recipientModel } = await supabase
      .from("models")
      .select("id, user_id, first_name, username")
      .eq("username", recipientUsername)
      .single() as { data: { id: string; user_id: string; first_name: string | null; username: string } | null };

    if (!recipientModel) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    // Get recipient's actor ID
    const { data: recipientActor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", recipientModel.user_id)
      .single() as { data: { id: string } | null };

    if (!recipientActor) {
      return NextResponse.json(
        { error: "Recipient actor not found" },
        { status: 404 }
      );
    }

    // Can't tip yourself
    if (sender.id === recipientActor.id) {
      return NextResponse.json(
        { error: "Cannot tip yourself" },
        { status: 400 }
      );
    }

    // Deduct from sender
    if (sender.type === "fan") {
      await (supabase
        .from("fans") as any)
        .update({ coin_balance: senderBalance - amount })
        .eq("id", sender.id);
    } else if (sender.type === "model") {
      await (supabase
        .from("models") as any)
        .update({ coin_balance: senderBalance - amount })
        .eq("user_id", user.id);
    }

    // Add to recipient model
    const { data: currentRecipient } = await supabase
      .from("models")
      .select("coin_balance")
      .eq("id", recipientModel.id)
      .single() as { data: { coin_balance: number } | null };

    await (supabase
      .from("models") as any)
      .update({ coin_balance: (currentRecipient?.coin_balance || 0) + amount })
      .eq("id", recipientModel.id);

    // Log transaction for sender (debit)
    await (supabase.from("coin_transactions") as any).insert({
      actor_id: sender.id,
      amount: -amount,
      action: "tip_sent",
      metadata: {
        recipient_username: recipientUsername,
        recipient_model_id: recipientModel.id,
      },
    });

    // Log transaction for recipient (credit)
    await (supabase.from("coin_transactions") as any).insert({
      actor_id: recipientActor.id,
      amount: amount,
      action: "tip_received",
      metadata: {
        sender_actor_id: sender.id,
      },
    });

    return NextResponse.json({
      success: true,
      amount,
      newBalance: senderBalance - amount,
      recipientName: recipientModel.first_name || recipientModel.username,
    });
  } catch (error) {
    console.error("Tip error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
