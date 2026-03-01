import { createServiceRoleClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";
import { PRINT_PRICE_PER_CARD, PRINT_MIN_QUANTITY } from "@/lib/stripe-config";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  quantity: z.number().int().min(PRINT_MIN_QUANTITY).max(500),
  email: z.string().email().max(254),
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  pdfBase64: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "general");
    if (rateLimitResponse) return rateLimitResponse;

    // Feature toggle check
    if (process.env.NEXT_PUBLIC_PRINT_PICKUP_ENABLED !== "true") {
      return NextResponse.json(
        { error: "Print pickup is not currently available" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const { quantity } = parsed.data;
    const totalCents = quantity * PRINT_PRICE_PER_CARD;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = createServiceRoleClient();
    const orderId = crypto.randomUUID();
    const storagePath = `comp-card-prints/${orderId}.pdf`;

    // Upload PDF to Supabase Storage
    const pdfBuffer = Buffer.from(parsed.data.pdfBase64, "base64");

    const { error: uploadError } = await supabase.storage
      .from("portfolio")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("PDF upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload PDF" },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("portfolio").getPublicUrl(storagePath);

    // Create pending order record
    const { error: insertError } = await supabase
      .from("comp_card_print_orders")
      .insert({
        id: orderId,
        email: parsed.data.email.toLowerCase().trim(),
        first_name: parsed.data.firstName.trim(),
        last_name: parsed.data.lastName?.trim() || null,
        phone: parsed.data.phone?.trim() || null,
        pdf_url: publicUrl,
        storage_path: storagePath,
        quantity,
        package_name: `${quantity} Cards`,
        amount_cents: totalCents,
        status: "pending_payment",
      });

    if (insertError) {
      console.error("Order insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Comp Card Print — ${quantity} Cards`,
              description: `${quantity} professional comp cards on premium cardstock, ready for pickup at EXA Models HQ Miami`,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/free-comp-card/print-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/free-comp-card?cancelled=true`,
      customer_email: parsed.data.email,
      metadata: {
        type: "comp_card_print",
        order_id: orderId,
        quantity: quantity.toString(),
        package_name: `${quantity} Cards`,
      },
    });

    // Update order with Stripe session ID
    await supabase
      .from("comp_card_print_orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", orderId);

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Print order error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
