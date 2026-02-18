import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Redirect compcards.co to free comp card page
  const hostname = request.headers.get('host') || ''
  if (hostname.replace('www.', '') === 'compcards.co') {
    return NextResponse.redirect('https://www.examodels.com/free-comp-card', 301)
  }

  // Vanity URL for Miami Swim Week 2026
  if (request.nextUrl.pathname === '/swimweek') {
    return NextResponse.redirect(new URL('/shows/miami-swim-week-2026', request.url), 301)
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
