export const dynamic = "force-dynamic";

import { createServiceRoleClient } from "@/lib/supabase/service";
import { XLeadsClient } from "./XLeadsClient";

export default async function XLeadsPage() {
  const db = createServiceRoleClient() as any;

  const { data: leads } = await db
    .from("x_leads")
    .select("*")
    .order("discovered_at", { ascending: false });

  return <XLeadsClient initialLeads={leads ?? []} />;
}
