import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);

  // Best-effort server-side revocation. supabase-js bails out WITHOUT
  // removing the session when the auth server call fails (network blip,
  // rate limit), so this must never be the thing that actually signs the
  // browser out.
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Cookie deletion below signs this browser out regardless.
  }

  const response = NextResponse.redirect(`${origin}/`);

  // Authoritative sign-out: expire every Supabase auth cookie (including
  // chunked .0/.1 variants and the PKCE code-verifier).
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.delete({ name: cookie.name, path: "/" });
    }
  }

  return response;
}
