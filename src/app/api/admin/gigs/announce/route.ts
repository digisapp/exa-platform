import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendNewGigAnnouncementEmail } from "@/lib/email";
import { format } from "date-fns";

// Announce a new gig to all models with profile pictures
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { gigId } = body;

    if (!gigId) {
      return NextResponse.json(
        { error: "Missing gigId" },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get gig details
    const { data: gig } = await (adminClient
      .from("gigs") as any)
      .select("*")
      .eq("id", gigId)
      .single();

    if (!gig) {
      return NextResponse.json(
        { error: "Gig not found" },
        { status: 404 }
      );
    }

    // Get all models with profile pictures (approved models only)
    const { data: models, error: modelsError } = await (adminClient
      .from("models") as any)
      .select("id, email, first_name, username, profile_photo_url")
      .eq("is_approved", true)
      .not("profile_photo_url", "is", null);

    if (modelsError) {
      console.error("Error fetching models:", modelsError);
      return NextResponse.json(
        { error: "Failed to fetch models" },
        { status: 500 }
      );
    }

    if (!models || models.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No models with profile pictures found",
        emailsSent: 0
      });
    }

    // Format gig details for email
    const gigDate = gig.start_at
      ? format(new Date(gig.start_at), "MMMM d, yyyy")
      : undefined;
    const gigLocation = gig.location_city && gig.location_state
      ? `${gig.location_city}, ${gig.location_state}`
      : gig.location_city || gig.location_state || undefined;

    // Send emails to all models
    let emailsSent = 0;
    let emailsSkipped = 0;
    let emailsFailed = 0;

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < models.length; i += batchSize) {
      const batch = models.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (model: any) => {
          if (!model.email) {
            emailsSkipped++;
            return;
          }

          try {
            const result = await sendNewGigAnnouncementEmail({
              to: model.email,
              modelName: model.first_name || model.username || "",
              gigTitle: gig.title,
              gigType: gig.type,
              gigDate,
              gigLocation,
              gigSlug: gig.slug,
              coverImageUrl: gig.cover_image_url || undefined,
            });

            if (result.success) {
              if ((result as any).skipped) {
                emailsSkipped++;
              } else {
                emailsSent++;
              }
            } else {
              emailsFailed++;
            }
          } catch (error) {
            console.error(`Failed to send email to ${model.email}:`, error);
            emailsFailed++;
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < models.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Gig announcement emails: ${emailsSent} sent, ${emailsSkipped} skipped, ${emailsFailed} failed`);

    return NextResponse.json({
      success: true,
      emailsSent,
      emailsSkipped,
      emailsFailed,
      totalModels: models.length
    });
  } catch (error) {
    console.error("Announce gig error:", error);
    return NextResponse.json(
      { error: "Failed to announce gig" },
      { status: 500 }
    );
  }
}
