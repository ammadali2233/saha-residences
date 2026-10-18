import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { WIDTHS } from '../../playwright.config';

// Pages reachable without signing in. Signed-in screens get the same checks from Phase 4.
const PAGES = ['/admin/login/'];

for (const width of WIDTHS) {
  for (const path of PAGES) {
    test(`${path} at ${width}px: WCAG 2.2 AA, no sideways scroll, noindex`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(path);
      expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');

      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);

      // Labelled controls meet the 44px touch minimum.
      for (const box of await page.locator('input:not([type=hidden]), button').evaluateAll((els) =>
        els.map((e) => e.getBoundingClientRect().height),
      )) {
        expect(box).toBeGreaterThanOrEqual(44);
      }

      await page.screenshot({ path: info.outputPath(`${path.replaceAll('/', '_')}${width}.png`), fullPage: true });
    });
  }
}

test('every admin route redirects to sign-in when signed out', async ({ request }) => {
  for (const path of ['/admin/', '/admin/mfa/']) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status()).toBe(303);
    expect(res.headers()['location']).toBe('/admin/login/');
    expect(res.headers()['x-robots-tag']).toBe('noindex, nofollow');
  }
});
