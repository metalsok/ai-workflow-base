import { loadRuntimeSecrets } from '../runtime-config.js';
import { createDataSource } from '../database/data-source.js';
import { assertMigrationsApplied } from '../database/migrate.js';
import { resetPassword } from './reset-password.js';

async function hiddenLine(prompt: string): Promise<string> {
  process.stderr.write(prompt);
  const wasRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      process.stderr.write('\n');
    };
    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (character === '\u0003' || character === '\u0004') {
          cleanup();
          reject(new Error('Cancelled.'));
          return;
        }
        if (character === '\u007f' || character === '\b')
          value = Array.from(value).slice(0, -1).join('');
        else if (value.length < 129) value += character;
      }
    };
    process.stdin.on('data', onData);
  });
}
async function passwordInput() {
  if (process.stdin.isTTY) {
    const password = await hiddenLine('New password (hidden): ');
    if (password !== (await hiddenLine('Confirm password (hidden): ')))
      throw new Error('Passwords do not match.');
    return password;
  }
  let value = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    value += String(chunk);
    if (Buffer.byteLength(value) > 1024)
      throw new Error('Password input is too long.');
  }
  value = value.replace(/\r?\n$/, '');
  if (/[\r\n]/.test(value))
    throw new Error('Provide one password line on standard input.');
  return value;
}
async function main() {
  loadRuntimeSecrets();
  if (process.argv.length !== 3)
    throw new Error(
      'Usage: account:reset -- email@example.com (password is read privately from stdin).',
    );
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const password = await passwordInput();
  const database = await createDataSource(
    process.env.DATABASE_URL,
  ).initialize();
  try {
    await assertMigrationsApplied(database);
    await resetPassword(database, process.argv[2]!, password);
    console.log(
      'Password changed. All previous sessions for this account are revoked.',
    );
  } finally {
    await database.destroy();
  }
}
main().catch((error) => {
  // Only explicit input errors are shown. Driver errors can contain secrets.
  const known = new Set([
    'Use a password of 12–128 characters.',
    'Account not found.',
    'Passwords do not match.',
    'Cancelled.',
    'Password input is too long.',
    'Provide one password line on standard input.',
    'DATABASE_URL is required.',
  ]);
  const message =
    error instanceof Error &&
    (known.has(error.message) || error.message.startsWith('Usage:'))
      ? error.message
      : 'Password reset failed. Check database access and apply migrations first.';
  console.error(message);
  process.exitCode = 1;
});
