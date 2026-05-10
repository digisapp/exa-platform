import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";

// Prevent caching to ensure fresh auth state on every request
export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  let user: { id: string; email?: string } | null = null;
  let actor: { id: string; type: string } | null = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.error("AdminLayout: getUser threw", err);
  }

  if (!user) {
    redirect("/signin");
  }

  try {
    const { data } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };
    actor = data;
  } catch (err) {
    console.error("AdminLayout: actor lookup threw", err);
  }

  if (!actor || actor.type !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="fixed inset-0 bg-background overflow-y-auto">
      <Navbar
        user={{
          id: user.id,
          email: user.email || "",
        }}
        actorType="admin"
      />
      <main>{children}</main>
    </div>
  );
}
