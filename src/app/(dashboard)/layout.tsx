import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get actor info
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: "admin" | "model" | "brand" } | null };

  // Get model info if model
  let modelData: any = null;
  if (actor?.type === "model") {
    const { data } = await supabase
      .from("models")
      .select("username, name, avatar_url")
      .eq("id", actor.id)
      .single() as { data: any };
    modelData = data;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        user={{
          id: user.id,
          email: user.email || "",
          avatar_url: modelData?.avatar_url || undefined,
          name: modelData?.name || undefined,
          username: modelData?.username || undefined,
        }}
        actorType={actor?.type || null}
      />
      <main className="container py-8">{children}</main>
    </div>
  );
}
