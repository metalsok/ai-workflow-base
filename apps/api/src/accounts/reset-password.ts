import { hash } from 'argon2';
import type { DataSource } from 'typeorm';
import { Account } from './account.entity.js';

// CLI-only operation: lock the account so simultaneous resets increment safely.
export async function resetPassword(
  database: DataSource,
  email: string,
  password: string,
) {
  if (password.length < 12 || password.length > 128)
    throw new Error('Use a password of 12–128 characters.');
  const passwordHash = await hash(password);
  await database.transaction(async (manager) => {
    const accounts = manager.getRepository(Account);
    const account = await accounts.findOne({
      where: { email: email.trim().toLowerCase() },
      lock: { mode: 'pessimistic_write' },
    });
    if (!account) throw new Error('Account not found.');
    account.passwordHash = passwordHash;
    account.sessionVersion++;
    await accounts.save(account);
  });
}
