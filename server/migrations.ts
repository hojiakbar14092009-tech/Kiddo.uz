/**
 * Turso ("kiddo" database) schema. Migrations only ever ADD tables, columns or indexes;
 * nothing here drops or rewrites data. Applied in order, once (schema_migrations).
 * What each table holds: docs/architecture/turso.md.
 * Times are Unix milliseconds; ids are random strings made on the server.
 */
export const MIGRATIONS: { version: number; statements: string[] }[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        google_sub TEXT UNIQUE,
        phone TEXT UNIQUE,
        telegram_id TEXT UNIQUE,
        name TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
      `CREATE TABLE IF NOT EXISTS auth_codes (
        id TEXT PRIMARY KEY,
        channel TEXT NOT NULL,
        target TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        used_at INTEGER
      )`,
      `CREATE INDEX IF NOT EXISTS auth_codes_target ON auth_codes(channel, target, created_at)`,
      `CREATE TABLE IF NOT EXISTS telegram_logins (
        token_hash TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        status TEXT NOT NULL,
        telegram_user_id TEXT,
        chat_id TEXT,
        language TEXT,
        sends INTEGER NOT NULL DEFAULT 0,
        last_sent_at INTEGER,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS telegram_logins_user ON telegram_logins(telegram_user_id, created_at)`,
      `CREATE TABLE IF NOT EXISTS user_state (
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        rev INTEGER NOT NULL,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, key)
      ) WITHOUT ROWID`,
      `CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        count INTEGER NOT NULL
      ) WITHOUT ROWID`,
      `CREATE TABLE IF NOT EXISTS subscriptions (
        user_id TEXT PRIMARY KEY,
        plan TEXT NOT NULL,
        source TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        plan TEXT NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        provider_ref TEXT,
        created_at INTEGER NOT NULL,
        UNIQUE (user_id, idempotency_key)
      )`,
      `CREATE INDEX IF NOT EXISTS payments_user ON payments(user_id, created_at)`,
    ],
  },
]
