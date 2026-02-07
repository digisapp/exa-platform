import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";

// Service role client for atomic stock operations
const supabaseAdmin: any = createServiceRoleClient();

interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface CheckoutRequest {
  email: string;
  name: string;
  phone?: string;
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  billingSameAsShipping?: boolean;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const sessionId = request.headers.get("x-session-id");
    const body: CheckoutRequest = await request.json();

    const {
      email,
      name,
      phone,
      shippingAddress,
      billingAddress,
      billingSameAsShipping = true,
    } = body;

    // Validate required fields
    if (!email || !name || !shippingAddress) {
      return NextResponse.json(
        { error: "Email, name, and shipping address are required" },
        { status: 400 }
      );
    }

    // Find cart
    let cartQuery = (supabase as any)
      .from("shop_carts")
      .select(`
        id,
        affiliate_model_id,
        affiliate_code,
        items:shop_cart_items(
          id,
          quantity,
          variant:shop_product_variants(
            id,
            sku,
            size,
            color,
            stock_quantity,
            price_override,
            product:shop_products(
              id,
              name,
              retail_price,
              wholesale_price,
              brand_id,
              brand:shop_brands(
                id,
                name,
                commission_rate,
                model_commission_rate
              )
            )
          )
        )
      `)
      .gt("expires_at", new Date().toISOString());

    if (user) {
      cartQuery = cartQuery.eq("user_id", user.id);
    } else if (sessionId) {
      cartQuery = cartQuery.eq("session_id", sessionId);
    } else {
      return NextResponse.json(
        { error: "No cart found" },
        { status: 400 }
      );
    }

    const { data: cart, error: cartError } = await cartQuery.single();

    if (cartError || !cart || !cart.items?.length) {
      return NextResponse.json(
        { error: "Cart is empty or not found" },
        { status: 400 }
      );
    }

    // Validate stock and calculate totals
    const lineItems: any[] = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const variant = item.variant;
      const product = variant?.product;

      if (!variant || !product) {
        return NextResponse.json(
          { error: `Product no longer available` },
          { status: 400 }
        );
      }

      if (variant.stock_quantity < item.quantity) {
        return NextResponse.json(
          {
            error: `Not enough stock for ${product.name} (${variant.size})`,
            available: variant.stock_quantity,
          },
          { status: 400 }
        );
      }

      const price = variant.price_override || product.retail_price;
      const lineTotal = price * item.quantity;
      subtotal += lineTotal;

      lineItems.push({
        variantId: variant.id,
        brandId: product.brand_id,
        productName: product.name,
        variantSku: variant.sku,
        variantSize: variant.size,
        variantColor: variant.color,
        quantity: item.quantity,
        unitPrice: price,
        wholesalePrice: product.wholesale_price,
        lineTotal,
        brand: product.brand,
      });
    }

    // Atomically reserve stock for all items using database-level locking
    // This prevents race conditions where two users buy the last item simultaneously
    const reservedVariants: { variantId: string; quantity: number }[] = [];
    for (const item of lineItems) {
      const { data: reserved, error: reserveError } = await supabaseAdmin.rpc(
        "reserve_stock",
        { p_variant_id: item.variantId, p_quantity: item.quantity }
      );

      if (reserveError || !reserved) {
        // Rollback previously reserved stock
        for (const r of reservedVariants) {
          await supabaseAdmin.rpc("release_stock", {
            p_variant_id: r.variantId,
            p_quantity: r.quantity,
          });
        }
        return NextResponse.json(
          {
            error: `Not enough stock for ${item.productName} (${item.variantSize})`,
          },
          { status: 409 }
        );
      }

      reservedVariants.push({ variantId: item.variantId, quantity: item.quantity });
    }

    // TODO: Calculate shipping and tax based on address
    const shippingCost = 0; // Free shipping for now
    const taxAmount = 0; // Would integrate with tax calculation service
    const total = subtotal + shippingCost + taxAmount;

    // Calculate affiliate commission if applicable
    let affiliateCommission = 0;
    if (cart.affiliate_model_id) {
      // Use the average model commission rate or default to 10%
      const avgCommissionRate = lineItems.reduce((sum, item) => {
        return sum + (item.brand?.model_commission_rate || 10);
      }, 0) / lineItems.length;

      affiliateCommission = Math.round(subtotal * (avgCommissionRate / 100));
    }

    // Create order in database
    const { data: order, error: orderError } = await (supabase as any)
      .from("shop_orders")
      .insert({
        user_id: user?.id || null,
        customer_email: email,
        customer_name: name,
        customer_phone: phone || null,
        shipping_address_line1: shippingAddress.line1,
        shipping_address_line2: shippingAddress.line2 || null,
        shipping_city: shippingAddress.city,
        shipping_state: shippingAddress.state,
        shipping_postal_code: shippingAddress.postalCode,
        shipping_country: shippingAddress.country || "US",
        billing_same_as_shipping: billingSameAsShipping,
        billing_address_line1: billingSameAsShipping ? null : billingAddress?.line1,
        billing_address_line2: billingSameAsShipping ? null : billingAddress?.line2,
        billing_city: billingSameAsShipping ? null : billingAddress?.city,
        billing_state: billingSameAsShipping ? null : billingAddress?.state,
        billing_postal_code: billingSameAsShipping ? null : billingAddress?.postalCode,
        billing_country: billingSameAsShipping ? null : billingAddress?.country,
        subtotal,
        shipping_cost: shippingCost,
        tax_amount: taxAmount,
        total,
        affiliate_model_id: cart.affiliate_model_id,
        affiliate_code: cart.affiliate_code,
        affiliate_commission: affiliateCommission,
        status: "pending",
        payment_status: "pending",
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      console.error("Order creation error:", orderError);
      // Rollback reserved stock
      for (const r of reservedVariants) {
        await supabaseAdmin.rpc("release_stock", {
          p_variant_id: r.variantId,
          p_quantity: r.quantity,
        });
      }
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // Create order items
    const orderItems = lineItems.map((item) => ({
      order_id: order.id,
      variant_id: item.variantId,
      brand_id: item.brandId,
      product_name: item.productName,
      variant_sku: item.variantSku,
      variant_size: item.variantSize,
      variant_color: item.variantColor,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      wholesale_price: item.wholesalePrice,
      line_total: item.lineTotal,
    }));

    const { error: itemsError } = await (supabase as any)
      .from("shop_order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Order items error:", itemsError);
      // Rollback order and reserved stock
      await (supabase as any)
        .from("shop_orders")
        .delete()
        .eq("id", order.id);
      for (const r of reservedVariants) {
        await supabaseAdmin.rpc("release_stock", {
          p_variant_id: r.variantId,
          p_quantity: r.quantity,
        });
      }
      return NextResponse.json(
        { error: "Failed to create order items" },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://examodels.com";

    const stripeLineItems = lineItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${item.productName} - ${item.variantSize}${item.variantColor ? ` / ${item.variantColor}` : ""}`,
          metadata: {
            variant_id: item.variantId,
            brand_id: item.brandId,
          },
        },
        unit_amount: item.unitPrice,
      },
      quantity: item.quantity,
    }));

    // Add shipping if applicable
    if (shippingCost > 0) {
      stripeLineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Shipping",
            metadata: {
              variant_id: "shipping",
              brand_id: "shipping",
            },
          },
          unit_amount: shippingCost,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: stripeLineItems,
      mode: "payment",
      success_url: `${baseUrl}/shop/order/${order.order_number}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/shop/cart?cancelled=true`,
      customer_email: email,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        user_id: user?.id || "",
        affiliate_model_id: cart.affiliate_model_id || "",
        affiliate_code: cart.affiliate_code || "",
      },
      shipping_address_collection: {
        allowed_countries: ["US", "CA"], // Start with US and Canada
      },
      phone_number_collection: {
        enabled: true,
      },
    });

    // Update order with Stripe payment intent
    await (supabase as any)
      .from("shop_orders")
      .update({
        stripe_payment_intent_id: session.payment_intent,
      })
      .eq("id", order.id);

    return NextResponse.json({
      url: session.url,
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
