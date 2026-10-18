import { expect, test } from '@playwright/test';

// End-to-end booking request against the local database (sample data). Uses keyboard where it matters.
test('a guest can pick dates, see the price in PKR, send a request and continue on WhatsApp', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/book/');
  await expect(page.getByText('Choose your dates to see the full price.')).toBeVisible();

  // Next month, days 10 to 13: clear of the sample bookings in the seed.
  await page.getByRole('button', { name: 'Next month' }).click();
  await page.getByRole('button', { name: 'Next month' }).click();
  const days = page.locator('.days button[aria-disabled="false"]');
  await days.nth(9).click();
  await days.nth(12).click();
  await expect(page.locator('.lines .total')).toContainText('USD 180');

  // 8 guests: two extra beddings, shown in PKR.
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'More guests' }).click();
  await expect(page.getByText('2 extra beddings for guests 7 and 8.')).toBeVisible();
  await page.getByLabel('PKR').check();
  await expect(page.locator('.lines .total')).toContainText('PKR 56,400');
  await expect(page.locator('.lines .deposit')).toContainText('PKR 11,280');

  await page.getByLabel('Full name').fill('Playwright Guest');
  await page.getByLabel('WhatsApp number').fill(`0300 ${String(Date.now()).slice(-7)}`);
  await page.getByRole('button', { name: /Send request/ }).click();

  await expect(page).toHaveURL(/\/book\/thanks\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Thank you, Playwright');
  await expect(page.getByText(/^Request SR-[0-9A-F]{6}$/)).toBeVisible();
  const wa = await page.getByRole('link', { name: 'Continue on WhatsApp' }).getAttribute('href');
  expect(wa).toMatch(/^https:\/\/wa\.me\/923205361616\?text=/);
  const text = decodeURIComponent(wa!.split('text=')[1]);
  expect(text).toContain('8 guests');
  expect(text).not.toContain('Playwright'); // no personal data in the link
});

test('booked dates cannot be chosen and the calendar works by keyboard', async ({ page }) => {
  await page.goto('/book/');
  // Sample booking 1 to 7 November 2026 (seed): those nights are marked booked.
  const nov3 = page.getByRole('button', { name: /^Tuesday 3 November 2026/ });
  while (!(await nov3.isVisible())) await page.getByRole('button', { name: 'Next month' }).click();
  await expect(nov3).toHaveAttribute('aria-disabled', 'true');
  await expect(nov3).toHaveAccessibleName(/booked/);

  await nov3.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: /^Wednesday 4 November 2026/ })).toBeFocused();
});

test('without dates, sending a request explains what to do', async ({ page }) => {
  await page.goto('/book/');
  await page.getByLabel('Full name').fill('Test');
  await page.getByLabel('WhatsApp number').fill('+923001234567');
  await page.getByRole('button', { name: /Send request/ }).click();
  await expect(page.getByRole('alert')).toContainText('choose your check-in and check-out dates');
});
