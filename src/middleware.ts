import { defineMiddleware } from 'astro:middleware';
import { supabaseForRequest } from './lib/supabase';

const PRIVATE_PREFIXES = ['/admin', '/api', '/ical'];
// Pages under /admin that work before full sign-in.
const AUTH_FLOW = ['/admin/login/', '/admin/mfa/', '/admin/logout/'];

/** Admin pages: no indexing, no caching, no third-party code (D-011, D-015). */
function hardenPrivate(response: Response, isAdmin: boolean) {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store');
  if (isAdmin) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
    );
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Content-Type-Options', 'nosniff');
  }
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isPrivate = PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isPrivate) return next();

  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  if (!isAdmin) return hardenPrivate(await next(), false);

  const supabase = supabaseForRequest(context.request, context.cookies);
  context.locals.supabase = supabase;

  // getClaims() verifies the JWT; never trust an unverified session from cookies.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  context.locals.userId = claims?.sub ?? null;
  context.locals.aal = (claims?.aal as string | undefined) ?? null;

  if (!AUTH_FLOW.includes(pathname)) {
    if (!claims) return hardenPrivate(context.redirect('/admin/login/', 303), true);
    if (claims.aal !== 'aal2') return hardenPrivate(context.redirect('/admin/mfa/', 303), true);

    // RLS returns the caller's own profile only at aal2. Phase 1 UI is admin-only.
    const { data: profile } = await supabase.from('profiles').select('display_name, role').maybeSingle();
    if (!profile || profile.role !== 'admin') {
      await supabase.auth.signOut();
      return hardenPrivate(new Response('Forbidden', { status: 403 }), true);
    }
    context.locals.profile = profile;
  }

  return hardenPrivate(await next(), true);
});
