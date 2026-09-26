# WanderNest Travel 🌍✈️

WanderNest Travel is a modern, full-stack travel workspace and itinerary planning web application. It combines real-time geographic data, interactive split maps, live weather forecasts, verified traveler reviews, authentic accommodations, flight route benchmarks, and travel budget intelligence.

---

## ✨ Features

- **Dual-Pane Interactive Explorer**: Dual-pane split view with synchronized Leaflet map markers, high-resolution photography, and 360° street view inspection.
- **Day-by-Day Itinerary Planner**: Drag-free day scheduling with walking distance anchors, live Open-Meteo temperature forecasts, and dynamic stop management.
- **Verified Accommodations & Basecamp**: Live boutique hotel and stay details with real nightly rates, amenity badges, and Google Hotels integration.
- **Flight Route Intelligence**: Direct carrier routes, IATA airport pairs, flight durations, fare benchmarks, and live Google Flights links.
- **Real Travel Budget Intelligence**: Destination cost benchmarks (lodging, dining, sights, transit), travel style toggles (*Backpacker*, *Standard*, *Luxury*), and live expense logging.
- **Authentic Traveler Reviews**: Verified traveler profiles with star ratings, badges, and authentic travel tips.
- **Multi-Currency Engine**: Instant conversion across USD, EUR, GBP, JPY, and BDT.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Leaflet / React-Leaflet, Lucide Icons
- **Backend**: Node.js, Express, Axios, MySQL2 (with in-memory fallback)
- **External Data**: Open-Meteo API, Wikipedia Geosearch, OpenStreetMap / Overpass / Nominatim

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd wandernest-travel
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
npm run dev
```
The server will start on `http://localhost:5001`.

### 3. Frontend Setup
```bash
cd ../client
npm install
npm run dev
```
The client will start on `http://localhost:5173`.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
