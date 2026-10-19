import { computed } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';

// Keep page presentation independent of Angular's resource status/value rules.
export function catalogRequest<T, P>(
  params: () => P | undefined,
  load: (params: P) => Observable<T>,
) {
  const request = rxResource({
    params,
    stream: ({ params }) => load(params),
  });
  return {
    // Hide the old result during reload, matching the existing clear-on-retry UI.
    result: computed(() =>
      !request.isLoading() && request.hasValue() ? request.value() : null,
    ),
    loading: request.isLoading,
    failure: request.error,
    error: computed(() => {
      const failure = request.error();
      return failure ? failure.message : '';
    }),
    retry: () => request.reload(),
  };
}
