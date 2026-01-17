import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, CheckCircle } from "lucide-react";

export default function SetPasswordPage() {
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <CardTitle className="text-xl">Welcome to EXA!</CardTitle>
          <CardDescription className="text-base">
            Your account has been confirmed
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-pink-500/10 border border-pink-500/30">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-pink-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Set your password</p>
                <p className="text-xs text-muted-foreground mt-1">
                  We just sent you an email with a link to create your password.
                  Check your inbox (and spam folder) for an email from EXA.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>After setting your password, you&apos;ll be able to sign in anytime.</p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button asChild className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
            <Link href="/signin">
              Go to Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Didn&apos;t receive the email?{" "}
            <Link href="/forgot-password" className="text-pink-500 hover:underline">
              Request a new link
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
