import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('a signed-in tester can search, page, open details, and recover from empty or failed results', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (/Content Security Policy/.test(message.text()))
      errors.push(message.text());
  });
  await page.route('https://images.igdb.com/**', (route) =>
    route.fulfill({
      contentType: 'image/gif',
      body: Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
        'base64',
      ),
    }),
  );
  await page.goto('/register');
  await page
    .getByRole('heading', { name: 'Create your account', exact: true })
    .waitFor();
  await page
    .getByLabel('Email', { exact: true })
    .fill(`catalog-${randomUUID()}@example.com`);
  await page
    .getByLabel('Password', { exact: true })
    .fill('long-catalog-browser-passphrase');
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Discover', exact: true }),
  ).toBeVisible();
  const search = async (query: string) => {
    await page.getByRole('searchbox', { name: 'Search games' }).fill(query);
    await page.getByRole('button', { name: 'Search', exact: true }).click();
  };
  const query = `Baldur's Gate 3 ${info.project.name}`;
  await search(query);
  await expect(page.getByRole('status')).toContainText('Searching');
  await page
    .getByRole('link', { name: "Baldur's Gate III", exact: true })
    .waitFor();
  await page.getByRole('link', { name: 'Next page', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Page two game', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Previous page', exact: true }).click();
  await page
    .getByRole('link', { name: "Baldur's Gate III", exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: "Baldur's Gate III",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  await expect(
    page.getByText('Gather your party and return to the Forgotten Realms.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText('First release date', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Aug 3, 2023', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Role-playing (RPG)', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Larian Studios', { exact: true })).toHaveCount(
    2,
  );
  await page.reload();
  await expect(
    page.getByRole('heading', {
      name: "Baldur's Gate III",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  await search(`Unknown ${info.project.name}`);
  await page
    .getByRole('link', { name: 'Little-known game', exact: true })
    .click();
  await expect(
    page.getByText('No cover available', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Summary unavailable.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Unknown', { exact: true })).toBeVisible();
  await expect(page.getByText('Unavailable', { exact: true })).toHaveCount(3);
  await search(`Empty ${info.project.name}`);
  await expect(
    page.getByRole('heading', { name: 'No games found', exact: true }),
  ).toBeVisible();
  await search(`Retry ${info.project.name}`);
  await expect(page.getByRole('alert')).toContainText(
    'temporarily unavailable',
  );
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(
    page.getByRole('link', { name: "Baldur's Gate III", exact: true }),
  ).toBeVisible();
  await page.goto('/games/999999');
  await expect(
    page.getByRole('heading', { name: 'Game not found', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
