"use client";

import { useState, useCallback, useMemo } from "react";
import { ModelCard } from "./model-card";
import { AuthRequiredDialog } from "@/components/auth/AuthRequiredDialog";

interface ModelsGridProps {
  models: any[];
  isLoggedIn: boolean;
  favoriteModelIds: string[];
}

export function ModelsGrid({ models, isLoggedIn, favoriteModelIds }: ModelsGridProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  // Memoize the callback to prevent unnecessary re-renders
  const handleAuthRequired = useCallback(() => {
    setShowAuthDialog(true);
  }, []);

  // Memoize the favoriteModelIds set for O(1) lookups
  const favoriteSet = useMemo(() => new Set(favoriteModelIds), [favoriteModelIds]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {models.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            showFavorite={true}
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
