"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Instagram, MessageCircle, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FanSignupDialog } from "@/components/auth/FanSignupDialog";
import { modelDisplayName } from "@/lib/model-display";

// Shown when a logged-out visitor clicks the heart on a model card. Replaces
// the generic "Sign in to follow" AuthRequiredDialog: the model who prompted
// the click stays on screen, the account is sold on value (socials, chat,
// exclusive content) rather than stated as a requirement, and signup happens
// inline via FanSignupDialog — no page redirect, referrer attribution intact,
// and the follow itself is applied automatically after signup (followModelId).

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/${url}`;
}

interface FollowGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The model whose heart was clicked (grid card shape: id, username, profile_photo_url, …). */
  model: {
    id: string;
    username: string;
    profile_photo_url?: string | null;
  } | null;
}

const VALUE_PROPS = [
  {
    icon: Heart,
    iconClass: "text-pink-500",
    bgClass: "bg-pink-500/10 border-pink-500/20",
    pillClass: "bg-pink-500/20",
    title: "Follow Models",
    subtitle: "Never lose a profile",
  },
  {
    icon: Instagram,
    iconClass: "text-violet-500",
    bgClass: "bg-violet-500/10 border-violet-500/20",
    pillClass: "bg-violet-500/20",
    title: "Unlock Socials",
    subtitle: "IG, TikTok & more",
  },
  {
    icon: MessageCircle,
    iconClass: "text-blue-500",
    bgClass: "bg-blue-500/10 border-blue-500/20",
    pillClass: "bg-blue-500/20",
    title: "Chat & Calls",
    subtitle: "Connect directly",
  },
  {
    icon: Sparkles,
    iconClass: "text-yellow-500",
    bgClass: "bg-yellow-500/10 border-yellow-500/20",
    pillClass: "bg-yellow-500/20",
    title: "Free Forever",
    subtitle: "No card required",
  },
];

export function FollowGateDialog({ open, onOpenChange, model }: FollowGateDialogProps) {
  if (!model) return null;

  const displayName = modelDisplayName(model);
  const photoUrl = resolveMediaUrl(model.profile_photo_url);
  // Land back where the click happened (grid page incl. filters) so the
  // freshly applied follow is visible immediately.
  const redirectTo =
    typeof window === "undefined"
      ? "/models"
      : window.location.pathname + window.location.search;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-6 text-white text-center">
          <div className="mx-auto mb-3 w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/70 shadow-[0_0_18px_rgba(255,255,255,0.35)]">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={displayName}
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-white/20 flex items-center justify-center text-xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <DialogTitle className="text-2xl font-bold text-white notranslate">
            Follow @{displayName} for free
          </DialogTitle>
          <p className="text-sm text-white/85 mt-1">
            Create a free account to follow her and unlock more.
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {VALUE_PROPS.map(({ icon: Icon, iconClass, bgClass, pillClass, title, subtitle }) => (
              <div key={title} className={`flex items-center gap-3 p-3 rounded-lg border ${bgClass}`}>
                <div className={`p-2 rounded-full ${pillClass}`}>
                  <Icon className={`h-4 w-4 ${iconClass}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <FanSignupDialog
              redirectTo={redirectTo}
              referrerModelId={model.id}
              followModelId={model.id}
              modelName={model.username}
              modelPhotoUrl={photoUrl}
              prompt={`Free account — follow @${displayName} and unlock her socials and exclusive content.`}
              source="follow_gate"
            >
              <Button className="w-full h-12 text-base exa-gradient-button">
                Create Free Account
              </Button>
            </FanSignupDialog>
            <Link href={`/signin?redirect=${encodeURIComponent(redirectTo)}`} className="w-full">
              <Button variant="ghost" className="w-full text-muted-foreground">
                Already have an account? <span className="text-pink-500 ml-1">Sign In</span>
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
