"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Camera,
  Video,
  Image as ImageIcon,
  Calendar,
  DollarSign,
  CheckCircle,
  Sparkles,
  Sun,
  Waves,
  Loader2,
  CreditCard,
  Mail,
  User,
  Building,
} from "lucide-react";

export default function SwimwearContentPage() {
  const [loading, setLoading] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");

  const handlePayNow = async () => {
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
      const res = await fetch("/api/content-program/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          contactName: contactName.trim(),
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout");
      }

      // Redirect to Stripe
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link href="/" className="font-bold text-xl">EXA</Link>
          <Link href="/models" className="text-sm text-muted-foreground hover:text-foreground">
            Browse Models
          </Link>
        </div>
      </nav>

      <main className="container px-4 md:px-8 py-12 max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm mb-6">
            <Waves className="h-4 w-4" />
            <span>Miami Swim Week 2026</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan-400 via-pink-500 to-violet-500 bg-clip-text text-transparent">
              Swimwear Brand Content Program
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            Professional content for your swimwear collection
          </p>
          <p className="text-muted-foreground">
            Months of content and exposure leading up to Miami Swim Week
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          <StatCard icon={<Video className="h-5 w-5 text-pink-500" />} label="10 Video Clips" sublabel="per month" />
          <StatCard icon={<ImageIcon className="h-5 w-5 text-violet-500" />} label="50 Pro Photos" sublabel="per month" />
          <StatCard icon={<DollarSign className="h-5 w-5 text-green-500" />} label="$500/month" sublabel="3-month commitment" />
          <StatCard icon={<Sun className="h-5 w-5 text-amber-500" />} label="Swim Week Credits" sublabel="toward $3,000 package" />
        </div>

        {/* Payment Form - Prominent Position */}
        <Card className="p-8 mb-12 bg-gradient-to-br from-pink-500/20 via-violet-500/20 to-cyan-500/20 border-pink-500/30">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Join the Program</h2>
            <p className="text-muted-foreground">
              All brands accepted • Pay $1,500 for 3 months of content
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brandName" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Brand Name *
              </Label>
              <Input
                id="brandName"
                placeholder="Your swimwear brand name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Your Name *
              </Label>
              <Input
                id="contactName"
                placeholder="Contact person name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@yourbrand.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="pt-4">
              <Button
                onClick={handlePayNow}
                disabled={loading || !brandName.trim() || !contactName.trim() || !email.trim()}
                className="w-full h-14 text-lg bg-gradient-to-r from-cyan-500 via-pink-500 to-violet-500 hover:from-cyan-600 hover:via-pink-600 hover:to-violet-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Redirecting to payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Pay $1,500 Now
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Secure payment via Stripe • 3-month content program
              </p>
            </div>
          </div>
        </Card>

        {/* Main Value Prop */}
        <Card className="p-8 mb-12 bg-gradient-to-br from-cyan-500/10 via-pink-500/10 to-violet-500/10 border-pink-500/20">
          <div className="text-center">
            <Camera className="h-12 w-12 mx-auto mb-4 text-pink-500" />
            <h2 className="text-2xl font-bold mb-4">What You Get</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              We produce tropical-location shoots with our professional models to grow your brand&apos;s visibility
              before you even step on the runway.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <BenefitCard
                icon={<Camera className="h-6 w-6" />}
                title="Studio & Beach Shoots"
                description="Professional content at premium Miami locations"
              />
              <BenefitCard
                icon={<Sparkles className="h-6 w-6" />}
                title="Instagram Exposure"
                description="Story posts and content featuring your swimwear"
              />
              <BenefitCard
                icon={<Waves className="h-6 w-6" />}
                title="Swim Week Ready"
                description="Build momentum before the main event"
              />
            </div>
          </div>
        </Card>

        {/* Monthly Deliverables */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-pink-500" />
            Monthly Deliverables
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-full bg-pink-500/10">
                  <Video className="h-6 w-6 text-pink-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">10 Video Clips</h3>
                  <p className="text-muted-foreground text-sm">High-quality reels & content</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Model showcase videos
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Behind-the-scenes content
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Ready for social media
                </li>
              </ul>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-full bg-violet-500/10">
                  <ImageIcon className="h-6 w-6 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">50 Professional Photos</h3>
                  <p className="text-muted-foreground text-sm">Studio & location shots</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Lookbook quality images
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  E-commerce ready
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Full usage rights
                </li>
              </ul>
            </Card>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-500" />
            Investment
          </h2>
          <Card className="p-8 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <div className="text-center mb-6">
              <p className="text-5xl font-bold text-green-500 mb-2">$1,500</p>
              <p className="text-muted-foreground">3-month content program (one-time payment)</p>
            </div>
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg mb-4">
                <span className="text-muted-foreground">Monthly Content Value</span>
                <span className="font-bold">$500/month × 3</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg mb-4">
                <span className="text-muted-foreground">Total Program Cost</span>
                <span className="font-bold">$1,500</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <span className="text-cyan-400">Credited to Swim Week</span>
                <span className="font-bold text-cyan-400">$1,500</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Swim Week Credit */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Waves className="h-6 w-6 text-cyan-500" />
            Swim Week Credit
          </h2>
          <Card className="p-8 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-4 text-cyan-400">
                  Your Content Investment = Swim Week Credits
                </h3>
                <p className="text-muted-foreground mb-4">
                  The Miami Swim Week package is <span className="text-white font-bold">$3,000</span>.
                  Your $1,500 payment is credited toward your Swim Week balance.
                </p>
                <p className="text-muted-foreground">
                  After the program, you&apos;ll have <span className="text-cyan-400 font-bold">$1,500</span> already
                  credited — plus a complete content library and months of brand exposure!
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="relative w-40 h-40">
                  {/* Progress ring visual */}
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-muted/20"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="url(#gradient)"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={440}
                      strokeDashoffset={220}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">50%</span>
                    <span className="text-xs text-muted-foreground">credited</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Timeline */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Program Timeline</h2>
          <div className="space-y-4">
            <TimelineItem
              month="Month 1"
              title="Kickoff Shoot"
              description="First collection shoot, 10 videos + 50 photos delivered"
              credit="$500 value"
            />
            <TimelineItem
              month="Month 2"
              title="Content Momentum"
              description="Second shoot, Instagram exposure begins"
              credit="$1,000 value"
            />
            <TimelineItem
              month="Month 3"
              title="Pre-Show Content"
              description="Final content package, Swim Week preparation"
              credit="$1,500 value"
            />
            <TimelineItem
              month="May 26, 2026"
              title="Miami Swim Week"
              description="Only $1,500 remaining for full Swim Week package"
              credit="$3,000 package"
              highlight
            />
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <StepCard number={1} title="Pay" description="Complete your $1,500 payment securely" />
            <StepCard number={2} title="Send Collection" description="Ship your swimwear pieces to our Miami studio" />
            <StepCard number={3} title="We Shoot" description="Professional models bring your designs to life" />
            <StepCard number={4} title="Receive Content" description="Get your videos and photos monthly" />
          </div>
        </div>

        {/* Second Payment Form */}
        <Card className="p-8 text-center bg-gradient-to-br from-pink-500/20 via-violet-500/20 to-cyan-500/20 border-pink-500/30 mb-12">
          <h2 className="text-2xl font-bold mb-4">Ready to Join?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Get months of professional content and exposure leading up to Miami Swim Week.
            All brands accepted — just fill in your details and pay.
          </p>
          <div className="max-w-md mx-auto space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Brand Name *"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                disabled={loading}
              />
              <Input
                placeholder="Your Name *"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                disabled={loading}
              />
            </div>
            <Input
              type="email"
              placeholder="Email *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <Button
              onClick={handlePayNow}
              disabled={loading || !brandName.trim() || !contactName.trim() || !email.trim()}
              size="lg"
              className="w-full bg-gradient-to-r from-cyan-500 via-pink-500 to-violet-500 hover:from-cyan-600 hover:via-pink-600 hover:to-violet-600 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Pay $1,500 Now
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* FAQ */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">FAQ</h2>
          <div className="space-y-4">
            <FAQItem
              question="What swimwear styles work best?"
              answer="We shoot all styles — bikinis, one-pieces, resort wear, cover-ups. Our diverse model roster can showcase any aesthetic from athletic to luxury."
            />
            <FAQItem
              question="How do I send my collection?"
              answer="After payment, we'll email you a shipping address for our Miami studio. We recommend sending 5-10 pieces per month for variety."
            />
            <FAQItem
              question="What happens to my pieces after shooting?"
              answer="We can return your collection after each shoot, or hold items for the full program duration — your choice."
            />
            <FAQItem
              question="Can I provide creative direction?"
              answer="Absolutely! Share your brand guidelines, mood boards, and preferences. We'll collaborate to capture your vision."
            />
            <FAQItem
              question="What's included in the Swim Week package?"
              answer="The $3,000 Swim Week package includes runway presence, show content, backstage access, and post-event deliverables. Your $1,500 payment credits directly toward this."
            />
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Questions? Reach out to us</p>
          <Button asChild size="lg" variant="outline" className="text-lg px-8">
            <Link href="mailto:hello@examodels.com">
              Contact Us
            </Link>
          </Button>
        </div>
      </main>

      <footer className="border-t mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} EXA Models. All rights reserved.</p>
      </footer>
    </div>
  );
}

function StatCard({ icon, label, sublabel }: { icon: React.ReactNode; label: string; sublabel: string }) {
  return (
    <Card className="p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="font-bold">{label}</div>
      <div className="text-xs text-muted-foreground">{sublabel}</div>
    </Card>
  );
}

function BenefitCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-4 bg-background/50 rounded-lg text-center">
      <div className="flex justify-center mb-2 text-pink-500">{icon}</div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TimelineItem({ month, title, description, credit, highlight = false }: { month: string; title: string; description: string; credit: string; highlight?: boolean }) {
  return (
    <div className={`flex gap-4 p-4 rounded-lg ${highlight ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-muted/30'}`}>
      <div className={`flex-shrink-0 w-24 text-sm font-bold ${highlight ? 'text-cyan-400' : 'text-pink-500'}`}>
        {month}
      </div>
      <div className="flex-1">
        <h3 className="font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className={`flex-shrink-0 text-sm font-bold ${highlight ? 'text-cyan-400' : 'text-green-500'}`}>
        {credit}
      </div>
    </div>
  );
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <Card className="p-4 text-center">
      <div className="w-8 h-8 rounded-full bg-pink-500 text-white font-bold flex items-center justify-center mx-auto mb-3">
        {number}
      </div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Card>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <Card className="p-4">
      <h3 className="font-bold mb-2">{question}</h3>
      <p className="text-sm text-muted-foreground">{answer}</p>
    </Card>
  );
}
