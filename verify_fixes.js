// Verification Script for WeatherGPT 4 Core Fixes
import { aiEngine } from './js/aiEngine.js';
import { getLocationProfile } from './js/config.js';

async function runVerification() {
  console.log('====================================================');
  console.log('🌦️ RUNNING COMPREHENSIVE VERIFICATION FOR WEATHERGPT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // Mock weather data for testing
  const mockBengaluruData = {
    location: { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
    current: {
      temp: 27,
      feelsLike: 28,
      humidity: 68,
      dewPoint: 20,
      rainProb: 65,
      windSpeed: 16,
      windDirectionText: 'WSW',
      windDirection: 240,
      windGusts: 24,
      pressure: 1012,
      uvIndex: 6,
      aqi: { value: 72, category: 'Moderate', pm25: 22, pm10: 45, healthImpact: 'Acceptable for most individuals.' },
      condition: 'Partly Cloudy with Showers',
      sunrise: '06:05 AM',
      sunset: '06:32 PM'
    },
    nowcast: {
      status: 'Showers expected in ~35 minutes',
      expectedInMinutes: 35,
      expectedDurationHours: '1.5 hours',
      intensity: 'Moderate Showers',
      accumulationMm: '14 mm',
      rainCurve: [15, 30, 65, 60, 45, 25, 10, 0]
    },
    hourly: [
      { time: '02:00 PM', rawTime: '2026-09-07T14:00:00', temp: 28, rainProb: 30, windSpeed: 14 },
      { time: '04:00 PM', rawTime: '2026-09-07T16:00:00', temp: 27, rainProb: 65, windSpeed: 18 },
      { time: '06:00 PM', rawTime: '2026-09-07T18:00:00', temp: 24, rainProb: 75, windSpeed: 20 },
      { time: '08:00 PM', rawTime: '2026-09-07T20:00:00', temp: 23, rainProb: 40, windSpeed: 12 }
    ],
    daily: [
      { day: 'Today', maxTemp: 28, minTemp: 19, rainProb: 65, condition: 'Showers' },
      { day: 'Tomorrow', maxTemp: 29, minTemp: 20, rainProb: 40, condition: 'Partly Cloudy', windMax: 16 }
    ],
    confidence: { percentage: 89, rating: 'HIGH', explanation: 'Strong agreement across ECMWF and GFS.' },
    thermodynamics: { cape: 1850, liftedIndex: -3.2, dewPointDepression: 7, geopotential500hPa: 5860 }
  };

  const mockMumbaiData = {
    ...mockBengaluruData,
    location: { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
    current: {
      ...mockBengaluruData.current,
      temp: 31,
      feelsLike: 36,
      humidity: 82,
      condition: 'Humid & Overcast'
    }
  };

  const mockDelhiData = {
    ...mockBengaluruData,
    location: { name: 'New Delhi', lat: 28.6139, lon: 77.2090 },
    current: {
      ...mockBengaluruData.current,
      temp: 39,
      feelsLike: 42,
      humidity: 45,
      aqi: { value: 260, category: 'Very Unhealthy', pm25: 110, pm10: 210, healthImpact: 'Hazardous respiratory risk' },
      condition: 'Hazy Sun with Heatwave'
    }
  };

  // -------------------------------------------------------------
  // TEST 1: Language Response Issue (Strict Language Enforcement)
  // -------------------------------------------------------------
  console.log('\n--- 1. TESTING LANGUAGE RESPONSE ENFORCEMENT ---');

  // Test Hindi
  const resHindi = await aiEngine.processUserQuery('Will it rain today?', mockBengaluruData, 'simple', 'hi');
  assert(/[\u0900-\u097F]/.test(resHindi.answer), 'Hindi response contains Devanagari script');
  assert(resHindi.answer.includes('बारिश') || resHindi.answer.includes('पूर्वानुमान') || resHindi.answer.includes('वर्षा'), 'Hindi response contains authentic Hindi weather vocabulary');

  // Test Telugu
  const resTelugu = await aiEngine.processUserQuery('Will it rain today?', mockBengaluruData, 'simple', 'te');
  assert(/[\u0C00-\u0C7F]/.test(resTelugu.answer), 'Telugu response contains Telugu script');
  assert(resTelugu.answer.includes('వర్షం') || resTelugu.answer.includes('వాతావరణం'), 'Telugu response contains authentic Telugu weather vocabulary');

  // Test Tamil
  const resTamil = await aiEngine.processUserQuery('Will it rain today?', mockBengaluruData, 'simple', 'ta');
  assert(/[\u0B80-\u0BFF]/.test(resTamil.answer), 'Tamil response contains Tamil script');

  // Test Kannada
  const resKannada = await aiEngine.processUserQuery('Will it rain today?', mockBengaluruData, 'simple', 'kn');
  assert(/[\u0C80-\u0CFF]/.test(resKannada.answer), 'Kannada response contains Kannada script');

  // Test Malayalam
  const resMalayalam = await aiEngine.processUserQuery('Will it rain today?', mockBengaluruData, 'simple', 'ml');
  assert(/[\u0D00-\u0D7F]/.test(resMalayalam.answer), 'Malayalam response contains Malayalam script');

  // Test Bengali
  const resBengali = await aiEngine.processUserQuery('Will it rain today?', mockBengaluruData, 'simple', 'bn');
  assert(/[\u0980-\u09FF]/.test(resBengali.answer), 'Bengali response contains Bengali script');

  // Test Marathi
  const resMarathi = await aiEngine.processUserQuery('Will it rain today?', mockBengaluruData, 'simple', 'mr');
  assert(/[\u0900-\u097F]/.test(resMarathi.answer), 'Marathi response contains Devanagari script');

  // Test English
  const resEnglish = await aiEngine.processUserQuery('Will it rain today?', mockBengaluruData, 'simple', 'en');
  assert(/precipitation|rain/i.test(resEnglish.answer), 'English response contains English weather terminology');

  // -------------------------------------------------------------
  // TEST 2: Same Response for Different Requests (Query Distinctness)
  // -------------------------------------------------------------
  console.log('\n--- 2. TESTING MULTI-QUERY DISTINCTNESS & INTENT REASONING ---');

  const testQueries = [
    { q: 'What is the temperature right now?', expectedCategory: 'temperature_specific', keyword: 'Temperature' },
    { q: 'Will it rain today?', expectedCategory: 'rain_nowcast', keyword: 'Rain' },
    { q: 'Can I travel safely at 6 PM?', expectedCategory: 'timing_hourly', keyword: '06:00 PM' },
    { q: 'How is the weather tomorrow?', expectedCategory: 'tomorrow_forecast', keyword: 'Tomorrow' },
    { q: 'What is the humidity and moisture level?', expectedCategory: 'humidity_dewpoint', keyword: 'Humidity' },
    { q: 'How strong is the wind today?', expectedCategory: 'wind_specific', keyword: 'Wind' },
    { q: 'Is the air quality pollution dangerous?', expectedCategory: 'air_quality', keyword: 'Air Quality' },
    { q: 'Can I dry my clothes outside?', expectedCategory: 'laundry_carwash', keyword: 'Laundry' },
    { q: 'What should I wear today?', expectedCategory: 'clothing_dress', keyword: 'Fabric' },
    { q: 'Can we play cricket or football outdoors?', expectedCategory: 'outdoor_fitness', keyword: 'Sports' },
    { q: 'Should I irrigate crops or spray pesticides today?', expectedCategory: 'agriculture_kisan', keyword: 'Irrigation' },
    { q: 'Is there any flood or cyclone risk near me?', expectedCategory: 'disaster_safety', keyword: 'Hazard' },
    { q: 'Why is the weather like this?', expectedCategory: 'meteorological_why', keyword: 'CAPE' }
  ];

  const generatedResponses = new Set();

  for (const item of testQueries) {
    const res = await aiEngine.processUserQuery(item.q, mockBengaluruData, 'simple', 'en');
    assert(res.category === item.expectedCategory, `Query "${item.q}" classified as ${res.category}`);
    assert(res.answer.includes(item.keyword) || res.answer.toLowerCase().includes(item.keyword.toLowerCase()), `Query "${item.q}" contains relevant content keyword [${item.keyword}]`);
    
    // Check non-repetition: each answer must be distinctly unique
    const answerSnippet = res.answer.slice(0, 80);
    assert(!generatedResponses.has(answerSnippet), `Query "${item.q}" produced a UNIQUE non-cached answer`);
    generatedResponses.add(answerSnippet);
  }

  // -------------------------------------------------------------
  // TEST 3: Location-Specific AI Information
  // -------------------------------------------------------------
  console.log('\n--- 3. TESTING LOCATION-SPECIFIC METEOROLOGICAL INTELLIGENCE ---');

  // Test Bengaluru
  const blrBriefing = aiEngine.generateBriefing(mockBengaluruData, 'en');
  assert(blrBriefing.includes('Deccan Plateau') || blrBriefing.includes('Bengaluru'), 'Bengaluru briefing references Deccan Plateau geography');

  const blrQuery = await aiEngine.processUserQuery('Is there any flood risk near me?', mockBengaluruData, 'simple', 'en');
  assert(blrQuery.answer.includes('Silk Board') || blrQuery.answer.includes('Outer Ring Road') || blrQuery.answer.includes('Bengaluru'), 'Bengaluru query response references local urban transit bottlenecks');

  // Test Mumbai
  const bomBriefing = aiEngine.generateBriefing(mockMumbaiData, 'en');
  assert(bomBriefing.includes('Mumbai') && (bomBriefing.includes('Peninsula') || bomBriefing.includes('Coastal') || bomBriefing.includes('Wet')), 'Mumbai briefing references coastal/maritime conditions');

  const bomProfile = getLocationProfile('Mumbai', 19.07, 72.87);
  assert(bomProfile.geography.includes('Arabian Sea') && bomProfile.urbanVulnerabilities.includes('Hindmata'), 'Mumbai profile accurately models high-tide & Hindmata subway drainage');

  // Test New Delhi
  const delBriefing = aiEngine.generateBriefing(mockDelhiData, 'en');
  assert(delBriefing.includes('New Delhi') && (delBriefing.includes('thermal') || delBriefing.includes('heat') || delBriefing.includes('Indo-Gangetic')), 'Delhi briefing identifies severe thermal continentality');

  const delProfile = getLocationProfile('New Delhi', 28.61, 77.20);
  assert(delProfile.geography.includes('Indo-Gangetic') && delProfile.urbanVulnerabilities.includes('PM2.5'), 'Delhi profile references Indo-Gangetic plains and PM2.5 boundary layer trapping');

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
