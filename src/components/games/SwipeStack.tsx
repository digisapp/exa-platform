"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SwipeCard, ActionButtons } from "./SwipeCard";

interface Model {
  id: string;
  first_name: string | null;
  username: string;
  profile_photo_url: string;
  city: string | null;
  state: string | null;
  focus_tags: string[] | null;
  is_verified: boolean | null;
  is_featured: boolean | null;
  today_points?: number;
  total_points?: number;
  today_rank?: number | null;
}

interface SwipeStackProps {
  models: Model[];
  onSwipe: (modelId: string, direction: "left" | "right") => void;
  onBoost: (model: Model) => void;
  onEmpty?: () => void;
  totalModels?: number;
  modelsSwiped?: number;
}

export function SwipeStack({ models, onSwipe, onBoost, onEmpty, totalModels, modelsSwiped = 0 }: SwipeStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);

  const currentModel = models[currentIndex];
  const nextModels = models.slice(currentIndex + 1, currentIndex + 3);

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      if (!currentModel || exitDirection) return; // Prevent double swipes

      setExitDirection(direction);

      // Sync with exit animation duration (250ms)
      setTimeout(() => {
        onSwipe(currentModel.id, direction);
        setCurrentIndex((prev) => {
          const newIndex = prev + 1;
          if (newIndex >= models.length) {
            onEmpty?.();
          }
          return newIndex;
        });
        setExitDirection(null);
      }, 250);
    },
    [currentModel, exitDirection, models.length, onSwipe, onEmpty]
  );

  const handleBoost = useCallback(() => {
    if (currentModel) {
      onBoost(currentModel);
    }
  }, [currentModel, onBoost]);

  if (!currentModel) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6">
      {/* Card Stack */}
      <div className="relative w-[calc(100vw-32px)] max-w-[380px] sm:max-w-[400px] aspect-[3/4]">
        {/* Background cards (show up to 2 cards behind) */}
        {nextModels.map((model, index) => (
          <div
            key={model.id}
            className="absolute inset-0"
            style={{
              transform: `scale(${1 - (index + 1) * 0.05}) translateY(${(index + 1) * 8}px)`,
              zIndex: 10 - index - 1,
              opacity: 1 - (index + 1) * 0.2,
            }}
          >
            <div className="w-full h-full rounded-3xl overflow-hidden bg-zinc-800">
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${model.profile_photo_url})` }}
              />
              <div className="absolute inset-0 bg-black/30" />
            </div>
          </div>
        ))}

        {/* Current (top) card */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentModel.id}
            className="absolute inset-0"
            style={{ zIndex: 10 }}
            initial={false}
            animate={{ scale: 1, opacity: 1 }}
            exit={{
              x: exitDirection === "right" ? 300 : exitDirection === "left" ? -300 : 0,
              opacity: 0,
              rotate: exitDirection === "right" ? 20 : exitDirection === "left" ? -20 : 0,
              transition: { duration: 0.25, ease: "easeOut" },
            }}
          >
            <SwipeCard
              model={currentModel}
              onSwipe={handleSwipe}
              onBoost={handleBoost}
              isTop={true}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <ActionButtons
        onPass={() => handleSwipe("left")}
        onLike={() => handleSwipe("right")}
        onBoost={handleBoost}
        disabled={!currentModel}
      />

      {/* Progress indicator */}
      <div className="text-center text-sm text-muted-foreground">
        {modelsSwiped + currentIndex + 1} of {totalModels || models.length} models
      </div>
    </div>
  );
}
