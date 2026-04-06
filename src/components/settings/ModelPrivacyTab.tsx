"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Trash2, Loader2, PauseCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Model } from "@/types/database";

interface ModelPrivacyTabProps {
  model: Model;
  onChange: (model: Model) => void;
  onDeleteAccount: () => Promise<void>;
  deleting: boolean;
}

export function ModelPrivacyTab({ model, onChange, onDeleteAccount, deleting }: ModelPrivacyTabProps) {
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>Control what information is visible on your public profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Location</Label>
              <p className="text-sm text-muted-foreground">Display your city and state</p>
            </div>
            <Switch
              checked={model.show_location ?? true}
              onCheckedChange={(v) => onChange({ ...model, show_location: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Measurements</Label>
              <p className="text-sm text-muted-foreground">Display height and body measurements</p>
            </div>
            <Switch
              checked={model.show_measurements ?? true}
              onCheckedChange={(v) => onChange({ ...model, show_measurements: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Social Media</Label>
              <p className="text-sm text-muted-foreground">Display Instagram and TikTok handles</p>
            </div>
            <Switch
              checked={model.show_social_media ?? true}
              onCheckedChange={(v) => onChange({ ...model, show_social_media: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Interactions</CardTitle>
          <CardDescription>Control which interaction buttons appear on your public profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Chat</Label>
              <p className="text-sm text-muted-foreground">Let fans and brands message you</p>
            </div>
            <Switch
              checked={(model as any).allow_chat ?? true}
              onCheckedChange={(v) => onChange({ ...model, allow_chat: v } as any)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Video Calls</Label>
              <p className="text-sm text-muted-foreground">Let fans and brands video call you</p>
            </div>
            <Switch
              checked={(model as any).allow_video_call ?? true}
              onCheckedChange={(v) => onChange({ ...model, allow_video_call: v } as any)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Voice Calls</Label>
              <p className="text-sm text-muted-foreground">Let fans and brands voice call you</p>
            </div>
            <Switch
              checked={(model as any).allow_voice_call ?? true}
              onCheckedChange={(v) => onChange({ ...model, allow_voice_call: v } as any)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Tips</Label>
              <p className="text-sm text-muted-foreground">Let fans and brands send you tips</p>
            </div>
            <Switch
              checked={(model as any).allow_tips ?? true}
              onCheckedChange={(v) => onChange({ ...model, allow_tips: v } as any)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Deactivate Account */}
      <Card className="border-amber-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-500">
            <PauseCircle className="h-5 w-5" />
            Deactivate Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Temporarily hide your profile from search and public pages. Your data stays safe and you can reactivate anytime.
              </p>
            </div>
            <Switch
              checked={(model as any).deactivated ?? false}
              onCheckedChange={(v) => onChange({ ...model, deactivated: v } as any)}
            />
          </div>
          {(model as any).deactivated && (
            <p className="mt-3 text-sm text-amber-500/80 bg-amber-500/10 rounded-lg p-3">
              Your profile is currently hidden. Toggle this off to reactivate.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <AlertDialog onOpenChange={(open) => !open && setDeleteConfirmation("")}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <span className="block">
                      Your account will be deactivated immediately and hidden from all public pages.
                      You have 30 days to contact support to recover your account.
                      After 90 days, your personal data will be permanently deleted.
                    </span>
                    <span className="block font-medium text-foreground">
                      Type DELETE to confirm:
                    </span>
                    <Input
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="Type DELETE"
                      className="mt-2"
                    />
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDeleteAccount}
                    className="bg-red-500 hover:bg-red-600"
                    disabled={deleting || deleteConfirmation !== "DELETE"}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Account"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
