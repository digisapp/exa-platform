import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import {
  Camera,
  Megaphone,
  PartyPopper,
  MapPin,
  Search,
  Calendar,
} from "lucide-react";
import { RatesFilters } from "@/components/rates/RatesFilters";

export const metadata: Metadata = {
  title: "Model Rates & Booking | EXA Models",
  description: "Browse model rates and book talent for photoshoots, events, promotions, and more.",
  openGraph: {
    title: "Model Rates & Booking | EXA Models",
    description: "Browse model rates and book talent for photoshoots, events, promotions, and more.",
  },
};

// Helper to get the minimum rate from a model
function getStartingRate(model: any): number | null {
  const rates = [
    model.photoshoot_hourly_rate,
    model.promo_hourly_rate,
    model.private_event_hourly_rate,
    model.social_companion_hourly_rate,
  ].filter((r) => r && r > 0);

  return rates.length > 0 ? Math.min(...rates) : null;
}

// Helper to get service categories a model offers
function getServiceCategories(model: any): string[] {
  const categories: string[] = [];

  if ((model.photoshoot_hourly_rate || 0) > 0 ||
      (model.photoshoot_half_day_rate || 0) > 0 ||
      (model.photoshoot_full_day_rate || 0) > 0) {
    categories.push("photography");
  }

  if ((model.promo_hourly_rate || 0) > 0 ||
      (model.brand_ambassador_daily_rate || 0) > 0) {
    categories.push("promotional");
  }

  if ((model.private_event_hourly_rate || 0) > 0 ||
      (model.social_companion_hourly_rate || 0) > 0 ||
      (model.meet_greet_rate || 0) > 0) {
    categories.push("private");
  }

  return categories;
}

