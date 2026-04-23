import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const service: any = createServiceRoleClient();
    const { data: models, error } = await service
      .from("models")
      .select("id, first_name, last_name, username, instagram_name, city, state, height, bust, waist, hips, eye_color, hair_color, dress_size, shoe_size, profile_photo_url, comp_card_exported_at")
      .not("comp_card_exported_at", "is", null)
      .order("comp_card_exported_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ models: models || [] });
  } catch (error) {
    logger.error("Comp card exports fetch error", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
