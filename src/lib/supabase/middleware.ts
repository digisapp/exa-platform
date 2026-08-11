import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Protected routes that require authentication
const PROTECTED_PATHS = [
  '/dashboard',
  '/profile',
  '/chats',
  '/settings',
  '/admin',
  '/studio',
  '/earnings',
  '/coins',
  '/wallet',
  '/bookings',
  '/offers',
  '/followers',
  '/favorites',
  '/campaigns',
  '/my-content',
  // Gigs went members-only 2026-08-05 (reverses the PR #73 public funnel):
  // castings and pay rates are for signed-in models, not public visitors.
  '/gigs',
]

// Routes that require model approval (subset of protected paths)
const MODEL_APPROVED_PATHS = [
  '/dashboard',
  '/studio',
  '/earnings',
  '/wallet',
  '/bookings',
  '/offers',
  '/followers',
  '/favorites',
  '/campaigns',
  '/my-content',
  '/chats',
  '/gigs',
]

export async function updateSession(request: NextRequest) {
  // CSRF protection for mutation requests
  if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    // Allow requests with no origin (same-origin, non-browser clients)
    // But if origin IS present, it must match our host
    if (origin) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        // Allow Stripe and Payoneer webhook callbacks
        if (!request.nextUrl.pathname.startsWith("/api/webhooks/") &&
            !request.nextUrl.pathname.startsWith("/api/payoneer/webhook")) {
          return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
        }
      }
    }
  }

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
            // Deletions arrive as maxAge 0 / empty value — extending their
            // lifetime would resurrect them as empty 30-day cookies.
            const isRemoval = value === '' || options?.maxAge === 0
            response.cookies.set(name, value, isRemoval ? { ...options, path: '/' } : {
              ...options,
              // Extend cookie lifetime to 30 days (in seconds)
              maxAge: 60 * 60 * 24 * 30,
              // Ensure cookies persist across browser sessions
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              // Ensure path is set for all routes
              path: '/',
            })
          })
        },
      },
    }
  )

  // IMPORTANT: Do not remove this - it refreshes the auth token
  let user: { id: string } | null = null
  let getUserError: unknown = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
    getUserError = result.error
  } catch (err) {
    // Network/Supabase blip — fall through with a null user. Protected routes
    // below will redirect to signin instead of throwing a 503.
    getUserError = err
    console.error('middleware: getUser threw', err)
  }

  // If there's an auth error but we have cookies, try to recover
  // This can happen when returning from external sites like Stripe
  if (getUserError && !user) {
    const hasAuthCookies = request.cookies.getAll().some(c =>
      c.name.includes('auth-token') || c.name.includes('sb-')
    )

    if (hasAuthCookies) {
      try {
        const { data: { session } } = await supabase.auth.refreshSession()
        if (session?.user) {
          const recoveredUser = session.user

          if (request.nextUrl.pathname.startsWith('/admin')) {
            const { data: actor } = await supabase
              .from('actors')
              .select('type, user_id')
              .eq('user_id', recoveredUser.id)
              .single()

            if (actor?.type !== 'admin' || actor?.user_id !== recoveredUser.id) {
              return NextResponse.redirect(new URL('/dashboard', request.url))
            }
          }

          return response
        }
      } catch (err) {
        console.error('middleware: refreshSession threw', err)
      }
    }
  }

  // Gig invite links (/gigs/[slug]?invite=<token>, texted/DM'd to models) let
  // a logged-out visitor view ONE gig detail page. The page validates the
  // token server-side (invalid → signin redirect, same as this gate), so
  // skipping the middleware gates here opens nothing on its own. Detail pages
  // only — the bare /gigs listing stays members-only.
  const isGigInvite = request.nextUrl.pathname.startsWith('/gigs/') &&
    request.nextUrl.searchParams.has('invite')

  // Check if this is a protected route
  const isProtectedPath = !isGigInvite && PROTECTED_PATHS.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Redirect to signin if accessing protected route without auth
  if (isProtectedPath && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/signin'
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Fetch actor once for both admin and model approval checks
  let cachedActor: { type: string; user_id?: string } | null = null
  const needsActor = (user && request.nextUrl.pathname.startsWith('/admin')) ||
    (user && MODEL_APPROVED_PATHS.some(path => request.nextUrl.pathname.startsWith(path)))

  if (user && needsActor) {
    try {
      const { data: actor } = await supabase
        .from('actors')
        .select('type, user_id')
        .eq('user_id', user.id)
        .single()
      cachedActor = actor
    } catch (err) {
      console.error('middleware: actor lookup threw', err)
    }
  }

  // Check admin routes require admin actor type
  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    if (cachedActor?.type !== 'admin' || cachedActor?.user_id !== user.id) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Gigs are model-only: signed-in fans/brands get bounced to their dashboard.
  // (RLS enforces the same at the data layer; this keeps the UX coherent.)
  if (user && !isGigInvite && request.nextUrl.pathname.startsWith('/gigs') &&
      cachedActor && cachedActor.type !== 'model' && cachedActor.type !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check if unapproved model is trying to access restricted pages
  const isModelApprovedPath = !isGigInvite && MODEL_APPROVED_PATHS.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (user && isModelApprovedPath) {
    if (request.nextUrl.pathname === '/pending-approval') {
      return response
    }

    if (cachedActor?.type === 'model') {
      try {
        const { data: model } = await supabase
          .from('models')
          .select('is_approved')
          .eq('user_id', user.id)
          .single()

        if (model && !model.is_approved) {
          return NextResponse.redirect(new URL('/pending-approval', request.url))
        }
      } catch (err) {
        console.error('middleware: model approval lookup threw', err)
      }
    }
  }

  return response
}
