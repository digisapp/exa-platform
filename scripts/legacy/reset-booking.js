const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function reset() {
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "pending",
      model_response_notes: null,
      responded_at: null
    })
    .eq("id", "ddb52a52-eb28-4fe2-aaff-6e2dcad0fa3e");
  
  console.log("Reset error:", error);
  console.log("Booking reset to pending");
}

reset();
