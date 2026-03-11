import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { isInAppBrowser, getInAppBrowserName } from '@/lib/in-app-browser'

export async function middleware(request: NextRequest) {
  // Redirect compcards.co to comp card creator
  const hostname = request.headers.get('host') || ''
  if (hostname.replace('www.', '') === 'compcards.co') {
    return NextResponse.redirect('https://www.examodels.com/comp-card-creator', 301)
  }

  // Vanity URLs for Miami Swim Week 2026
  if (request.nextUrl.pathname === '/swimweek') {
    return NextResponse.redirect(new URL('/shows/miami-swim-week-2026', request.url), 301)
  }
  if (request.nextUrl.pathname === '/swimweek-sponsors' || request.nextUrl.pathname === '/sponsor') {
    return NextResponse.redirect(new URL('/sponsors/miami-swim-week', request.url), 301)
  }

  // In-app browser detection — redirect to interstitial page
  // Skip for the interstitial page itself, API routes, static assets, and auth callbacks
  const pathname = request.nextUrl.pathname
  if (
    !pathname.startsWith('/open-in-browser') &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/auth/') &&
    !pathname.startsWith('/_next/')
  ) {
    const userAgent = request.headers.get('user-agent') || ''
    if (isInAppBrowser(userAgent)) {
      const appName = getInAppBrowserName(userAgent)
      const redirectUrl = new URL('/open-in-browser', request.url)
      redirectUrl.searchParams.set('to', pathname + (request.nextUrl.search || ''))
      redirectUrl.searchParams.set('app', appName)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth routes (let them handle their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/reset-password|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
