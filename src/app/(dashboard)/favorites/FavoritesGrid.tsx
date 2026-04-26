"use client";

import { useState } from "react";
import { Heart, Users } from "lucide-react";
import Link from "next/link";
import { ModelCard } from "@/components/models/model-card";

interface FavoritesGridProps {
  initialModels: any[];
}

export function FavoritesGrid({ initialModels }: FavoritesGridProps) {
  const [models, setModels] = useState(initialModels);

  const handleFavoriteChange = (modelId: string, isFavorited: boolean) => {
    if (!isFavorited) {
      setModels((prev) => prev.filter((m) => m.id !== modelId));
    }
  };

  if (models.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 ring-1 ring-pink-500/20 mb-4">
          <Heart className="h-8 w-8 text-pink-500/50" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
        <p className="text-white/50 text-sm mb-6">
          Browse models and tap the heart icon to save them here.
        </p>
        <Link
          href="/models"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-sm font-semibold text-white shadow-[0_0_18px_rgba(236,72,153,0.4)] transition-all"
        >
          <Users className="h-4 w-4" />
          Browse Models
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-white/50 mb-8 ml-[52px]">
        {models.length} {models.length === 1 ? "model" : "models"}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {models.map((model: any) => (
          <ModelCard
            key={model.id}
            model={model}
            showFavorite={true}
            isLoggedIn={true}
            isFavorited={true}
            onFavoriteChange={handleFavoriteChange}
          />
        ))}
      </div>
    </>
  );
}
