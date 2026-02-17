import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "uploads", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Verify caller is a brand
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (!actor || actor.type !== "brand") {
      return NextResponse.json({ error: "Only brands can upload contract PDFs" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be under 10MB" }, { status: 400 });
    }

    const adminClient: any = createServiceRoleClient();
    const timestamp = Date.now();
    const storagePath = `contracts/${actor.id}/${timestamp}.pdf`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from("portfolio")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    // Get signed URL (valid for 1 year)
    const { data: signedUrlData } = await adminClient.storage
      .from("portfolio")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    return NextResponse.json({
      url: signedUrlData?.signedUrl || null,
      storagePath,
    });
  } catch (error) {
    console.error("Error in POST /api/contracts/upload:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
