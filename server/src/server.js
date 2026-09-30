import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/db.js';
import destinationsRouter from './routes/destinations.js';
import placesRouter from './routes/places.js';
import weatherRouter from './routes/weather.js';
import tripsRouter from './routes/trips.js';
import flightsRouter from './routes/flights.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/destinations', destinationsRouter);
app.use('/api/places', placesRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/flights', flightsRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    app: 'WanderNest Travel API',
    endpoints: {
      health: '/api/health',
      destinations: '/api/destinations/featured',
      search: '/api/destinations/search?q=:query',
      weather: '/api/weather?lat=:lat&lng=:lng',
      places: '/api/places?lat=:lat&lng=:lng',
      flights: '/api/flights'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'WanderNest Travel API',
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Start Server & Init DB
async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 WanderNest Server running on http://localhost:${PORT}`);
  });
}

start();
