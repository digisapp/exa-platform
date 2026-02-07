import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendOfferReminderEmail } from "@/lib/email";

const adminClient = createServiceRoleClient();

// GET /api/cron/offer-reminders - Send reminder emails to confirmed models
// Runs twice daily (8 AM and 6 PM) via Vercel cron
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for Vercel cron jobs) - REQUIRED
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error("Cron authentication failed - CRON_SECRET missing or invalid");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find confirmed responses for events in 24-48 hours that haven't received a reminder
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Get confirmed/accepted responses with upcoming events
    const { data: responses, error } = await adminClient
      .from("offer_responses")
      .select(`
        id,
        model_id,
        reminder_sent_at,
        offer:offers(
          id,
          title,
          event_date,
          event_time,
          location_name,
          location_city,
          location_state,
          brand_id
        )
      `)
      .in("status", ["confirmed", "accepted"])
      .is("reminder_sent_at", null);

    if (error) throw error;

    // Filter to events in 24-48 hour window
    // Note: Supabase returns offer as single object (not array) for FK relationships
    const upcomingResponses = (responses || []).filter((r: any) => {
      const offer = r.offer as any;
      if (!offer?.event_date) return false;
      const eventDate = new Date(offer.event_date);
      return eventDate >= in24Hours && eventDate <= in48Hours;
    });

    if (upcomingResponses.length === 0) {
      return NextResponse.json({ message: "No reminders to send", sent: 0 });
    }

    // Get unique brand IDs for company names
    const brandIds = [...new Set(upcomingResponses.map((r: any) => (r.offer as any).brand_id))];
    const { data: brands } = await adminClient
      .from("brands")
      .select("id, company_name, contact_email, contact_phone")
      .in("id", brandIds);

    const brandMap = new Map(brands?.map((b: any) => [b.id, b]) || []);

    // Get model details
    const modelIds = [...new Set(upcomingResponses.map((r: any) => r.model_id))];
    const { data: models } = await adminClient
      .from("models")
      .select("id, first_name, username, user_id")
      .in("id", modelIds);

    const modelMap = new Map(models?.map((m: any) => [m.id, m]) || []);

    // Get user emails
    const userIds = models?.map((m: any) => m.user_id) || [];
    const { data: users } = await adminClient.auth.admin.listUsers();
    const userEmails = new Map(
      users?.users?.filter((u: any) => userIds.includes(u.id)).map((u: any) => [u.id, u.email]) || []
    );

    let sentCount = 0;
    const errors: string[] = [];

    // Send reminders
    for (const response of upcomingResponses) {
      const offer = response.offer as any;
      const model = modelMap.get(response.model_id);
      const brand = brandMap.get(offer.brand_id);
      const email = model ? userEmails.get(model.user_id) : null;

      if (!email || !model) continue;

      // Build location string
      const locationParts = [
        offer.location_name,
        offer.location_city,
        offer.location_state
      ].filter(Boolean);
      const location = locationParts.length > 0 ? locationParts.join(", ") : undefined;

      // Build brand contact
      const brandContact = brand?.contact_phone || brand?.contact_email || undefined;

      try {
        await sendOfferReminderEmail({
          to: email,
          modelName: model.first_name || model.username,
          offerTitle: offer.title,
          eventDate: new Date(offer.event_date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          }),
          eventTime: offer.event_time,
          location,
          brandName: brand?.company_name || "The brand",
          brandContact,
        });

        // Mark reminder as sent
        await adminClient
          .from("offer_responses")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", response.id);

        sentCount++;
      } catch (err) {
        console.error(`Failed to send reminder to ${email}:`, err);
        errors.push(`Failed for model ${model.id}`);
      }
    }

    return NextResponse.json({
      message: `Sent ${sentCount} reminders`,
      sent: sentCount,
      total: upcomingResponses.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Cron offer-reminders error:", error);
    return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 });
  }
}
