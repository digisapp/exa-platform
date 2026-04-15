import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendAuctionSoldEmail, sendAuctionWonEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

// as any needed: nullable field mismatches with models.user_id and RPC Json results
const supabase: any = createServiceRoleClient();

// GET /api/cron/end-auctions - End expired auctions
// Runs every 5 minutes via Vercel cron
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.error("Cron authentication failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find active auctions that have expired
    const { data: expiredAuctions, error: fetchError } = await supabase
      .from("auctions")
      .select("id, title, model_id, bid_count, created_at, original_end_at")
      .eq("status", "active")
      .lt("ends_at", new Date().toISOString());

    if (fetchError) {
      logger.error("Failed to fetch expired auctions", fetchError);
      return NextResponse.json({ error: "Failed to fetch auctions" }, { status: 500 });
    }

    if (!expiredAuctions?.length) {
      return NextResponse.json({ message: "No expired auctions", ended: 0, restarted: 0 });
    }

    // Auto-restart 0-bid expired auctions in place (keep status=active, just
    // extend ends_at). Bypasses the end_auction RPC, which is the only way
    // expired zero-bid auctions would otherwise get stuck — they should never
    // end without receiving a bid.
    const zeroBidExpired = expiredAuctions.filter(
      (a: { bid_count: number }) => (a.bid_count ?? 0) === 0
    );
    let autoExtended = 0;
    for (const auction of zeroBidExpired as Array<{
      id: string;
      title: string;
      created_at: string;
      original_end_at: string;
    }>) {
      // Use original duration, min 1 hour, max 7 days
      const originalDuration =
        new Date(auction.original_end_at).getTime() - new Date(auction.created_at).getTime();
      const duration = Math.min(
        Math.max(originalDuration, 60 * 60 * 1000),
        7 * 24 * 60 * 60 * 1000
      );
      const newEndsAt = new Date(Date.now() + duration).toISOString();

      const { error: extendError } = await supabase
        .from("auctions")
        .update({
          ends_at: newEndsAt,
          original_end_at: newEndsAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", auction.id);

      if (extendError) {
        logger.error("Failed to auto-extend 0-bid auction", extendError, { auctionId: auction.id });
      } else {
        autoExtended++;
        logger.info("Auto-extended 0-bid auction", { auctionId: auction.id, title: auction.title, newEndsAt });
      }
    }

    // Any expired auctions that actually received bids go through the
    // end_auction RPC for the sold/no_sale path (escrow transfer, refunds).
    const biddedExpired = expiredAuctions.filter(
      (a: { bid_count: number }) => (a.bid_count ?? 0) > 0
    );

    if (!biddedExpired.length) {
      return NextResponse.json({
        message: `Auto-extended ${autoExtended} zero-bid auctions`,
        ended: 0,
        restarted: autoExtended,
      });
    }

    // End each bidded auction using the RPC function
    const results = await Promise.all(
      biddedExpired.map(async (auction: { id: string; title: string; model_id: string }) => {
        try {
          const { data, error } = await supabase.rpc("end_auction", {
            p_auction_id: auction.id,
          });

          if (error) {
            logger.error("Failed to end auction", error, { auctionId: auction.id, title: auction.title });
            return { id: auction.id, title: auction.title, success: false, error: "Failed to end auction" };
          }

          // Send email notifications if auction was sold
          if (data?.status === "sold" && data?.winner_id && data?.amount) {
            try {
              // Get model info and winner actor info in parallel
              const [modelResult, winnerActorResult] = await Promise.all([
                supabase.from("models").select("first_name, last_name, user_id").eq("id", auction.model_id).single(),
                supabase.from("actors").select("id, type, user_id").eq("id", data.winner_id).single(),
              ]);

              const model = modelResult.data;

              if (model) {
                const modelName = model.first_name
                  ? `${model.first_name} ${model.last_name || ""}`.trim()
                  : "there";

                // Get model user and winner user emails in parallel
                const winnerActor = winnerActorResult.data;
                const emailPromises: Promise<any>[] = [
                  supabase.auth.admin.getUserById(model.user_id),
                ];
                if (winnerActor?.user_id) {
                  emailPromises.push(supabase.auth.admin.getUserById(winnerActor.user_id));
                }
                const emailResults = await Promise.all(emailPromises);
                const modelUser = emailResults[0]?.data;
                const winnerUser = emailResults[1]?.data;

                if (modelUser?.user?.email) {
                  await sendAuctionSoldEmail({
                    to: modelUser.user.email,
                    modelName,
                    auctionTitle: auction.title,
                    amount: data.amount,
                    auctionId: auction.id,
                  });
                }

                if (winnerActor?.user_id && winnerUser?.user?.email) {
                  let winnerName = "there";

                  if (winnerActor.type === "fan") {
                    const { data: fan } = await supabase
                      .from("fans")
                      .select("display_name, username")
                      .eq("id", winnerActor.id)
                      .single();
                    winnerName = fan?.display_name || fan?.username || "there";
                  } else if (winnerActor.type === "model") {
                    const { data: winnerModel } = await supabase
                      .from("models")
                      .select("first_name, last_name, username")
                      .eq("user_id", winnerActor.user_id)
                      .single();
                    winnerName = winnerModel?.first_name
                      ? `${winnerModel.first_name} ${winnerModel.last_name || ""}`.trim()
                      : winnerModel?.username || "there";
                  }

                  await sendAuctionWonEmail({
                    to: winnerUser.user.email,
                    winnerName,
                    modelName,
                    auctionTitle: auction.title,
                    amount: data.amount,
                    auctionId: auction.id,
                  });
                }
              }
            } catch (emailError) {
              // Don't fail the cron job if email sending fails
              logger.error("Failed to send auction emails", emailError, { auctionId: auction.id });
            }
          }

          return { id: auction.id, title: auction.title, success: true, result: data };
        } catch (err: any) {
          logger.error("Exception ending auction", err, { auctionId: auction.id });
          return { id: auction.id, title: auction.title, success: false, error: err.message };
        }
      })
    );

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info("End auctions cron complete", { succeeded, failed, total: results.length });

    // Auto-restart auctions that ended without a sale (no bids or reserve not met)
    const { data: noSaleAuctions, error: noSaleError } = await supabase
      .from("auctions")
      .select("id, title, model_id, created_at, original_end_at, starting_price, reserve_price, buy_now_price, category, description, deliverables, cover_image_url, allow_auto_bid, anti_snipe_minutes")
      .eq("status", "no_sale");

    let restarted = 0;

    if (!noSaleError && noSaleAuctions?.length) {
      for (const auction of noSaleAuctions) {
        try {
          // Calculate original duration and set new end time
          const originalDuration = new Date(auction.original_end_at).getTime() - new Date(auction.created_at).getTime();
          // Use original duration or default to 24 hours, cap at 7 days
          const duration = Math.min(
            Math.max(originalDuration, 60 * 60 * 1000), // min 1 hour
            7 * 24 * 60 * 60 * 1000 // max 7 days
          );
          const newEndsAt = new Date(Date.now() + duration).toISOString();

          const { error: restartError } = await supabase
            .from("auctions")
            .update({
              status: "active",
              ends_at: newEndsAt,
              original_end_at: newEndsAt,
              current_bid: null,
              bid_count: 0,
              winner_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", auction.id);

          if (restartError) {
            logger.error("Failed to restart auction", restartError, { auctionId: auction.id });
          } else {
            restarted++;
            logger.info("Auto-restarted auction", { auctionId: auction.id, title: auction.title, newEndsAt });
          }
        } catch (err) {
          logger.error("Exception restarting auction", err, { auctionId: auction.id });
        }
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} expired bidded auctions, auto-extended ${autoExtended} zero-bid auctions`,
      ended: succeeded,
      failed,
      restarted: restarted + autoExtended,
    });
  } catch (error) {
    logger.error("End auctions cron error", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
