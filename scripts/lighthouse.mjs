// Mobile Lighthouse for every public page template (quality gate: 95+ in all four categories).
// Usage: node scripts/lighthouse.mjs http://localhost:4322   (CHROME_PATH may point at any Chromium)
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const base = process.argv[2] ?? 'http://localhost:4322';
const pages = ['/', '/stays/dha-retreat/', '/stays/dha-retreat/gallery/', '/book/', '/location/', '/faq/', '/house-rules/', '/stays/'];
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
let failed = false;
const rows = [];
try {
  for (const path of pages) {
    const { lhr } = await lighthouse(`${base}${path}`, { port: chrome.port, output: 'json', logLevel: 'error' });
    const s = Object.fromEntries(Object.entries(lhr.categories).map(([k, c]) => [k, Math.round(c.score * 100)]));
    const a = lhr.audits;
    rows.push({
      page: path,
      perf: s.performance,
      a11y: s.accessibility,
      bp: s['best-practices'],
      seo: s.seo,
      LCP: a['largest-contentful-paint'].displayValue,
      CLS: a['cumulative-layout-shift'].displayValue,
      TBT: a['total-blocking-time'].displayValue,
    });
    if (Object.values(s).some((v) => v < 95)) {
      failed = true;
      for (const [id, audit] of Object.entries(a)) {
        if (audit.score !== null && audit.score < 0.9 && audit.scoreDisplayMode !== 'informative' && audit.scoreDisplayMode !== 'notApplicable') {
          console.log(`  ${path} ${id}: ${audit.title} ${audit.displayValue ?? ''}`);
        }
      }
    }
  }
} finally {
  chrome.kill();
}
console.table(rows);
process.exit(failed ? 1 : 0);
