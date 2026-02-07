import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// as any needed: POS tables not fully in generated types
const supabase: any = createServiceRoleClient();

interface CheckoutItem {
  variant_id: string;
  quantity: number;
  price: number;
}

interface CheckoutBody {
  items: CheckoutItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method: "cash" | "card";
  amount_paid: number;
  customer_email?: string;
  customer_phone?: string;
}

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
    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "financial");
    if (rateLimitResponse) return rateLimitResponse;

    const body: CheckoutBody = await request.json();

    // Validate input
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: "No items in cart" }, { status: 400 });
    }

    if (body.amount_paid < body.total) {
      return NextResponse.json({ error: "Insufficient payment" }, { status: 400 });
    }

    // Verify stock for all items
    for (const item of body.items) {
      const { data: variant, error } = await supabase
        .from("shop_product_variants")
        .select("stock_quantity, sku")
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
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from("shop_orders")
      .insert({
        order_number: orderNumber,
        status: "completed", // POS orders are completed immediately
        subtotal: body.subtotal,
        tax: body.tax,
        shipping_cost: 0,
        total: body.total,
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
    for (const item of body.items) {
      // Get variant details
      const { data: variant } = await supabase
        .from("shop_product_variants")
        .select(`
          id,
          sku,
          size,
          color,
          product_id,
          shop_products (
            id,
            name,
            brand_id
          )
        `)
        .eq("id", item.variant_id)
        .single();

      if (!variant) continue;

      // Create order item
      const { error: itemError } = await supabase
        .from("shop_order_items")
        .insert({
          order_id: order.id,
          product_id: variant.shop_products.id,
          variant_id: variant.id,
          brand_id: variant.shop_products.brand_id,
          product_name: variant.shop_products.name,
          variant_sku: variant.sku,
          variant_size: variant.size,
          variant_color: variant.color,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
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

    // Record payment
    await supabase.from("pos_transactions").insert({
      order_id: order.id,
      order_number: orderNumber,
      payment_method: body.payment_method,
      amount: body.total,
      amount_paid: body.amount_paid,
      change_given: body.amount_paid - body.total,
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
