import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { sendWorkshopRegistrationConfirmationEmail } from "../src/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EMAILS = ["christymd305@gmail.com", "connectwithyani.ee@gmail.com"];

async function main() {
  const { data: workshop, error: wErr } = await supabase
    .from("workshops")
    .select("id, title, date, start_time, end_time, location_city, location_state, location_address, what_to_bring")
    .eq("slug", "runway-workshop")
    .single();

  if (wErr || !workshop) {
    console.error("Runway workshop not found:", wErr);
    process.exit(1);
  }

  const workshopDateObj = new Date(workshop.date);
  const dateFormatted = workshopDateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const timeFormatted = workshop.start_time && workshop.end_time
    ? `${workshop.start_time} - ${workshop.end_time}`
    : workshop.start_time || "TBA";

  const locationParts = [
    workshop.location_address,
    workshop.location_city && workshop.location_state
      ? `${workshop.location_city}, ${workshop.location_state}`
      : workshop.location_city || workshop.location_state,
  ].filter(Boolean);
  const locationFormatted = locationParts.length > 0 ? locationParts.join(", ") : "TBA";

  for (const email of EMAILS) {
    const { data: reg, error } = await supabase
      .from("workshop_registrations")
      .select("buyer_email, buyer_name, payment_type, total_price_cents")
      .ilike("buyer_email", email)
      .eq("workshop_id", workshop.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !reg) {
      console.error(`No completed runway registration for ${email}:`, error);
      continue;
    }

    const result = await sendWorkshopRegistrationConfirmationEmail({
      to: reg.buyer_email,
      buyerName: reg.buyer_name || "there",
      workshopTitle: workshop.title,
      workshopDate: dateFormatted,
      workshopTime: timeFormatted,
      workshopLocation: locationFormatted,
      paymentType: (reg.payment_type === "installment" ? "installment" : "full"),
      totalPriceCents: reg.total_price_cents,
      whatToBring: workshop.what_to_bring || undefined,
    });

    if (result.success) {
      console.log(`✓ Sent to ${reg.buyer_email} (${reg.buyer_name})`);
    } else {
      console.error(`✗ Failed to send to ${reg.buyer_email}:`, result.error);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
