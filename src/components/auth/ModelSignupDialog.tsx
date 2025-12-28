"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, CheckCircle, Clock, Sparkles } from "lucide-react";

interface ModelSignupDialogProps {
  children: React.ReactNode;
}

export function ModelSignupDialog({ children }: ModelSignupDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!instagram.trim()) {
      toast.error("Please enter your Instagram username");
      return;
    }

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    // Basic email validation
    if (!email.includes("@") || !email.includes(".")) {
      toast.error("Please enter a valid email");
      return;
    }

    setLoading(true);

    try {
      // Generate a random password for the user (they can reset later)
      const tempPassword = Math.random().toString(36).slice(-12) + "Aa1!";

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: tempPassword,
      });

      if (authError) {
        // Check if user already exists
        if (authError.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
          setLoading(false);
          return;
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create account");
      }

      // Create actor record (as fan initially)
      const { data: actor, error: actorError } = await (supabase
        .from("actors") as any)
        .insert({
          user_id: authData.user.id,
          type: "fan",
        })
        .select()
        .single();

      if (actorError) {
        console.error("Actor error:", actorError);
        throw actorError;
      }

      // Create fan profile
      const { error: fanError } = await (supabase
        .from("fans") as any)
        .insert({
          id: actor.id,
          user_id: authData.user.id,
          email: email.trim(),
          display_name: name.trim(),
          phone: phone.trim() || null,
          coin_balance: 10, // Welcome bonus
        });

      if (fanError) {
        console.error("Fan error:", fanError);
        throw fanError;
      }

      // Create model application
      const { error: appError } = await (supabase
        .from("model_applications") as any)
        .insert({
          user_id: authData.user.id,
          email: email.trim(),
          display_name: name.trim(),
          instagram_username: instagram.trim().replace("@", ""),
          phone: phone.trim() || null,
          status: "pending",
        });

      if (appError) {
        console.error("Application error:", appError);
        throw appError;
      }

      // Record the welcome bonus transaction
      await (supabase.from("coin_transactions") as any).insert({
        actor_id: actor.id,
        amount: 10,
        action: "signup_bonus",
        metadata: { reason: "Welcome bonus for new signup" },
      });

      setSubmitted(true);
      toast.success("Application submitted!");

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset form after close animation
    setTimeout(() => {
      setSubmitted(false);
      setName("");
      setInstagram("");
      setEmail("");
      setPhone("");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          // Success state
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl">Application Submitted!</DialogTitle>
              <DialogDescription className="text-base mt-2">
                We&apos;ll review your profile and get back to you within 24 hours.
                Check your email for updates!
              </DialogDescription>
            </DialogHeader>
            <Button
              onClick={handleClose}
              className="mt-6 bg-gradient-to-r from-pink-500 to-violet-500"
            >
              Got it!
            </Button>
          </div>
        ) : (
          // Form state
          <>
            <DialogHeader className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-pink-500" />
              </div>
              <DialogTitle className="text-xl">Become a Model</DialogTitle>
              <DialogDescription>
                Join EXA and connect with fans worldwide
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  placeholder="@yourhandle"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* What happens next */}
              <div className="p-4 rounded-lg bg-muted/50 text-sm space-y-2">
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  What happens next?
                </p>
                <ul className="space-y-1 text-muted-foreground ml-6">
                  <li>We&apos;ll review your submission</li>
                  <li>Approval typically takes 24 hours</li>
                  <li>Once approved, you&apos;ll get full model access</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
