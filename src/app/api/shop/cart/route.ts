import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// GET - Fetch current cart
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get session ID from cookie for guest carts
    const sessionId = request.headers.get("x-session-id");

    if (!user && !sessionId) {
      return NextResponse.json({ cart: null, items: [] });
    }

    // Find cart
    let cartQuery = supabase
      .from("shop_carts")
      .select(`
        id,
        affiliate_model_id,
        affiliate_code,
        expires_at,
        items:shop_cart_items(
          id,
          quantity,
          variant:shop_product_variants(
            id,
            sku,
            size,
            color,
            color_hex,
            stock_quantity,
            price_override,
            image_url,
            product:shop_products(
              id,
              name,
              slug,
              retail_price,
              images,
              brand:shop_brands(
                id,
                name,
                slug
              )
            )
          )
        )
      `);

    if (user) {
      cartQuery = cartQuery.eq("user_id", user.id);
    } else {
      cartQuery = cartQuery.eq("session_id", sessionId!);
    }

    const { data: cart, error } = await cartQuery.single();

    if (error || !cart) {
      return NextResponse.json({ cart: null, items: [] });
    }

    // Transform items
    const items = cart.items?.map((item: any) => {
      const variant = item.variant;
      const product = variant?.product;
      const price = variant?.price_override || product?.retail_price || 0;

      return {
        id: item.id,
        variantId: variant?.id,
        sku: variant?.sku,
        size: variant?.size,
        color: variant?.color,
        colorHex: variant?.color_hex,
        quantity: item.quantity,
        price,
        lineTotal: price * item.quantity,
        inStock: variant?.stock_quantity >= item.quantity,
        stockAvailable: variant?.stock_quantity || 0,
        image: variant?.image_url || product?.images?.[0],
        product: {
          id: product?.id,
          name: product?.name,
          slug: product?.slug,
          brand: product?.brand,
        },
      };
    }) || [];

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + item.lineTotal, 0);
    const itemCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

    return NextResponse.json({
      cart: {
        id: cart.id,
        affiliateCode: cart.affiliate_code,
        affiliateModelId: cart.affiliate_model_id,
        expiresAt: cart.expires_at,
      },
      items,
      subtotal,
      itemCount,
    });
  } catch (error) {
    console.error("Cart fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}

// POST - Add item to cart
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user?.id);
    if (rateLimitResponse) return rateLimitResponse;

    const sessionId = request.headers.get("x-session-id");
    const { variantId, quantity = 1, affiliateCode } = await request.json();

    if (!variantId) {
      return NextResponse.json(
        { error: "Variant ID is required" },
        { status: 400 }
      );
    }

    // Verify variant exists and has stock
    const { data: variant, error: variantError } = await supabase
      .from("shop_product_variants")
      .select(`
        id,
        stock_quantity,
        is_active,
        product:shop_products(
          is_active,
          brand_id
        )
      `)
      .eq("id", variantId)
      .single();

    if (variantError || !variant) {
      return NextResponse.json(
        { error: "Product variant not found" },
        { status: 404 }
      );
    }

    if (!variant.is_active || !variant.product?.is_active) {
      return NextResponse.json(
        { error: "Product is not available" },
        { status: 400 }
      );
    }

    if ((variant.stock_quantity ?? 0) < quantity) {
      return NextResponse.json(
        { error: "Not enough stock available", available: variant.stock_quantity },
        { status: 400 }
      );
    }

    // Find or create cart
    let cartQuery = supabase
      .from("shop_carts")
      .select("id, affiliate_code")
      .gt("expires_at", new Date().toISOString());

    if (user) {
      cartQuery = cartQuery.eq("user_id", user.id);
    } else if (sessionId) {
      cartQuery = cartQuery.eq("session_id", sessionId);
    } else {
      return NextResponse.json(
        { error: "Session required for guest cart" },
        { status: 400 }
      );
    }

    let { data: cart } = await cartQuery.single();

    // Create cart if doesn't exist
    if (!cart) {
      // If affiliate code provided, look up model
      let affiliateModelId = null;
      if (affiliateCode) {
        const { data: affiliateData } = await supabase
          .from("shop_affiliate_codes")
          .select("model_id")
          .eq("code", affiliateCode.toUpperCase())
          .eq("is_active", true)
          .single();

        if (affiliateData) {
          affiliateModelId = affiliateData.model_id;

          // Increment click count
          await supabase
            .from("shop_affiliate_codes")
            .update({ click_count: (supabase as any).sql`click_count + 1` })
            .eq("code", affiliateCode.toUpperCase());
        }
      }

      const { data: newCart, error: createError } = await supabase
        .from("shop_carts")
        .insert({
          user_id: user?.id || null,
          session_id: user ? null : sessionId,
          affiliate_model_id: affiliateModelId,
          affiliate_code: affiliateCode?.toUpperCase() || null,
        })
        .select("id, affiliate_code")
        .single();

      if (createError) {
        console.error("Cart creation error:", createError);
        return NextResponse.json(
          { error: "Failed to create cart" },
          { status: 500 }
        );
      }

      cart = newCart;
    }

    // Check if item already in cart
    const { data: existingItem } = await supabase
      .from("shop_cart_items")
      .select("id, quantity")
      .eq("cart_id", cart.id)
      .eq("variant_id", variantId)
      .single();

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > (variant.stock_quantity ?? 0)) {
        return NextResponse.json(
          { error: "Not enough stock available", available: variant.stock_quantity },
          { status: 400 }
        );
      }

      await supabase
        .from("shop_cart_items")
        .update({ quantity: newQuantity })
        .eq("id", existingItem.id);
    } else {
      // Add new item
      await supabase
        .from("shop_cart_items")
        .insert({
          cart_id: cart.id,
          variant_id: variantId,
          quantity,
        });
    }

    return NextResponse.json({ success: true, cartId: cart.id });
  } catch (error) {
    console.error("Cart add error:", error);
    return NextResponse.json(
      { error: "Failed to add to cart" },
      { status: 500 }
    );
  }
}

