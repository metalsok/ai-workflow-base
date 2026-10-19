import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('a tester saves from search and details, changes status, uses Played, removes and signs in again', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://images.igdb.com/**', (route) => route.abort());
  const email = `library-${randomUUID()}@example.com`;
  const password = 'long-library-browser-passphrase';
  await page.goto('/register');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await page.getByRole('link', { name: 'My Library', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your library is waiting', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('searchbox', { name: 'Search games' })
    .fill(`Library ${info.project.name}`);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const first = page.getByRole('article').filter({
    has: page.getByRole('link', { name: "Baldur's Gate III", exact: true }),
  });
  await first
    .getByRole('button', { name: 'Want to play', exact: true })
    .click();
  await expect(first.getByRole('status')).toContainText('Saved');
  await page
    .getByRole('link', { name: "Baldur's Gate III", exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: "Baldur's Gate III",
      level: 1,
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Want to play', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved');
  await page.getByRole('link', { name: 'My Library', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page
    .getByLabel("Play status for Baldur's Gate III")
    .selectOption('playing');
  await expect(
    page.getByLabel("Play status for Baldur's Gate III"),
  ).toHaveValue('playing');
  await page.getByRole('link', { name: 'Played', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page
    .getByLabel("Play status for Baldur's Gate III")
    .selectOption('completed');
  await expect(
    page.getByLabel("Play status for Baldur's Gate III"),
  ).toHaveValue('completed');
  await page.getByRole('link', { name: 'Want to play', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'No games in this view', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Played', exact: true }).click();
  await page.reload();
  await expect(
    page.getByLabel("Play status for Baldur's Gate III"),
  ).toHaveValue('completed');
  await page.screenshot({
    path: info.outputPath('library.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('link', { name: 'My Library', exact: true }).click();
  await expect(
    page.getByLabel("Play status for Baldur's Gate III"),
  ).toHaveValue('completed');
  await page
    .getByRole('button', { name: "Remove Baldur's Gate III", exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your library is waiting', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
