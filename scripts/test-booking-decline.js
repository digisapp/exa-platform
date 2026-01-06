const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const bookingId = "ddb52a52-eb28-4fe2-aaff-6e2dcad0fa3e";

  // Get the booking
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  console.log("Booking:", JSON.stringify(booking, null, 2));
  console.log("Booking Error:", bookingError);

  if (!booking) {
    console.log("Booking not found!");
    return;
  }

  // Get Miriam's model info
  const { data: miriam } = await supabase
    .from("models")
    .select("id, user_id, username")
    .eq("username", "miriam")
    .single();

  console.log("\nMiriam:", miriam);

  // Check if booking belongs to Miriam
  console.log("\nBooking model_id:", booking.model_id);
  console.log("Miriam model id:", miriam?.id);
  console.log("Match:", booking.model_id === miriam?.id);

  // Get Miriam's actor
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", miriam?.user_id)
    .single();

  console.log("\nMiriam's actor:", actor);

  // Try to update the booking status to declined
  console.log("\nTrying to update booking status to 'declined'...");
  const { data: updated, error: updateError } = await supabase
    .from("bookings")
    .update({
      status: "declined",
      model_response_notes: "Test decline",
      responded_at: new Date().toISOString()
    })
    .eq("id", bookingId)
    .select()
    .single();

  console.log("Updated:", updated);
  console.log("Update Error:", updateError);
}

test().catch(console.error);
