"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, X, Loader2, Handshake, SlidersHorizontal } from "lucide-react";
import { useCallback, useState, useEffect, useRef } from "react";

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "Washington DC" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "followers", label: "Most Followers" },
  { value: "name", label: "Name A-Z" },
  { value: "cpm_low", label: "Lowest CPM" },
  { value: "cpm_high", label: "Highest CPM" },
];

const FOLLOWER_TIERS = [
  { value: "1k",   label: "1K+ followers" },
  { value: "10k",  label: "10K+ followers" },
  { value: "50k",  label: "50K+ followers" },
  { value: "100k", label: "100K+ followers" },
  { value: "500k", label: "500K+ followers" },
  { value: "1m",   label: "1M+ followers" },
];

const HEIGHT_RANGES = [
  { value: "under54", label: "5'3\" and under" },
  { value: "54up", label: "5'4\" and up" },
  { value: "57up", label: "5'7\" and up" },
  { value: "510up", label: "5'10\" and up" },
];

const FOCUS_OPTIONS = [
  { value: "fashion", label: "Fashion" },
  { value: "commercial", label: "Commercial" },
  { value: "fitness", label: "Fitness" },
  { value: "athlete", label: "Athlete" },
  { value: "swimwear", label: "Swimwear" },
  { value: "beauty", label: "Beauty" },
  { value: "editorial", label: "Editorial" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "promo", label: "Promo/Event" },
  { value: "luxury", label: "Luxury" },
  { value: "lifestyle", label: "Lifestyle" },
];

export function ModelFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuery = searchParams.get("q") || "";
  const isSearching = search !== currentQuery;

  const updateParams = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/models?${params.toString()}`);
  }, [router, searchParams]);

  // Debounced live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (search !== currentQuery) {
      debounceRef.current = setTimeout(() => {
        updateParams("q", search || null);
      }, 300);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, currentQuery, updateParams]);

  const clearFilters = () => {
    setSearch("");
    router.push("/models");
  };

  const collabsOnly = searchParams.get("collabs") === "1";
  const hasFilters = !!(
    searchParams.get("q") ||
    searchParams.get("state") ||
    searchParams.get("focus") ||
    searchParams.get("height") ||
    searchParams.get("collabs") ||
    searchParams.get("platform") ||
    searchParams.get("cpm") ||
    searchParams.get("engagement") ||
    searchParams.get("ig_followers") ||
    searchParams.get("tt_followers")
  );

  // Count active filters (excluding search, shown separately)
  const activeFilterCount = [
    searchParams.get("state"),
    searchParams.get("focus"),
    searchParams.get("height"),
    searchParams.get("ig_followers"),
    searchParams.get("tt_followers"),
    searchParams.get("collabs"),
  ].filter(Boolean).length;

  // All the dropdown/button filter controls (shared between desktop bar and mobile sheet)
  const filterControls = (
    <div className="flex flex-wrap gap-3">
      <Select
        value={searchParams.get("focus") || "all"}
        onValueChange={(v) => updateParams("focus", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Focus" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Focus</SelectItem>
          {FOCUS_OPTIONS.map((focus) => (
            <SelectItem key={focus.value} value={focus.value}>{focus.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("state") || "all"}
        onValueChange={(v) => updateParams("state", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All States" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All States</SelectItem>
          {US_STATES.map((state) => (
            <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("height") || "all"}
        onValueChange={(v) => updateParams("height", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Heights" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Heights</SelectItem>
          {HEIGHT_RANGES.map((range) => (
            <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("sort") || "newest"}
        onValueChange={(v) => updateParams("sort", v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("ig_followers") || "all"}
        onValueChange={(v) => updateParams("ig_followers", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[165px]">
          <SelectValue placeholder="IG Followers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any IG Followers</SelectItem>
          {FOLLOWER_TIERS.map((tier) => (
            <SelectItem key={tier.value} value={tier.value}>IG {tier.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("tt_followers") || "all"}
        onValueChange={(v) => updateParams("tt_followers", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[165px]">
          <SelectValue placeholder="TT Followers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any TT Followers</SelectItem>
          {FOLLOWER_TIERS.map((tier) => (
            <SelectItem key={tier.value} value={tier.value}>TT {tier.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant={collabsOnly ? "default" : "outline"}
        onClick={() => {
          const params = new URLSearchParams(searchParams.toString());
          if (collabsOnly) {
            params.delete("collabs");
            params.delete("platform");
            params.delete("cpm");
            params.delete("engagement");
          } else {
            params.set("collabs", "1");
          }
          router.push(`/models?${params.toString()}`);
        }}
        className={collabsOnly ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0" : ""}
      >
        <Handshake className="h-4 w-4 mr-2" />
        Open to Collabs
      </Button>

      {hasFilters && (
        <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
          <X className="h-4 w-4 mr-2" />
          Clear filters
        </Button>
      )}
    </div>
  );

  // Collab sub-filters
  const collabSubFilters = collabsOnly && (
    <div className="flex flex-wrap gap-3 p-3 rounded-lg border border-pink-500/20 bg-pink-500/5">
      <span className="text-xs text-pink-400 font-medium self-center mr-1">Collab filters:</span>

      <Select
        value={searchParams.get("platform") || "all"}
        onValueChange={(v) => updateParams("platform", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[150px] h-8 text-sm">
          <SelectValue placeholder="All Platforms" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Platforms</SelectItem>
          <SelectItem value="instagram">Instagram</SelectItem>
          <SelectItem value="tiktok">TikTok</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("cpm") || "all"}
        onValueChange={(v) => updateParams("cpm", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[160px] h-8 text-sm">
          <SelectValue placeholder="Any CPM" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any CPM</SelectItem>
          <SelectItem value="under5">Under $5 CPM</SelectItem>
          <SelectItem value="5to15">$5 – $15 CPM</SelectItem>
          <SelectItem value="15to30">$15 – $30 CPM</SelectItem>
          <SelectItem value="30plus">$30+ CPM</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("engagement") || "all"}
        onValueChange={(v) => updateParams("engagement", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[175px] h-8 text-sm">
          <SelectValue placeholder="Any Engagement" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Engagement</SelectItem>
          <SelectItem value="1">1%+ Engagement</SelectItem>
          <SelectItem value="3">3%+ Engagement</SelectItem>
          <SelectItem value="5">5%+ Engagement</SelectItem>
          <SelectItem value="10">10%+ Engagement</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search + mobile Filters button */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          )}
          <Input
            placeholder="Search by name or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Mobile: Filters button + sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative md:hidden shrink-0">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-pink-500 hover:bg-pink-500">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto rounded-t-2xl">
            <SheetHeader className="pb-2">
              <SheetTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-4 py-2 pb-8">
              {filterControls}
              {collabSubFilters}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: full filter bar */}
      <div className="hidden md:block space-y-4">
        {filterControls}
        {collabSubFilters}
      </div>
    </div>
  );
}
