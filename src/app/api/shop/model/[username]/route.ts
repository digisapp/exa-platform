import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    // Rate limit (public endpoint, IP-based)
    const rateLimitResponse = await checkEndpointRateLimit(request, "general");
    if (rateLimitResponse) return rateLimitResponse;

    // as any needed: shop tables and nullable fields not fully in generated types
    const supabase: any = await createClient();
    const { username } = await params;

    // Get model by username
    const { data: model, error: modelError } = await supabase
      .from("models")
      .select(`
        id,
        username,
        first_name,
        last_name,
        profile_photo_url,
        bio,
        instagram_handle
      `)
      .eq("username", username.toLowerCase())
      .single();

    if (modelError || !model) {
      return NextResponse.json(
        { error: "Model not found" },
        { status: 404 }
      );
    }

    // Get model's affiliate code
    const { data: affiliateCode } = await supabase
      .from("shop_affiliate_codes")
      .select("code, discount_type, discount_value")
      .eq("model_id", model.id)
      .eq("is_active", true)
      .single();

    // Get products the model has worn/promoted
    const { data: modelProducts } = await supabase
      .from("shop_model_products")
      .select(`
        id,
        is_favorite,
        worn_at_event,
        photo_urls,
        product:shop_products!inner(
          id,
          name,
          slug,
          description,
          retail_price,
          compare_at_price,
          images,
          is_active,
          total_sold,
          brand:shop_brands!inner(
            id,
            name,
            slug,
            logo_url,
            status
          ),
          variants:shop_product_variants(
            id,
            size,
            color,
            color_hex,
            stock_quantity,
            is_active
          )
        )
      `)
      .eq("model_id", model.id)
      .eq("product.is_active", true)
      .eq("product.brand.status", "active")
      .order("is_favorite", { ascending: false })
      .order("created_at", { ascending: false });

    // Transform products
    const products = modelProducts
      ?.filter((mp: any) => mp.product)
      .map((mp: any) => {
        const product = mp.product;
        const activeVariants = product.variants?.filter((v: any) => v.is_active) || [];
        const totalStock = activeVariants.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);
        const sizes = [...new Set(activeVariants.map((v: any) => v.size))] as string[];
        const colors = activeVariants
          .filter((v: any) => v.color)
          .reduce((acc: any[], v: any) => {
            if (!acc.find((c) => c.name === v.color)) {
              acc.push({ name: v.color, hex: v.color_hex });
            }
            return acc;
          }, []);

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.retail_price,
          compareAtPrice: product.compare_at_price,
          images: product.images || [],
          totalSold: product.total_sold,
          brand: {
            id: product.brand.id,
            name: product.brand.name,
            slug: product.brand.slug,
            logoUrl: product.brand.logo_url,
          },
          inStock: totalStock > 0,
          sizes,
          colors,
          // Model-specific data
          isFavorite: mp.is_favorite,
          wornAtEvent: mp.worn_at_event,
          modelPhotos: mp.photo_urls || [],
        };
      }) || [];

    // Get favorite products (model's picks)
    const favorites = products.filter((p: any) => p.isFavorite);

    // Get featured products from the shop for "You might also like"
    const { data: featuredProducts } = await supabase
      .from("shop_products")
      .select(`
        id,
        name,
        slug,
        retail_price,
        compare_at_price,
        images,
        brand:shop_brands!inner(
          id,
          name,
          slug,
          status
        ),
        variants:shop_product_variants(
          stock_quantity,
          is_active
        )
      `)
      .eq("is_active", true)
      .eq("is_featured", true)
      .eq("brand.status", "active")
      .limit(8);

    const recommended = featuredProducts
      ?.filter((p: any) => !products.find((mp: any) => mp.id === p.id))
      .map((p: any) => {
        const activeVariants = p.variants?.filter((v: any) => v.is_active) || [];
        const totalStock = activeVariants.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.retail_price,
          compareAtPrice: p.compare_at_price,
          images: p.images || [],
          brand: {
            id: p.brand.id,
            name: p.brand.name,
            slug: p.brand.slug,
          },
          inStock: totalStock > 0,
        };
      })
      .slice(0, 4) || [];

    return NextResponse.json({
      model: {
        id: model.id,
        username: model.username,
        name: model.first_name,
        fullName: `${model.first_name || ""} ${model.last_name || ""}`.trim(),
        photo: model.profile_photo_url,
        bio: model.bio,
        instagram: model.instagram_handle,
      },
      affiliateCode: affiliateCode?.code || null,
      discount: affiliateCode?.discount_type
        ? {
            type: affiliateCode.discount_type,
            value: affiliateCode.discount_value,
          }
        : null,
      favorites,
      products,
      recommended,
      stats: {
        productCount: products.length,
        favoriteCount: favorites.length,
      },
    });
  } catch (error) {
    console.error("Model shop error:", error);
    return NextResponse.json(
      { error: "Failed to fetch model shop" },
      { status: 500 }
    );
  }
}
