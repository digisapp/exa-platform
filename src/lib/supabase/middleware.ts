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
  let supabaseResponse = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Always call getUser() to refresh the session
  // This validates the JWT and refreshes tokens if needed
  const { data: { user } } = await supabase.auth.getUser()

  // Check if this is a protected route
  const isProtectedPath = PROTECTED_PATHS.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Redirect to login if accessing protected route without auth
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
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

  // Add cache control headers to prevent stale auth state
  supabaseResponse.headers.set('Cache-Control', 'no-store, max-age=0')

  return supabaseResponse
}
