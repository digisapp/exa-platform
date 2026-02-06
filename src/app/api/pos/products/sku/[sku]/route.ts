import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sku: string }> }
) {
  try {
    const { sku } = await params;

    if (!sku) {
      return NextResponse.json({ error: "SKU required" }, { status: 400 });
    }

    // Look up variant by SKU
    const { data: variant, error: variantError } = await supabase
      .from("shop_product_variants")
      .select(`
        id,
        sku,
        size,
        color,
        stock_quantity,
        price_override,
        product_id
      `)
      .eq("sku", sku)
      .single();

    if (variantError || !variant) {
      // Try case-insensitive search
      const { data: variantCaseInsensitive, error: error2 } = await supabase
        .from("shop_product_variants")
        .select(`
          id,
          sku,
          size,
          color,
          stock_quantity,
          price_override,
          product_id
        `)
        .ilike("sku", sku)
        .limit(1)
        .single();

      if (error2 || !variantCaseInsensitive) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      // Get product details
      const { data: product, error: productError } = await supabase
        .from("shop_products")
        .select(`
          id,
          name,
          retail_price,
          images,
          brand_id,
          shop_brands (
            name
          )
        `)
        .eq("id", variantCaseInsensitive.product_id)
        .eq("is_active", true)
        .single();

      if (productError || !product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      return NextResponse.json({
        product: {
          id: product.id,
          name: product.name,
          retail_price: product.retail_price,
          images: product.images || [],
          brand_id: product.brand_id,
          brand_name: (product as any).shop_brands?.name,
        },
        variant: {
          id: variantCaseInsensitive.id,
          sku: variantCaseInsensitive.sku,
          size: variantCaseInsensitive.size,
          color: variantCaseInsensitive.color,
          stock_quantity: variantCaseInsensitive.stock_quantity,
          price_override: variantCaseInsensitive.price_override,
        },
      });
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from("shop_products")
      .select(`
        id,
        name,
        retail_price,
        images,
        brand_id,
        shop_brands (
          name
        )
      `)
      .eq("id", variant.product_id)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        retail_price: product.retail_price,
        images: product.images || [],
        brand_id: product.brand_id,
        brand_name: (product as any).shop_brands?.name,
      },
      variant: {
        id: variant.id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        stock_quantity: variant.stock_quantity,
        price_override: variant.price_override,
      },
    });
  } catch (error) {
    console.error("SKU lookup error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
