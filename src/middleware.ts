import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

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

  // POS is on hold (no in-store sales currently). The POS routes authenticate
  // only via an unauthenticated x-pos-staff-id header, so we disable the whole
  // surface at the edge rather than leave it reachable. Re-enable by setting
  // POS_ENABLED=true once a real staff credential (PIN/device token) is added.
  const { pathname } = request.nextUrl
  const isPosPath =
    pathname === '/pos' ||
    pathname.startsWith('/pos/') ||
    pathname === '/api/pos' ||
    pathname.startsWith('/api/pos/')
  if (isPosPath && process.env.POS_ENABLED !== 'true') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'POS is currently disabled' },
        { status: 503 }
      )
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  try {
    return await updateSession(request)
  } catch (err) {
    console.error('middleware: updateSession threw', err)
    // Don't 503 the request just because Supabase had a blip — let the
    // request through and let server components / RLS enforce auth.
    return NextResponse.next({ request: { headers: request.headers } })
  }
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
