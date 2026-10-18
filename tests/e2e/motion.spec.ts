import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Motion is progressive enhancement: with reduced motion everything is visible and usable without scrolling
// tricks, and the hero (LCP) is never hidden behind an entrance animation.
const PAGES = ['/', '/stays/dha-retreat/', '/stays/dha-retreat/gallery/', '/location/', '/book/'];

for (const path of PAGES) {
  test(`${path}: reduced motion shows everything, hero visible on first paint`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    // Every element that would animate in is fully shown with reduced motion, even off-screen.
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('.reveal-rise, .reveal-wipe, .reveal-wipe-right')]
        .filter((el) => {
          const s = getComputedStyle(el);
          return s.opacity !== '1' || (s.clipPath !== 'none' && s.clipPath !== 'inset(0px)');
        })
        .map((el) => el.className),
    );
    expect(hidden).toEqual([]);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  });
}

test('the hero headline and photo are not animated in on load', async ({ page }) => {
  await page.goto('/');
  const states = await page.evaluate(() => {
    const h1 = document.querySelector('h1')!;
    const img = document.querySelector<HTMLImageElement>('.hero img')!;
    return [getComputedStyle(h1).opacity, getComputedStyle(h1).animationName, getComputedStyle(img).opacity, getComputedStyle(img).animationName];
  });
  expect(states).toEqual(['1', 'none', '1', 'none']);
});

test('the priority (LCP) image on every page is never inside a reveal animation', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    const wrapped = await page.evaluate(() =>
      [...document.querySelectorAll('img[fetchpriority="high"]')].filter((img) => img.closest('.reveal-rise, .reveal-wipe, .reveal-wipe-right')).length,
    );
    expect(wrapped, path).toBe(0);
  }
});

test('room index links open the right floor and room on the plan', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Queen bedroom/ }).click();
  await expect(page).toHaveURL(/#room-queen$/);
  await expect(page.locator('#room-queen')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ground floor' })).toHaveAttribute('aria-pressed', 'true');
});

test('the time-aware hero picks a part of day before first paint', async ({ page }) => {
  await page.goto('/');
  const part = await page.evaluate(() => document.documentElement.dataset.daypart);
  expect(['morning', 'afternoon', 'evening', 'night']).toContain(part);
});

test('without JavaScript the home page and floor plan are complete', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.room-index li')).toHaveCount(6);
  await page.goto('/stays/dha-retreat/');
  for (const card of await page.locator('[data-room-card]').all()) await expect(card).toBeVisible();
  await ctx.close();
});
