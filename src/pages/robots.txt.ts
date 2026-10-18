import type { APIRoute } from 'astro';

// Allow everything and point to the sitemap. /admin is deliberately not listed: it's protected by
// login and noindex headers, and naming it here would only advertise it (D-015).
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
