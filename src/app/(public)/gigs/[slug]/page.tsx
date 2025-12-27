import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
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
import { ApplyButton } from "@/components/opportunities/apply-button";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("opportunities")
    .select("title, description")
    .eq("slug", slug)
    .single() as { data: { title: string; description: string | null } | null };

  if (!data) {
    return { title: "Opportunity Not Found | EXA" };
  }

  return {
    title: `${data.title} | EXA Gigs`,
    description: data.description || `Apply for ${data.title} on EXA Models`,
  };
}

export default async function OpportunityDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Get opportunity
  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("*")
    .eq("slug", slug)
    .single() as { data: any };

  if (!opportunity) {
    notFound();
  }

  // Check if user has already applied
  const { data: { user } } = await supabase.auth.getUser();
  let existingApplication: any = null;
  let actorId: string | null = null;

  if (user) {
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (actor) {
      actorId = actor.id;
      const { data: app } = await supabase
        .from("opportunity_applications")
        .select("*")
        .eq("opportunity_id", opportunity.id)
        .eq("model_id", actor.id)
        .single() as { data: any };
      existingApplication = app;
    }
  }

  const spotsLeft = opportunity.spots ? opportunity.spots - opportunity.spots_filled : null;
  const deadline = opportunity.application_deadline
    ? new Date(opportunity.application_deadline)
    : null;
  const isExpired = deadline && deadline < new Date();
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const canApply = opportunity.status === "open" && !isExpired && !isFull && !existingApplication;

  // Parse requirements
  const requirements = opportunity.requirements as Record<string, any> | null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

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
            {/* Cover Image */}
            <div className="aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20">
              {opportunity.cover_image_url ? (
                <img
                  src={opportunity.cover_image_url}
                  alt={opportunity.title}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-8xl">✨</span>
                </div>
              )}
            </div>

            {/* Header */}
            <div>
              <Badge className="mb-3 capitalize">{opportunity.type}</Badge>
              <h1 className="text-3xl font-bold mb-2">{opportunity.title}</h1>
              {(opportunity.location_city || opportunity.location_state) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {opportunity.location_name ||
                    `${opportunity.location_city}, ${opportunity.location_state}`}
                </div>
              )}
            </div>

            {/* Description */}
            {opportunity.description && (
              <div>
                <h2 className="font-semibold mb-2">About This Opportunity</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {opportunity.description}
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
            {opportunity.compensation_description && (
              <Card>
                <CardHeader>
                  <CardTitle>Compensation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{opportunity.compensation_description}</p>
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
                          existingApplication.status === "accepted"
                            ? "default"
                            : existingApplication.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                        className="capitalize"
                      >
                        {existingApplication.status}
                      </Badge>
                    </div>
                  ) : canApply ? (
                    <ApplyButton opportunityId={opportunity.id} actorId={actorId} />
                  ) : (
                    <div className="p-4 rounded-lg bg-muted text-center">
                      {!user ? (
                        <>
                          <p className="text-muted-foreground mb-2">Sign in to apply</p>
                          <Button asChild className="w-full">
                            <Link href={`/signin?redirect=/opportunities/${slug}`}>Sign In</Link>
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
                    {opportunity.start_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date
                        </span>
                        <span className="font-medium">
                          {format(new Date(opportunity.start_at), "MMM d, yyyy")}
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
                          {spotsLeft} of {opportunity.spots} left
                        </span>
                      </div>
                    )}
                    {opportunity.compensation_type && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Compensation
                        </span>
                        <span className="font-medium capitalize">
                          {opportunity.compensation_type}
                          {opportunity.compensation_amount && (
                            <span className="text-green-500 ml-1">
                              ${(opportunity.compensation_amount / 100).toFixed(0)}
                            </span>
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
                        +{opportunity.points_for_completion}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
