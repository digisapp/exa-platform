import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { sendPPVUnlockedEmail } from "@/lib/email";

const unlockSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
});

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
    const rateLimitResponse = await checkEndpointRateLimit(request, "messages", user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();

    const validationResult = unlockSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { messageId } = validationResult.data;

    // Get buyer's actor ID
    const { data: buyer } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!buyer) {
      return NextResponse.json(
        { error: "Actor not found" },
        { status: 400 }
      );
    }

    // Call atomic unlock RPC
    const { data: result, error: rpcError } = await (supabase.rpc as any)(
      "unlock_message_media",
      {
        p_buyer_id: buyer.id,
        p_message_id: messageId,
      }
    );

    if (rpcError) {
      console.error("Unlock RPC error:", rpcError);
      return NextResponse.json(
        { error: "Failed to unlock message" },
        { status: 500 }
      );
    }

    if (!result.success) {
      if (result.error === "Insufficient coins") {
        return NextResponse.json(
          {
            error: "Insufficient coins",
            required: result.required,
            balance: result.balance,
          },
          { status: 402 }
        );
      }
      return NextResponse.json(
        { error: result.error || "Failed to unlock message" },
        { status: 400 }
      );
    }

    // Send email notification to model (fire and forget)
    if (!result.already_unlocked) {
      // Get message to find sender info
      const { data: message } = await (supabase
        .from("messages") as any)
        .select("sender_id")
        .eq("id", messageId)
        .single();

      if (message) {
        // Get sender (model) info for email
        const { data: senderActor } = await supabase
          .from("actors")
          .select("user_id")
          .eq("id", message.sender_id)
          .single() as { data: { user_id: string } | null };

        if (senderActor) {
          const { data: model } = await supabase
            .from("models")
            .select("first_name, last_name")
            .eq("user_id", senderActor.user_id)
            .single() as { data: { first_name: string | null; last_name: string | null } | null };

          const { data: senderUser } = await supabase.auth.admin.getUserById(senderActor.user_id);

          // Get buyer display name
          let buyerName = "Someone";
          if (buyer.type === "fan") {
            const { data: fan } = await (supabase
              .from("fans") as any)
              .select("display_name, username")
              .eq("id", buyer.id)
              .single();
            buyerName = fan?.display_name || fan?.username || "A fan";
          } else if (buyer.type === "brand") {
            const { data: brand } = await (supabase
              .from("brands") as any)
              .select("company_name")
              .eq("id", buyer.id)
              .single();
            buyerName = brand?.company_name || "A brand";
          }

          if (senderUser?.user?.email && model) {
            const modelName = model.first_name
              ? `${model.first_name} ${model.last_name || ""}`.trim()
              : "Model";

            sendPPVUnlockedEmail({
              to: senderUser.user.email,
              modelName,
              buyerName,
              amount: result.amount_paid,
            }).catch((err) => console.error("PPV email error:", err));
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      mediaUrl: result.media_url,
      amountPaid: result.amount_paid,
      newBalance: result.new_balance,
      alreadyUnlocked: result.already_unlocked || false,
    });
  } catch (error) {
    console.error("Unlock message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
