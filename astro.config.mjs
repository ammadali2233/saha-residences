// @ts-check
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, envField, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// Canonical origin. Set SITE_URL per environment; the domain isn't bought yet.
const site = process.env.SITE_URL || 'http://localhost:4321';
// Only a production build sets INDEXABLE=true. Every other build (local, staging, previews) is noindex.
const indexable = process.env.INDEXABLE === 'true';

// Never list private or utility routes in the sitemap.
const PRIVATE = /\/(admin|api|ical|concepts)(\/|$)|\/book\/thanks\/?$/;

/** Adds X-Robots-Tag: noindex to every static response on non-production builds. */
const noindexOutsideProduction = {
  name: 'saha-noindex-outside-production',
  hooks: {
    /** @param {{ dir: URL }} options */
    'astro:build:done': ({ dir }) => {
      if (indexable) return;
      const headers = fileURLToPath(new URL('_headers', dir));
      appendFileSync(headers, '\n/*\n  X-Robots-Tag: noindex, nofollow\n');
    },
  },
};

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
    // Static pages use no Cloudflare bindings, so prerender them in Node (D-029).
    prerenderEnvironment: 'node',
  }),
  integrations: [
    preact(),
    sitemap({ filter: (page) => !PRIVATE.test(new URL(page).pathname) }),
    noindexOutsideProduction,
  ],
  // Brand fonts, self-hosted at build time with metric-matched fallbacks to keep layout shift low (D-031).
  fonts: [
    {
      name: 'Bodoni Moda',
      cssVariable: '--font-bodoni',
      provider: fontProviders.fontsource(),
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
      display: 'swap',
    },
    {
      name: 'Jost',
      cssVariable: '--font-jost',
      provider: fontProviders.fontsource(),
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
      display: 'swap',
    },
  ],
  image: {
    // Every photo ships as AVIF and WebP with a JPEG fallback (CLAUDE.md).
    layout: 'constrained',
  },
  env: {
    schema: {
      // Optional at build time: prerendered public pages never touch the database.
      // src/lib/supabase.ts fails loudly if a request needs them and they're missing.
      SUPABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      SUPABASE_ANON_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      APP_ENV: envField.enum({ context: 'server', access: 'public', values: ['local', 'staging', 'production'], default: 'local' }),
    },
  },
});
