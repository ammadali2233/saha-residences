import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Redesign concept prototypes: accessible, no sideways scroll, never indexed, and usable with reduced motion.
const CONCEPTS = ['/concepts/a/', '/concepts/b/', '/concepts/c/'];

for (const width of [390, 1440]) {
  for (const path of CONCEPTS) {
    for (const motion of ['no-preference', 'reduce'] as const) {
      test(`${path} at ${width}px, motion ${motion}`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: motion });
        await page.setViewportSize({ width, height: 900 });
        const res = await page.goto(path);
        await page.waitForLoadState('networkidle');
        expect(await page.locator('meta[name="robots"]').getAttribute('content')).toBe('noindex');
        // Hero headline and image are visible at first paint (never behind an entrance animation).
        await expect(page.locator('h1')).toBeVisible();
        expect(await page.locator('h1').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
        // Scroll through so scroll-linked states settle, then audit.
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } });
        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)).toEqual([]);
        expect(res?.ok()).toBeTruthy();
      });
    }
  }
}

test('floor plan works by keyboard and switches floors', async ({ page }) => {
  await page.goto('/concepts/a/');
  await page.getByRole('button', { name: 'Ground floor' }).click();
  await page.getByRole('button', { name: 'Queen bedroom' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#room-queen')).toBeVisible();
  await expect(page.locator('#room-master')).toBeHidden();
});

test('without JavaScript every room is listed', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/concepts/a/');
  await expect(page.locator('[data-room-card]')).toHaveCount(7);
  for (const card of await page.locator('[data-room-card]').all()) await expect(card).toBeVisible();
  await ctx.close();
});
