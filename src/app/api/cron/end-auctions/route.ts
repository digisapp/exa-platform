import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendAuctionSoldEmail, sendAuctionWonEmail } from "@/lib/email";

const supabase: any = createServiceRoleClient();

// GET /api/cron/end-auctions - End expired auctions
// Runs every 5 minutes via Vercel cron
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error("Cron authentication failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find active auctions that have expired
    const { data: expiredAuctions, error: fetchError } = await supabase
      .from("auctions")
      .select("id, title, model_id")
      .eq("status", "active")
      .lt("ends_at", new Date().toISOString());

    if (fetchError) {
      console.error("Failed to fetch expired auctions:", fetchError);
      return NextResponse.json({ error: "Failed to fetch auctions" }, { status: 500 });
    }

    if (!expiredAuctions?.length) {
      return NextResponse.json({ message: "No expired auctions", ended: 0 });
    }

    // End each auction using the RPC function
    const results = await Promise.all(
      expiredAuctions.map(async (auction: { id: string; title: string; model_id: string }) => {
        try {
          const { data, error } = await supabase.rpc("end_auction", {
            p_auction_id: auction.id,
          });

          if (error) {
            console.error(`Failed to end auction ${auction.id} (${auction.title}):`, error);
            return { id: auction.id, title: auction.title, success: false, error: error.message };
          }

          // Send email notifications if auction was sold
          if (data?.status === "sold" && data?.winner_id && data?.amount) {
            try {
              // Get model's email and name
              const { data: model } = await supabase
                .from("models")
                .select("first_name, last_name, user_id")
                .eq("id", auction.model_id)
                .single();

              if (model) {
                const { data: modelUser } = await supabase.auth.admin.getUserById(model.user_id);
                const modelName = model.first_name
                  ? `${model.first_name} ${model.last_name || ""}`.trim()
                  : "there";

                if (modelUser?.user?.email) {
                  await sendAuctionSoldEmail({
                    to: modelUser.user.email,
                    modelName,
                    auctionTitle: auction.title,
                    amount: data.amount,
                    auctionId: auction.id,
                  });
                }

                // Get winner's email and name
                const { data: winnerActor } = await supabase
                  .from("actors")
                  .select("id, type, user_id")
                  .eq("id", data.winner_id)
                  .single();

                if (winnerActor?.user_id) {
                  const { data: winnerUser } = await supabase.auth.admin.getUserById(winnerActor.user_id);
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

                  if (winnerUser?.user?.email) {
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
              }
            } catch (emailError) {
              // Don't fail the cron job if email sending fails
              console.error(`Failed to send auction emails for ${auction.id}:`, emailError);
            }
          }

          return { id: auction.id, title: auction.title, success: true, result: data };
        } catch (err: any) {
          console.error(`Exception ending auction ${auction.id}:`, err);
          return { id: auction.id, title: auction.title, success: false, error: err.message };
        }
      })
    );

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`End auctions cron: ${succeeded} ended, ${failed} failed out of ${results.length}`);

    return NextResponse.json({
      message: `Processed ${results.length} expired auctions`,
      ended: succeeded,
      failed,
    });
  } catch (error) {
    console.error("End auctions cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
