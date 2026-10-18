import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from 'astro:env/server';

/**
 * Per-request Supabase client. Auth lives in HttpOnly cookies set by the server;
 * the browser never receives a Supabase key or talks to Supabase directly.
 */
export function supabaseForRequest(request: Request, cookies: AstroCookies) {
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
