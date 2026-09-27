import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/** Exact public paths (normalized, no trailing slash except root). */
const PUBLIC_PATHS = new Set(['/login', '/auth/callback', '/forbidden']);

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isPublicPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (PUBLIC_PATHS.has(path)) return true;
  // Auth callback may include deeper paths in future
  if (path.startsWith('/auth/callback')) return true;
  // Base44 inbound webhooks (authenticated via shared secret, not session)
  if (path.startsWith('/api/webhooks/')) return true;
  return false;
}

function isStaticOrInternal(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

/** Redirect only when target differs from current path (prevents loops). */
function redirectTo(
  request: NextRequest,
  sessionResponse: NextResponse,
  pathname: string,
  searchParams?: Record<string, string>,
): NextResponse {
  const current = normalizePathname(request.nextUrl.pathname);
  const target = normalizePathname(pathname);

  if (current === target) {
    return sessionResponse;
  }

  const url = request.nextUrl.clone();
  url.pathname = target;
  url.search = '';
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const redirectResponse = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value);
  });
  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  const pathname = normalizePathname(request.nextUrl.pathname);

  if (isStaticOrInternal(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const publicRoute = isPublicPath(pathname);

  let user: Awaited<ReturnType<typeof updateSession>>['user'] = null;
  let supabase: Awaited<ReturnType<typeof updateSession>>['supabase'] | null =
    null;
  let supabaseResponse = NextResponse.next({ request });

  try {
    const session = await updateSession(request);
    user = session.user;
    supabase = session.supabase;
    supabaseResponse = session.supabaseResponse;
  } catch (error) {
    console.error('[middleware] session update failed:', error);
    // Never bounce a public route to itself (ERR_TOO_MANY_REDIRECTS).
    if (publicRoute) {
      return NextResponse.next({ request });
    }
    return redirectTo(request, supabaseResponse, '/login', {
      next: pathname === '/' ? '/dashboard' : pathname,
    });
  }

  // --- Public routes ---
  if (publicRoute) {
    // Logged-in visitor on /login → send to dashboard or forbidden (no hop via /).
    if (user && pathname === '/login' && supabase) {
      const { data: profile } = await supabase
        .from('admin_profiles')
        .select('role, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      const isActiveAdmin =
        !!profile &&
        profile.is_active === true &&
        typeof profile.role === 'string';

      if (isActiveAdmin) {
        return redirectTo(request, supabaseResponse, '/dashboard');
      }
      return redirectTo(request, supabaseResponse, '/forbidden');
    }

    // /forbidden, /auth/callback, /login (no session): pass through
    return supabaseResponse;
  }

  // --- Protected admin routes ---
  if (!user) {
    return redirectTo(request, supabaseResponse, '/login', {
      next: pathname,
    });
  }

  // Session exists: still verify platform admin here so non-admins never hit
  // the admin layout redirect cycle (/ → /dashboard → /forbidden).
  if (supabase) {
    const { data: profile } = await supabase
      .from('admin_profiles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .maybeSingle();

    const isActiveAdmin =
      !!profile &&
      profile.is_active === true &&
      typeof profile.role === 'string';

    if (!isActiveAdmin) {
      return redirectTo(request, supabaseResponse, '/forbidden');
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run on app routes only. Exclude:
     * - Next internals (_next/static, _next/image)
     * - favicon
     * - common static file extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)',
  ],
};
