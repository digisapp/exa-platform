import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// GET - Get model's affiliate dashboard data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get model
    const { data: model } = await supabase
      .from("models")
      .select("id, username, first_name")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json(
        { error: "Model profile not found" },
        { status: 404 }
      );
    }

    // Get affiliate codes
    const { data: codes } = await supabase
      .from("shop_affiliate_codes")
      .select(`
        id,
        code,
        discount_type,
        discount_value,
        click_count,
        order_count,
        total_earnings,
        is_active,
        created_at
      `)
      .eq("model_id", model.id)
      .order("created_at", { ascending: false });

    // Get earnings summary
    const { data: earnings } = await supabase
      .from("shop_affiliate_earnings")
      .select(`
        id,
        order_total,
        commission_rate,
        commission_amount,
        status,
        available_at,
        paid_at,
        created_at,
        order:shop_orders(
          order_number,
          status
        )
      `)
      .eq("model_id", model.id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Calculate totals
    const totalEarnings = earnings?.reduce((sum: number, e: any) =>
      e.status !== "cancelled" ? sum + e.commission_amount : sum, 0
    ) || 0;

    const now = new Date();

    // Pending = not yet past the hold period
    const pendingEarnings = earnings?.reduce((sum: number, e: any) =>
      e.status !== "cancelled" && e.status !== "paid" && e.available_at && new Date(e.available_at) > now
        ? sum + e.commission_amount
        : sum, 0
    ) || 0;

    // Available = hold period passed, not yet paid
    const availableEarnings = earnings?.reduce((sum: number, e: any) =>
      e.status !== "cancelled" && e.status !== "paid" && e.available_at && new Date(e.available_at) <= now
        ? sum + e.commission_amount
        : sum, 0
    ) || 0;

    const paidEarnings = earnings?.reduce((sum: number, e: any) =>
      e.status === "paid" ? sum + e.commission_amount : sum, 0
    ) || 0;

    // Get products model has worn/promoted
    const { data: modelProducts } = await supabase
      .from("shop_model_products")
      .select(`
        id,
        is_favorite,
        worn_at_event,
        photo_urls,
        product:shop_products(
          id,
          name,
          slug,
          retail_price,
          images,
          brand:shop_brands(name, slug)
        )
      `)
      .eq("model_id", model.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      model: {
        id: model.id,
        username: model.username,
        name: model.first_name,
      },
      codes: codes || [],
      earnings: {
        total: totalEarnings,
        pending: pendingEarnings,
        available: availableEarnings,
        paid: paidEarnings,
        history: earnings?.map((e: any) => ({
          id: e.id,
          orderNumber: e.order?.order_number,
          orderStatus: e.order?.status,
          orderTotal: e.order_total,
          commissionRate: e.commission_rate,
          commissionAmount: e.commission_amount,
          status: e.status,
          availableAt: e.available_at,
          paidAt: e.paid_at,
          createdAt: e.created_at,
        })) || [],
      },
      products: modelProducts?.map((mp: any) => ({
        id: mp.product?.id,
        name: mp.product?.name,
        slug: mp.product?.slug,
        price: mp.product?.retail_price,
        image: mp.product?.images?.[0],
        brand: mp.product?.brand,
        isFavorite: mp.is_favorite,
        event: mp.worn_at_event,
        photos: mp.photo_urls || [],
      })) || [],
    });
  } catch (error) {
    console.error("Affiliate dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch affiliate data" },
      { status: 500 }
    );
  }
}

// POST - Create or update affiliate code
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get model
    const { data: model } = await supabase
      .from("models")
      .select("id, username")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json(
        { error: "Model profile not found" },
        { status: 404 }
      );
    }

    const { code, discountType, discountValue } = await request.json();

    // Validate code format
    const cleanCode = (code || model.username || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (cleanCode.length < 3 || cleanCode.length > 20) {
      return NextResponse.json(
        { error: "Code must be 3-20 alphanumeric characters" },
        { status: 400 }
      );
    }

    // Check if code already exists (not owned by this model)
    const { data: existingCode } = await supabase
      .from("shop_affiliate_codes")
      .select("id, model_id")
      .eq("code", cleanCode)
      .single();

    if (existingCode && existingCode.model_id !== model.id) {
      return NextResponse.json(
        { error: "This code is already taken" },
        { status: 400 }
      );
    }

    // Validate discount
    let validDiscountType = null;
    let validDiscountValue = null;

    if (discountType && discountValue) {
      if (discountType === "percent" && discountValue > 0 && discountValue <= 20) {
        validDiscountType = "percent";
        validDiscountValue = discountValue;
      } else if (discountType === "fixed" && discountValue > 0 && discountValue <= 2000) {
        validDiscountType = "fixed";
        validDiscountValue = discountValue; // cents
      }
    }

    if (existingCode) {
      // Update existing code
      const { data: updated, error } = await supabase
        .from("shop_affiliate_codes")
        .update({
          code: cleanCode,
          discount_type: validDiscountType,
          discount_value: validDiscountValue,
        })
        .eq("id", existingCode.id)
        .select()
        .single();

      if (error) {
        console.error("Update affiliate code error:", error);
        return NextResponse.json(
          { error: "Failed to update code" },
          { status: 500 }
        );
      }

      return NextResponse.json({ code: updated });
    } else {
      // Create new code
      const { data: created, error } = await supabase
        .from("shop_affiliate_codes")
        .insert({
          model_id: model.id,
          code: cleanCode,
          discount_type: validDiscountType,
          discount_value: validDiscountValue,
        })
        .select()
        .single();

      if (error) {
        console.error("Create affiliate code error:", error);
        return NextResponse.json(
          { error: "Failed to create code" },
          { status: 500 }
        );
      }

      return NextResponse.json({ code: created });
    }
  } catch (error) {
    console.error("Affiliate code error:", error);
    return NextResponse.json(
      { error: "Failed to save affiliate code" },
      { status: 500 }
    );
  }
}
