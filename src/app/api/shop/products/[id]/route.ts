import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Fetch product with all related data
    const { data: product, error } = await (supabase as any)
      .from("shop_products")
      .select(`
        id,
        name,
        slug,
        description,
        wholesale_price,
        retail_price,
        compare_at_price,
        images,
        meta_title,
        meta_description,
        is_active,
        is_featured,
        total_sold,
        view_count,
        created_at,
        brand:shop_brands!inner(
          id,
          name,
          slug,
          logo_url,
          description,
          ships_internationally,
          avg_ship_days
        ),
        category:shop_categories(
          id,
          name,
          slug
        ),
        variants:shop_product_variants(
          id,
          sku,
          size,
          color,
          color_hex,
          stock_quantity,
          low_stock_threshold,
          price_override,
          image_url,
          is_active
        )
      `)
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Increment view count (fire and forget)
    (supabase as any)
      .from("shop_products")
      .update({ view_count: (product.view_count || 0) + 1 })
      .eq("id", id)
      .then(() => {});

    // Get models who have worn this product
    const { data: modelProducts } = await (supabase as any)
      .from("shop_model_products")
      .select(`
        is_favorite,
        worn_at_event,
        photo_urls,
        model:models(
          id,
          first_name,
          username,
          profile_photo_url
        )
      `)
      .eq("product_id", id)
      .limit(10);

    // Transform product data
    const activeVariants = product.variants?.filter((v: any) => v.is_active) || [];
    const totalStock = activeVariants.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);

    // Group variants by size and color
    const sizes = [...new Set(activeVariants.map((v: any) => v.size))] as string[];
    const colors = activeVariants
      .filter((v: any) => v.color)
      .reduce((acc: any[], v: any) => {
        if (!acc.find((c) => c.name === v.color)) {
          acc.push({ name: v.color, hex: v.color_hex, image: v.image_url });
        }
        return acc;
      }, []);

    // Create variant lookup for stock by size/color
    const variantLookup: Record<string, any> = {};
    activeVariants.forEach((v: any) => {
      const key = `${v.size}-${v.color || "default"}`;
      variantLookup[key] = {
        id: v.id,
        sku: v.sku,
        stock: v.stock_quantity,
        lowStock: v.stock_quantity <= v.low_stock_threshold,
        price: v.price_override || product.retail_price,
      };
    });

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.retail_price,
        compareAtPrice: product.compare_at_price,
        images: product.images || [],
        metaTitle: product.meta_title,
        metaDescription: product.meta_description,
        isFeatured: product.is_featured,
        totalSold: product.total_sold,
        brand: {
          id: product.brand.id,
          name: product.brand.name,
          slug: product.brand.slug,
          logoUrl: product.brand.logo_url,
          description: product.brand.description,
          shipsInternationally: product.brand.ships_internationally,
          avgShipDays: product.brand.avg_ship_days,
        },
        category: product.category,
        inStock: totalStock > 0,
        totalStock,
        sizes,
        colors,
        variants: variantLookup,
      },
      wornBy: modelProducts?.map((mp: any) => ({
        model: {
          id: mp.model.id,
          name: mp.model.first_name,
          username: mp.model.username,
          photo: mp.model.profile_photo_url,
        },
        event: mp.worn_at_event,
        photos: mp.photo_urls || [],
        isFavorite: mp.is_favorite,
      })) || [],
    });
  } catch (error) {
    console.error("Shop product detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
