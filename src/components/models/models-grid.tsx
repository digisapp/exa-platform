"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ModelCard } from "./model-card";
import { AuthRequiredDialog } from "@/components/auth/AuthRequiredDialog";
import { cn } from "@/lib/utils";

interface ModelsGridProps {
  models: any[];
  isLoggedIn: boolean;
  favoriteModelIds: string[];
  actorType?: "model" | "fan" | "brand" | "admin" | null;
}

function ModelCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border bg-card">
      <div className="aspect-[3/4] bg-muted animate-pulse" />
      <div className="p-2 space-y-2">
        <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
        <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
      </div>
    </div>
  );
}

export function ModelsGrid({ models, isLoggedIn, favoriteModelIds, actorType }: ModelsGridProps) {
  const searchParams = useSearchParams();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const paramsRef = useRef(searchParams.toString());

  // When URL params change (filter applied), immediately show skeleton
  useEffect(() => {
    const current = searchParams.toString();
    if (paramsRef.current !== current) {
      setIsLoading(true);
      paramsRef.current = current;
    }
  }, [searchParams]);

  // When models prop updates (server data arrived), hide skeleton
  useEffect(() => {
    setIsLoading(false);
  }, [models]);

  const handleAuthRequired = useCallback(() => {
    setShowAuthDialog(true);
  }, []);

  const favoriteSet = useMemo(() => new Set(favoriteModelIds), [favoriteModelIds]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <ModelCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {models.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            showFavorite={true}
            showListButton={actorType === "brand"}
            isLoggedIn={isLoggedIn}
            isFavorited={favoriteSet.has(model.id)}
            onAuthRequired={handleAuthRequired}
          />
        ))}
      </div>

      {models.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No models found matching your criteria.</p>
        </div>
      )}

      <AuthRequiredDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        title="Sign in to follow"
        description="Create an account or sign in to follow models."
      />
    </>
  );
}
