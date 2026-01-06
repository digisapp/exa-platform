const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // Query just pending (without counter) to avoid the enum error
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("model_id", "864607e6-8f62-4e32-a508-db075e611d85")
    .eq("status", "pending")
    .limit(5);

  console.log("Pending bookings (status='pending' only):");
  console.log("Count:", bookings?.length || 0);
  console.log("Error:", error);
  
  if (bookings && bookings.length > 0) {
    console.log("\nFirst booking:");
    console.log(JSON.stringify(bookings[0], null, 2));
  }

  // Check what statuses exist
  const { data: statuses } = await supabase
    .from("bookings")
    .select("status")
    .limit(100);
  
  const uniqueStatuses = [...new Set(statuses?.map(s => s.status))];
  console.log("\nUnique statuses in bookings table:", uniqueStatuses);
}

check().catch(console.error);
