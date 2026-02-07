import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendOfferReceivedEmail } from "@/lib/email";

const adminClient: any = createServiceRoleClient();

// Helper to calculate next occurrence date
function getNextOccurrence(currentDate: string, pattern: string): Date {
  const date = new Date(currentDate);

  switch (pattern) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "biweekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      date.setDate(date.getDate() + 7);
  }

  return date;
}

// GET /api/cron/recurring-offers - Create next instances of recurring offers
// Runs daily at 6 AM via Vercel cron
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find recurring offers where event_date has passed and no child exists for next occurrence
    const { data: recurringOffers, error } = await adminClient
      .from("offers")
      .select(`
        *,
        list:brand_lists(id, name, brand_id)
      `)
      .eq("is_recurring", true)
      .lt("event_date", today.toISOString().split("T")[0]);

    if (error) throw error;

    let createdCount = 0;
    const errors: string[] = [];

    for (const offer of recurringOffers || []) {
      try {
        // Skip if recurrence has ended
        if (offer.recurrence_end_date && new Date(offer.recurrence_end_date) < today) {
          // Mark as no longer recurring
          await adminClient
            .from("offers")
            .update({ is_recurring: false })
            .eq("id", offer.id);
          continue;
        }

        // Calculate next occurrence
        const nextDate = getNextOccurrence(offer.event_date, offer.recurrence_pattern);

        // Skip if next date is past the end date
        if (offer.recurrence_end_date && nextDate > new Date(offer.recurrence_end_date)) {
          await adminClient
            .from("offers")
            .update({ is_recurring: false })
            .eq("id", offer.id);
          continue;
        }

        // Check if a child offer already exists for this date
        const { data: existingChild } = await adminClient
          .from("offers")
          .select("id")
          .eq("parent_offer_id", offer.id)
          .eq("event_date", nextDate.toISOString().split("T")[0])
          .single();

        if (existingChild) {
          continue; // Already created
        }

        // Create new offer instance
        const { data: newOffer, error: createError } = await adminClient
          .from("offers")
          .insert({
            brand_id: offer.brand_id,
            list_id: offer.list_id,
            title: offer.title,
            description: offer.description,
            location_name: offer.location_name,
            location_city: offer.location_city,
            location_state: offer.location_state,
            event_date: nextDate.toISOString().split("T")[0],
            event_time: offer.event_time,
            compensation_type: offer.compensation_type,
            compensation_amount: offer.compensation_amount,
            compensation_description: offer.compensation_description,
            spots: offer.spots,
            status: "open",
            // Keep recurring for the next instance to be created
            is_recurring: true,
            recurrence_pattern: offer.recurrence_pattern,
            recurrence_end_date: offer.recurrence_end_date,
            parent_offer_id: offer.parent_offer_id || offer.id, // Link to original parent
          })
          .select()
          .single();

        if (createError) throw createError;

        // Mark the old offer as no longer recurring (it's been superseded)
        await adminClient
          .from("offers")
          .update({ is_recurring: false })
          .eq("id", offer.id);

        // Get current list members
        const { data: listItems } = await adminClient
          .from("brand_list_items")
          .select("model_id")
          .eq("list_id", offer.list_id);

        if (listItems && listItems.length > 0) {
          // Create pending responses
          const responses = listItems.map((item: any) => ({
            offer_id: newOffer.id,
            model_id: item.model_id,
            status: "pending",
          }));

          await adminClient.from("offer_responses").insert(responses);

          // Get brand name
          const { data: brand } = await adminClient
            .from("brands")
            .select("company_name")
            .eq("id", offer.brand_id)
            .single();

          // Get model details for emails
          const modelIds = listItems.map((item: any) => item.model_id);
          const { data: models } = await adminClient
            .from("models")
            .select("id, first_name, username, user_id")
            .in("id", modelIds);

          if (models && models.length > 0) {
            // Get user emails
            const userIds = models.map((m: any) => m.user_id);
            const { data: users } = await adminClient.auth.admin.listUsers();
            const userEmails = new Map<string, string>(
              users?.users?.filter((u: any) => userIds.includes(u.id)).map((u: any) => [u.id, u.email]) || []
            );

            // Build location string
            const locationParts = [offer.location_name, offer.location_city, offer.location_state].filter(Boolean);
            const locationStr = locationParts.length > 0 ? locationParts.join(", ") : undefined;

            // Build compensation string
            let compensationStr: string | undefined;
            if (offer.compensation_type === "paid" && offer.compensation_amount) {
              compensationStr = `$${offer.compensation_amount / 100}`;
            } else if (offer.compensation_description) {
              compensationStr = offer.compensation_description;
            }

            // Send emails (fire and forget)
            for (const model of models) {
              const email = userEmails.get(model.user_id);
              if (email) {
                sendOfferReceivedEmail({
                  to: email,
                  modelName: model.first_name || model.username,
                  brandName: brand?.company_name || "A brand",
                  offerTitle: offer.title,
                  eventDate: nextDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  }),
                  eventTime: offer.event_time,
                  location: locationStr,
                  compensation: compensationStr,
                  offerId: newOffer.id,
                }).catch((err) => console.error("Failed to send recurring offer email:", err));
              }
            }
          }
        }

        createdCount++;
      } catch (err) {
        console.error(`Failed to create recurring offer for ${offer.id}:`, err);
        errors.push(`Failed for offer ${offer.id}`);
      }
    }

    return NextResponse.json({
      message: `Created ${createdCount} recurring offers`,
      created: createdCount,
      total: recurringOffers?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Cron recurring-offers error:", error);
    return NextResponse.json({ error: "Failed to process recurring offers" }, { status: 500 });
  }
}
