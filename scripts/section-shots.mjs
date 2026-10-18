// Screenshots every top-level section of the given pages at 390px and 1440px (redesign audit and before/after).
// Usage: node scripts/section-shots.mjs <out-dir> [baseUrl] [paths...]
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [outDir = 'docs/redesign/before', base = 'http://localhost:4321', ...rest] = process.argv.slice(2);
const paths = rest.length ? rest : ['/', '/stays/dha-retreat/', '/book/', '/stays/dha-retreat/gallery/', '/location/'];
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const width of [390, 1440]) {
  // Reduced motion shows every section in its settled state (scroll-linked reveals would be caught mid-way).
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  for (const path of paths) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    // Load lazy images before shooting.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
    const slug = path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replaceAll('/', '-');
    const sections = page.locator('body > header, main > *, body > footer');
    const n = await sections.count();
    for (let i = 0; i < n; i++) {
      const el = sections.nth(i);
      if (!(await el.isVisible()) || ((await el.boundingBox())?.height ?? 0) < 40) continue;
      await el.screenshot({ path: `${outDir}/${slug}-${String(i).padStart(2, '0')}-${width}.jpg`, type: 'jpeg', quality: 70 });
    }
  }
  await page.close();
}
await browser.close();
console.log(`section shots written to ${outDir}`);
