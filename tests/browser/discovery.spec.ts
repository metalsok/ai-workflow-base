import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('Discover shows a cinematic spotlight and honest feed shelves with usable details and image fallbacks', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://images.igdb.com/**', (route) => route.abort());
  await page.goto('/register');
  await page
    .getByLabel('Email', { exact: true })
    .fill(`discover-${randomUUID()}@example.com`);
  await page
    .getByLabel('Password', { exact: true })
    .fill('long-discovery-browser-passphrase');
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Discover', exact: true }),
  ).toBeVisible();
  const popular = page.getByRole('region', {
    name: 'Popular now',
    exact: true,
  });
  const recent = page.getByRole('region', {
    name: 'Recent releases',
    exact: true,
  });
  await expect(
    popular.getByRole('link', { name: "Baldur's Gate III", exact: true }),
  ).toBeVisible();
  await expect(popular).toContainText('IGDB page visits');
  await expect(popular).toContainText('Updated');
  await expect(recent).toContainText('90 days');
  await expect(
    recent.getByRole('link', { name: 'Little-known game', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: "Baldur's Gate III",
      level: 2,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    popular.getByText('No cover available', { exact: true }),
  ).toHaveCount(2);
  await page.getByRole('link', { name: 'Explore game', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', {
      name: "Baldur's Gate III",
      level: 1,
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Discover', exact: true }).click();
  await recent
    .getByRole('link', { name: 'Little-known game', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Little-known game',
      level: 1,
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Discover', exact: true }).click();
  await expect(
    popular.getByRole('link', { name: "Baldur's Gate III", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    popular.getByRole('link', { name: "Baldur's Gate III", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath('discovery.png'),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
