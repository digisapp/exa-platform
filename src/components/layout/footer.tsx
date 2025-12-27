import Link from "next/link";
import Image from "next/image";
import { Instagram, Twitter, Youtube } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container px-8 md:px-16 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/">
              <Image
                src="/exa-logo-white.png"
                alt="EXA"
                width={80}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              The community platform where models build careers, join experiences, and get discovered.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="https://instagram.com/examodels" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://twitter.com/examodels" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://youtube.com/@examodels" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* For Models */}
          <div>
            <h3 className="font-semibold mb-4">For Models</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/signup" className="text-muted-foreground hover:text-primary transition-colors">
                  Join EXA
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-muted-foreground hover:text-primary transition-colors">
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          {/* For Brands */}
          <div>
            <h3 className="font-semibold mb-4">For Brands</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/brands" className="text-muted-foreground hover:text-primary transition-colors">
                  Brand Portal
                </Link>
              </li>
              <li>
                <Link href="/models" className="text-muted-foreground hover:text-primary transition-colors">
                  Browse Models
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  About
                </Link>
              </li>
              <li>
                <a href="mailto:team@examodels.com" className="text-muted-foreground hover:text-primary transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/40 mt-12 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} EXA Models. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
