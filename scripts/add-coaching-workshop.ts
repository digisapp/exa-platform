import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const { data, error } = await supabase.from("workshops").insert({
  slug: "3-month-runway-coaching",
  title: "3-Month Runway Coaching Program",
  subtitle: "Virtual · Bi-Weekly Video Feedback · Swim Week Ready",
  description: `Get personalized 1-on-1 coaching to perfect your runway walk before Miami Swim Week 2026!\n\nOver 3 months, you'll work directly with our team of professional runway models. Each month you'll submit bi-weekly runway video submissions — our coaches review every submission and send back detailed personalized feedback covering your walk, posture, turns, expression, and stage presence. You refine, resubmit, and improve in real time.\n\nThis is the same preparation our top models use to get runway-ready. Available virtually so you can train from anywhere in the world.\n\n**runway workshop attendees walk in our Miami Swim Week Shows!**`,
  date: "2026-05-26",
  price_cents: 52500,
  spots_available: null,
  spots_sold: 0,
  highlights: [
    "Bi-weekly runway video submissions — submit from anywhere in the world",
    "Personalized 1-on-1 feedback on walk, posture, turns & stage presence",
    "Direct communication with our EXA Models coaching team each month",
    "3 full months of dedicated training to be runway-ready for Swim Week",
  ],
  status: "upcoming",
  meta_title: "3-Month Runway Coaching Program | EXA Models",
  meta_description: "Virtual 3-month runway coaching with bi-weekly video submissions and 1-on-1 feedback from EXA Models' professional team. Get runway-ready for Miami Swim Week 2026.",
}).select("id, slug");

if (error) {
  console.error("Error:", error.message);
} else {
  console.log("Created workshop:", data);
}
