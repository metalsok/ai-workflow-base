import { effect, signal } from '@angular/core';

// Own the common lifecycle; each page still chooses its request and empty/404 UI.
export function catalogRequest<T>(
  load: (signal: AbortSignal) => Promise<T> | null,
) {
  const result = signal<T | null>(null);
  const loading = signal(false);
  const error = signal('');
  const failure = signal<unknown>(null);
  const retries = signal(0);
  effect((cleanup) => {
    retries();
    const controller = new AbortController();
    cleanup(() => controller.abort());
    result.set(null);
    error.set('');
    failure.set(null);
    const request = load(controller.signal);
    loading.set(request !== null);
    if (!request) return;
    request
      .then((value) => {
        if (!controller.signal.aborted) result.set(value);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        failure.set(reason);
        error.set(
          reason instanceof Error
            ? reason.message
            : 'Cannot load game information. Please try again.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) loading.set(false);
      });
  });
  return {
    result,
    loading,
    error,
    failure,
    retry: () => retries.update((value) => value + 1),
  };
}
