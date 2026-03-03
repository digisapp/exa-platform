"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface CreateListingButtonProps {
  isLoggedIn: boolean;
  actorType?: "model" | "fan" | "brand" | "admin" | null;
  className?: string;
  children?: React.ReactNode;
}

export function CreateListingButton({ isLoggedIn, actorType, className, children }: CreateListingButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleClick = () => {
    if (isLoggedIn) {
      if (actorType === "model" || actorType === "admin") {
        router.push("/dashboard/bids/new");
      } else {
        toast.error("Only models can create listings. Sign up as a model to get started!");
      }
    } else {
      setOpen(true);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (error) throw error;
      if (data.user) {
        setOpen(false);
        window.location.href = "/dashboard/bids/new";
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={handleClick} className={className}>
        {children ?? "+ Create a Listing"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Sign in to create a listing</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSignIn} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="cl-email">Email</Label>
              <Input
                id="cl-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cl-password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-zinc-500 hover:text-zinc-300" onClick={() => setOpen(false)}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="cl-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 h-11"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In & Create Listing"}
            </Button>

            <p className="text-center text-xs text-zinc-500">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-pink-400 hover:underline" onClick={() => setOpen(false)}>
                Sign Up
              </Link>
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
