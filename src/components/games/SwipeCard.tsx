"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import Image from "next/image";
import { Heart, X, MapPin, Verified, Star, Share2, TrendingUp, Flame, User } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  // Like/Pass indicator opacity - show earlier for better feedback
  const likeOpacity = useTransform(x, [0, 50, 75], [0, 0.5, 1]);
  const passOpacity = useTransform(x, [-75, -50, 0], [1, 0.5, 0]);

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    // Lower thresholds for easier swiping on mobile
    const swipeThreshold = 75;
    const velocityThreshold = 300;

    if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      onSwipe("right");
    } else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      onSwipe("left");
    }
  };

  // Only show state for privacy (no city)
  const location = model.state || null;

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
      <div
        className="relative w-full h-full rounded-3xl overflow-hidden bg-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
        onDoubleClick={() => isTop && router.push(`/${model.username}`)}
      >
        {/* Model Image */}
        <Image
          src={model.profile_photo_url}
          alt={model.first_name || model.username}
          fill
          className="object-cover"
          sizes="(max-width: 640px) calc(100vw - 32px), 400px"
          quality={90}
          priority={isTop}
          unoptimized={model.profile_photo_url?.includes("cdninstagram.com")}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 via-30% to-transparent" />

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
          <span className="text-red-500 font-bold text-2xl">PASS</span>
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
          {model.today_rank && (
            <div className="flex items-center gap-1 bg-gradient-to-r from-pink-500 to-purple-500 backdrop-blur-sm rounded-full px-2.5 py-1">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
              <span className="text-xs font-semibold text-white">
                #{model.today_rank} Today
              </span>
            </div>
          )}
        </div>

        {/* Model Info */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <div className="mb-1">
            <Link
              href={`/${model.username}`}
              onClick={(e) => e.stopPropagation()}
              className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg hover:text-pink-300 transition-colors"
            >
              {model.first_name || model.username}
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
            {/* View Profile Button */}
            <Link
              href={`/${model.username}`}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white/30 transition-colors"
            >
              <User className="h-4 w-4 text-white" />
            </Link>

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
              className="bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white/30 transition-colors"
            >
              <Share2 className="h-4 w-4 text-white" />
            </button>
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
    <div className="flex items-center justify-center gap-4 sm:gap-6">
      {/* Pass Button */}
      <motion.button
        onClick={onPass}
        disabled={disabled}
        whileTap={{ scale: 0.9, backgroundColor: "rgba(239, 68, 68, 0.3)" }}
        className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white/10 backdrop-blur-sm border-2 border-red-500/50 flex items-center justify-center hover:bg-red-500/20 hover:scale-105 transition-all disabled:opacity-50 shadow-lg shadow-red-500/10"
      >
        <X className="h-8 w-8 text-red-500" />
      </motion.button>

      {/* Boost Button */}
      <motion.button
        onClick={onBoost}
        disabled={disabled}
        whileTap={{ scale: 0.9 }}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center hover:scale-110 transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50"
      >
        <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
      </motion.button>

      {/* Like Button */}
      <motion.button
        onClick={onLike}
        disabled={disabled}
        whileTap={{
          scale: 0.9,
          backgroundColor: "rgba(34, 197, 94, 0.4)",
          boxShadow: "0 0 30px rgba(34, 197, 94, 0.6)"
        }}
        className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white/10 backdrop-blur-sm border-2 border-green-500/50 flex items-center justify-center hover:bg-green-500/20 hover:scale-105 transition-all disabled:opacity-50 shadow-lg shadow-green-500/10"
      >
        <Heart className="h-8 w-8 text-green-500" />
      </motion.button>
    </div>
  );
}
