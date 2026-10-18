import type { APIRoute } from 'astro';
import { loadPricing } from '../../lib/booking';
import { supabaseAnon } from '../../lib/supabase';

export const prerender = false;

/** Pricing rules and the display rate for the Book page. Public data only. */
export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('stay') ?? '';
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return Response.json({ error: 'invalid_stay' }, { status: 400 });
  try {
    const pricing = await loadPricing(supabaseAnon(), slug);
    if (!pricing) return Response.json({ error: 'not_found' }, { status: 404 });
    return Response.json(pricing, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 503 });
  }
};
