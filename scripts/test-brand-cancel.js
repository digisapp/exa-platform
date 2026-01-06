const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  // Get a pending booking
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, client_id, model_id")
    .eq("status", "pending")
    .limit(1);

  if (!bookings || bookings.length === 0) {
    console.log("No pending bookings found");
    return;
  }

  const booking = bookings[0];
  console.log("Booking:", booking);

  // Get the client (brand) info
  const { data: clientActor } = await supabase
    .from("actors")
    .select("id, type, user_id")
    .eq("id", booking.client_id)
    .single();

  console.log("\nClient actor:", clientActor);

  // Try to update to cancelled
  console.log("\nTrying to cancel booking...");
  const { data: updated, error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_by: booking.client_id,
      cancelled_at: new Date().toISOString()
    })
    .eq("id", booking.id)
    .select()
    .single();

  console.log("Updated:", updated?.status);
  console.log("Error:", error);

  // Reset back to pending
  if (updated) {
    await supabase
      .from("bookings")
      .update({
        status: "pending",
        cancelled_by: null,
        cancelled_at: null
      })
      .eq("id", booking.id);
    console.log("\nReset back to pending");
  }
}

test().catch(console.error);
