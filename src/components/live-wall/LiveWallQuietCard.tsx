import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Radio, Calendar, MapPin, ArrowUpRight, Sparkles } from "lucide-react";

interface Props {
  actorType: string;
  compact?: boolean;
}

/**
 * Shown in place of the Live Wall when it has gone quiet between events.
 * The wall is an event feature — it lit up around Miami Swim Week and went
 * dark after — so instead of a dead chat room we show "next up" gigs and
 * let the wall reopen itself when activity (or a system heartbeat) returns.
 */
export async function LiveWallQuietCard({ actorType, compact }: Props) {
  const supabase = await createClient();

  const { data: upcomingGigs } = await (supabase as any)
    .from("gigs")
    .select("id, slug, title, start_at, location_city, location_state")
    .eq("status", "open")
    .eq("visibility", "public")
    .order("start_at", { ascending: true })
    .limit(3);

  const gigs = upcomingGigs || [];
  const isModel = actorType === "model";

  return (
    <section
      className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden ${
        compact ? "" : "w-full"
      }`}
    >
      <header className="flex items-center gap-2 p-4 border-b border-white/5">
        <Radio className="h-4 w-4 text-pink-400" />
        <h3 className="text-sm font-semibold">EXA Live Wall</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-white/40">
          Between shows
        </span>
      </header>

      <div className="p-4 space-y-4">
        <p className="text-sm text-white/60">
          The Live Wall lights up during EXA shows and events — it&apos;ll be
          buzzing again when the next one kicks off.
        </p>

        {gigs.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40">
              Next up
            </p>
            {gigs.map((gig: any) => (
              <Link
                key={gig.id}
                href={`/gigs/${gig.slug}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.08] hover:border-pink-500/30 transition-all"
              >
                <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-violet-500/20 shrink-0">
                  <Sparkles className="h-4 w-4 text-pink-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{gig.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {gig.start_at && (
                      <span className="flex items-center gap-1 text-xs text-white/50">
                        <Calendar className="h-3 w-3" />
                        {new Date(gig.start_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    {(gig.location_city || gig.location_state) && (
                      <span className="flex items-center gap-1 text-xs text-white/50 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {[gig.location_city, gig.location_state].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/40">
            New shows are being scheduled — announcements land here first.
          </p>
        )}

        {isModel ? (
          <Link
            href="/gigs"
            className="flex items-center justify-center gap-1 text-xs font-semibold text-pink-400 hover:text-pink-300 transition-colors"
          >
            See all gigs <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : (
          <Link
            href="/tv"
            className="flex items-center justify-center gap-1 text-xs font-semibold text-pink-400 hover:text-pink-300 transition-colors"
          >
            Watch EXA TV <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </section>
  );
}
