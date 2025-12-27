import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Protected routes that require authentication
const PROTECTED_PATHS = [
  '/dashboard',
  '/profile',
  '/messages',
  '/settings',
  '/admin',
  '/content',
  '/earnings',
  '/coins',
  '/wallet',
  '/gigs',
]

export async function updateSession(request: NextRequest) {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update cookies on the request for downstream use
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          // Create new response with updated request
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          // Set cookies on the response for the browser with extended expiration
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              // Extend cookie lifetime to 1 year (in seconds)
              maxAge: 60 * 60 * 24 * 365,
              // Ensure cookies persist across browser sessions
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            })
          })
        },
      },
    }
  )

  // IMPORTANT: Do not remove this - it refreshes the auth token
  const { data: { user } } = await supabase.auth.getUser()

  // Check if this is a protected route
  const isProtectedPath = PROTECTED_PATHS.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Redirect to signin if accessing protected route without auth
  if (isProtectedPath && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/signin'
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Check admin routes require admin actor type
  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    const { data: actor } = await supabase
      .from('actors')
      .select('type')
      .eq('user_id', user.id)
      .single()

    if (actor?.type !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}
