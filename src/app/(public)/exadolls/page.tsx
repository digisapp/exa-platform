import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "EXA Dolls — AI-Generated Digital Twins",
  description:
    "Browse the EXA Dolls gallery — stunning AI-generated doll-style digital twins of EXA Models.",
  openGraph: {
    title: "EXA Dolls — AI-Generated Digital Twins",
    description:
      "Browse the EXA Dolls gallery — stunning AI-generated doll-style digital twins of EXA Models.",
  },
};

export const revalidate = 120;

export default async function ExaDollsGalleryPage() {
  const supabase = createServiceRoleClient();

  const { data: models } = await supabase
    .from("models")
    .select(
      "id, first_name, last_name, username, exa_doll_image_url, exa_doll_generated_at"
    )
    .not("exa_doll_image_url", "is", null)
    .eq("is_approved", true)
    .order("exa_doll_generated_at", { ascending: false, nullsFirst: false })
    .limit(50);

  const dolls = models || [];

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-8 md:px-16 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Sparkles className="h-8 w-8 text-pink-500" />
            <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
              EXA Dolls
            </span>
            <Sparkles className="h-8 w-8 text-violet-500" />
          </h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            AI-generated doll-style digital twins of our models. Each one is
            uniquely crafted.
          </p>
        </div>

        {/* Gallery Grid */}
        {dolls.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-pink-300" />
            <p className="text-lg">No EXA Dolls generated yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {dolls.map((model) => {
              const name =
                [model.first_name, model.last_name].filter(Boolean).join(" ") ||
                model.username ||
                "Unknown";

              return (
                <Link
                  key={model.id}
                  href={`/models/${model.username}`}
                  className="group"
                >
                  <Card className="overflow-hidden transition-shadow hover:shadow-lg hover:shadow-pink-500/10 border-transparent hover:border-pink-500/20">
                    <div className="aspect-[3/4] relative bg-muted">
                      <Image
                        src={model.exa_doll_image_url!}
                        alt={`${name} EXA Doll`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm truncate">{name}</p>
                      {model.username && (
                        <p className="text-xs text-muted-foreground truncate">
                          @{model.username}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
