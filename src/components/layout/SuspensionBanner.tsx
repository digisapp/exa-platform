import { AlertTriangle } from "lucide-react";

/**
 * Shown to suspended fans on every dashboard page so they learn about the
 * restriction up front instead of via a 403 when they try to spend coins.
 * Copy mirrors the assertNotSuspended error in src/lib/auth/suspension.ts.
 */
export function SuspensionBanner() {
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10">
      <div className="container flex items-start gap-3 px-4 py-3 md:px-8">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="text-sm">
          <p className="font-medium text-amber-500">
            Your account is temporarily restricted
          </p>
          <p className="text-muted-foreground">
            A payment dispute is being reviewed, so sending messages, tips, and
            other purchases are paused. You can still browse and read your
            messages. Contact support@examodels.com if you think this is a
            mistake.
          </p>
        </div>
      </div>
    </div>
  );
}
