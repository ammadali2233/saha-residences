import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { WIDTHS } from '../../playwright.config';

export const PUBLIC_PAGES = [
  '/',
  '/stays/',
  '/stays/dha-retreat/',
  '/stays/dha-retreat/gallery/',
  '/location/',
  '/book/',
  '/faq/',
  '/house-rules/',
  '/contact/',
  '/privacy/',
  '/terms/',
];

for (const width of WIDTHS) {
  for (const path of PUBLIC_PAGES) {
    test(`${path} at ${width}px: WCAG 2.2 AA, layout, SEO basics`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`)).toEqual([]);

      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main')).toHaveCount(1);
      expect((await page.title()).length).toBeGreaterThan(10);
      expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
      expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/\/$/);
      expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toMatch(/^https?:\/\//);

      await page.screenshot({ path: info.outputPath(`${path.replaceAll('/', '_') || '_home'}${width}.png`), fullPage: true });
    });
  }
}

test('titles and descriptions are unique across pages', async ({ page }) => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const path of PUBLIC_PAGES) {
    await page.goto(path);
    titles.add(await page.title());
    descriptions.add((await page.locator('meta[name="description"]').getAttribute('content')) ?? '');
  }
  expect(titles.size).toBe(PUBLIC_PAGES.length);
  expect(descriptions.size).toBe(PUBLIC_PAGES.length);
});

test('public pages never link to the dashboard', async ({ page }) => {
  for (const path of PUBLIC_PAGES) {
    await page.goto(path);
    expect(await page.locator('a[href^="/admin"]').count()).toBe(0);
  }
});
