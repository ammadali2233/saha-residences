import type { APIRoute } from 'astro';
import { supabaseAnon } from '../../lib/supabase';

export const prerender = false;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Booked and blocked date ranges (end exclusive). No guest data ever leaves the database (D-007). */
export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('stay') ?? '';
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';
  if (!/^[a-z0-9-]{1,60}$/.test(slug) || !DATE.test(from) || !DATE.test(to)) {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }
  try {
    const { data, error } = await supabaseAnon().rpc('public_availability', { p_slug: slug, p_from: from, p_to: to });
    if (error) return Response.json({ error: 'invalid_range' }, { status: 400 });
    const blocked = (data ?? []).map((r: { start_date: string; end_date: string }) => [r.start_date, r.end_date]);
    // Short cache: a new booking shows up within a minute.
    return Response.json({ blocked }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 503 });
  }
};
