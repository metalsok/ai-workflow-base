import session, { type SessionData } from 'express-session';
import { LessThan, MoreThanOrEqual, type Repository } from 'typeorm';
import { StoredSession } from './session.entity.js';

type Done = (error?: unknown) => void;
export class OrmSessionStore extends session.Store {
  private readonly timer: NodeJS.Timeout;
  private readonly pending = new Set<Promise<unknown>>();
  constructor(
    private readonly sessions: Repository<StoredSession>,
    private readonly timezone: string,
  ) {
    super();
    this.timer = setInterval(() => {
      // No session contents or database errors are logged by the adapter.
      this.track(
        this.sessions.delete({
          expire: LessThan(this.databaseDate(Date.now())),
        }),
      ).catch(() => {});
    }, 60_000);
    this.timer.unref();
  }
  // The historical timestamp has no zone: connect-pg-simple stored the
  // database TimeZone's wall time, while pg decodes timestamp in the process TZ.
  // Represent that same wall time in the process zone for ORM reads/writes.
  private databaseDate(milliseconds: number): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(milliseconds);
    const value = (name: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === name)!.value);
    return new Date(
      value('year'),
      value('month') - 1,
      value('day'),
      value('hour'),
      value('minute'),
      value('second'),
    );
  }
  private track<T>(operation: Promise<T>): Promise<T> {
    this.pending.add(operation);
    operation.then(
      () => this.pending.delete(operation),
      () => this.pending.delete(operation),
    );
    return operation;
  }
  get(
    sid: string,
    callback: (error: unknown, session?: SessionData | null) => void,
  ) {
    this.track(
      this.sessions.findOneBy({
        sid,
        expire: MoreThanOrEqual(
          this.databaseDate(Math.floor(Date.now() / 1000) * 1000),
        ),
      }),
    ).then(
      (row) => callback(null, row?.sess ?? null),
      (error) => callback(error),
    );
  }
  set(sid: string, sess: SessionData, callback?: Done) {
    // Match connect-pg-simple's whole-second ceiling; account expiresAt remains
    // the authoritative absolute lifetime, even when Express resets cookie age.
    const expires =
      sess.expiresAt ??
      (sess.cookie.expires
        ? new Date(sess.cookie.expires).valueOf()
        : Date.now() + 86_400_000);
    const expire = this.databaseDate(Math.ceil(expires / 1000) * 1000);
    this.track(this.sessions.upsert({ sid, sess, expire }, ['sid'])).then(
      () => callback?.(),
      (error) => callback?.(error),
    );
  }
  destroy(sid: string, callback?: Done) {
    this.track(this.sessions.delete({ sid })).then(
      () => callback?.(),
      (error) => callback?.(error),
    );
  }
  touch(_sid: string, _sess: SessionData, callback?: Done) {
    callback?.();
  }
  async close() {
    clearInterval(this.timer);
    await Promise.allSettled([...this.pending]);
  }
}
