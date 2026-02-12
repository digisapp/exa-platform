import { createServiceRoleClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

// as any needed: nested join type instantiation is too deep for typed client
const supabaseAdmin: any = createServiceRoleClient();

// GET /api/cron/workshop-payments - Process due workshop installment payments
// Runs daily at 9am UTC via Vercel cron
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error("Cron authentication failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Find pending installments that are due
    const { data: dueInstallments, error: fetchError } = await supabaseAdmin
      .from("workshop_installments")
      .select(`
        id,
        registration_id,
        installment_number,
        amount_cents,
        retry_count,
        workshop_registrations!inner (
          id,
          stripe_customer_id,
          buyer_email,
          buyer_name,
          workshop_id,
          workshops!inner (
            title
          )
        )
      `)
      .eq("status", "pending")
      .lte("due_date", today);

    if (fetchError) {
      console.error("Failed to fetch due installments:", fetchError);
      return NextResponse.json({ error: "Failed to fetch installments" }, { status: 500 });
    }

    if (!dueInstallments || dueInstallments.length === 0) {
      return NextResponse.json({ message: "No installments due", processed: 0 });
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const installment of dueInstallments) {
      processed++;
      const registration = (installment as any).workshop_registrations;
      const customerId = registration?.stripe_customer_id;

      if (!customerId) {
        console.error("No Stripe customer ID for registration:", installment.registration_id);
        failed++;
        continue;
      }

      try {
        // Get the customer's default payment method
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: "card",
          limit: 1,
        });

        if (paymentMethods.data.length === 0) {
          console.error("No payment method found for customer:", customerId);
          await handleInstallmentRetryFailed(installment.id, installment.registration_id, installment.retry_count);
          failed++;
          continue;
        }

        const paymentMethodId = paymentMethods.data[0].id;
        const workshopTitle = (registration as any).workshops?.title || "Workshop";

        // Create off-session payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: installment.amount_cents,
          currency: "usd",
          customer: customerId,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
          metadata: {
            type: "workshop_installment",
            installment_id: installment.id,
            registration_id: installment.registration_id,
            installment_number: installment.installment_number.toString(),
          },
          description: `${workshopTitle} — Installment ${installment.installment_number} of 3`,
        });

        if (paymentIntent.status === "succeeded") {
          // Mark installment as completed
          await supabaseAdmin
            .from("workshop_installments")
            .update({
              status: "completed",
              stripe_payment_intent_id: paymentIntent.id,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", installment.id);

          // Increment installments_paid on registration
          const { data: reg } = await supabaseAdmin
            .from("workshop_registrations")
            .select("installments_paid")
            .eq("id", installment.registration_id)
            .single();

          if (reg) {
            await supabaseAdmin
              .from("workshop_registrations")
              .update({
                installments_paid: (reg.installments_paid || 0) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", installment.registration_id);
          }

          succeeded++;
        } else {
          // Payment requires action or failed — increment retry
          await handleInstallmentRetryFailed(installment.id, installment.registration_id, installment.retry_count);
          failed++;
        }
      } catch (err: any) {
        console.error("Error charging installment:", installment.id, err.message);
        await handleInstallmentRetryFailed(installment.id, installment.registration_id, installment.retry_count);
        failed++;
      }
    }

    return NextResponse.json({
      message: "Workshop payments processed",
      processed,
      succeeded,
      failed,
    });
  } catch (error) {
    console.error("Workshop payments cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}

async function handleInstallmentRetryFailed(
  installmentId: string,
  registrationId: string,
  currentRetryCount: number
) {
  const newRetryCount = (currentRetryCount || 0) + 1;

  if (newRetryCount >= 3) {
    // Max retries reached — cancel the installment and registration
    await supabaseAdmin
      .from("workshop_installments")
      .update({
        status: "failed",
        retry_count: newRetryCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", installmentId);

    // Cancel all remaining pending installments for this registration
    await supabaseAdmin
      .from("workshop_installments")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("registration_id", registrationId)
      .eq("status", "pending");

    // Cancel the registration and free the spot
    const { data: registration } = await supabaseAdmin
      .from("workshop_registrations")
      .select("workshop_id, quantity")
      .eq("id", registrationId)
      .single();

    await supabaseAdmin
      .from("workshop_registrations")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", registrationId);

    // Free the spot by decrementing spots_sold
    if (registration) {
      const { data: workshop } = await supabaseAdmin
        .from("workshops")
        .select("spots_sold")
        .eq("id", registration.workshop_id)
        .single();

      if (workshop && workshop.spots_sold > 0) {
        await supabaseAdmin
          .from("workshops")
          .update({
            spots_sold: Math.max(0, workshop.spots_sold - (registration.quantity || 1)),
          })
          .eq("id", registration.workshop_id);
      }
    }

    console.log("Workshop registration cancelled due to payment failure:", registrationId);
  } else {
    // Increment retry count
    await supabaseAdmin
      .from("workshop_installments")
      .update({
        retry_count: newRetryCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", installmentId);
  }
}
