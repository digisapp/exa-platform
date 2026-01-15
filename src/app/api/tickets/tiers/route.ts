import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    interface TicketTier {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      price_cents: number;
      quantity_available: number | null;
      quantity_sold: number;
      sort_order: number;
      is_active: boolean;
      sale_starts_at: string | null;
      sale_ends_at: string | null;
    }

    // Get active tiers for the event
    const { data: tiers, error } = await (supabase as any)
      .from("ticket_tiers")
      .select(`
        id,
        name,
        slug,
        description,
        price_cents,
        quantity_available,
        quantity_sold,
        sort_order,
        is_active,
        sale_starts_at,
        sale_ends_at
      `)
      .eq("event_id", eventId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }) as { data: TicketTier[] | null; error: any };

    if (error) {
      console.error("Error fetching tiers:", error);
      return NextResponse.json(
        { error: "Failed to fetch ticket tiers" },
        { status: 500 }
      );
    }

    // Add availability info
    const now = new Date();
    const tiersWithAvailability = (tiers || []).map((tier) => {
      const available = tier.quantity_available === null
        ? null // Unlimited
        : Math.max(0, tier.quantity_available - tier.quantity_sold);

      const isSaleActive =
        (!tier.sale_starts_at || new Date(tier.sale_starts_at) <= now) &&
        (!tier.sale_ends_at || new Date(tier.sale_ends_at) >= now);

      return {
        ...tier,
        available,
        isSoldOut: available === 0,
        isSaleActive,
      };
    });

    return NextResponse.json({ tiers: tiersWithAvailability });
  } catch (error) {
    console.error("Tiers fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
