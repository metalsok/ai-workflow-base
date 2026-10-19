CREATE TABLE catalog_games (
  id bigint PRIMARY KEY,
  metadata jsonb NOT NULL,
  fetched_at timestamptz NOT NULL,
  eligible boolean NOT NULL DEFAULT true
);
CREATE TABLE catalog_searches (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL
);
CREATE INDEX catalog_searches_fetched_at_idx ON catalog_searches (fetched_at);
