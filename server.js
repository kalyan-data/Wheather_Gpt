import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { pool, initDatabase } from './db.js';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env variables if present
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        if (!process.env[k.trim()]) {
          process.env[k.trim()] = v.join('=').trim();
        }
      }
    }
  }
} catch (e) {}

const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';

const app = express();
const PORT = process.env.PORT || 5173;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(__dirname));

// Helper: Hash password with salt
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// Helper: Verify password
function verifyPassword(password, storedHash, salt) {
  const hash = hashPassword(password, salt);
  const hashBuffer = Buffer.from(hash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');
  if (hashBuffer.length !== storedBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, storedBuffer);
}

// Helper: Extract Bearer token
function getBearerToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;
}

// Helper: Authenticate token middleware
async function authenticateUser(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication token required' });
  }

  try {
    const sessionRes = await pool.query(
      `SELECT s.token, s.expires_at, u.id, u.name, u.email, u.preferred_location, u.preferred_language, u.role, u.created_at, u.last_login
       FROM public.user_sessions s
       JOIN public.app_users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Session expired or invalid' });
    }

    req.user = sessionRes.rows[0];
    req.token = token;
    next();
  } catch (err) {
    console.error('Auth check error:', err);
    res.status(500).json({ success: false, error: 'Authentication service error' });
  }
}

// --- API ROUTES ---

// Health Check
app.get('/api/db/health', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT NOW() as db_time, 
             version() as pg_version,
             (SELECT COUNT(*) FROM public.app_users) as total_users
    `);
    res.json({
      status: 'connected',
      engine: 'Supabase PostgreSQL',
      pooler: 'aws-0-ap-northeast-1.pooler.supabase.com',
      database: 'postgres',
      stats: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Register User
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, preferred_location, preferred_language, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.includes('@') || cleanEmail.length < 5) {
    return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
  }

  try {
    // Check if user already exists
    const existing = await pool.query('SELECT id FROM public.app_users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists. Please sign in.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const location = preferred_location || 'Bengaluru';
    const language = preferred_language || 'en';
    const userRole = role || 'meteorologist';

    // Insert user
    const insertRes = await pool.query(
      `INSERT INTO public.app_users 
       (name, email, password_hash, salt, preferred_location, preferred_language, role, last_login)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, name, email, preferred_location, preferred_language, role, created_at, last_login`,
      [name.trim(), cleanEmail, passwordHash, salt, location, language, userRole]
    );

    const newUser = insertRes.rows[0];

    // Create session token (30 days validity)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO public.user_sessions (token, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [token, newUser.id, expiresAt]
    );

    console.log(`[Supabase Auth] Registered new user: ${cleanEmail} (ID: ${newUser.id})`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully in Supabase PostgreSQL!',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Database registration error: ' + err.message });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const userRes = await pool.query(
      `SELECT id, name, email, password_hash, salt, preferred_location, preferred_language, role, created_at
       FROM public.app_users 
       WHERE email = $1`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const user = userRes.rows[0];
    const isMatch = verifyPassword(password, user.password_hash, user.salt);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Update last_login
    await pool.query('UPDATE public.app_users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Issue new session token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO public.user_sessions (token, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [token, user.id, expiresAt]
    );

    console.log(`[Supabase Auth] User logged in: ${cleanEmail} (ID: ${user.id})`);

    const { password_hash, salt, ...safeUser } = user;

    res.json({
      success: true,
      message: 'Welcome back! Authenticated with Supabase PostgreSQL.',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Database authentication error: ' + err.message });
  }
});

// Get Current User Profile (/api/auth/me)
app.get('/api/auth/me', authenticateUser, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Update Preferences
app.post('/api/user/preferences', authenticateUser, async (req, res) => {
  const { preferred_location, preferred_language } = req.body;

  try {
    const updateRes = await pool.query(
      `UPDATE public.app_users 
       SET preferred_location = COALESCE($1, preferred_location),
           preferred_language = COALESCE($2, preferred_language)
       WHERE id = $3
       RETURNING id, name, email, preferred_location, preferred_language, role`,
      [preferred_location, preferred_language, req.user.id]
    );

    res.json({
      success: true,
      message: 'Preferences updated in Supabase PostgreSQL',
      user: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Preferences update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
  const token = getBearerToken(req);
  if (token) {
    try {
      await pool.query('DELETE FROM public.user_sessions WHERE token = $1', [token]);
    } catch (e) {
      console.error('Logout cleanup error:', e);
    }
  }
  res.json({ success: true, message: 'Signed out successfully' });
});

// --- USER FAVORITE CITIES ENDPOINTS (Supabase public.user_favorite_cities) ---

// Get Favorite Cities
app.get('/api/user/favorites', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, city_name, lat, lon, is_home, created_at
       FROM public.user_favorite_cities
       WHERE user_id = $1
       ORDER BY is_home DESC, created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, favorites: result.rows });
  } catch (err) {
    console.error('Fetch favorites error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add Favorite City
app.post('/api/user/favorites', authenticateUser, async (req, res) => {
  const { city_name, lat, lon, is_home } = req.body;
  if (!city_name) {
    return res.status(400).json({ success: false, error: 'city_name is required' });
  }

  try {
    const insertRes = await pool.query(
      `INSERT INTO public.user_favorite_cities (user_id, city_name, lat, lon, is_home, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, city_name) 
       DO UPDATE SET lat = EXCLUDED.lat, lon = EXCLUDED.lon, is_home = EXCLUDED.is_home, created_at = NOW()
       RETURNING id, city_name, lat, lon, is_home, created_at`,
      [req.user.id, city_name.trim(), lat || null, lon || null, Boolean(is_home)]
    );
    res.status(201).json({ success: true, favorite: insertRes.rows[0] });
  } catch (err) {
    console.error('Add favorite error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Remove Favorite City
app.delete('/api/user/favorites/:cityName', authenticateUser, async (req, res) => {
  const { cityName } = req.params;
  try {
    await pool.query(
      `DELETE FROM public.user_favorite_cities WHERE user_id = $1 AND LOWER(city_name) = LOWER($2)`,
      [req.user.id, decodeURIComponent(cityName).trim()]
    );
    res.json({ success: true, message: 'City removed from favorites' });
  } catch (err) {
    console.error('Delete favorite error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- USER SEARCH HISTORY ENDPOINTS (Supabase public.user_search_history) ---

// Get User Search History
app.get('/api/user/searches', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, city_name, query, temp_c, condition_text, created_at
       FROM public.user_search_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [req.user.id]
    );
    res.json({ success: true, searches: result.rows });
  } catch (err) {
    console.error('Fetch searches error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add Search Record
app.post('/api/user/searches', authenticateUser, async (req, res) => {
  const { city_name, query, temp_c, condition_text } = req.body;
  if (!city_name) {
    return res.status(400).json({ success: false, error: 'city_name is required' });
  }

  try {
    const insertRes = await pool.query(
      `INSERT INTO public.user_search_history (user_id, city_name, query, temp_c, condition_text, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, city_name, query, temp_c, condition_text, created_at`,
      [req.user.id, city_name.trim(), query || city_name.trim(), temp_c || null, condition_text || null]
    );
    res.status(201).json({ success: true, search: insertRes.rows[0] });
  } catch (err) {
    console.error('Add search record error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear User Search History
app.delete('/api/user/searches', authenticateUser, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM public.user_search_history WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ success: true, message: 'Search history cleared' });
  } catch (err) {
    console.error('Clear searches error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// --- CHAT HISTORY ENDPOINTS (Supabase public.user_chat_messages) ---

// Get Chat History for Authenticated User
app.get('/api/chat/history', authenticateUser, async (req, res) => {
  try {
    const cleanEmail = (req.user.email || '').trim().toLowerCase();
    const result = await pool.query(
      `SELECT id, session_id, session_title, role, message, city, lang, created_at
       FROM public.user_chat_messages
       WHERE user_id = $1 OR (user_email IS NOT NULL AND LOWER(user_email) = $2)
       ORDER BY created_at ASC`,
      [req.user.id, cleanEmail]
    );

    // Group messages by session_id
    const sessionsMap = new Map();
    for (const row of result.rows) {
      if (!sessionsMap.has(row.session_id)) {
        sessionsMap.set(row.session_id, {
          id: row.session_id,
          title: row.session_title || 'Weather Conversation',
          city: row.city || 'Visakhapatnam',
          lang: row.lang || 'en',
          createdAt: row.created_at,
          updatedAt: row.created_at,
          messages: []
        });
      }
      const sess = sessionsMap.get(row.session_id);
      sess.updatedAt = row.created_at;
      sess.messages.push({
        id: row.id,
        role: row.role,
        text: row.message,
        city: row.city,
        lang: row.lang,
        createdAt: row.created_at
      });
    }

    const sessions = Array.from(sessionsMap.values()).reverse();
    res.json({ success: true, sessions });
  } catch (err) {
    console.error('Chat history fetch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save Chat Message (User or Assistant)
app.post('/api/chat/message', authenticateUser, async (req, res) => {
  const { session_id, session_title, role, message, city, lang } = req.body;

  if (!session_id || !role || !message) {
    return res.status(400).json({ success: false, error: 'session_id, role, and message are required' });
  }

  const cleanEmail = (req.user.email || '').trim().toLowerCase();

  try {
    const insertRes = await pool.query(
      `INSERT INTO public.user_chat_messages (user_id, user_email, session_id, session_title, role, message, city, lang, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id, session_id, session_title, role, message, city, lang, created_at`,
      [req.user.id, cleanEmail, session_id, session_title || 'Weather Query', role, message, city || 'Live Location', lang || 'en']
    );

    res.status(201).json({ success: true, message: insertRes.rows[0] });
  } catch (err) {
    console.error('Save chat message error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a Chat Session
app.delete('/api/chat/session/:sessionId', authenticateUser, async (req, res) => {
  const { sessionId } = req.params;
  const cleanEmail = (req.user.email || '').trim().toLowerCase();
  try {
    await pool.query(
      `DELETE FROM public.user_chat_messages WHERE (user_id = $1 OR (user_email IS NOT NULL AND LOWER(user_email) = $2)) AND session_id = $3`,
      [req.user.id, cleanEmail, sessionId]
    );
    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (err) {
    console.error('Delete chat session error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- VOICE & SPEECH TRANSCRIPTION ENDPOINT (Groq Whisper Large v3) ---
app.post('/api/voice/transcribe', async (req, res) => {
  try {
    const { audio_base64, mime_type, language } = req.body;
    if (!audio_base64) {
      return res.status(400).json({ success: false, error: 'audio_base64 is required' });
    }

    const cleanBase64 = audio_base64.replace(/^data:[^;]+;base64,/, '');
    const audioBuffer = Buffer.from(cleanBase64, 'base64');
    const mime = mime_type || 'audio/webm';
    const ext = mime.includes('wav') ? 'wav' : (mime.includes('mp4') || mime.includes('m4a') ? 'm4a' : 'webm');

    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mime });
    formData.append('file', blob, `voice_recording.${ext}`);
    formData.append('model', 'whisper-large-v3-turbo');
    if (language && language !== 'auto') {
      formData.append('language', language);
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: formData
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      console.warn('Groq Whisper error response:', data);
      return res.status(groqRes.status).json({ success: false, error: data.error?.message || 'Speech transcription failed' });
    }

    const transcribed = (data.text || '').trim();
    console.log(`[VoiceEngine] Successfully transcribed audio (${transcribed.length} chars): "${transcribed.slice(0, 60)}"`);

    res.json({
      success: true,
      text: transcribed
    });
  } catch (err) {
    console.error('Voice transcription server error:', err);
    res.status(500).json({ success: false, error: 'Internal speech processing error: ' + err.message });
  }
});

// --- AI WEATHER CHAT ENDPOINT (Groq Qwen Engine) ---
app.post('/api/mobile/chat', async (req, res) => {
  try {
    const { prompt, city, lang } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const userCity = city || 'Visakhapatnam';
    const userLang = lang || 'en';

    const systemPrompt = `You are WeatherGPT, an advanced Meteorological AI Assistant backed by live observation telemetry and Supabase SQL. Provide accurate, actionable meteorological intelligence.
FORMATTING RULES:
- When presenting recommendations, precautions, steps, or multi-item breakdowns, ALWAYS output them as clean numbered points (1., 2., 3.) or bullet points (•), with EACH point beginning on a brand new line.
- Never place a second point in the middle of a continuous sentence.
- When giving general answers, answer naturally and concisely.
- Language: If user asks in Telugu, respond in fluent Telugu. If Hindi, respond in fluent Hindi. City: ${userCity}.`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        max_tokens: 450,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await groqRes.json();
    let reply = (data.choices?.[0]?.message?.content || '').trim();
    if (reply.includes('</think>')) {
      reply = reply.split('</think>').pop().trim();
    }

    res.json({ success: true, reply });
  } catch (err) {
    console.error('Mobile chat API error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Default Home Route & Mobile App: Direct ChatGPT Interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'mobile_preview.html'));
});

app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'mobile_preview.html'));
});

// Dedicated login page route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Desktop dashboard route if explicitly requested
app.get('/desktop', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback for SPA routing to mobile_preview.html
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, 'mobile_preview.html'));
  }
  next();
});

// Start Server
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 WeatherGPT Platform & Supabase API Server Active`);
      console.log(`📍 Web Client: http://localhost:${PORT}`);
      console.log(`🗄️ Supabase DB: Connected & Synchronized (PostgreSQL 17)`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
}

startServer();
