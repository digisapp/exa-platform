import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { escapeIlike } from "@/lib/utils";

const supabase: any = createServiceRoleClient();

interface CSVRow {
  sku: string;
  name: string;
  brand?: string;
  category?: string;
  retail_price: string;
  wholesale_price?: string;
  size?: string;
  color?: string;
  stock_quantity: string;
  description?: string;
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    rows.push(row);
  }

  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data in CSV" }, { status: 400 });
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Get or create default brand
    let defaultBrandId: string | null = null;
    const { data: defaultBrand } = await supabase
      .from("shop_brands")
      .select("id")
      .eq("name", "Default")
      .single();

    if (defaultBrand) {
      defaultBrandId = defaultBrand.id;
    } else {
      const { data: newBrand } = await supabase
        .from("shop_brands")
        .insert({ name: "Default", slug: "default", is_active: true })
        .select()
        .single();
      defaultBrandId = newBrand?.id;
    }

    // Brand cache
    const brandCache: Record<string, string> = {};

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Account for header row and 0-index

      try {
        // Validate required fields
        if (!row.sku) {
          errors.push(`Row ${rowNum}: Missing SKU`);
          failed++;
          continue;
        }
        if (!row.name) {
          errors.push(`Row ${rowNum}: Missing product name`);
          failed++;
          continue;
        }
        if (!row.retail_price || isNaN(parseFloat(row.retail_price))) {
          errors.push(`Row ${rowNum}: Invalid retail price`);
          failed++;
          continue;
        }
        if (!row.stock_quantity || isNaN(parseInt(row.stock_quantity))) {
          errors.push(`Row ${rowNum}: Invalid stock quantity`);
          failed++;
          continue;
        }

        // Get or create brand
        let brandId = defaultBrandId;
        if (row.brand) {
          if (brandCache[row.brand]) {
            brandId = brandCache[row.brand];
          } else {
            const { data: existingBrand } = await supabase
              .from("shop_brands")
              .select("id")
              .ilike("name", escapeIlike(row.brand))
              .single();

            if (existingBrand) {
              brandId = existingBrand.id;
              brandCache[row.brand] = existingBrand.id;
            } else {
              const slug = row.brand.toLowerCase().replace(/\s+/g, "-");
              const { data: newBrand } = await supabase
                .from("shop_brands")
                .insert({ name: row.brand, slug, is_active: true })
                .select()
                .single();
              if (newBrand) {
                brandId = newBrand.id;
                brandCache[row.brand] = newBrand.id;
              }
            }
          }
        }

        // Check if product with this name exists
        const { data: existingProduct } = await supabase
          .from("shop_products")
          .select("id")
          .eq("name", row.name)
          .eq("brand_id", brandId)
          .single();

        let productId: string;

        if (existingProduct) {
          productId = existingProduct.id;
        } else {
          // Create new product
          const { data: newProduct, error: productError } = await supabase
            .from("shop_products")
            .insert({
              name: row.name,
              brand_id: brandId,
              retail_price: parseFloat(row.retail_price),
              wholesale_price: row.wholesale_price ? parseFloat(row.wholesale_price) : null,
              description: row.description || null,
              is_active: true,
            })
            .select()
            .single();

          if (productError || !newProduct) {
            errors.push(`Row ${rowNum}: Failed to create product - ${productError?.message}`);
            failed++;
            continue;
          }

          productId = newProduct.id;
        }

        // Check if variant with this SKU exists
        const { data: existingVariant } = await supabase
          .from("shop_product_variants")
          .select("id")
          .eq("sku", row.sku)
          .single();

        if (existingVariant) {
          // Update existing variant
          const { error: updateError } = await supabase
            .from("shop_product_variants")
            .update({
              size: row.size || null,
              color: row.color || null,
              stock_quantity: parseInt(row.stock_quantity),
              price_override: row.retail_price ? parseFloat(row.retail_price) : null,
            })
            .eq("id", existingVariant.id);

          if (updateError) {
            errors.push(`Row ${rowNum}: Failed to update variant - ${updateError.message}`);
            failed++;
            continue;
          }
        } else {
          // Create new variant
          const { error: variantError } = await supabase
            .from("shop_product_variants")
            .insert({
              product_id: productId,
              sku: row.sku,
              size: row.size || null,
              color: row.color || null,
              stock_quantity: parseInt(row.stock_quantity),
              price_override: null,
            });

          if (variantError) {
            errors.push(`Row ${rowNum}: Failed to create variant - ${variantError.message}`);
            failed++;
            continue;
          }
        }

        success++;
      } catch (error) {
        errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : "Unknown error"}`);
        failed++;
      }
    }

    return NextResponse.json({
      success,
      failed,
      errors: errors.slice(0, 20), // Limit errors returned
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