// PATCH - Update item quantity
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const sessionId = request.headers.get("x-session-id");
    const { itemId, quantity } = await request.json();

    if (!itemId || quantity === undefined) {
      return NextResponse.json(
        { error: "Item ID and quantity are required" },
        { status: 400 }
      );
    }

    // Verify cart ownership
    const { data: item } = await supabase
      .from("shop_cart_items")
      .select(`
        id,
        variant:shop_product_variants(stock_quantity),
        cart:shop_carts(user_id, session_id)
      `)
      .eq("id", itemId)
      .single();

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (user && item.cart.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!user && item.cart.session_id !== sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (quantity <= 0) {
      // Remove item
      await supabase
        .from("shop_cart_items")
        .delete()
        .eq("id", itemId);
    } else {
      // Check stock
      if (quantity > (item.variant.stock_quantity ?? 0)) {
        return NextResponse.json(
          { error: "Not enough stock", available: item.variant.stock_quantity },
          { status: 400 }
        );
      }

      // Update quantity
      await supabase
        .from("shop_cart_items")
        .update({ quantity })
        .eq("id", itemId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cart update error:", error);
    return NextResponse.json(
      { error: "Failed to update cart" },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from cart
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const sessionId = request.headers.get("x-session-id");
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Verify cart ownership
    const { data: item } = await supabase
      .from("shop_cart_items")
      .select(`
        id,
        cart:shop_carts(user_id, session_id)
      `)
      .eq("id", itemId)
      .single();

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (user && item.cart.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!user && item.cart.session_id !== sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Remove item
    await supabase
      .from("shop_cart_items")
      .delete()
      .eq("id", itemId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cart delete error:", error);
    return NextResponse.json(
      { error: "Failed to remove from cart" },
      { status: 500 }
    );
  }
}
