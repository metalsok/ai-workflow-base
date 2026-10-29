#!/usr/bin/env bash
# Starts the Java API on port 3000 with the repository's .env, against its own database
# (game_tracker_java). Stop the Node API first: both use port 3000.
set -euo pipefail
cd "$(dirname "$0")"

if [[ -f ../../.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source ../../.env
  set +a
fi

# Same server and user as the Node API, different database.
export DATABASE_URL="${DATABASE_URL%/*}/game_tracker_java"

# Homebrew's openjdk@25 is not on the PATH by default.
if [[ -z "${JAVA_HOME:-}" ]] && command -v brew >/dev/null; then
  export JAVA_HOME="$(brew --prefix openjdk@25)/libexec/openjdk.jdk/Contents/Home"
fi

exec ./mvnw spring-boot:run
