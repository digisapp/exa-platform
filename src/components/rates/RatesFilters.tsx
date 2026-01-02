"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface RatesFiltersProps {
  states: string[];
}

export function RatesFilters({ states }: RatesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentState = searchParams.get("state") || "";
  const currentService = searchParams.get("service") || "";
  const currentMinPrice = searchParams.get("minPrice") || "";
  const currentMaxPrice = searchParams.get("maxPrice") || "";

  const hasFilters = currentState || currentService || currentMinPrice || currentMaxPrice;

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/rates?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = useCallback(() => {
    router.push("/rates");
  }, [router]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* State Filter */}
      <Select value={currentState} onValueChange={(v) => updateFilter("state", v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All States" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All States</SelectItem>
          {states.map((state) => (
            <SelectItem key={state} value={state}>
              {state}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Service Type Filter */}
      <Select value={currentService} onValueChange={(v) => updateFilter("service", v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Services" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Services</SelectItem>
          <SelectItem value="photography">Photography</SelectItem>
          <SelectItem value="promotional">Promotional</SelectItem>
          <SelectItem value="private">Private Events</SelectItem>
        </SelectContent>
      </Select>

      {/* Price Range Filter */}
      <Select
        value={currentMinPrice && currentMaxPrice ? `${currentMinPrice}-${currentMaxPrice}` : ""}
        onValueChange={(v) => {
          if (v) {
            const [min, max] = v.split("-");
            updateFilter("minPrice", min);
            setTimeout(() => updateFilter("maxPrice", max), 0);
          } else {
            updateFilter("minPrice", "");
            setTimeout(() => updateFilter("maxPrice", ""), 0);
          }
        }}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Any Price" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Any Price</SelectItem>
          <SelectItem value="0-100">Under $100/hr</SelectItem>
          <SelectItem value="100-250">$100 - $250/hr</SelectItem>
          <SelectItem value="250-500">$250 - $500/hr</SelectItem>
          <SelectItem value="500-10000">$500+/hr</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
