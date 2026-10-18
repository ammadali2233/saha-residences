import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from 'astro:env/server';

/**
 * Per-request Supabase client. Auth lives in HttpOnly cookies set by the server;
 * the browser never receives a Supabase key or talks to Supabase directly.
 */
export function supabaseForRequest(request: Request, cookies: AstroCookies) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set as Worker secrets (see docs/RUNBOOK.md)');
  }
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '').map(({ name, value }) => ({
          name,
          value: value ?? '',
        }));
      },
      setAll(toSet) {
        for (const { name, value, options } of toSet) {
          cookies.set(name, value, { ...options, httpOnly: true, sameSite: 'lax', secure: import.meta.env.PROD, path: '/' });
        }
      },
    },
  });
}

export type Supabase = ReturnType<typeof supabaseForRequest>;

/** Anonymous server-side client for the public API routes: no cookies, no session, RPCs only. */
export function supabaseAnon() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set as Worker secrets (see docs/RUNBOOK.md)');
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
