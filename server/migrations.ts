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
  {
    // the parents' Telegram notifications (stage 9): off until the parent turns them on
    version: 2,
    statements: [
      `CREATE TABLE IF NOT EXISTS notification_prefs (
        user_id TEXT PRIMARY KEY,
        chat_id TEXT,
        weekly INTEGER NOT NULL DEFAULT 0,
        events INTEGER NOT NULL DEFAULT 0,
        language TEXT NOT NULL DEFAULT 'uz',
        link_hash TEXT,
        link_expires_at INTEGER,
        last_report_week TEXT,
        last_event_day TEXT,
        last_nudge_week TEXT,
        milestone INTEGER,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS notification_prefs_chat ON notification_prefs(chat_id)`,
      `CREATE INDEX IF NOT EXISTS notification_prefs_link ON notification_prefs(link_hash)`,
      // a short hash of (account, "browser, system") only: never an IP or the full user agent
      `CREATE TABLE IF NOT EXISTS user_devices (
        user_id TEXT NOT NULL,
        device_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, device_hash)
      ) WITHOUT ROWID`,
    ],
  },
  {
    // the bot's menu (stage 9.1): security alerts switch, /fikr (feedback), "this was not me"
    version: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS bot_prefs (
        user_id TEXT PRIMARY KEY,
        security INTEGER NOT NULL DEFAULT 1,
        feedback_until INTEGER,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        text TEXT NOT NULL,
        language TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS feedback_user ON feedback(user_id, created_at)`,
      // one row per new-device message: its "this was not me" button works once, for a week
      `CREATE TABLE IF NOT EXISTS device_alerts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        used_at INTEGER
      )`,
      `CREATE INDEX IF NOT EXISTS device_alerts_user ON device_alerts(user_id)`,
    ],
  },
]
