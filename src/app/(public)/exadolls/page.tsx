import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/service";

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
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-3">
            Gallery
          </p>
          <h1 className="text-4xl md:text-5xl font-bold flex items-center justify-center gap-3">
            <Sparkles className="h-8 w-8 text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.6)]" />
            <span className="exa-gradient-text">EXA Dolls</span>
            <Sparkles className="h-8 w-8 text-violet-400 drop-shadow-[0_0_10px_rgba(167,139,250,0.6)]" />
          </h1>
          <p className="mt-3 text-white/60 max-w-lg mx-auto">
            AI-generated doll-style digital twins of our models. Each one is
            uniquely crafted.
          </p>
        </div>

        {/* Gallery Grid */}
        {dolls.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-16 text-center">
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute inset-0 rounded-full bg-pink-500/30 blur-2xl" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 ring-1 ring-pink-500/40 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-pink-300" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              <span className="exa-gradient-text">No EXA Dolls yet</span>
            </h3>
            <p className="text-sm text-white/50">Check back soon — dolls are minted daily.</p>
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
                  <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-sm hover:border-pink-500/40 hover:shadow-[0_0_18px_rgba(236,72,153,0.3)] transition-all">
                    <div className="aspect-[3/4] relative bg-white/5">
                      <Image
                        src={model.exa_doll_image_url!}
                        alt={`${name} EXA Doll`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm text-white truncate">{name}</p>
                      {model.username && (
                        <p className="text-xs text-white/50 truncate">
                          @{model.username}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
