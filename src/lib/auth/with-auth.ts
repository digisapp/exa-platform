import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit, type EndpointType } from "@/lib/rate-limit";
import { assertNotSuspended } from "@/lib/auth/suspension";
import { logger } from "@/lib/logger";

export type ActorType = "model" | "fan" | "brand" | "admin";

export type AuthedActor = { id: string; type: ActorType; user_id: string };

export type AuthedContext<P> = {
  request: NextRequest;
  /** Route params, already awaited. */
  params: P;
  user: User;
  actor: AuthedActor;
  /** RLS-scoped client authenticated as the caller. */
  supabase: Awaited<ReturnType<typeof createClient>>;
};

export type WithAuthOptions = {
  /** Only these actor types may call the route; others get 403. */
  requireType?: ActorType | ActorType[];
  /** Rate-limit bucket, keyed by the caller's user id. */
  rateLimit?: EndpointType;
  /**
   * Block suspended/soft-deleted fans. Required on every route that spends
   * coins or sends messages (see assertNotSuspended).
   */
  checkSuspension?: boolean;
};

/**
 * Standard route-handler wrapper: resolves the caller (401), applies the
 * rate limit (429), resolves their actor (404), enforces actor type (403)
 * and suspension (403), and converts uncaught errors into a logged 500.
 *
 *   export const PATCH = withAuth(
 *     async ({ params, supabase }) => { ... },
 *     { requireType: "admin", rateLimit: "general" }
 *   );
 */
export function withAuth<P = unknown>(
  handler: (ctx: AuthedContext<P>) => Promise<Response>,
  options: WithAuthOptions = {}
) {
  return async (
    request: NextRequest,
    routeCtx: { params: Promise<P> }
  ): Promise<Response> => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (options.rateLimit) {
        const limited = await checkEndpointRateLimit(
          request,
          options.rateLimit,
          user.id
        );
        if (limited) return limited;
      }

      const { data: actor } = (await (supabase.from("actors") as any)
        .select("id, type, user_id")
        .eq("user_id", user.id)
        .single()) as { data: AuthedActor | null };
      if (!actor) {
        return NextResponse.json({ error: "Actor not found" }, { status: 404 });
      }

      if (options.requireType) {
        const allowed = Array.isArray(options.requireType)
          ? options.requireType
          : [options.requireType];
        if (!allowed.includes(actor.type)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      if (options.checkSuspension) {
        const blocked = await assertNotSuspended(actor.id);
        if (blocked) return blocked;
      }

      const params = await routeCtx.params;
      return await handler({ request, params, user, actor, supabase });
    } catch (error) {
      logger.error(
        `API error: ${request.method} ${new URL(request.url).pathname}`,
        error
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
