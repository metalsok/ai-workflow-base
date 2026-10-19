import { types } from 'pg';
import type { ValueTransformer } from 'typeorm';

// A timestamp without timezone is calendar text, not an instant. A Date round
// trip loses values in the Node process's daylight-saving gap. Keep PostgreSQL
// driver parsing and ORM parameter binding lossless for this legacy column.
class DatabaseTimestamp {
  constructor(readonly value: string) {}
  toPostgres() {
    return this.value;
  } // Bound value only; never SQL syntax.
}
export const timestampTransformer: ValueTransformer = {
  to: (value: string) => new DatabaseTimestamp(value),
  from: (value: DatabaseTimestamp) => value.value,
};
export const postgresTypes = {
  getTypeParser(oid: number, format?: 'text' | 'binary') {
    if (oid === types.builtins.TIMESTAMP && format !== 'binary')
      return (value: string) => new DatabaseTimestamp(value);
    return types.getTypeParser(oid, format);
  },
};
