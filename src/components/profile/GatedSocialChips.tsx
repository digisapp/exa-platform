"use client";

import { Instagram, Youtube, Twitch, Mail, Lock } from "lucide-react";
import { TikTokIcon } from "@/components/ui/tiktok-icon";
import { SnapchatIcon } from "@/components/ui/snapchat-icon";
import { XIcon } from "@/components/ui/x-icon";
import { FanSignupDialog } from "@/components/auth/FanSignupDialog";
import { trackEvent } from "@/lib/analytics-client";

// Anonymous-visitor version of the profile social chips. The real handles and
// URLs are never sent to logged-out viewers (this page renders per-request, so
// the server only passes platform names + follower counts) — clicking any chip
// opens the fan signup dialog and returns the visitor to this profile. The
// "want her Instagram" impulse is the strongest signup trigger we have, so the
// chips stay visible with follower counts as social proof; only the links are
// locked.

interface GatedSocialChipsProps {
  platforms: { platform: string; followers: number | null }[];
  hasEmail: boolean;
  modelUsername: string;
  modelId: string;
  modelPhotoUrl: string | null;
  /** "hero" = compact glass dock chips, "circle" = default centered layout */
  variant: "hero" | "circle";
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  tiktok: TikTokIcon,
  snapchat: SnapchatIcon,
  x: XIcon,
  youtube: Youtube,
  twitch: Twitch,
};

export function GatedSocialChips({
  platforms,
  hasEmail,
  modelUsername,
  modelId,
  modelPhotoUrl,
  variant,
}: GatedSocialChipsProps) {
  const hero = variant === "hero";
  const chipClass = hero
    ? "w-8 h-8 rounded-full bg-white/12 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all group-hover:scale-110 group-hover:border-pink-400/60 group-hover:shadow-[0_0_14px_rgba(236,72,153,0.45)]"
    : "w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center transition-all group-hover:scale-110 group-hover:border-pink-500/50 group-hover:shadow-[0_0_16px_rgba(236,72,153,0.4)]";
  const iconClass = hero ? "h-3.5 w-3.5 text-white/80" : "h-4 w-4 text-white/80";
  const followerClass = hero
    ? "text-[9px] font-medium leading-none text-white/60 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
    : "text-[10px] text-white/50 leading-none font-medium";

  return (
    <FanSignupDialog
      redirectTo={`/${modelUsername}`}
      referrerModelId={modelId}
      modelName={modelUsername}
      modelPhotoUrl={modelPhotoUrl}
      prompt={`Free account — see @${modelUsername}'s socials and unlock exclusive content.`}
      source="social_gate"
    >
      <button
        type="button"
        className={`group flex items-start flex-wrap ${
          hero ? "gap-1.5" : "justify-center gap-3"
        }`}
        title="Sign up free to view socials"
        onClick={() =>
          // Funnel: gate taps vs. gate signups (signup_source="social_gate")
          // tells us whether to fix the gate's visibility or the signup form.
          trackEvent("social_gate_click", {
            modelId,
            metadata: { platforms: platforms.map((p) => p.platform) },
          })
        }
      >
        {platforms.map(({ platform, followers }) => {
          const Icon = ICONS[platform];
          if (!Icon) return null;
          return (
            <span key={platform} className="flex flex-col items-center gap-0.5">
              <span className={`relative ${chipClass}`}>
                <Icon className={iconClass} />
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-black/85 border border-white/25 flex items-center justify-center">
                  <Lock className="h-2 w-2 text-pink-300" />
                </span>
              </span>
              {followers ? (
                <span className={followerClass}>{formatFollowers(followers)}</span>
              ) : null}
            </span>
          );
        })}
        {hasEmail && (
          <span className={`relative ${chipClass}`}>
            <Mail className={iconClass} />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-black/85 border border-white/25 flex items-center justify-center">
              <Lock className="h-2 w-2 text-pink-300" />
            </span>
          </span>
        )}
        <span
          className={`${
            hero ? "h-8 px-3 text-[10px]" : "h-9 px-3.5 text-xs"
          } rounded-full flex items-center font-medium bg-gradient-to-r from-pink-500/25 to-violet-500/25 border border-pink-400/40 text-pink-100 transition-all group-hover:from-pink-500/40 group-hover:to-violet-500/40 group-hover:shadow-[0_0_14px_rgba(236,72,153,0.45)]`}
        >
          Join free to view
        </span>
      </button>
    </FanSignupDialog>
  );
}
