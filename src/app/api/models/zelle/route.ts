import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const zelleSchema = z.object({
  zelle_info: z
    .string()
    .trim()
    .min(1, "Zelle email or phone is required")
    .max(255),
});

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkEndpointRateLimit(
      request,
      "general",
      user.id
    );
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const parsed = zelleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: model } = (await supabase
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single()) as { data: { id: string } | null };

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const { error } = await (supabase
      .from("models") as any)
      .update({ zelle_info: parsed.data.zelle_info })
      .eq("id", model.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to save Zelle info" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
