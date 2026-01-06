const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

async function test() {
  // Create client with anon key (like browser would)
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Sign in as Miriam
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: "miriam@examodels.com",
    password: "test1234"  // This is a test password, we'll try common ones
  });

  if (signInError) {
    console.log("Sign in error:", signInError.message);
    console.log("\nTrying to get Miriam's model_id to check directly...");
    
    // Use admin to get Miriam's info
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: miriam } = await adminClient
      .from("models")
      .select("id, user_id")
      .eq("username", "miriam")
      .single();
    
    // Generate a session for Miriam
    const { data: sessionData, error: sessionError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: 'miriam@examodels.com'
    });
    
    console.log("Session generation:", sessionError ? sessionError.message : "attempted");
    
    // Let's test what the RLS would return by using set_config to simulate
    // Actually, let's just verify the offer_response belongs to Miriam
    
    const { data: responses } = await adminClient
      .from("offer_responses")
      .select("*")
      .eq("model_id", miriam.id);
    
    console.log("\nMiriam's offer_responses (admin):", responses?.length, "records");
    
    // Check the model's user_id matches
    console.log("\nMiriam model user_id:", miriam.user_id);
    
    // Get the auth.users record
    const { data: { user } } = await adminClient.auth.admin.getUserById(miriam.user_id);
    console.log("Auth user email:", user?.email);
    console.log("Auth user id:", user?.id);
    
    // The key test: Is miriam.user_id the same as what auth.uid() would return?
    // Let's verify this is consistent
    
    // Check the actors table
    const { data: actor } = await adminClient
      .from("actors")
      .select("id, type, user_id")
      .eq("user_id", miriam.user_id)
      .single();
    
    console.log("\nActor for Miriam:", actor);
    
    // The models table query in dashboard uses user_id from auth
    // But the offer_responses query uses model.id
    // Let's verify model.id is correct
    console.log("\nVerification:");
    console.log("- model.id:", miriam.id);
    console.log("- model.user_id:", miriam.user_id);
    console.log("- The dashboard queries offer_responses with model_id =", miriam.id);
    
    // Now let's check if the offer_response.model_id matches
    if (responses && responses[0]) {
      console.log("- offer_response.model_id:", responses[0].model_id);
      console.log("- Match:", responses[0].model_id === miriam.id);
    }
    
    return;
  }

  console.log("Signed in as:", signInData.user?.email);
  
  // Now test the queries as Miriam
  const { data: model } = await anonClient
    .from("models")
    .select("id")
    .eq("user_id", signInData.user.id)
    .single();
  
  console.log("Model ID:", model?.id);

  // Test offer_responses query
  const { data: responses, error: respError } = await anonClient
    .from("offer_responses")
    .select(`
      id,
      status,
      offer_id,
      offers (
        id,
        title,
        brand_id
      )
    `)
    .eq("model_id", model.id)
    .eq("status", "pending");

  console.log("\nAs Miriam - Offer responses:", responses);
  console.log("Error:", respError);
}

test().catch(console.error);
