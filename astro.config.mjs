// @ts-check
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// Canonical origin. Set SITE_URL per environment; the domain isn't bought yet.
const site = process.env.SITE_URL || 'http://localhost:4321';

// Never list private or utility routes in the sitemap.
const PRIVATE = /\/(admin|api|ical)(\/|$)|\/book\/thanks\/?$/;

export default defineConfig({
  site,
  trailingSlash: 'always',
  // Auth state lives in Supabase cookies; Astro sessions (and their KV binding) aren't needed.
  session: false,
  // The dev toolbar injects its own controls, which would skew local accessibility checks.
  devToolbar: { enabled: false },
  // Public pages are static by default. Admin, API and iCal routes opt out with `prerender = false`.
  adapter: cloudflare({
    // Optimize images at build time only (D-001): no runtime image binding or cost.
    imageService: 'compile',
  }),
  integrations: [preact(), sitemap({ filter: (page) => !PRIVATE.test(new URL(page).pathname) })],
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: 'server', access: 'secret' }),
      SUPABASE_ANON_KEY: envField.string({ context: 'server', access: 'secret' }),
      APP_ENV: envField.enum({ context: 'server', access: 'public', values: ['local', 'staging', 'production'], default: 'local' }),
    },
  },
});
