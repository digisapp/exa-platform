import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// GET - Get brand's products
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

    // Get brand for this user (brand admin)
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (!actor || (actor.type !== "brand" && actor.type !== "admin")) {
      return NextResponse.json({ error: "Not a brand account" }, { status: 403 });
    }

    // For admins, get brand_id from query param; for brands, use their actor id
    const { searchParams } = new URL(request.url);
    const brandId = actor.type === "admin"
      ? searchParams.get("brand_id")
      : null;

    // Get shop_brand for this actor
    let shopBrandQuery = supabase
      .from("shop_brands")
      .select("id, name, slug, commission_rate");

    if (brandId) {
      shopBrandQuery = shopBrandQuery.eq("id", brandId);
    } else {
      shopBrandQuery = shopBrandQuery.eq("contact_email", user.email || "");
    }

    const { data: shopBrand } = await shopBrandQuery.single();

    if (!shopBrand) {
      return NextResponse.json({
        brand: null,
        products: [],
        message: "No shop brand found for this account",
      });
    }

    // Get products
    const { data: products, error } = await supabase
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
        is_active,
        is_featured,
        total_sold,
        view_count,
        created_at,
        category:shop_categories(id, name, slug),
        variants:shop_product_variants(
          id,
          sku,
          size,
          color,
          stock_quantity,
          low_stock_threshold,
          price_override,
          is_active
        )
      `)
      .eq("brand_id", shopBrand.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Brand products query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    // Transform products
    const transformedProducts = products?.map((product: any) => {
      const activeVariants = product.variants?.filter((v: any) => v.is_active) || [];
      const totalStock = activeVariants.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);
      const lowStockVariants = activeVariants.filter((v: any) =>
        v.stock_quantity <= (v.low_stock_threshold || 5)
      ).length;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        wholesalePrice: product.wholesale_price,
        retailPrice: product.retail_price,
        compareAtPrice: product.compare_at_price,
        images: product.images || [],
        isActive: product.is_active,
        isFeatured: product.is_featured,
        totalSold: product.total_sold,
        viewCount: product.view_count,
        category: product.category,
        totalStock,
        variantCount: activeVariants.length,
        lowStockVariants,
        variants: product.variants,
        createdAt: product.created_at,
      };
    });

    return NextResponse.json({
      brand: {
        id: shopBrand.id,
        name: shopBrand.name,
        slug: shopBrand.slug,
        commissionRate: shopBrand.commission_rate,
      },
      products: transformedProducts || [],
    });
  } catch (error) {
    console.error("Brand products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST - Create new product
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

    // Get shop_brand for this user
    const { data: shopBrand } = await supabase
      .from("shop_brands")
      .select("id")
      .eq("contact_email", user.email || "")
      .single();

    if (!shopBrand) {
      return NextResponse.json(
        { error: "No shop brand found for this account" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      categoryId,
      wholesalePrice,
      retailPrice,
      compareAtPrice,
      images,
      variants,
    } = body;

    // Validate required fields
    if (!name || !wholesalePrice || !retailPrice) {
      return NextResponse.json(
        { error: "Name, wholesale price, and retail price are required" },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Create product
    const { data: product, error: productError } = await supabase
      .from("shop_products")
      .insert({
        brand_id: shopBrand.id,
        category_id: categoryId || null,
        name,
        slug,
        description: description || null,
        wholesale_price: wholesalePrice,
        retail_price: retailPrice,
        compare_at_price: compareAtPrice || null,
        images: images || [],
        is_active: true,
      })
      .select("id")
      .single();

    if (productError) {
      console.error("Create product error:", productError);
      return NextResponse.json(
        { error: "Failed to create product" },
        { status: 500 }
      );
    }

    // Create variants if provided
    if (variants && variants.length > 0) {
      const variantRecords = variants.map((v: any, index: number) => ({
        product_id: product.id,
        sku: v.sku || `${slug}-${index + 1}`,
        size: v.size,
        color: v.color || null,
        color_hex: v.colorHex || null,
        stock_quantity: v.stockQuantity || 0,
        low_stock_threshold: v.lowStockThreshold || 5,
        price_override: v.priceOverride || null,
        is_active: true,
      }));

      const { error: variantsError } = await supabase
        .from("shop_product_variants")
        .insert(variantRecords);

      if (variantsError) {
        console.error("Create variants error:", variantsError);
        // Product created but variants failed - still return success with warning
        return NextResponse.json({
          product: { id: product.id },
          warning: "Product created but some variants may have failed",
        });
      }
    }

    return NextResponse.json({ product: { id: product.id } });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
