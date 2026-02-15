"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    // Auto-generate username from company name
    let baseUsername = companyName.trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
    if (baseUsername.length < 3) {
      baseUsername = baseUsername + "brand";
    }

    // Check if username is taken (only check models table which is publicly readable)
    let finalUsername = baseUsername;
    let suffix = 1;

    while (true) {
      // Only check models table - it has public read access
      // Brands table will enforce uniqueness at insert time
      const { data: existingModel } = await (supabase.from("models") as any)
        .select("id")
        .eq("username", finalUsername)
        .maybeSingle();

      if (!existingModel) {
        break; // Username is available in models
      }

      // Try with a number suffix
      finalUsername = `${baseUsername}${suffix}`;
      suffix++;

      if (suffix > 99) {
        toast.error("Could not generate unique username. Please try again.");
        setLoading(false);
        return;
      }
    }

    try {
      // Create auth user with brand metadata so auth callback knows the signup type
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            signup_type: "brand",
            display_name: companyName.trim(),
            company_name: companyName.trim(),
            contact_name: contactName.trim(),
          },
        },
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

      // Use API route to create actor and brand profile (bypasses RLS)
      const res = await fetch("/api/auth/create-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          bio: message.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create brand profile");
      }

      // Send our custom confirmation email via Resend (more reliable than Supabase SMTP)
      try {
        await fetch("/api/auth/send-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            displayName: contactName.trim(),
            signupType: "brand",
          }),
        });
      } catch {
        // Non-blocking
      }

      setSubmitted(true);
      toast.success("Application submitted!");

    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : "Something went wrong";
      toast.error(errMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setSubmitted(false);
      setCompanyName("");
      setContactName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setMessage("");
    }, 300);
  };

  const handleGoToDashboard = () => {
    router.push("/dashboard");
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
              <DialogTitle className="text-xl">Application Submitted!</DialogTitle>
              <p className="text-muted-foreground mt-2">
                We&apos;ll review your brand and get back to you within 24 hours.
                In the meantime, feel free to browse our models!
              </p>
            </DialogHeader>
            <Button
              onClick={handleGoToDashboard}
              className="mt-6 bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Go to Dashboard
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
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                  autoComplete="organization"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName">Your Name</Label>
                <Input
                  id="contactName"
                  placeholder="Contact person"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  disabled={loading}
                  autoComplete="name"
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
                  autoComplete="email"
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
                    autoComplete="new-password"
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
                  Must be at least 8 characters
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
