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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle, Clock } from "lucide-react";
import Image from "next/image";

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
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [height, setHeight] = useState("");

  // Height options from 4'10" to 7'0"
  const heightOptions = [
    "4'10\"", "4'11\"",
    "5'0\"", "5'1\"", "5'2\"", "5'3\"", "5'4\"", "5'5\"", "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "5'11\"",
    "6'0\"", "6'1\"", "6'2\"", "6'3\"", "6'4\"", "6'5\"", "6'6\"", "6'7\"", "6'8\"", "6'9\"", "6'10\"", "6'11\"",
    "7'0\""
  ];

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

    // Date of birth validation (must be 18+)
    if (!dateOfBirth) {
      toast.error("Please enter your date of birth");
      return;
    }

    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      toast.error("You must be at least 18 years old to apply");
      return;
    }

    // Height validation
    if (!height) {
      toast.error("Please select your height");
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
          date_of_birth: dateOfBirth,
          height: height,
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
      setDateOfBirth("");
      setHeight("");
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
              <div className="mx-auto mb-2">
                <Image
                  src="/exa-logo-white.png"
                  alt="EXA"
                  width={80}
                  height={32}
                  className="h-8 w-auto"
                />
              </div>
              <DialogTitle className="text-xl">Model Sign Up</DialogTitle>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    disabled={loading}
                    required
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    className="text-sm px-2"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">Height</Label>
                  <Select value={height} onValueChange={setHeight} disabled={loading}>
                    <SelectTrigger id="height">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {heightOptions.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* What happens next */}
              <div className="p-4 rounded-lg bg-muted/50 text-sm space-y-1">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  We&apos;ll review your submission within 24 hours
                </p>
                <p className="text-muted-foreground ml-6">
                  Once approved, you&apos;ll get full model access
                </p>
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