interface Props {
  searchParams: Promise<{
    state?: string;
    service?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

export default async function RatesPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  // Fetch models who have opted in to the rates page and have at least one rate set
  let query = supabase
    .from("models")
    .select("*")
    .eq("is_approved", true)
    .eq("show_on_rates_page", true);

  // Filter by state if provided
  if (params.state) {
    query = query.eq("state", params.state);
  }

  const { data: allModels } = await query.order("created_at", { ascending: false }) as { data: any[] | null };

  // Filter models that have at least one booking rate set
  let models = (allModels || []).filter((model) => {
    const hasAnyRate =
      (model.photoshoot_hourly_rate || 0) > 0 ||
      (model.photoshoot_half_day_rate || 0) > 0 ||
      (model.photoshoot_full_day_rate || 0) > 0 ||
      (model.promo_hourly_rate || 0) > 0 ||
      (model.private_event_hourly_rate || 0) > 0 ||
      (model.social_companion_hourly_rate || 0) > 0 ||
      (model.brand_ambassador_daily_rate || 0) > 0 ||
      (model.meet_greet_rate || 0) > 0;

    return hasAnyRate;
  });

  // Filter by service type
  if (params.service) {
    models = models.filter((model) => {
      const categories = getServiceCategories(model);
      return categories.includes(params.service!);
    });
  }

  // Filter by price range
  if (params.minPrice || params.maxPrice) {
    const minPrice = params.minPrice ? parseInt(params.minPrice) : 0;
    const maxPrice = params.maxPrice ? parseInt(params.maxPrice) : Infinity;

    models = models.filter((model) => {
      const startingRate = getStartingRate(model);
      if (!startingRate) return false;
      return startingRate >= minPrice && startingRate <= maxPrice;
    });
  }

  // Get unique states for filter
  const states = [...new Set((allModels || []).map((m) => m.state).filter(Boolean))].sort();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500/10 via-violet-500/10 to-blue-500/10 border-b">
        <div className="container max-w-6xl mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Model Rates & Booking</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Browse available models and their rates for photoshoots, events, promotions, and more.
              Find the perfect talent for your next project.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <RatesFilters states={states} />
        </div>
      </div>

      {/* Results */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {models.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No models found</h2>
            <p className="text-muted-foreground">
              Try adjusting your filters or check back later for more talent.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Showing {models.length} model{models.length !== 1 ? "s" : ""} available for booking
            </p>

            <div className="grid gap-6">
              {models.map((model) => {
                const displayName = model.first_name
                  ? `${model.first_name} ${model.last_name || ""}`.trim()
                  : model.username;
                const startingRate = getStartingRate(model);
                const categories = getServiceCategories(model);

                return (
                  <div
                    key={model.id}
                    className="group relative bg-card rounded-2xl border overflow-hidden hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10 transition-all"
                  >
                    <div className="flex flex-col md:flex-row">
                      {/* Photo */}
                      <div className="relative w-full md:w-64 h-64 md:h-auto flex-shrink-0">
                        {model.profile_photo_url ? (
                          <Image
                            src={model.profile_photo_url}
                            alt={displayName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center">
                            <span className="text-6xl">👤</span>
                          </div>
                        )}
                        {/* Availability Badge - online if active within last 5 minutes */}
                        {model.last_active_at && (Date.now() - new Date(model.last_active_at).getTime()) < 5 * 60 * 1000 && (
                          <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-green-500/90 text-white text-xs font-medium">
                            Available
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-6">
                        <div className="flex flex-col h-full">
                          {/* Header */}
                          <div className="mb-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h2 className="text-xl font-bold group-hover:text-pink-500 transition-colors">
                                  {displayName}
                                </h2>
                                <p className="text-sm text-muted-foreground">@{model.username}</p>
                              </div>
                              {startingRate && (
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">Starting at</p>
                                  <p className="text-2xl font-bold text-pink-500">{startingRate.toLocaleString()}<span className="text-sm font-normal text-muted-foreground"> coins/hr</span></p>
                                </div>
                              )}
                            </div>

                            {/* Location */}
                            {model.show_location && (model.city || model.state) && (
                              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {model.city && model.state ? `${model.city}, ${model.state}` : model.city || model.state}
                              </p>
                            )}
                          </div>

                          {/* Service Categories */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {categories.includes("photography") && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 text-pink-500 text-xs font-medium">
                                <Camera className="h-3 w-3" />
                                Photography
                              </span>
                            )}
                            {categories.includes("promotional") && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-medium">
                                <Megaphone className="h-3 w-3" />
                                Promotional
                              </span>
                            )}
                            {categories.includes("private") && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-500 text-xs font-medium">
                                <PartyPopper className="h-3 w-3" />
                                Private Events
                              </span>
                            )}
                          </div>

                          {/* Rate Summary */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                            {(model.photoshoot_hourly_rate || 0) > 0 && (
                              <div className="p-2 rounded-lg bg-muted/50">
                                <p className="text-muted-foreground text-xs">Photoshoot</p>
                                <p className="font-semibold">{model.photoshoot_hourly_rate?.toLocaleString()} coins/hr</p>
                              </div>
                            )}
                            {(model.promo_hourly_rate || 0) > 0 && (
                              <div className="p-2 rounded-lg bg-muted/50">
                                <p className="text-muted-foreground text-xs">Promo</p>
                                <p className="font-semibold">{model.promo_hourly_rate?.toLocaleString()} coins/hr</p>
                              </div>
                            )}
                            {(model.private_event_hourly_rate || 0) > 0 && (
                              <div className="p-2 rounded-lg bg-muted/50">
                                <p className="text-muted-foreground text-xs">Private Event</p>
                                <p className="font-semibold">{model.private_event_hourly_rate?.toLocaleString()} coins/hr</p>
                              </div>
                            )}
                            {(model.brand_ambassador_daily_rate || 0) > 0 && (
                              <div className="p-2 rounded-lg bg-muted/50">
                                <p className="text-muted-foreground text-xs">Ambassador</p>
                                <p className="font-semibold">{model.brand_ambassador_daily_rate?.toLocaleString()} coins/day</p>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3 mt-auto">
                            <Link
                              href={`/${model.username}/rates`}
                              className="flex-1 text-center py-2.5 px-4 rounded-xl border border-pink-500/50 text-pink-500 font-medium hover:bg-pink-500/10 transition-colors"
                            >
                              View All Rates
                            </Link>
                            <Link
                              href={`/${model.username}`}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-medium transition-colors"
                            >
                              <Calendar className="h-4 w-4" />
                              Book
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
