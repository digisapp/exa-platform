import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Issue {
  model_id: string;
  username: string;
  email: string;
  name: string;
  user_id: string;
  correct_actor_exists: boolean;
  correct_actor_user_id: string | null;
  orphan_actor_id: string | null;
  issue: string;
}

async function findOrphanActorIssues() {
  console.log("Finding models with orphan actor issues...\n");

  const { data: models, error: modelsError } = await supabase
    .from("models")
    .select(
      "id, username, email, user_id, first_name, last_name, is_approved, claimed_at"
    )
    .not("user_id", "is", null);

  if (modelsError) {
    console.error("Error fetching models:", modelsError);
    return;
  }

  console.log("Total models with user_id:", models.length);

  const issues: Issue[] = [];

  for (const model of models) {
    const { data: correctActor } = await supabase
      .from("actors")
      .select("id, user_id, type")
      .eq("id", model.id)
      .single();

    const { data: orphanActor } = await supabase
      .from("actors")
      .select("id, user_id, type")
      .eq("user_id", model.user_id)
      .single();

    const hasCorrectActor =
      correctActor && correctActor.user_id === model.user_id;
    const hasOrphanActor = orphanActor && orphanActor.id !== model.id;
    const noActor = !correctActor;

    if (!hasCorrectActor || hasOrphanActor) {
      issues.push({
        model_id: model.id,
        username: model.username,
        email: model.email,
        name: (
          (model.first_name || "") +
          " " +
          (model.last_name || "")
        ).trim(),
        user_id: model.user_id,
        correct_actor_exists: !!correctActor,
        correct_actor_user_id: correctActor ? correctActor.user_id : null,
        orphan_actor_id: hasOrphanActor ? orphanActor.id : null,
        issue: noActor
          ? "NO_ACTOR"
          : hasOrphanActor
          ? "ORPHAN_ACTOR"
          : "USER_ID_MISMATCH",
      });
    }
  }

  console.log("\n========================================");
  console.log("Models with orphan actor issues: " + issues.length);
  console.log("========================================\n");

  if (issues.length > 0) {
    issues.forEach((issue, i) => {
      console.log(i + 1 + ". " + issue.username + " (" + issue.name + ")");
      console.log("   Email: " + issue.email);
      console.log("   Issue: " + issue.issue);
      console.log("   Model ID: " + issue.model_id);
      if (issue.orphan_actor_id) {
        console.log("   Orphan Actor ID: " + issue.orphan_actor_id);
      }
      console.log("");
    });
  } else {
    console.log(
      "No issues found! All models with logins have correct actor records."
    );
  }

  return issues;
}

findOrphanActorIssues().catch(console.error);
