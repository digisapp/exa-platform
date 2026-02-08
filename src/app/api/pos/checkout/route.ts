import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { requirePosAuth, isPosAuthError } from "@/lib/pos-auth";
import { z } from "zod";

// as any needed: POS orders use different field names than typed shop_orders schema
const supabase: any = createServiceRoleClient();

const TAX_RATE = 0.08; // 8% sales tax

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        variant_id: z.string().uuid(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1, "At least one item is required"),
  payment_method: z.enum(["cash", "card"]),
  amount_paid: z.number().min(0),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().optional(),
});

// Generate order number: POS-YYMMDD-XXXX
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `POS-${year}${month}${day}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    // POS staff authentication
    const authResult = await requirePosAuth(request);
    if (isPosAuthError(authResult)) return authResult;

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "financial");
    if (rateLimitResponse) return rateLimitResponse;

    const rawBody = await request.json();
    const parsed = checkoutSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Look up actual prices from DB and verify stock for all items
    const itemsWithPrices: {
      variant_id: string;
      quantity: number;
      unit_price: number;
      sku: string;
      size: string | null;
      color: string | null;
      product_id: string;
      product_name: string;
      brand_id: string;
    }[] = [];

    for (const item of body.items) {
      const { data: variant, error } = await supabase
        .from("shop_product_variants")
        .select(`
          id,
          stock_quantity,
          sku,
          size,
          color,
          price_override,
          product_id,
          shop_products (
            id,
            name,
            retail_price,
            brand_id
          )
        `)
        .eq("id", item.variant_id)
        .single();

      if (error || !variant) {
        return NextResponse.json(
          { error: `Product variant not found: ${item.variant_id}` },
          { status: 400 }
        );
      }

      if ((variant.stock_quantity ?? 0) < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${variant.sku}` },
          { status: 400 }
        );
      }

      // Use price_override if set, otherwise fall back to product retail_price
      const unitPrice: number =
        variant.price_override != null
          ? variant.price_override
          : variant.shop_products.retail_price;

      itemsWithPrices.push({
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        product_id: variant.shop_products.id,
        product_name: variant.shop_products.name,
        brand_id: variant.shop_products.brand_id,
      });
    }

    // Calculate totals server-side (ignore any client-provided totals)
    const subtotal = itemsWithPrices.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    );
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    if (body.amount_paid < total) {
      return NextResponse.json({ error: "Insufficient payment" }, { status: 400 });
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from("shop_orders")
      .insert({
        order_number: orderNumber,
        status: "completed", // POS orders are completed immediately
        subtotal,
        tax,
        shipping_cost: 0,
        total,
        payment_method: body.payment_method,
        payment_status: "paid",
        customer_email: body.customer_email || null,
        customer_phone: body.customer_phone || null,
        customer_notes: `POS Sale - ${body.payment_method.toUpperCase()}`,
        shipping_address: null, // No shipping for in-store
        billing_address: null,
        is_pos_sale: true,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Create order items and update inventory
    for (const item of itemsWithPrices) {
      // Create order item using server-verified prices
      const { error: itemError } = await supabase
        .from("shop_order_items")
        .insert({
          order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          brand_id: item.brand_id,
          product_name: item.product_name,
          variant_sku: item.sku,
          variant_size: item.size,
          variant_color: item.color,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.unit_price * item.quantity,
          fulfillment_status: "delivered", // POS items are delivered immediately
        });

      if (itemError) {
        console.error("Order item error:", itemError);
      }

      // Decrement inventory
      const { error: inventoryError } = await supabase
        .rpc("decrement_stock", {
          variant_id: item.variant_id,
          quantity: item.quantity,
        });

      // If RPC doesn't exist, do manual update
      if (inventoryError) {
        const { data: currentVariant } = await supabase
          .from("shop_product_variants")
          .select("stock_quantity")
          .eq("id", item.variant_id)
          .single();

        if (currentVariant) {
          await supabase
            .from("shop_product_variants")
            .update({
              stock_quantity: currentVariant.stock_quantity - item.quantity,
            })
            .eq("id", item.variant_id);
        }
      }
    }

    // Record payment with server-calculated total
    await supabase.from("pos_transactions").insert({
      order_id: order.id,
      order_number: orderNumber,
      payment_method: body.payment_method,
      amount: total,
      amount_paid: body.amount_paid,
      change_given: body.amount_paid - total,
      status: "completed",
    });

    return NextResponse.json({
      success: true,
      orderNumber,
      orderId: order.id,
    });
  } catch (error) {
    console.error("POS checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
