import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const newDescription = `Join us for an exclusive runway workshop designed to prepare you for Miami Swim Week! Learn from industry models who have walked for top fashion shows. This workshop will cover runway techniques, posture, posing, and the confidence you need to shine on any catwalk.

**runway workshop attendees walk in our Miami Swim Week Shows!**

Whether you're a beginner looking to break into the industry or an experienced model wanting to refine your skills, this workshop is your gateway to the runway for Swim Week!`;

const { data, error } = await supabase
  .from("workshops")
  .update({ description: newDescription })
  .eq("slug", "runway-workshop")
  .select("slug, description");

if (error) {
  console.error("Error:", error.message);
} else {
  console.log("Updated:", data?.[0]?.slug);
  console.log("New description:", data?.[0]?.description);
}
