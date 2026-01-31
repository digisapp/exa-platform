import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: categories, error } = await (supabase as any)
      .from("shop_categories")
      .select(`
        id,
        name,
        slug,
        description,
        image_url,
        parent_id,
        sort_order
      `)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Shop categories query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      );
    }

    // Build hierarchical structure
    const categoryMap: Record<string, any> = {};
    const rootCategories: any[] = [];

    categories?.forEach((cat: any) => {
      categoryMap[cat.id] = {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        imageUrl: cat.image_url,
        children: [],
      };
    });

    categories?.forEach((cat: any) => {
      if (cat.parent_id && categoryMap[cat.parent_id]) {
        categoryMap[cat.parent_id].children.push(categoryMap[cat.id]);
      } else {
        rootCategories.push(categoryMap[cat.id]);
      }
    });

    return NextResponse.json({
      categories: rootCategories,
    });
  } catch (error) {
    console.error("Shop categories error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
