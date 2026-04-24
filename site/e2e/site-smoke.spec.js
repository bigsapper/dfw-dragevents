import { expect, test } from '@playwright/test';

test('static site smoke flow renders list and detail pages', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/DFW Drag Racing Events/);
  await expect(page.locator('nav')).toContainText('dfw-dragevents');

  await page.goto('/events.html');
  const cards = page.locator('#events-list .card');
  await expect(cards.first()).toBeVisible();
  await expect(cards.first().locator('.card-title')).not.toHaveText('');

  await cards.first().locator('.card-link').click();
  await expect(page).toHaveURL(/event\.html\?id=/);
  await expect(page.locator('#ev-title')).not.toHaveText('Event');
  await expect(page.locator('#ev-track')).not.toHaveText('');
  await expect(page.locator('#download-calendar')).toBeVisible();
});
