"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Instagram, Globe, Phone, Mail, CheckCircle, Clock, Waves } from "lucide-react";

export default function SwimwearApplyPage() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingApplication, setExistingApplication] = useState<{
    status: string;
    created_at: string;
    brand_name: string;
  } | null>(null);

  // Form state
  const [brandName, setBrandName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");

  const supabase = createClient();

  useEffect(() => {
    const checkExisting = async () => {
      // Check if there's a logged in user and pre-fill email
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.email) {
        setEmail(user.email);

        // Check for existing application by user_id
        const { data: application } = await (supabase as any).from("content_program_applications")
          .select("status, created_at, brand_name")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (application) {
          setExistingApplication(application);
        }
      }

      setChecking(false);
    };

    checkExisting();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!brandName.trim() || !contactName.trim() || !email.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/content-program/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName.trim(),
          contact_name: contactName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          website_url: website.trim() || null,
          instagram_handle: instagram.replace("@", "").trim() || null,
          collection_name: collectionName.trim() || null,
          collection_description: collectionDescription.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      if (data.existing) {
        toast.info("You already have an application on file");
        setExistingApplication({
          status: data.status,
          created_at: new Date().toISOString(),
          brand_name: brandName,
        });
      } else {
        toast.success("Application submitted! We'll be in touch soon.");
        setExistingApplication({
          status: "pending",
          created_at: new Date().toISOString(),
          brand_name: brandName,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Has existing application
  if (existingApplication) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link href="/" className="flex justify-center mb-4">
              <Image
                src="/exa-logo-white.png"
                alt="EXA"
                width={100}
                height={40}
                className="h-10 w-auto"
              />
            </Link>
            {existingApplication.status === "pending" && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-amber-500" />
                </div>
                <CardTitle>Application Received!</CardTitle>
                <CardDescription>
                  Thank you for applying to the Swimwear Content Program.
                  We&apos;ll review your application and get back to you soon!
                </CardDescription>
              </>
            )}
            {existingApplication.status === "approved" && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <CardTitle>Welcome to the Program!</CardTitle>
                <CardDescription>
                  Your application for {existingApplication.brand_name} has been approved.
                  Check your email for next steps.
                </CardDescription>
              </>
            )}
            {existingApplication.status === "reviewing" && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Waves className="h-8 w-8 text-cyan-500" />
                </div>
                <CardTitle>Under Review</CardTitle>
                <CardDescription>
                  Your application is currently being reviewed by our team.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>Submitted {new Date(existingApplication.created_at).toLocaleDateString()}</p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button asChild variant="outline" className="w-full">
              <Link href="/swimwear-content">Back to Program Info</Link>
            </Button>
            <Link href="/" className="flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Application form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Link href="/" className="flex justify-center mb-4">
            <Image
              src="/exa-logo-white.png"
              alt="EXA"
              width={100}
              height={40}
              className="h-10 w-auto"
            />
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs mx-auto mb-2">
            <Waves className="h-3 w-3" />
            <span>Swimwear Content Program</span>
          </div>
          <CardTitle>Apply for the Program</CardTitle>
          <CardDescription>
            Tell us about your brand and collection
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Brand Info */}
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name *</Label>
              <Input
                id="brandName"
                placeholder="Your swimwear brand name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  placeholder="Your name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@yourbrand.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourbrand.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="h-3 w-3 text-pink-500" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  placeholder="@yourbrand"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Collection Info */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-3">Collection Details (Optional)</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="collectionName">Collection Name</Label>
                  <Input
                    id="collectionName"
                    placeholder="e.g., Summer 2026 Collection"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collectionDescription">Tell us about your brand</Label>
                  <Textarea
                    id="collectionDescription"
                    placeholder="Describe your brand aesthetic, target audience, and what makes your swimwear unique..."
                    value={collectionDescription}
                    onChange={(e) => setCollectionDescription(e.target.value)}
                    disabled={loading}
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-sm">
              <p className="font-medium text-cyan-400 mb-2">What happens next?</p>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>We&apos;ll review your brand and collection</li>
                <li>A team member will reach out within 48 hours</li>
                <li>We&apos;ll discuss shipping details and shoot scheduling</li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 via-pink-500 to-violet-500 hover:from-cyan-600 hover:via-pink-600 hover:to-violet-600 h-12 text-base"
              disabled={loading || !brandName.trim() || !contactName.trim() || !email.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
            <Link href="/swimwear-content" className="flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to program info
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
