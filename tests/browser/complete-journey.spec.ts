import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('the complete journey keeps saved status consistent across Discover, search, details, library, and accounts', async ({
  page,
}) => {
  await page.route('https://images.igdb.com/**', (route) => route.abort());
  const email = `journey-${randomUUID()}@example.com`;
  const password = 'complete-journey-passphrase';
  await page.goto('/register');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  const hero = page.getByRole('region', {
    name: "Baldur's Gate III",
    exact: true,
  });
  const popular = page.getByRole('region', {
    name: 'Popular now',
    exact: true,
  });
  const recent = page.getByRole('region', {
    name: 'Recent releases',
    exact: true,
  });
  const card = (region: typeof popular, title: string) =>
    region
      .getByRole('article')
      .filter({ has: page.getByRole('link', { name: title, exact: true }) });
  await hero.getByRole('button', { name: 'Want to play', exact: true }).click();
  await expect(hero.getByRole('status')).toHaveText('Saved · Want to play');
  await expect(
    card(popular, "Baldur's Gate III").getByRole('status'),
  ).toHaveText('Saved · Want to play');
  await expect(
    card(recent, "Baldur's Gate III").getByRole('status'),
  ).toHaveText('Saved · Want to play');
  await card(popular, 'Little-known game')
    .getByRole('button', { name: 'Want to play', exact: true })
    .click();
  await expect(
    card(popular, 'Little-known game').getByRole('status'),
  ).toHaveText('Saved · Want to play');
  await page.getByRole('searchbox', { name: 'Search games' }).fill('Baldur');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Search games', exact: true }),
  ).toBeVisible();
  const result = page.getByRole('article').filter({
    has: page.getByRole('link', { name: "Baldur's Gate III", exact: true }),
  });
  await expect(result.getByRole('status')).toHaveText('Saved · Want to play');
  await result
    .getByRole('link', { name: "Baldur's Gate III", exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: "Baldur's Gate III",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Saved · Want to play');
  await page.getByRole('link', { name: 'My Library', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  const updated = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().endsWith('/api/library/games/119171') &&
      response.ok(),
  );
  await page
    .getByLabel("Play status for Baldur's Gate III")
    .selectOption('playing');
  await updated;
  await page.getByRole('link', { name: 'Played', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('link', { name: 'Discover', exact: true }).click();
  await expect(hero.getByRole('status')).toHaveText('Saved · Playing');
  await expect(
    card(popular, "Baldur's Gate III").getByRole('status'),
  ).toHaveText('Saved · Playing');
  await page.getByRole('link', { name: 'My Library', exact: true }).click();
  await page
    .getByRole('button', { name: "Remove Baldur's Gate III", exact: true })
    .click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('link', { name: 'Discover', exact: true }).click();
  await expect(
    hero.getByRole('button', { name: 'Want to play', exact: true }),
  ).toBeEnabled();
  await expect(hero.getByRole('status')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.goto('/register');
  await page
    .getByLabel('Email', { exact: true })
    .fill(`second-${randomUUID()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    card(popular, 'Little-known game').getByRole('button', {
      name: 'Want to play',
      exact: true,
    }),
  ).toBeEnabled();
  await expect(
    card(popular, 'Little-known game').getByRole('status'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    card(popular, 'Little-known game').getByRole('status'),
  ).toHaveText('Saved · Want to play');
  await expect(
    hero.getByRole('button', { name: 'Want to play', exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
