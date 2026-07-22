"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PushOptIn } from "@/components/pwa/PushOptIn";
import {
  DEFAULT_PUSH_PREFERENCES,
  PUSH_EVENT_KEYS,
  type PushEventKey,
  type PushPreferences,
} from "@/lib/push-config";

// Notifications section (model settings → Privacy tab).
//
// v1 is MODEL-FACING ONLY. Fan push opt-in is deliberately DEFERRED: every
// push event today targets models (calls, messages, earnings, offers), so a
// fan-facing surface would be a dead toggle. Add one only alongside the
// first fan-facing push event.
//
// Per-event toggles persist per ACTOR via /api/push/preferences (instant
// save, independent of the page's Save button) and apply to every device
// where the model turned push on. Master enable/disable per device is
// PushOptIn. Copy rule: model-facing says "paid photo/video", never "PPV".

const EVENT_COPY: Record<PushEventKey, { label: string; description: string }> =
  {
    calls: {
      label: "Calls",
      description: "Incoming call rings and missed-call alerts",
    },
    messages: {
      label: "Messages",
      description: "New messages from fans and brands",
    },
    earnings: {
      label: "Earnings",
      description: "Tips, content sales, paid photo/video unlocks, auction sales",
    },
    offers: {
      label: "Offers",
      description: "New offers from brands",
    },
  };

export function PushNotificationSettings() {
  const [prefs, setPrefs] = useState<PushPreferences>(DEFAULT_PUSH_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/push/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.preferences) setPrefs(data.preferences);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true); // fall back to defaults, stay usable
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (key: PushEventKey, value: boolean) => {
    const previous = prefs;
    setPrefs({ ...prefs, [key]: value }); // optimistic
    try {
      const res = await fetch("/api/push/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      setPrefs(previous);
      toast.error("Couldn't save that — please try again");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-violet-400" />
          Notifications
        </CardTitle>
        <CardDescription>
          Get a ping the moment you earn or someone reaches out — even when
          EXA is closed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PushOptIn />

        <div className="space-y-6 border-t border-white/10 pt-6">
          {PUSH_EVENT_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label>{EVENT_COPY[key].label}</Label>
                <p className="text-sm text-muted-foreground">
                  {EVENT_COPY[key].description}
                </p>
              </div>
              <Switch
                checked={prefs[key]}
                disabled={!loaded}
                onCheckedChange={(v) => toggle(key, v)}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            These apply to every device where you&apos;ve turned push on.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
