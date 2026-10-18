import type { APIRoute } from 'astro';
import { supabaseAnon } from '../../lib/supabase';

export const prerender = false;

const EVENTS = new Set(['booking_started', 'booking_request_submitted', 'whatsapp_click', 'phone_click']);

/** Conversion beacon (D-011): event name and page path only. Always answers 204 so it never blocks a click. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as { event?: string; path?: string };
    if (body.event && EVENTS.has(body.event)) {
      await supabaseAnon().rpc('log_site_event', { p_event: body.event, p_path: String(body.path ?? '').slice(0, 300) });
    }
  } catch {
    // Malformed beacons and database hiccups are ignored: analytics must never break the site.
  }
  return new Response(null, { status: 204 });
};
