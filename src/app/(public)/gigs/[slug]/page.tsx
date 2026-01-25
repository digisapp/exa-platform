import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Clock,
  ArrowLeft,
  Trophy,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ApplyButton } from "@/components/gigs/ApplyButton";
import { TripApplicationForm } from "@/components/gigs/TripApplicationForm";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("gigs")
    .select("title, description")
    .eq("slug", slug)
    .single() as { data: { title: string; description: string | null } | null };

  if (!data) {
    return { title: "Gig Not Found | EXA" };
  }

  return {
    title: `${data.title} | EXA Gigs`,
    description: data.description || `Apply for ${data.title} on EXA Models`,
    robots: { index: false, follow: false },
  };
}

export default async function GigDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Get gig
  const { data: gig } = await supabase
    .from("gigs")
    .select("*")
    .eq("slug", slug)
    .single() as { data: any };

  if (!gig) {
    notFound();
  }

  // Check if user has already applied
  const { data: { user } } = await supabase.auth.getUser();
  let existingApplication: any = null;
  let modelId: string | null = null;
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let profileData: any = null;
  let coinBalance = 0;

  if (user) {
    // Get actor info
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: "admin" | "model" | "brand" | "fan" } | null };

    actorType = actor?.type || null;

    // Get profile info based on actor type
    if (actor?.type === "model" || actor?.type === "admin") {
      const { data: model } = await supabase
        .from("models")
        .select("id, username, first_name, last_name, profile_photo_url, coin_balance")
        .eq("user_id", user.id)
        .single() as { data: any };
      profileData = model;
      coinBalance = model?.coin_balance ?? 0;

      if (model) {
        modelId = model.id;
        const { data: app } = await supabase
          .from("gig_applications")
          .select("*, trip_number, spot_type, payment_status")
          .eq("gig_id", gig.id)
          .eq("model_id", model.id)
          .single() as { data: any };
        existingApplication = app;
      }
    } else if (actor?.type === "fan") {
      const { data } = await supabase
        .from("fans")
        .select("display_name, avatar_url, coin_balance")
        .eq("id", actor.id)
        .single() as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;
    }
  }

  const displayName = actorType === "fan"
    ? profileData?.display_name
    : profileData?.first_name
      ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
      : profileData?.username || undefined;

  const spotsLeft = gig.spots ? gig.spots - gig.spots_filled : null;
  const deadline = gig.application_deadline
    ? new Date(gig.application_deadline)
    : null;
  const isExpired = deadline && deadline < new Date();
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const canApply = gig.status === "open" && !isExpired && !isFull && !existingApplication;

  // Parse requirements
  const requirements = gig.requirements as Record<string, any> | null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        user={user ? {
          id: user.id,
          email: user.email || "",
          avatar_url: profileData?.profile_photo_url || profileData?.avatar_url || undefined,
          name: displayName,
          username: profileData?.username || undefined,
        } : undefined}
        actorType={actorType}
      />

      <main className="container px-8 md:px-16 py-8">
        {/* Back Button */}
        <Link
          href="/gigs"
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Gigs
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cover Image - Ultra wide banner */}
            {gig.cover_image_url && (
              <div className="aspect-[21/9] rounded-2xl overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                <img
                  src={gig.cover_image_url}
                  alt={gig.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Header */}
            <div>
              <Badge className="mb-3 capitalize">{gig.type}</Badge>
              <h1 className="text-3xl font-bold mb-2">{gig.title}</h1>
              {(gig.location_city || gig.location_state) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {gig.location_name ||
                    `${gig.location_city}, ${gig.location_state}`}
                </div>
              )}
            </div>

            {/* Description */}
            {gig.description && (
              <div>
                <h2 className="font-semibold mb-2">About This Gig</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {gig.description}
                </p>
              </div>
            )}

            {/* Requirements */}
            {requirements && Object.keys(requirements).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {requirements.min_followers && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Minimum {requirements.min_followers.toLocaleString()} followers
                      </li>
                    )}
                    {requirements.locations && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Based in: {requirements.locations.join(", ")}
                      </li>
                    )}
                    {requirements.height_range && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Height: {requirements.height_range.min}&quot; - {requirements.height_range.max}&quot;
                      </li>
                    )}
                    {requirements.experience && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {requirements.experience}
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Compensation */}
            {gig.compensation_description && (
              <Card>
                <CardHeader>
                  <CardTitle>Compensation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{gig.compensation_description}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Apply Card */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {/* Status */}
                  {existingApplication ? (
                    <div className="p-4 rounded-lg bg-muted text-center">
                      <p className="font-medium mb-1">Application Status</p>
                      <Badge
                        variant={
                          existingApplication.status === "accepted" || existingApplication.status === "approved"
                            ? "default"
                            : existingApplication.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                        className={`capitalize ${
                          existingApplication.status === "accepted" || existingApplication.status === "approved"
                            ? "bg-green-500"
                            : ""
                        }`}
                      >
                        {existingApplication.status === "approved" ? "Confirmed" : existingApplication.status}
                      </Badge>
                      {existingApplication.payment_status === "paid" && (
                        <p className="text-xs text-green-500 mt-2">Payment received</p>
                      )}
                      {existingApplication.trip_number && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Trip {existingApplication.trip_number}
                        </p>
                      )}
                    </div>
                  ) : gig.type === "travel" && canApply ? (
                    // Use TripApplicationForm for travel gigs
                    <TripApplicationForm
                      gigId={gig.id}
                      gigSlug={slug}
                      modelId={modelId}
                      isLoggedIn={!!user}
                    />
                  ) : canApply ? (
                    <ApplyButton gigId={gig.id} modelId={modelId} />
                  ) : (
                    <div className="p-4 rounded-lg bg-muted text-center">
                      {!user ? (
                        <>
                          <p className="text-muted-foreground mb-2">Sign in to apply</p>
                          <Button asChild className="w-full">
                            <Link href={`/signin?redirect=/gigs/${slug}`}>Sign In</Link>
                          </Button>
                        </>
                      ) : isExpired ? (
                        <p className="text-muted-foreground">Applications closed</p>
                      ) : isFull ? (
                        <p className="text-muted-foreground">All spots filled</p>
                      ) : (
                        <p className="text-muted-foreground">Not accepting applications</p>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Details */}
                  <div className="space-y-3">
                    {gig.start_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date
                        </span>
                        <span className="font-medium">
                          {format(new Date(gig.start_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                    {deadline && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Deadline
                        </span>
                        <span className={`font-medium ${isExpired ? "text-red-500" : ""}`}>
                          {isExpired ? "Expired" : formatDistanceToNow(deadline, { addSuffix: true })}
                        </span>
                      </div>
                    )}
                    {spotsLeft !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Spots
                        </span>
                        <span className="font-medium">
                          {spotsLeft} of {gig.spots} left
                        </span>
                      </div>
                    )}
                    {gig.compensation_type && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Compensation
                        </span>
                        <span className="font-medium capitalize">
                          {gig.compensation_type === "paid" && gig.compensation_amount > 0 ? (
                            <span className="text-green-500">
                              ${(gig.compensation_amount / 100).toFixed(0)}
                            </span>
                          ) : (
                            gig.compensation_type
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Points
                      </span>
                      <span className="font-medium text-pink-500">
                        +{gig.points_for_completion}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
