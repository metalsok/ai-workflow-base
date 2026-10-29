import { QueryFailedError } from 'typeorm';
import { setTimeout } from 'node:timers/promises';

export function postgresError(error: unknown): {
  code?: string;
  constraint?: string;
} {
  return error instanceof QueryFailedError ? error.driverError : {};
}
// The caller supplies the whole transaction, so every read is repeated on retry.
// Unique retries are restricted to the absent counter's primary key.
export async function retryTransaction<T>(
  work: () => Promise<T>,
  initializationConstraint?: string,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await work();
    } catch (error) {
      const { code, constraint } = postgresError(error);
      const retryable =
        code === '40001' ||
        code === '40P01' ||
        (code === '23505' &&
          initializationConstraint !== undefined &&
          constraint === initializationConstraint);
      if (!retryable || attempt >= 11) throw error;
      await setTimeout(Math.min(2 ** attempt, 64) + Math.random() * 10);
    }
  }
}
