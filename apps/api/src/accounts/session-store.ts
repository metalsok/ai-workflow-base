import session, { type SessionData } from 'express-session';
import { LessThan, type Repository } from 'typeorm';
import { StoredSession } from './session.entity.js';

// The fields this app keeps in a session.
declare module 'express-session' {
  interface SessionData {
    accountId: string;
    /** The account's session_version when the user signed in. (Optional only
     * to match the identical declaration in apps/api while both exist.) */
    accountVersion?: number;
    /** Epoch milliseconds; the session stops working after this. */
    expiresAt: number;
  }
}

type Callback = (error?: unknown) => void;

/**
 * Tells express-session how to keep sessions in PostgreSQL, so that users
 * stay signed in when the server restarts. express-session calls these
 * methods; we never call them ourselves.
 */
export class TypeOrmSessionStore extends session.Store {
  constructor(private readonly sessions: Repository<StoredSession>) {
    super();
  }

  get(
    sid: string,
    callback: (error: unknown, data?: SessionData | null) => void,
  ) {
    this.sessions.findOneBy({ sid }).then((row) => {
      const live = row && row.sess.expiresAt > Date.now();
      callback(null, live ? row.sess : null);
    }, callback);
  }

  set(sid: string, data: SessionData, callback?: Callback) {
    const expire = new Date(data.expiresAt);
    this.sessions
      .upsert({ sid, sess: data, expire }, ['sid'])
      // Housekeeping: whenever someone signs in, forget expired sessions.
      .then(() => this.sessions.delete({ expire: LessThan(new Date()) }))
      .then(() => callback?.(), callback);
  }

  destroy(sid: string, callback?: Callback) {
    this.sessions.delete({ sid }).then(() => callback?.(), callback);
  }
}
