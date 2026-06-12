import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { PendingApprovalView } from "./PendingApprovalView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PendingApprovalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Service role bypasses RLS so an approved model can never get stuck here
  // due to a permission edge case (e.g. models.id != actors.id from the
  // existing-model approval branch).
  const admin = createServiceRoleClient();

  const [{ data: model }, { data: actor }] = await Promise.all([
    admin.from("models").select("is_approved").eq("user_id", user.id).maybeSingle(),
    admin.from("actors").select("type").eq("user_id", user.id).maybeSingle(),
  ]);

  if (model?.is_approved) redirect("/dashboard");
  if (!actor) redirect("/fan/signup");
  if (actor.type === "admin") redirect("/admin");
  if (actor.type === "brand") redirect("/dashboard");
  if (actor.type === "model") {
    // model row exists but not approved — stay on pending page
  } else if (actor.type === "fan") {
    // Only show pending to fans who actually have a pending application
    const { data: pendingApp } = await admin
      .from("model_applications")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    if (!pendingApp) redirect("/dashboard");
  }

  const { data: application } = await admin
    .from("model_applications")
    .select("instagram_username, tiktok_username, created_at, email_confirmed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return <PendingApprovalView application={application} />;
}
