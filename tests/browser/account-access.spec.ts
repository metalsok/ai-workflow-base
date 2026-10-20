import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('a tester can register, see their identity, sign out, and sign in again', async ({
  page,
}) => {
  const email = `tester-${randomUUID()}@example.com`;
  const password = 'a-long-browser-test-passphrase';
  await page.goto('/');
  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(
    page.getByRole('heading', { name: 'Create your account', exact: true }),
  ).toBeVisible();
  const createAccount = page.getByRole('button', {
    name: 'Create account',
    exact: true,
  });
  await expect(createAccount).toBeDisabled();
  await page.getByLabel('Email', { exact: true }).fill('invalid-email');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await expect(createAccount).toBeDisabled();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('too-short');
  await expect(createAccount).toBeDisabled();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
    'maxlength',
    '128',
  );
  await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute(
    'maxlength',
    '254',
  );

  await page.getByLabel('Password', { exact: true }).fill(password);
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Discover', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'My Library', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'My Library', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Welcome back', exact: true }),
  ).toBeVisible();
  await page.goto('/library');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page
    .getByLabel('Password', { exact: true })
    .fill('an-incorrect-passphrase');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Email or password is incorrect.',
  );
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Discover', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Welcome back', exact: true }),
  ).toBeVisible();
});
