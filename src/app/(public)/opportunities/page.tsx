import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Plane,
  Camera,
  Star,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const typeIcons: Record<string, any> = {
  show: Star,
  travel: Plane,
  campaign: Camera,
  content: Camera,
  hosting: Users,
  other: Sparkles,
};

const typeColors: Record<string, string> = {
  show: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  travel: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  campaign: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  content: "bg-green-500/10 text-green-500 border-green-500/20",
  hosting: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  other: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export default async function OpportunitiesPage() {
  const supabase = await createClient();

  // Get open opportunities
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "open")
    .eq("visibility", "public")
    .order("start_at", { ascending: true }) as { data: any[] | null };

  // Group by type
  const shows = opportunities?.filter((o) => o.type === "show") || [];
  const travel = opportunities?.filter((o) => o.type === "travel") || [];
  const campaigns = opportunities?.filter((o) => ["campaign", "content"].includes(o.type)) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container px-8 md:px-16 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-pink-500" />
            <h1 className="text-3xl font-bold">Gigs</h1>
          </div>
          <p className="text-muted-foreground">
            Apply to fashion shows, travel experiences, and brand campaigns
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All ({opportunities?.length || 0})</TabsTrigger>
            <TabsTrigger value="shows">Shows ({shows.length})</TabsTrigger>
            <TabsTrigger value="travel">Travel ({travel.length})</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <OpportunityGrid opportunities={opportunities || []} />
          </TabsContent>

          <TabsContent value="shows" className="space-y-6">
            <OpportunityGrid opportunities={shows} />
          </TabsContent>

          <TabsContent value="travel" className="space-y-6">
            <OpportunityGrid opportunities={travel} />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <OpportunityGrid opportunities={campaigns} />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}

function OpportunityGrid({ opportunities }: { opportunities: any[] }) {
  if (opportunities.length === 0) {
    return (
      <div className="text-center py-16">
        <Sparkles className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold mb-2">No gigs available</h3>
        <p className="text-muted-foreground">Check back soon for new gigs!</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {opportunities.map((opportunity) => (
        <OpportunityCard key={opportunity.id} opportunity={opportunity} />
      ))}
    </div>
  );
}

function OpportunityCard({ opportunity }: { opportunity: any }) {
  const Icon = typeIcons[opportunity.type] || Sparkles;
  const spotsLeft = opportunity.spots ? opportunity.spots - opportunity.spots_filled : null;
  const isUrgent = spotsLeft !== null && spotsLeft <= 5;
  const deadline = opportunity.application_deadline
    ? new Date(opportunity.application_deadline)
    : null;
  const isDeadlineSoon = deadline && deadline.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <Card className="group overflow-hidden hover:border-primary/50 transition-all flex flex-col">
      {/* Cover Image */}
      <div className="h-48 relative bg-gradient-to-br from-pink-500/20 to-violet-500/20 overflow-hidden">
        {opportunity.cover_image_url ? (
          <img
            src={opportunity.cover_image_url}
            alt={opportunity.title}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        {/* Type Badge */}
        <Badge className={`absolute top-3 left-3 capitalize ${typeColors[opportunity.type]}`}>
          <Icon className="h-3 w-3 mr-1" />
          {opportunity.type}
        </Badge>
        {/* Urgency Badge */}
        {isUrgent && (
          <Badge variant="destructive" className="absolute top-3 right-3">
            {spotsLeft} spots left!
          </Badge>
        )}
      </div>

      <CardHeader className="pb-2">
        <h3 className="font-semibold text-lg line-clamp-1">{opportunity.title}</h3>
        {opportunity.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {opportunity.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="pb-2 flex-1">
        <div className="space-y-2 text-sm">
          {(opportunity.location_city || opportunity.location_state) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {opportunity.location_city && opportunity.location_state
                ? `${opportunity.location_city}, ${opportunity.location_state}`
                : opportunity.location_name}
            </div>
          )}
          {opportunity.start_at && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(opportunity.start_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          )}
          {deadline && (
            <div className={`flex items-center gap-2 ${isDeadlineSoon ? "text-amber-500" : "text-muted-foreground"}`}>
              <Clock className="h-4 w-4" />
              Apply by {formatDistanceToNow(deadline, { addSuffix: true })}
            </div>
          )}
          {opportunity.compensation_type && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="capitalize">{opportunity.compensation_type}</span>
              {opportunity.compensation_amount && (
                <span className="font-medium text-green-500">
                  ${(opportunity.compensation_amount / 100).toFixed(0)}
                </span>
              )}
            </div>
          )}
          {spotsLeft !== null && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              {spotsLeft} of {opportunity.spots} spots available
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-4">
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-muted-foreground">
            +{opportunity.points_for_completion} points
          </div>
          <Button asChild>
            <Link href={`/opportunities/${opportunity.slug}`}>View Details</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
