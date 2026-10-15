import pg from 'pg';
const { Pool } = pg;

// Database configuration with primary and fallback support
// Direct host: db.nijlwdbbyrgxfxoazxbk.supabase.co (IPv6)
// Pooler host: aws-0-ap-northeast-1.pooler.supabase.com (IPv4/IPv6 compatible)
export const poolConfig = {
  user: 'postgres.nijlwdbbyrgxfxoazxbk',
  password: 'Kalyan@2024061960',
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000
};

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[Supabase DB Pool Error]:', err.message);
});

export async function initDatabase() {
  console.log('🔄 Initializing Supabase PostgreSQL tables...');
  const client = await pool.connect();
  try {
    // 1. Create app_users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.app_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(128) NOT NULL,
        preferred_location VARCHAR(100) DEFAULT 'Bengaluru',
        preferred_language VARCHAR(10) DEFAULT 'en',
        role VARCHAR(50) DEFAULT 'meteorologist',
        temp_unit VARCHAR(5) DEFAULT 'C',
        avatar_seed VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      );
      ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS temp_unit VARCHAR(5) DEFAULT 'C';
    `);

    // 2. Create user_sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_sessions (
        token VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);

    // 3. Create user_chat_messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_chat_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES public.app_users(id) ON DELETE CASCADE,
        user_email VARCHAR(255),
        session_id VARCHAR(100) NOT NULL,
        session_title VARCHAR(255) DEFAULT 'Weather Query',
        role VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        city VARCHAR(100) DEFAULT 'Live Location',
        lang VARCHAR(10) DEFAULT 'en',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create user_favorite_cities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_favorite_cities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
        city_name VARCHAR(120) NOT NULL,
        lat DOUBLE PRECISION,
        lon DOUBLE PRECISION,
        is_home BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, city_name)
      );
    `);

    // 5. Create user_search_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_search_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
        city_name VARCHAR(120) NOT NULL,
        query VARCHAR(150),
        temp_c DOUBLE PRECISION,
        condition_text VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Create indices for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(token);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_chat_user_id ON public.user_chat_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_chat_session_id ON public.user_chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorite_cities(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_search_user_id ON public.user_search_history(user_id);
    `);

    console.log('✅ Supabase PostgreSQL tables (app_users, user_sessions, user_chat_messages, user_favorite_cities, user_search_history) verified & ready!');
  } catch (err) {
    console.error('❌ Failed to initialize Supabase tables:', err.message);
    throw err;
  } finally {
    client.release();
  }
}
