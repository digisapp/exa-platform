import { NextRequest, NextResponse } from "next/server";
import { isInAppBrowser } from "@/lib/in-app-browser";

/**
 * Android WebView escape trick:
 * Instagram's WebView can't handle PDF content-type responses,
 * so it hands off the URL to the system's default browser (Chrome).
 * When Chrome loads this same URL, the user-agent won't be Instagram's,
 * so we redirect them to their actual destination.
 */
export async function GET(request: NextRequest) {
  const redirect = request.nextUrl.searchParams.get("redirect") || "https://www.examodels.com";
  const ua = request.headers.get("user-agent") || "";

  if (isInAppBrowser(ua)) {
    // Return fake PDF response — Instagram's WebView can't render this
    // and will hand off to the system browser
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=redirect",
        "Content-Transfer-Encoding": "binary",
        "Accept-Ranges": "bytes",
      },
    });
  }

  // Real browser: redirect to the destination
  return NextResponse.redirect(redirect);
}
