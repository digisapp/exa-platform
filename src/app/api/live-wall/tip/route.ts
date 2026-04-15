import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const tipSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
  amount: z
    .number()
    .int()
    .min(1, "Minimum tip is 1 coin")
    .max(10000, "Maximum tip is 10,000 coins"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(
      request,
      "tips",
      user.id
    );
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const validation = tipSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { messageId, amount } = validation.data;

    // Get sender's actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Call atomic tip function
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
      "tip_live_wall_message",
      {
        p_tipper_actor_id: actor.id,
        p_message_id: messageId,
        p_amount: amount,
      }
    );

    if (rpcError) {
      logger.error("Tip RPC error", rpcError);
      return NextResponse.json(
        { error: "Failed to send tip" },
        { status: 500 }
      );
    }

    const result = (rpcData ?? {}) as Record<string, any>;

    if (!result.success) {
      if (result.error === "Insufficient coins") {
        return NextResponse.json(
          {
            error: "Insufficient coins",
            balance: result.balance,
            required: result.required,
          },
          { status: 402 }
        );
      }
      return NextResponse.json(
        { error: result.error || "Failed to send tip" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      amount: result.amount,
      newBalance: result.new_balance,
      tipTotal: result.tip_total,
    });
  } catch (error) {
    logger.error("Live wall tip error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
