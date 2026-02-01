"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import Image from "next/image";
import { Heart, X, MapPin, Flame, Verified, Star, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
}

interface SwipeCardProps {
  model: Model;
  onSwipe: (direction: "left" | "right") => void;
  onBoost?: () => void;
  isTop?: boolean;
  style?: React.CSSProperties;
}

export function SwipeCard({
  model,
  onSwipe,
  onBoost,
  isTop = false,
  style,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  // Like/Pass indicator opacity
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = 100;
    const velocityThreshold = 500;

    if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      onSwipe("right");
    } else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      onSwipe("left");
    }
  };

  const location = [model.city, model.state].filter(Boolean).join(", ");

  return (
    <motion.div
      className="absolute w-full h-full cursor-grab active:cursor-grabbing"
      style={{ x, rotate, opacity, ...style }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: isTop ? 1.02 : 1 }}
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black shadow-2xl">
        {/* Model Image */}
        <Image
          src={model.profile_photo_url}
          alt={model.first_name || model.username}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 90vw, 400px"
          priority={isTop}
          unoptimized={model.profile_photo_url?.includes("cdninstagram.com")}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Like Indicator */}
        <motion.div
          className="absolute top-8 right-8 rotate-12 border-4 border-green-500 rounded-lg px-4 py-2"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-green-500 font-bold text-2xl">LIKE</span>
        </motion.div>

        {/* Pass Indicator */}
        <motion.div
          className="absolute top-8 left-8 -rotate-12 border-4 border-red-500 rounded-lg px-4 py-2"
          style={{ opacity: passOpacity }}
        >
          <span className="text-red-500 font-bold text-2xl">NOPE</span>
        </motion.div>

        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          {model.is_verified && (
            <div className="bg-blue-500 rounded-full p-1.5">
              <Verified className="h-4 w-4 text-white" />
            </div>
          )}
          {model.is_featured && (
            <div className="bg-amber-500 rounded-full p-1.5">
              <Star className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {/* Model Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-3xl font-bold text-white">
              {model.first_name || model.username}
            </h2>
            <Link
              href={`/${model.username}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="View profile"
            >
              <ExternalLink className="h-4 w-4 text-white" />
            </Link>
          </div>

          {location && (
            <div className="flex items-center gap-1 text-white/80 mb-3">
              <MapPin className="h-4 w-4" />
              <span>{location}</span>
            </div>
          )}

          {model.focus_tags && model.focus_tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {model.focus_tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-sm bg-white/20 backdrop-blur-sm rounded-full text-white"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Top Right Buttons (only on top card) */}
        {isTop && (
          <div className="absolute top-4 right-4 flex gap-2">
            {/* Share Button */}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const shareUrl = `${window.location.origin}/${model.username}`;
                const shareText = `Check out ${model.first_name || model.username} on EXA Models!`;

                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: `${model.first_name || model.username} | EXA Models`,
                      text: shareText,
                      url: shareUrl,
                    });
                  } catch {
                    // User cancelled
                  }
                } else {
                  await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
                  toast.success("Link copied!");
                }
              }}
              className="bg-white/20 backdrop-blur-sm rounded-full p-2.5 shadow-lg hover:bg-white/30 transition-colors"
            >
              <Share2 className="h-5 w-5 text-white" />
            </button>

            {/* Boost Button */}
            {onBoost && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBoost();
                }}
                className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
              >
                <Flame className="h-6 w-6 text-white" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Action buttons for manual swipe
interface ActionButtonsProps {
  onPass: () => void;
  onLike: () => void;
  onBoost: () => void;
  disabled?: boolean;
}

export function ActionButtons({ onPass, onLike, onBoost, disabled }: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-6">
      {/* Pass Button */}
      <button
        onClick={onPass}
        disabled={disabled}
        className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border-2 border-red-500/50 flex items-center justify-center hover:bg-red-500/20 transition-colors disabled:opacity-50"
      >
        <X className="h-8 w-8 text-red-500" />
      </button>

      {/* Boost Button */}
      <button
        onClick={onBoost}
        disabled={disabled}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center hover:scale-110 transition-transform shadow-lg disabled:opacity-50"
      >
        <Flame className="h-7 w-7 text-white" />
      </button>

      {/* Like Button */}
      <button
        onClick={onLike}
        disabled={disabled}
        className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border-2 border-green-500/50 flex items-center justify-center hover:bg-green-500/20 transition-colors disabled:opacity-50"
      >
        <Heart className="h-8 w-8 text-green-500" />
      </button>
    </div>
  );
}
