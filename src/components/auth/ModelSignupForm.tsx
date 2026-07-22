"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "sonner";
import { Loader2, Clock, Sparkles, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useLocale, type Locale } from "@/i18n";
import { en } from "@/i18n/dictionaries/en";
import { es } from "@/i18n/dictionaries/es";

interface ModelSignupFormProps {
  /**
   * Pin the form to one language regardless of the visitor's locale —
   * used on language-specific landing pages like /modelo.
   */
  forceLocale?: Locale;
  className?: string;
  /** Called right before the post-submit redirect fires. */
  onSuccess?: () => void;
}

const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The model application form — shared by ModelSignupDialog (homepage, /modelo,
 * logged-out gig Apply, Live Wall) and the standalone /apply page. All state
 * lives here, so the dialog resets naturally when Radix unmounts it on close.
 */
export function ModelSignupForm({ forceLocale, className, onSuccess }: ModelSignupFormProps) {
  const { locale: contextLocale } = useLocale();
  const locale = forceLocale ?? contextLocale;
  const s = locale === "es" ? es.signup : en.signup;

  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [isImportedModel, setIsImportedModel] = useState(false);

  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
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
      setIsImportedModel(!!data.isImported);
    } catch {
      // Silently fail - not critical
      setIsImportedModel(false);
    } finally {
      setCheckingEmail(false);
    }
  };

  // Map server error codes to the visitor's language; fall back to the
  // server's English message for codes this build doesn't know about.
  const serverError = (data: { code?: string; error?: string }) =>
    (data.code && (s.serverErrors as Record<string, string>)[data.code]) ||
    data.error ||
    s.errGeneric;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(s.errName);
      return;
    }

    // Instagram OR TikTok — at least one social handle is required
    if (!instagram.trim() && !tiktok.trim()) {
      toast.error(s.errSocial);
      return;
    }

    if (instagram.trim()) {
      if (/\s/.test(instagram.trim().replace(/^@/, ""))) {
        toast.error(s.errInstagramSpaces);
        return;
      }

      // Catch emails entered in the Instagram field
      if (EMAIL_LIKE.test(instagram.trim())) {
        toast.error(s.errInstagramEmail);
        return;
      }

      // Strip instagram.com URLs down to just the handle
      const igUrlMatch = instagram.trim().match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (igUrlMatch) {
        setInstagram(igUrlMatch[1]);
        return;
      }

      // Catch other URLs / domains (require protocol or www. or a slash — avoid false-positives on handles like camille.woods)
      const igClean = instagram.trim().replace(/^@/, "");
      if (/^(https?:\/\/|www\.)/i.test(igClean) || /\.[a-z]{2,}\//i.test(igClean)) {
        toast.error(s.errInstagramUrl);
        return;
      }
    }

    if (tiktok.trim()) {
      if (/\s/.test(tiktok.trim().replace(/^@/, ""))) {
        toast.error(s.errTiktokSpaces);
        return;
      }

      // Catch emails entered in the TikTok field
      if (EMAIL_LIKE.test(tiktok.trim())) {
        toast.error(s.errTiktokEmail);
        return;
      }

      // Strip tiktok.com URLs down to just the handle
      const ttUrlMatch = tiktok.trim().match(/tiktok\.com\/@?([a-zA-Z0-9._]+)/);
      if (ttUrlMatch) {
        setTiktok(ttUrlMatch[1]);
        return;
      }

      // Catch other URLs / domains (require protocol or www. or a slash)
      const ttClean = tiktok.trim().replace(/^@/, "");
      if (/^(https?:\/\/|www\.)/i.test(ttClean) || /\.[a-z]{2,}\//i.test(ttClean)) {
        toast.error(s.errTiktokUrl);
        return;
      }
    }

    if (!email.trim()) {
      toast.error(s.errEmail);
      return;
    }

    // Basic email validation
    if (!email.includes("@") || !email.includes(".")) {
      toast.error(s.errEmailInvalid);
      return;
    }

    if (password.length < 8) {
      toast.error(s.errPassword);
      return;
    }

    // Phone is optional, but a provided number needs enough digits to be real
    if (phone && phone.replace(/\D/g, "").length < 8) {
      toast.error(s.errPhone);
      return;
    }

    // Date of birth validation (must be 18+)
    if (!dateOfBirth) {
      toast.error(s.errDob);
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
      toast.error(s.errUnderage);
      return;
    }

    // Height validation
    if (!height) {
      toast.error(s.errHeight);
      return;
    }

    const instagramUsername = instagram.trim() ? instagram.trim().replace("@", "") : null;
    const tiktokUsername = tiktok.trim() ? tiktok.trim().replace("@", "") : null;

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
            instagram_username: instagramUsername,
            tiktok_username: tiktokUsername,
            preferred_language: locale,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered") || authError.message.includes("already been registered")) {
          throw new Error(s.serverErrors.email_registered);
        }
        if (authError.message.includes("rate limit")) {
          throw new Error(s.serverErrors.rate_limited);
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error(s.errGeneric);
      }

      // Step 2: Create application + auto-confirm via API
      const res = await fetch("/api/auth/model-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          userId: authData.user.id,
          instagram_username: instagramUsername,
          tiktok_username: tiktokUsername,
          phone: phone || null,
          date_of_birth: dateOfBirth,
          height: height,
          preferred_language: locale,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(serverError(data));
      }

      // Step 3: Sign in directly (email is auto-confirmed by the API)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (signInError) {
        // If sign-in fails, redirect to sign-in page
        toast.success(s.successSignin);
        onSuccess?.();
        window.location.href = "/signin";
        return;
      }

      // Step 4: Everyone goes through review — imported models get their
      // existing profile linked at approval time (admin approval route
      // matches by email/Instagram), so no separate fast path here.
      toast.success(s.success);
      onSuccess?.();
      window.location.href = "/pending-approval";
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : s.errGeneric;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label htmlFor="name">{s.name}</Label>
        <Input
          id="name"
          placeholder={s.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="instagram">{s.instagram}</Label>
            <Input
              id="instagram"
              placeholder={s.instagramPlaceholder}
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              disabled={loading}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tiktok">{s.tiktok}</Label>
            <Input
              id="tiktok"
              placeholder={s.tiktokPlaceholder}
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              disabled={loading}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{s.socialHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{s.email}</Label>
        <div className="relative">
          <Input
            id="email"
            type="email"
            placeholder={s.emailPlaceholder}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              // Reset imported status when email changes
              if (isImportedModel) {
                setIsImportedModel(false);
              }
            }}
            onBlur={(e) => checkImportedModel(e.target.value)}
            disabled={loading}
            required
            autoComplete="email"
          />
          {checkingEmail && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {isImportedModel && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm">
            <p className="font-medium text-green-500 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {s.welcomeBack}
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              {s.importedNote}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="modelPassword">{s.password}</Label>
        <div className="relative">
          <Input
            id="modelPassword"
            type={showPassword ? "text" : "password"}
            placeholder={s.passwordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            autoComplete="new-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 -m-2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? s.hidePassword : s.showPassword}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {s.passwordHint}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">{s.phone}</Label>
        <PhoneInput
          id="phone"
          value={phone}
          onChange={setPhone}
          locale={locale}
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="dob">{s.dob}</Label>
          <Input
            id="dob"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            disabled={loading}
            required
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
            className="px-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="height">{s.height}</Label>
          <Select value={height} onValueChange={setHeight} disabled={loading}>
            <SelectTrigger id="height">
              <SelectValue placeholder={s.heightPlaceholder} />
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
          {s.reviewNote}
        </p>
        <p className="text-muted-foreground ml-6">
          {s.approvedNote}
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
            {s.submitting}
          </>
        ) : (
          s.submit
        )}
      </Button>
    </form>
  );
}
