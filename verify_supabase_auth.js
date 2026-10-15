import { pool } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failCount++;
  }
}

async function runVerification() {
  console.log('================================================================');
  console.log('🔒 VERIFYING SUPABASE POSTGRESQL & AUTHENTICATION INTEGRATION');
  console.log('================================================================\n');

  // --- 1. DIRECT SUPABASE POSTGRESQL VERIFICATION ---
  console.log('--- 1. DATABASE SCHEMA IN SUPABASE ---');
  try {
    const tableRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('app_users', 'user_sessions');
    `);
    const tables = tableRes.rows.map(r => r.table_name);
    assert(tables.includes('app_users'), 'Table "app_users" exists in Supabase public schema');
    assert(tables.includes('user_sessions'), 'Table "user_sessions" exists in Supabase public schema');

    const colsRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'app_users';
    `);
    const colNames = colsRes.rows.map(r => r.column_name);
    assert(colNames.includes('id'), 'app_users has primary key id');
    assert(colNames.includes('name'), 'app_users has name column');
    assert(colNames.includes('email'), 'app_users has email column');
    assert(colNames.includes('password_hash'), 'app_users has password_hash column');
    assert(colNames.includes('salt'), 'app_users has salt column');
    assert(colNames.includes('preferred_location'), 'app_users has preferred_location column');
    assert(colNames.includes('preferred_language'), 'app_users has preferred_language column');
  } catch (err) {
    assert(false, `Database query error: ${err.message}`);
  }

  // --- 2. API ENDPOINTS & AUTHENTICATION FLOW ---
  console.log('\n--- 2. LIVE REST API & AUTHENTICATION FLOW ---');
  try {
    // A. Health check
    const healthRes = await fetch('http://localhost:5173/api/db/health');
    const health = await healthRes.json();
    assert(health.status === 'connected', 'GET /api/db/health reports "connected"');
    assert(health.engine.includes('Supabase PostgreSQL'), 'Health check identifies Supabase PostgreSQL');

    // B. Register unique user
    const testEmail = `meteorology_${Date.now()}@supabasetest.com`;
    const regRes = await fetch('http://localhost:5173/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kalyan Lead Meteorologist',
        email: testEmail,
        password: 'SuperSecurePassword@2026',
        preferred_location: 'Bengaluru',
        preferred_language: 'hi'
      })
    });
    const regData = await regRes.json();
    assert(regData.success === true, 'POST /api/auth/register creates user account in Supabase');
    assert(!!regData.token, 'Registration returns cryptographic session token');
    assert(regData.user.preferred_language === 'hi', 'User preferred language persisted as "hi"');

    const token = regData.token;

    // C. Validate Session (/api/auth/me)
    const meRes = await fetch('http://localhost:5173/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meData = await meRes.json();
    assert(meData.success === true, 'GET /api/auth/me successfully validates Bearer token');
    assert(meData.user.email === testEmail, 'GET /api/auth/me returns matching user email');

    // D. Update Preferences
    const prefRes = await fetch('http://localhost:5173/api/user/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        preferred_location: 'Shimla',
        preferred_language: 'te'
      })
    });
    const prefData = await prefRes.json();
    assert(prefData.success === true, 'POST /api/user/preferences updates user settings in Supabase');
    assert(prefData.user.preferred_location === 'Shimla', 'Updated preferred city is "Shimla"');
    assert(prefData.user.preferred_language === 'te', 'Updated preferred language is "te"');

    // E. Login with credentials
    const loginRes = await fetch('http://localhost:5173/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SuperSecurePassword@2026'
      })
    });
    const loginData = await loginRes.json();
    assert(loginData.success === true, 'POST /api/auth/login authenticates user with password hash');
    assert(loginData.user.preferred_location === 'Shimla', 'Login retrieves updated Supabase preferences');

    // F. Negative Test: Wrong password
    const badLoginRes = await fetch('http://localhost:5173/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'IncorrectPassword123'
      })
    });
    assert(badLoginRes.status === 401, 'POST /api/auth/login rejects wrong password with 401 Unauthorized');
  } catch (err) {
    assert(false, `API test error: ${err.message}`);
  }

  // --- 3. FRONTEND SOURCE ASSETS VERIFICATION ---
  console.log('\n--- 3. FRONTEND UI & INTEGRATION ASSETS ---');
  const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert(indexHtml.includes('id="headerAuthContainer"'), 'index.html contains #headerAuthContainer');
  assert(indexHtml.includes('id="authModalBackdrop"'), 'index.html contains #authModalBackdrop');
  assert(indexHtml.includes('id="supabaseStatusBadge"'), 'index.html contains #supabaseStatusBadge');
  assert(indexHtml.includes('id="authFormLogin"'), 'index.html contains #authFormLogin');
  assert(indexHtml.includes('id="authFormRegister"'), 'index.html contains #authFormRegister');

  const appJs = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
  assert(appJs.includes("import { authEngine } from './authEngine.js'"), 'app.js imports authEngine');
  assert(appJs.includes('await authEngine.init()'), 'app.js calls authEngine.init()');

  const mainCss = fs.readFileSync(path.join(__dirname, 'css', 'main.css'), 'utf8');
  assert(mainCss.includes('.auth-modal-backdrop'), 'main.css contains .auth-modal-backdrop styles');
  assert(mainCss.includes('.supabase-status-badge'), 'main.css contains .supabase-status-badge styles');
  assert(mainCss.includes('.user-profile-widget'), 'main.css contains .user-profile-widget styles');

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');

  await pool.end();
  process.exit(failCount === 0 ? 0 : 1);
}

runVerification();
