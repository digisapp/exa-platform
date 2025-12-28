"use client";

import { useState } from "react";
import { ModelCard } from "./model-card";
import { AuthRequiredDialog } from "@/components/auth/AuthRequiredDialog";

interface ModelsGridProps {
  models: any[];
  isLoggedIn: boolean;
  favoriteModelIds: string[];
}

export function ModelsGrid({ models, isLoggedIn, favoriteModelIds }: ModelsGridProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {models.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            showFavorite={true}
            isLoggedIn={isLoggedIn}
            isFavorited={favoriteModelIds.includes(model.id)}
            onAuthRequired={() => setShowAuthDialog(true)}
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
        title="Sign in to favorite"
        description="Create an account or sign in to save your favorite models."
      />
    </>
  );
}
