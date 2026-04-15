const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // Get Miriam's model ID
  const { data: miriam } = await supabase
    .from("models")
    .select("id, user_id")
    .eq("username", "miriam")
    .single();

  console.log("Miriam:", miriam);

  // Check bookings for Miriam
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("model_id", miriam.id)
    .in("status", ["pending", "counter"])
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("\nPending/Counter bookings for Miriam:");
  console.log("Count:", bookings?.length || 0);
  console.log("Data:", JSON.stringify(bookings, null, 2));
  console.log("Error:", error);

  // Check ALL bookings for Miriam (any status)
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("id, status, created_at")
    .eq("model_id", miriam.id);

  console.log("\nAll bookings for Miriam:");
  console.log("Count:", allBookings?.length || 0);
  allBookings?.forEach(b => console.log(`  - ${b.id}: ${b.status} (${b.created_at})`));
}

check().catch(console.error);
