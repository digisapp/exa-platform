"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";

interface BrandInquiryDialogProps {
  children: React.ReactNode;
}

export function BrandInquiryDialog({ children }: BrandInquiryDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error("Please choose a username");
      return;
    }

    // Validate username format
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleanUsername.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    if (cleanUsername.length > 20) {
      toast.error("Username must be 20 characters or less");
      return;
    }

    if (!companyName.trim()) {
      toast.error("Please enter your company name");
      return;
    }

    if (!contactName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      toast.error("Please enter a valid email");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    // Check if username is taken (across models, fans, brands)
    const { data: existingModel } = await (supabase.from("models") as any)
      .select("id")
      .eq("username", cleanUsername)
      .single();

    const { data: existingFan } = await (supabase.from("fans") as any)
      .select("id")
      .eq("username", cleanUsername)
      .single();

    const { data: existingBrand } = await (supabase.from("brands") as any)
      .select("id")
      .eq("username", cleanUsername)
      .single();

    if (existingModel || existingFan || existingBrand) {
      toast.error("This username is already taken");
      setLoading(false);
      return;
    }

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError) {
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

      // Create actor record
      const { data: actor, error: actorError } = await (supabase
        .from("actors") as any)
        .insert({
          user_id: authData.user.id,
          type: "brand",
        })
        .select()
        .single();

      if (actorError) {
        console.error("Actor error:", actorError);
        throw actorError;
      }

      // Create brand profile
      const { error: brandError } = await (supabase
        .from("brands") as any)
        .insert({
          id: actor.id,
          username: cleanUsername,
          company_name: companyName.trim(),
          contact_name: contactName.trim(),
          email: email.trim(),
          bio: message.trim() || null,
          is_verified: false,
          subscription_tier: "free",
        });

      if (brandError) {
        console.error("Brand error:", brandError);
        throw brandError;
      }

      setSubmitted(true);
      toast.success("Welcome to EXA!");

    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : "Something went wrong";
      toast.error(errMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyNameChange = (value: string) => {
    setCompanyName(value);
    // Auto-populate username from company name
    const autoUsername = value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
    setUsername(autoUsername);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setSubmitted(false);
      setUsername("");
      setCompanyName("");
      setContactName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setMessage("");
    }, 300);
  };

  const handleGoToModels = () => {
    window.location.href = "/models";
  };

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {submitted ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl">Welcome to EXA!</DialogTitle>
              <p className="text-muted-foreground mt-2">
                Your brand account is ready. Start browsing models!
              </p>
            </DialogHeader>
            <Button
              onClick={handleGoToModels}
              className="mt-6 bg-gradient-to-r from-pink-500 to-violet-500"
            >
              Browse Models
            </Button>
          </div>
        ) : (
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
              <DialogTitle className="text-xl">Brand Sign Up</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Your company"
                  value={companyName}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandUsername">Username</Label>
                <Input
                  id="brandUsername"
                  placeholder="Brand username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Auto-generated from company name
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName">Your Name</Label>
                <Input
                  id="contactName"
                  placeholder="Contact person"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandEmail">Email</Label>
                <Input
                  id="brandEmail"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandPassword">Password</Label>
                <div className="relative">
                  <Input
                    id="brandPassword"
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
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandMessage">What are you looking for? (optional)</Label>
                <Textarea
                  id="brandMessage"
                  placeholder="Tell us about your campaign goals..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                  className="min-h-[60px]"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
