"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useCallback, useState } from "react";

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
];

const HEIGHT_RANGES = [
  { value: "petite", label: "5'2\" & under" },
  { value: "short", label: "5'3\" - 5'5\"" },
  { value: "average", label: "5'6\" - 5'8\"" },
  { value: "tall", label: "5'9\" - 5'11\"" },
  { value: "vtall", label: "6'0\" & above" },
];

const FOCUS_OPTIONS = [
  { value: "fashion", label: "Fashion" },
  { value: "commercial", label: "Commercial" },
  { value: "fitness", label: "Fitness" },
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

  const updateParams = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/models?${params.toString()}`);
  }, [router, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams("q", search || null);
  };

  const clearFilters = () => {
    setSearch("");
    router.push("/models");
  };

  const hasFilters = searchParams.get("q") || searchParams.get("state") || searchParams.get("focus") || searchParams.get("height");

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

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
              <SelectItem key={focus.value} value={focus.value}>
                {focus.label}
              </SelectItem>
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
              <SelectItem key={state.value} value={state.value}>
                {state.label}
              </SelectItem>
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
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
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
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
            <X className="h-4 w-4 mr-2" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
