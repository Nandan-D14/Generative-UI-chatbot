import type { Env } from '../types';

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL REFERENCES chats(id),
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    text TEXT NOT NULL,
    render_type TEXT CHECK(render_type IN ('none', 'html', 'react')),
    component_name TEXT,
    component_props TEXT,
    code TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL,
    r2_key TEXT NOT NULL,
    chunk_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processing' CHECK(status IN ('processing', 'indexed', 'failed')),
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS components (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    render_type TEXT NOT NULL CHECK(render_type IN ('html', 'react')),
    r2_key TEXT NOT NULL,
    props_schema TEXT,
    use_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    chat_id TEXT REFERENCES chats(id),
    message_id TEXT REFERENCES messages(id),
    title TEXT NOT NULL,
    render_type TEXT NOT NULL,
    code TEXT NOT NULL,
    thumbnail_r2_key TEXT,
    created_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id)',
  'CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_components_user ON components(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_artifacts_user ON artifacts(user_id)'
];

let schemaInitPromise: Promise<void> | null = null;

export function ensureSchema(env: Env): Promise<void> {
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      for (const statement of schemaStatements) {
        await env.DB.prepare(statement.replace(/\s+/g, ' ').trim()).run();
      }
    })().catch((error) => {
      schemaInitPromise = null;
      throw error;
    });
  }

  return schemaInitPromise;
}
