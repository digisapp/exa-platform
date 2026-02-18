"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { Loader2, Clock, Sparkles, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface ModelSignupDialogProps {
  children: React.ReactNode;
}

export function ModelSignupDialog({ children }: ModelSignupDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [isImportedModel, setIsImportedModel] = useState(false);
  const [importedModelInfo, setImportedModelInfo] = useState<{
    name: string;
    instagram: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [height, setHeight] = useState("");

  const supabase = createClient();

  // Height options from 4'10" to 7'0"
  const heightOptions = [
    "4'10\"", "4'11\"",
    "5'0\"", "5'1\"", "5'2\"", "5'3\"", "5'4\"", "5'5\"", "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "5'11\"",
    "6'0\"", "6'1\"", "6'2\"", "6'3\"", "6'4\"", "6'5\"", "6'6\"", "6'7\"", "6'8\"", "6'9\"", "6'10\"", "6'11\"",
    "7'0\""
  ];

  // Check if email belongs to an imported model
  const checkImportedModel = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes("@")) return;

    setCheckingEmail(true);
    try {
      const res = await fetch(`/api/auth/check-imported?email=${encodeURIComponent(emailToCheck.toLowerCase().trim())}`);
      const data = await res.json();

      if (data.isImported) {
        setIsImportedModel(true);
        setImportedModelInfo({
          name: data.name || "",
          instagram: data.instagram || "",
        });
        // Pre-fill name and instagram if available
        if (data.name && !name) setName(data.name);
        if (data.instagram && !instagram) setInstagram(data.instagram);
      } else {
        setIsImportedModel(false);
        setImportedModelInfo(null);
      }
    } catch {
      // Silently fail - not critical
      setIsImportedModel(false);
      setImportedModelInfo(null);
    } finally {
      setCheckingEmail(false);
    }
  };

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

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
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
      // Step 1: Create auth account (client-side, with user's chosen password)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            signup_type: "model",
            display_name: name.trim(),
            instagram_username: instagram.trim().replace("@", ""),
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered") || authError.message.includes("already been registered")) {
          throw new Error("This email is already registered. Please sign in instead.");
        }
        if (authError.message.includes("rate limit")) {
          throw new Error("Too many attempts. Please wait a moment and try again.");
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create account");
      }

      // Step 2: Create application + auto-confirm via API
      const res = await fetch("/api/auth/model-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          userId: authData.user.id,
          instagram_username: instagram.trim().replace("@", ""),
          tiktok_username: "",
          phone: phone.trim() || null,
          date_of_birth: dateOfBirth,
          height: height,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      // Step 3: Sign in directly (email is auto-confirmed by the API)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (signInError) {
        // If sign-in fails, redirect to sign-in page
        toast.success("Application submitted! Please sign in.");
        window.location.href = "/signin";
        return;
      }

      // Step 4: Redirect based on whether they're an imported model or new applicant
      if (data.isImported) {
        toast.success("Welcome back! Your profile is ready.");
        window.location.href = "/dashboard";
      } else {
        toast.success("Application submitted!");
        window.location.href = "/pending-approval";
      }
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
      setIsImportedModel(false);
      setImportedModelInfo(null);
      setName("");
      setInstagram("");
      setEmail("");
      setPassword("");
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Reset imported status when email changes
                  if (isImportedModel) {
                    setIsImportedModel(false);
                    setImportedModelInfo(null);
                  }
                }}
                onBlur={(e) => checkImportedModel(e.target.value)}
                disabled={loading}
                required
              />
              {checkingEmail && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {isImportedModel && importedModelInfo && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm">
                <p className="font-medium text-green-500 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Welcome back{importedModelInfo.name ? `, ${importedModelInfo.name.split(" ")[0]}` : ""}!
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  We have your profile ready. Complete signup to claim your account.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="modelPassword">Password</Label>
            <div className="relative">
              <Input
                id="modelPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
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
      </DialogContent>
    </Dialog>
  );
}
