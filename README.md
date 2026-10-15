# 🌦️ WeatherGPT — AI-Powered Meteorological Intelligence & Decision-Support Platform

> **Not just a weather app — an AI system that understands the atmosphere, explains root causes, predicts hazards, visualizes satellite data, and recommends actionable decisions.**

---

## 🌟 Executive Overview

WeatherGPT addresses the core challenge of modern meteorology: **raw weather data is not decision support**. Traditional weather apps provide passive numbers (e.g. *"Rain: 78%"* or *"32°C"*), leaving users to guess the real-world implications on their commute, farm operations, flights, or disaster safety.

WeatherGPT bridges this gap by unifying:
1. **Numerical Weather Prediction (NWP) multi-model ensembles** (ECMWF, NOAA GFS, IMD NCUM-R, WRF-ARW).
2. **Real-time Doppler weather radar** and **multispectral thermal infrared satellite imagery**.
3. **Explainable AI ("Why?") reasoning** explaining atmospheric instability, convective thermodynamics (CAPE, CIN, Lifted Index), and surface pressure troughs.
4. **Context-aware decision engines** tailored for Agriculture (Kisan AI), Road Travel, Daily Commute, Aviation/Drones, and Smart City Municipalities.
5. **Emergency Disaster Situation Mode** with instant HUD transformation, helpline directory, and shelter routing.
6. **Indian Multilingual & Hands-Free Voice AI** supporting 8 major Indian languages + English.

---

## 🚀 24 Core Features Breakdown

| # | Feature | Architecture & Implementation |
|---|---|---|
| 🏠 1 | **AI Weather Home / Dashboard** | Instant spatial overview with live GPS telemetry, 8 atmospheric metrics, and natural-language AI executive briefing. |
| 🤖 2 | **WeatherGPT AI Chatbot** | Conversational meteorological intelligence answering open-ended queries with contextual multi-model reasoning. |
| 📍 3 | **Live Location Intelligence** | Browser Geolocation API integration, coordinate reverse geocoding, elevation tracking, and instant "My Location" re-center. |
| 🛰️ 4 | **Latest Satellite Location View** | Multispectral thermal IR cloud radiance layer, INSAT-3DR / Himawari cadence timestamp, and 1-click Weather ↔ Satellite toggle. |
| 🗺️ 5 | **Interactive Weather Map** | Multi-layer Leaflet map (Rain Radar, Wind Flow streamlines, Cloud cover, Risk zones) with dynamic **Time Slider** (`NOW` to `+24 HR`). |
| 🌧️ 6 | **AI Rain Prediction & Nowcasting** | Actionable nowcasting window (e.g., *"Rain expected in ~45 min"*), confidence score, duration, intensity, and 15-min interval probability curve. |
| ⚠️ 7 | **AI Early Warning & Risk Center** | Automated screening of 8 critical hazards: flash floods, cyclonic depressions, severe lightning, squall winds, heatwaves, frost, and smog. |
| 🧠 8 | **“Why?” WeatherGPT** | Deep-dive root-cause diagnostics comparing physical parameters (CAPE, tropospheric moisture advection, barometric troughs) with **Plain English** vs **Technical** modes. |
| 📊 9 | **Weather Confidence Score** | Multi-model ensemble agreement indicator (0-100%) quantifying forecast certainty and model dispersion. |
| 🛰️ 10 | **Multi-Model Forecast Consensus** | Side-by-side comparison of 4 world-class NWP models: **ECMWF IFS (9km)**, **NOAA GFS (13km)**, **IMD NCUM-R (4km)**, and **WRF-ARW (3km)**. |
| 🌤️ 11 | **Hourly & 7-Day Outlook** | Interactive 24-hour horizontal chip scrubber and 7-day synoptic outlook with daily precipitation accumulations and AI summaries. |
| 🎯 12 | **“Impact on Me” Decision Matrix** | Activity-specific decision algorithms converting weather into personalized advice for commute, outdoor sports, and clothing. |
| 🌾 13 | **AI Agriculture Advisor (Kisan AI)** | Dedicated farmer intelligence: soil moisture demand, irrigation postponement alerts, pesticide spraying wind/rain safety windows, and crop stress. |
| 🚗 14 | **Travel & Highway Intelligence** | Route departure planning assistant evaluating pavement friction, hydroplaning, crosswinds, and optimal travel windows. |
| 🏙️ 15 | **Smart City Weather Intelligence** | Urban Heat Island (UHI) amplification index, stormwater drainage capacity overload alerts, and weather-related mobility risks. |
| 🚨 16 | **Disaster Situation Mode** | High-contrast emergency HUD takeover triggered during critical events, displaying national helplines (NDRF 1078, 112, 108), shelters, and survival protocols. |
| 🎙️ 17 | **Voice WeatherGPT** | Web Speech API speech recognition with multi-bar animated audio waveforms and natural voice speech synthesis. |
| 🇮🇳 18 | **Indian Multilingual WeatherGPT** | Full UI and AI generation localized across 8 Indian languages: **हिन्दी, తెలుగు, தமிழ், ಕನ್ನಡ, മലയാളം, मराठी, বাংলা, and English**. |
| 📚 19 | **Weather Knowledge Mode** | Scientific educational encyclopedia explaining cyclogenesis, rain probability mathematics, AQI calculations, and ENSO/IOD monsoon teleconnections. |
| 📈 20 | **Climate & Historical Analytics** | Interactive 10-year climate trends (2016–2026) visualizing temperature anomalies, extreme heat days, and rainfall shifts. |
| 🔬 21 | **Research Mode** | Comparative studio comparing two cities side-by-side across elevation, CAPE, annual rainfall, and NWP diagnostics with CSV export. |
| 🗂️ 22 | **Data Source Transparency** | Complete provenance breakdown documenting satellite constellations, Doppler radar networks, NWP model resolutions, and CAAQMS sensors. |
| 🔔 23 | **Smart Weather Alerts** | Threshold-based notification simulation for heavy downpours, severe heatwaves, high wind squalls, and hazardous AQI. |
| 🧩 24 | **AI Weather Agent Pipeline** | Transparent 6-step cognitive execution trace (`[Spatial Ingestion] ➔ [NWP Synthesis] ➔ [Radar Vectors] ➔ [Hazard Evaluation] ➔ [Impact Assessment] ➔ [Action Formulation]`). |

