import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Countries where Spanish is the primary language — used to default new
// visitors into the Spanish UI (they can always switch manually).
const SPANISH_COUNTRIES = new Set([
  'MX', 'ES', 'CO', 'AR', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU', 'BO', 'DO',
  'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR', 'GQ',
])

// Detection hints for the client-side i18n provider. Cookies (not headers)
// because the provider runs in the browser and public pages are ISR-cached —
// per-visitor geo can't be baked into the HTML.
function setGeoLocaleCookies(request: NextRequest, response: NextResponse) {
  if (request.cookies.has('exa-geo-locale')) return

  const country = request.headers.get('x-vercel-ip-country')?.toUpperCase() || ''
  const acceptsSpanish = (request.headers.get('accept-language') || '').toLowerCase().startsWith('es')
  const locale = (country ? SPANISH_COUNTRIES.has(country) : acceptsSpanish) ? 'es' : 'en'

  const opts = { maxAge: 60 * 60 * 24 * 365, path: '/', sameSite: 'lax' as const }
  response.cookies.set('exa-geo-locale', locale, opts)
  if (country) response.cookies.set('exa-geo-country', country, opts)
}

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

  try {
    const response = await updateSession(request)
    setGeoLocaleCookies(request, response)
    return response
  } catch (err) {
    console.error('middleware: updateSession threw', err)
    // Don't 503 the request just because Supabase had a blip — let the
    // request through and let server components / RLS enforce auth.
    const response = NextResponse.next({ request: { headers: request.headers } })
    setGeoLocaleCookies(request, response)
    return response
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
