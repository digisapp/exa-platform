import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Query params
    const brandId = searchParams.get("brand_id");
    const categorySlug = searchParams.get("category");
    const search = searchParams.get("q");
    const featured = searchParams.get("featured") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "24"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const sortBy = searchParams.get("sort") || "newest";

    // Build query
    let query = (supabase as any)
      .from("shop_products")
      .select(`
        id,
        name,
        slug,
        description,
        retail_price,
        compare_at_price,
        images,
        is_featured,
        total_sold,
        created_at,
        brand:shop_brands!inner(
          id,
          name,
          slug,
          logo_url
        ),
        category:shop_categories(
          id,
          name,
          slug
        ),
        variants:shop_product_variants(
          id,
          size,
          color,
          color_hex,
          stock_quantity,
          price_override,
          is_active
        )
      `)
      .eq("is_active", true);

    // Apply filters
    if (brandId) {
      query = query.eq("brand_id", brandId);
    }

    if (categorySlug) {
      query = query.eq("category.slug", categorySlug);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (featured) {
      query = query.eq("is_featured", true);
    }

    // Apply sorting
    switch (sortBy) {
      case "price_asc":
        query = query.order("retail_price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("retail_price", { ascending: false });
        break;
      case "popular":
        query = query.order("total_sold", { ascending: false });
        break;
      case "newest":
      default:
        query = query.order("created_at", { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: products, error, count } = await query;

    if (error) {
      console.error("Shop products query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    // Transform products to include price formatting and stock info
    const transformedProducts = products?.map((product: any) => {
      const activeVariants = product.variants?.filter((v: any) => v.is_active) || [];
      const totalStock = activeVariants.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);
      const sizes = [...new Set(activeVariants.map((v: any) => v.size))];
      const colors = [...new Set(activeVariants.filter((v: any) => v.color).map((v: any) => ({
        name: v.color,
        hex: v.color_hex
      })))];

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.retail_price,
        compareAtPrice: product.compare_at_price,
        images: product.images || [],
        isFeatured: product.is_featured,
        totalSold: product.total_sold,
        brand: product.brand,
        category: product.category,
        inStock: totalStock > 0,
        totalStock,
        sizes,
        colors,
      };
    });

    return NextResponse.json({
      products: transformedProducts || [],
      pagination: {
        offset,
        limit,
        total: count || products?.length || 0,
      },
    });
  } catch (error) {
    console.error("Shop products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
