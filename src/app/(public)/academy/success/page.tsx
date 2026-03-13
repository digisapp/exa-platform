import { Suspense } from "react";
import { AcademySuccessContent } from "./academy-success-content";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function SuccessLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto p-4 rounded-full bg-muted mb-4">
              <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
            </div>
            <CardTitle className="text-2xl">Processing...</CardTitle>
            <CardDescription className="text-base">
              Please wait while we confirm your enrollment...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

export default function AcademySuccessPage() {
  return (
    <Suspense fallback={<SuccessLoading />}>
      <AcademySuccessContent />
    </Suspense>
  );
}
