import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Update username from inezsmedberg1 to inezsmedberg
  const { data, error } = await supabase
    .from("models")
    .update({ username: "inezsmedberg" })
    .eq("username", "inezsmedberg1")
    .select("id, username, email");

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No model found with username inezsmedberg1");
    return;
  }

  console.log("Updated:");
  console.log("  Username:", data[0].username);
  console.log("  Email:", data[0].email);
  console.log("  URL: https://www.examodels.com/" + data[0].username);
}

main().catch(console.error);
