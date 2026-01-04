import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// This route just verifies admin access and returns a signed upload URL
// The actual upload happens directly to Supabase Storage from the client

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 });
    }

    // Generate unique path
    const timestamp = Date.now();
    const ext = filename.split(".").pop() || "jpg";
    const path = `${timestamp}.${ext}`;

    // Create signed upload URL
    const { data, error } = await supabase.storage
      .from("gigs")
      .createSignedUploadUrl(path);

    if (error) {
      console.error("Signed URL error:", error);
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    // Get the public URL for after upload
    const { data: { publicUrl } } = supabase.storage
      .from("gigs")
      .getPublicUrl(path);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl,
    });
  } catch (error) {
    console.error("Gig upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
