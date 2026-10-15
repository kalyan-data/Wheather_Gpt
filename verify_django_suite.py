import requests
import time

BASE_URL = 'http://127.0.0.1:5173'

passes = 0
fails = 0

def test(cond, desc):
    global passes, fails
    if cond:
        print(f"[PASS] {desc}")
        passes += 1
    else:
        print(f"[FAIL] {desc}")
        fails += 1

print("==================================================")
print("Testing Django 5.2 Server + Supabase PostgreSQL")
print("==================================================")

# 1. Health check
try:
    r = requests.get(f'{BASE_URL}/api/db/health', timeout=10)
    test(r.status_code == 200, f"GET /api/db/health status code 200 (Got {r.status_code})")
    data = r.json()
    test(data.get('status') == 'connected', f"Status is 'connected' (Got {data.get('status')})")
    test('Django' in data.get('engine', ''), f"Engine mentions Django: {data.get('engine')}")
except Exception as e:
    test(False, f"GET /api/db/health failed: {e}")

# 2. Registration
test_email = f"django_meteorologist_{int(time.time())}@weathergpt.io"
try:
    r = requests.post(f'{BASE_URL}/api/auth/register', json={
        'name': 'Django Meteorologist',
        'email': test_email,
        'password': 'Password@123',
        'preferred_location': 'Mumbai',
        'preferred_language': 'hi'
    }, timeout=10)
    test(r.status_code == 201, f"POST /api/auth/register status code 201 (Got {r.status_code})")
    reg_data = r.json()
    test(reg_data.get('success') is True, "Registration success flag is True")
    token = reg_data.get('token')
    test(bool(token), f"Received session token: {bool(token)}")
except Exception as e:
    test(False, f"POST /api/auth/register failed: {e}")
    token = None

# 3. /api/auth/me
if token:
    try:
        r = requests.get(f'{BASE_URL}/api/auth/me', headers={'Authorization': f'Bearer {token}'}, timeout=10)
        test(r.status_code == 200, f"GET /api/auth/me status code 200 (Got {r.status_code})")
        me_data = r.json()
        test(me_data.get('user', {}).get('email') == test_email, f"User email matches {test_email}")
        test(me_data.get('user', {}).get('preferred_location') == 'Mumbai', "Location matches Mumbai")
    except Exception as e:
        test(False, f"GET /api/auth/me failed: {e}")

# 4. Login with demo account
try:
    r = requests.post(f'{BASE_URL}/api/auth/login', json={
        'email': 'kalyan@weathergpt.io',
        'password': 'Password@123'
    }, timeout=10)
    test(r.status_code == 200, f"POST /api/auth/login with demo account (Got {r.status_code})")
    login_data = r.json()
    test(login_data.get('success') is True, "Login success flag is True")
    test(login_data.get('user', {}).get('email') == 'kalyan@weathergpt.io', "Login returned Kalyan user")
except Exception as e:
    test(False, f"POST /api/auth/login failed: {e}")

# 5. Invalid credentials test
try:
    r = requests.post(f'{BASE_URL}/api/auth/login', json={
        'email': 'kalyan@weathergpt.io',
        'password': 'WrongPassword123'
    }, timeout=10)
    test(r.status_code == 401, f"Rejected invalid password with 401 (Got {r.status_code})")
except Exception as e:
    test(False, f"Invalid password check failed: {e}")

# 6. Preferences update
if token:
    try:
        r = requests.post(f'{BASE_URL}/api/user/preferences', headers={'Authorization': f'Bearer {token}'}, json={
            'preferred_location': 'Shimla',
            'preferred_language': 'te'
        }, timeout=10)
        test(r.status_code == 200, f"POST /api/user/preferences status 200 (Got {r.status_code})")
        p_data = r.json()
        test(p_data.get('user', {}).get('preferred_location') == 'Shimla', "Updated location is Shimla")
    except Exception as e:
        test(False, f"POST /api/user/preferences failed: {e}")

# 7. Static and Page serving
try:
    r = requests.get(f'{BASE_URL}/login', timeout=10)
    test(r.status_code == 200, f"GET /login renders login page (Got {r.status_code})")
    test('formSignIn' in r.text, "Login page contains formSignIn")

    r2 = requests.get(f'{BASE_URL}/', timeout=10)
    test(r2.status_code == 200, f"GET / renders index dashboard (Got {r2.status_code})")
    test('WeatherGPT' in r2.text, "Index dashboard contains WeatherGPT")

    r3 = requests.get(f'{BASE_URL}/css/main.css', timeout=10)
    test(r3.status_code == 200, f"GET /css/main.css status 200 (Got {r3.status_code})")

    r4 = requests.get(f'{BASE_URL}/js/app.js', timeout=10)
    test(r4.status_code == 200, f"GET /js/app.js status 200 (Got {r4.status_code})")
except Exception as e:
    test(False, f"Page serving failed: {e}")

# 8. WeatherAPI.com Integration Endpoint
try:
    r = requests.get(f'{BASE_URL}/api/weather?q=Bengaluru&days=3', timeout=12)
    test(r.status_code == 200, f"GET /api/weather status code 200 (Got {r.status_code})")
    wdata = r.json()
    test(wdata.get('success') is True, "WeatherAPI response success is True")
    test(wdata.get('source') == 'WeatherAPI.com', f"Data source is WeatherAPI.com (Got {wdata.get('source')})")
    test('current' in wdata.get('data', {}), "Response contains 'current' weather object")
    test('forecast' in wdata.get('data', {}), "Response contains 'forecast' object")
    test('air_quality' in wdata.get('data', {}).get('current', {}), "Live Air Quality telemetry returned")
    print(f"   [WeatherAPI] Location: {wdata['data']['location']['name']}, Temp: {wdata['data']['current']['temp_c']}°C, Condition: {wdata['data']['current']['condition']['text']}")
except Exception as e:
    test(False, f"GET /api/weather failed: {e}")

print("==================================================")
print(f"VERIFICATION RESULTS: {passes} PASSED, {fails} FAILED")
print("==================================================")

if fails > 0:
    exit(1)

