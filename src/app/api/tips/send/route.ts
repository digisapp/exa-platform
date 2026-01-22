import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendTipReceivedEmail } from "@/lib/email";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

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

    // Rate limit check
    const rateLimitResponse = await checkEndpointRateLimit(request, "tips", user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
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

    // Get sender's actor info
    const { data: sender } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 400 });
    }

    // Get recipient model by username
    const { data: recipientModel } = await supabase
      .from("models")
      .select("id, user_id, email, first_name, username")
      .eq("username", recipientUsername)
      .single() as { data: { id: string; user_id: string; email: string | null; first_name: string | null; username: string } | null };

    if (!recipientModel) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    // Use atomic RPC function for tip transfer (prevents race conditions)
    const { data: result, error: rpcError } = await (supabase.rpc as any)(
      "send_tip",
      {
        p_sender_id: sender.id,
        p_recipient_model_id: recipientModel.id,
        p_amount: amount,
      }
    );

    if (rpcError) {
      console.error("Tip RPC error:", rpcError);
      return NextResponse.json(
        { error: "Failed to send tip" },
        { status: 500 }
      );
    }

    if (!result.success) {
      // Handle specific errors
      if (result.error === "Insufficient coins") {
        return NextResponse.json(
          {
            error: `Insufficient balance. You have ${result.balance} coins.`,
            required: result.required,
            balance: result.balance,
          },
          { status: 402 }
        );
      }
      return NextResponse.json(
        { error: result.error || "Failed to send tip" },
        { status: 400 }
      );
    }

    // Send email notification to model (non-blocking)
    if (recipientModel.email) {
      // Get sender name
      let senderName = "Someone";
      if (sender.type === "fan") {
        const { data: fan } = await (supabase
          .from("fans") as any)
          .select("display_name")
          .eq("id", sender.id)
          .single();
        senderName = fan?.display_name || "A fan";
      } else if (sender.type === "model") {
        const { data: senderModel } = await (supabase
          .from("models") as any)
          .select("first_name, username")
          .eq("user_id", user.id)
          .single();
        senderName = senderModel?.first_name || senderModel?.username || "A model";
      } else if (sender.type === "brand") {
        const { data: brand } = await (supabase
          .from("brands") as any)
          .select("company_name")
          .eq("id", sender.id)
          .single();
        senderName = brand?.company_name || "A brand";
      }

      sendTipReceivedEmail({
        to: recipientModel.email,
        modelName: recipientModel.first_name || recipientModel.username || "Model",
        tipperName: senderName,
        amount,
      }).catch((err) => console.error("Failed to send tip email:", err));
    }

    return NextResponse.json({
      success: true,
      amount: result.amount,
      newBalance: result.sender_new_balance,
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
