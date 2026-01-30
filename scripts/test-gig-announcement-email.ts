import { config } from "dotenv";
config({ path: ".env.local" });

import { sendNewGigAnnouncementEmail } from "../src/lib/email";

async function main() {
  console.log("Sending test gig announcement email...");

  const result = await sendNewGigAnnouncementEmail({
    to: "miriam@examodels.com",
    modelName: "Miriam",
    gigTitle: "Miami Swim Week 2026 - Runway Show",
    gigType: "show",
    gigDate: "May 26, 2026",
    gigLocation: "Miami Beach, FL",
    gigSlug: "miami-swim-week-2026-runway-show",
    coverImageUrl: "https://www.examodels.com/miami-swim-week-cover.jpg",
  });

  if (result.success) {
    console.log("Email sent successfully!");
    console.log("Result:", result);
  } else {
    console.error("Failed to send email:", result.error);
  }
}

main().catch(console.error);