---

## 🏗️ Technical Architecture

- **Frontend**: Native HTML5 semantic architecture with zero build steps or heavyweight bundling overhead.
- **Styling**: Vanilla CSS3 with **Deep Aerosphere Glassmorphism** (`backdrop-filter: blur(16px)`), curated HSL color palettes, responsive typography (`Outfit`, `Plus Jakarta Sans`, `JetBrains Mono`), and HTML5 canvas particle backdrops.
- **Mapping**: Leaflet.js with CartoDB Dark Matter tiles, RainViewer animated Doppler radar loop API, and custom canvas streamline vector animations.
- **Data Integrations**:
  - Live Open-Meteo High-Resolution Global & Indian Forecast API
  - Open-Meteo European & US Air Quality API
  - RainViewer Real-Time Radar API
  - Built-in high-fidelity synthetic fallback simulation for zero-failure resilience offline.
- **State Management**: Reactive observer pub/sub central store (`weatherStore.js`).

---

## 💻 How to Run Locally

Because WeatherGPT is built natively without requiring node modules, build tools, or complex bundlers, you can run it immediately:

1. **Direct Browser Launch**:
   - Double-click or open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari).

2. **Local Development Server (Optional)**:
   ```bash
   # Python 3
   python -m http.server 8080

   # Or Node npx serve
   npx serve .
   ```
   Open `http://localhost:8080` in your browser.

---

## 🛡️ License & Attribution
Designed and engineered as an advanced meteorological decision-support system. Integrates open data from Open-Meteo, RainViewer, India Meteorological Department (IMD), ECMWF, and NOAA.
