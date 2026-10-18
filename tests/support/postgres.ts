import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { setTimeout } from 'node:timers/promises';
import { Client } from 'pg';

export async function startPostgres() {
  if (process.env.TEST_DATABASE_URL) {
    return { url: process.env.TEST_DATABASE_URL, stop: async () => {} };
  }
  // Use only the packaged binaries: the embedded-postgres lifecycle wrapper
  // installs an exit hook that can hide node:test's nonzero failure status.
  const binaries: { initdb: string; postgres: string } = await import(
    `@embedded-postgres/${process.platform}-${process.arch}`
  );
  const directory = await mkdtemp(join(tmpdir(), 'game-tracker-pg-'));
  const port = await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('No port');
      server.close(() => resolve(address.port));
    });
  });
  await promisify(execFile)(binaries.initdb, [
    '-D',
    directory,
    '-U',
    'tester',
    '--auth=trust',
    '--locale=C',
  ]);
  const child = spawn(
    binaries.postgres,
    ['-D', directory, '-h', '127.0.0.1', '-p', String(port), '-k', directory],
    { stdio: 'ignore' },
  );
  let spawnError: Error | undefined;
  child.on('error', (error) => {
    spawnError = error;
  });
  const url = `postgresql://tester@127.0.0.1:${port}/postgres`;
  const stop = async () => {
    if (child.exitCode === null && child.signalCode === null && child.pid) {
      const exited = once(child, 'exit');
      child.kill('SIGINT');
      await exited;
    }
    await rm(directory, { recursive: true, force: true });
  };
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (spawnError) throw spawnError;
      const client = new Client({ connectionString: url });
      try {
        await client.connect();
        await client.end();
        return { url, stop };
      } catch {
        await client.end();
        await setTimeout(50);
      }
    }
    throw new Error('Disposable PostgreSQL did not start');
  } catch (error) {
    await stop();
    throw error;
  }
}
