"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ModelCard } from "./model-card";
import { AuthRequiredDialog } from "@/components/auth/AuthRequiredDialog";

interface ModelsGridProps {
  models: any[];
  isLoggedIn: boolean;
  favoriteModelIds: string[];
  actorType?: "model" | "fan" | "brand" | "admin" | null;
  currentModelId?: string;
}

function ModelCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="aspect-[3/4] bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-cyan-500/10 animate-pulse" />
    </div>
  );
}

export function ModelsGrid({ models, isLoggedIn, favoriteModelIds, actorType, currentModelId }: ModelsGridProps) {
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
        {models.map((model, index) => (
          <ModelCard
            key={model.id}
            model={model}
            showFavorite={true}
            showListButton={actorType === "brand"}
            isLoggedIn={isLoggedIn}
            isFavorited={favoriteSet.has(model.id)}
            isOwner={!!currentModelId && model.id === currentModelId}
            onAuthRequired={handleAuthRequired}
            priority={index < 10}
          />
        ))}
      </div>

      {models.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-lg font-medium mb-1">No models found</p>
          <p className="text-muted-foreground text-sm">Try adjusting your filters or search terms.</p>
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
