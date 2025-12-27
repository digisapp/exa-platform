import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Create admin client for webhook (no auth context)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  console.log(`Received Stripe event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Get metadata from the session
        const actorId = session.metadata?.actor_id;
        const coins = parseInt(session.metadata?.coins || "0", 10);
        const userId = session.metadata?.user_id;

        if (!actorId || !coins) {
          console.error("Missing metadata in checkout session:", session.id);
          return NextResponse.json({ received: true });
        }

        console.log(
          `Processing coin purchase: ${coins} coins for actor ${actorId}`
        );

        // Credit coins using the add_coins function
        const { data: credited, error: creditError } = await supabaseAdmin.rpc(
          "add_coins",
          {
            p_actor_id: actorId,
            p_amount: coins,
            p_action: "purchase",
            p_metadata: {
              stripe_session_id: session.id,
              stripe_payment_intent: session.payment_intent,
              amount_paid: session.amount_total,
              currency: session.currency,
            },
          }
        );

        if (creditError) {
          console.error("Error crediting coins:", creditError);
          return NextResponse.json(
            { error: "Failed to credit coins" },
            { status: 500 }
          );
        }

        console.log(`Successfully credited ${coins} coins to actor ${actorId}`);

        // Get updated balance for logging
        const { data: model } = await supabaseAdmin
          .from("models")
          .select("coin_balance, first_name, email")
          .eq("id", actorId)
          .single();

        if (model) {
          console.log(
            `New balance for ${model.first_name || model.email}: ${model.coin_balance} coins`
          );
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error(
          "Payment failed:",
          paymentIntent.id,
          paymentIntent.last_payment_error?.message
        );
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Disable body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
