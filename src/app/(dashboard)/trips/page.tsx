import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSpotButton } from "@/components/travel/ConfirmSpotButton";
import {
  Plane,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";

export const dynamic = "force-dynamic";

interface TripApplication {
  id: string;
  status: string;
  confirmed_at: string | null;
  applied_at: string;
  gig: {
    id: string;
    slug: string;
    title: string;
    cover_image_url: string | null;
    location_city: string | null;
    location_state: string | null;
    start_at: string | null;
    end_at: string | null;
    status: string;
  };
}

export default async function MyTripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { data: model } = (await supabase
    .from("models")
    .select("id")
    .eq("user_id", user.id)
    .single()) as { data: { id: string } | null };
  if (!model) redirect("/dashboard");

  const { data } = (await (supabase.from("gig_applications") as any)
    .select(
      "id, status, confirmed_at, applied_at, gig:gigs!inner(id, slug, title, type, cover_image_url, location_city, location_state, start_at, end_at, status)"
    )
    .eq("model_id", model.id)
    .eq("gig.type", "travel")
    .order("applied_at", { ascending: false })) as { data: TripApplication[] | null };

  const apps = (data || []).filter((a) => a.gig);
  const now = new Date();
  const tripEnd = (a: TripApplication) =>
    new Date(a.gig.end_at || a.gig.start_at || 0);

  const upcoming = apps
    .filter((a) => a.status === "accepted" && a.gig.status !== "cancelled" && tripEnd(a) >= now)
    .sort((a, b) => new Date(a.gig.start_at || 0).getTime() - new Date(b.gig.start_at || 0).getTime());
  const applications = apps.filter((a) => a.status === "pending" || a.status === "waitlist");
  const past = apps.filter(
    (a) =>
      (a.status === "accepted" && (tripEnd(a) < now || a.gig.status === "cancelled")) ||
      a.status === "rejected" ||
      a.status === "withdrawn"
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plane className="h-6 w-6 text-violet-400" />
            My Trips
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Your EXA Travel schedule — accepted trips, applications, and travel history.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl border-white/15">
          <Link href="/travel#trips">
            Browse trips <ArrowRight className="h-4 w-4 ml-1.5" />
          </Link>
        </Button>
      </div>

      {apps.length === 0 && (
        <div className="text-center py-20 rounded-2xl border border-white/10 bg-white/[0.03]">
          <Plane className="h-12 w-12 mx-auto mb-4 text-white/20" />
          <p className="font-medium text-white/80 mb-1">No trips yet</p>
          <p className="text-sm text-white/50 mb-5">
            Apply for an EXA Travel trip and it&apos;ll show up here.
          </p>
          <Button asChild className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-xl">
            <Link href="/travel#trips">See open trips</Link>
          </Button>
        </div>
      )}

      {/* ── Upcoming ── */}
      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
            Upcoming
          </h2>
          {upcoming.map((app) => {
            const daysOut = app.gig.start_at
              ? differenceInCalendarDays(new Date(app.gig.start_at), now)
              : null;
            const location = [app.gig.location_city, app.gig.location_state]
              .filter(Boolean)
              .join(", ");
            return (
              <div
                key={app.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
              >
                <div className="flex items-stretch">
                  <Link
                    href={`/travel/${app.gig.slug}`}
                    className="w-24 sm:w-36 shrink-0 relative bg-gradient-to-br from-violet-500/20 to-cyan-500/20"
                  >
                    {app.gig.cover_image_url ? (
                      <Image
                        src={app.gig.cover_image_url}
                        alt={app.gig.title}
                        fill
                        sizes="144px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Plane className="h-8 w-8 text-white/20" />
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link
                        href={`/travel/${app.gig.slug}`}
                        className="font-semibold text-white hover:text-violet-300 transition-colors truncate"
                      >
                        {app.gig.title}
                      </Link>
                      {app.confirmed_at ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmed
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-400">Action needed</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
                      {location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-pink-400" /> {location}
                        </span>
                      )}
                      {app.gig.start_at && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-violet-400" />
                          {format(new Date(app.gig.start_at), "MMM d")}
                          {app.gig.end_at && ` – ${format(new Date(app.gig.end_at), "MMM d, yyyy")}`}
                        </span>
                      )}
                      {daysOut !== null && daysOut >= 0 && (
                        <span className="flex items-center gap-1.5 text-cyan-300">
                          <Clock className="h-3.5 w-3.5" />
                          {daysOut === 0 ? "Today!" : `In ${daysOut} day${daysOut === 1 ? "" : "s"}`}
                        </span>
                      )}
                    </div>
                    {!app.confirmed_at && (
                      <div className="mt-3">
                        <ConfirmSpotButton applicationId={app.id} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ── Pending applications ── */}
      {applications.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
            Applications
          </h2>
          {applications.map((app) => {
            const location = [app.gig.location_city, app.gig.location_state]
              .filter(Boolean)
              .join(", ");
            return (
              <Link
                key={app.id}
                href={`/travel/${app.gig.slug}`}
                className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                  {app.status === "waitlist" ? (
                    <Sparkles className="h-5 w-5 text-violet-400" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{app.gig.title}</p>
                  <p className="text-xs text-white/50">
                    {location}
                    {app.gig.start_at && ` · ${format(new Date(app.gig.start_at), "MMM d, yyyy")}`}
                  </p>
                </div>
                <Badge
                  className={
                    app.status === "waitlist"
                      ? "bg-violet-500/20 text-violet-300"
                      : "bg-amber-500/20 text-amber-400"
                  }
                >
                  {app.status === "waitlist" ? "Shortlisted" : "Under review"}
                </Badge>
              </Link>
            );
          })}
        </section>
      )}

      {/* ── Past ── */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Past</h2>
          {past.map((app) => {
            const location = [app.gig.location_city, app.gig.location_state]
              .filter(Boolean)
              .join(", ");
            const wasOnTrip = app.status === "accepted" && app.gig.status !== "cancelled";
            return (
              <Link
                key={app.id}
                href={`/travel/${app.gig.slug}`}
                className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors opacity-80"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                  <Plane className="h-5 w-5 text-white/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white/80 truncate">{app.gig.title}</p>
                  <p className="text-xs text-white/40">
                    {location}
                    {app.gig.start_at && ` · ${format(new Date(app.gig.start_at), "MMM yyyy")}`}
                  </p>
                </div>
                <Badge className="bg-zinc-500/20 text-zinc-400">
                  {app.gig.status === "cancelled"
                    ? "Cancelled"
                    : wasOnTrip
                      ? "Completed"
                      : app.status === "rejected"
                        ? "Not selected"
                        : "Withdrawn"}
                </Badge>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
