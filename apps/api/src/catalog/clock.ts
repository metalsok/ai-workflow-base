/** Returns "now" in epoch milliseconds. Tests swap it to move time forward. */
export type Clock = () => number;

/** Injection token: `@Inject(CLOCK) now: Clock`. */
export const CLOCK = Symbol('CLOCK');
