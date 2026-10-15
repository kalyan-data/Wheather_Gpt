import requests

BASE_URL = 'http://127.0.0.1:5173'

def test_ai_chat():
    print("Testing Groq Open LLM Chat API on Django...")

    # Test English query
    payload_en = {
        'prompt': 'Can I travel safely at 6 PM today?',
        'location': {'city': 'Bengaluru', 'lat': 12.97, 'lon': 77.59},
        'weatherData': {
            'current': {
                'temperature': 27,
                'feelsLike': 28,
                'humidity': 70,
                'conditionText': 'Light Convective Rain',
                'precipitationProbability': 65,
                'windSpeed': 18,
                'windDirection': 'SW',
                'aqi': 48,
                'uvIndex': 4
            }
        },
        'language': 'en'
    }

    r = requests.post(f'{BASE_URL}/api/ai/chat', json=payload_en, timeout=15)
    print("English Chat Status:", r.status_code)
    if r.status_code == 200:
        data = r.json()
        print("Model:", data.get('model'))
        clean_resp = data.get('response', '')[:150].encode('ascii', 'ignore').decode()
        print("Response Snippet:", clean_resp, "...\n")
    else:
        print("Error:", r.text)

    # Test Hindi query
    payload_hi = {
        'prompt': 'क्या मुझे आज छाता लेकर जाना चाहिए?',
        'location': {'city': 'New Delhi', 'lat': 28.61, 'lon': 77.20},
        'weatherData': {
            'current': {
                'temperature': 34,
                'feelsLike': 38,
                'humidity': 80,
                'conditionText': 'Thunderstorm',
                'precipitationProbability': 85,
                'windSpeed': 24,
                'windDirection': 'E',
                'aqi': 140,
                'uvIndex': 6
            }
        },
        'language': 'hi'
    }

    r_hi = requests.post(f'{BASE_URL}/api/ai/chat', json=payload_hi, timeout=15)
    print("Hindi Chat Status:", r_hi.status_code)
    if r_hi.status_code == 200:
        data_hi = r_hi.json()
        print("Hindi Model:", data_hi.get('model'))
        clean_hi = data_hi.get('response', '')[:100].encode('ascii', 'backslashreplace').decode('ascii')
        print("Hindi Response Snippet (escaped):", clean_hi, "...\n")
    else:
        print("Error:", r_hi.text)

    # Test Briefing
    r_brief = requests.post(f'{BASE_URL}/api/ai/briefing', json=payload_en, timeout=15)
    print("Briefing Status:", r_brief.status_code)
    if r_brief.status_code == 200:
        data_b = r_brief.json()
        clean_b = data_b.get('briefing', '').encode('ascii', 'ignore').decode()
        print("Briefing:", clean_b)
    else:
        print("Error:", r_brief.text)

if __name__ == '__main__':
    test_ai_chat()
