import express from 'express';
import { getDb, memoryDb } from '../config/db.js';

const router = express.Router();

// GET /api/admin/metrics
router.get('/metrics', async (req, res) => {
  const { pool, isConnected } = getDb();
  const startTime = Date.now();

  let counts = {
    trips: 0,
    itinerary_items: 0,
    expenses: 0,
    saved_places: 0
  };
  let recentTrips = [];
  let destinationsSummary = [];
  let dbLatency = 0;

  try {
    if (isConnected && pool) {
      // Measure DB query latency
      const pingStart = Date.now();
      await pool.query('SELECT 1;');
      dbLatency = Date.now() - pingStart;

      // Fetch table counts
      const [[tripsCount]] = await pool.query('SELECT COUNT(*) as count FROM trips');
      const [[itemsCount]] = await pool.query('SELECT COUNT(*) as count FROM itinerary_items');
      const [[expensesCount]] = await pool.query('SELECT COUNT(*) as count FROM expenses');
      const [[savedCount]] = await pool.query('SELECT COUNT(*) as count FROM saved_places');

      counts.trips = tripsCount?.count || 0;
      counts.itinerary_items = itemsCount?.count || 0;
      counts.expenses = expensesCount?.count || 0;
      counts.saved_places = savedCount?.count || 0;

      // Fetch recent trips
      const [trips] = await pool.query(
        'SELECT id, user_id, title, destination, country, latitude, longitude, created_at FROM trips ORDER BY created_at DESC LIMIT 20'
      );
      recentTrips = trips;

      // Group by destination
      const [destGroup] = await pool.query(
        'SELECT destination, COUNT(*) as trip_count FROM trips GROUP BY destination ORDER BY trip_count DESC LIMIT 8'
      );
      destinationsSummary = destGroup;
    } else {
      // Memory DB fallback
      counts.trips = memoryDb.trips.size;
      counts.itinerary_items = memoryDb.itinerary_items.size;
      counts.expenses = memoryDb.expenses.size;
      counts.saved_places = memoryDb.saved_places.size;

      recentTrips = Array.from(memoryDb.trips.values())
        .slice(-20)
        .reverse()
        .map(t => ({
          id: t.id,
          user_id: t.user_id,
          title: t.title,
          destination: t.destination,
          country: t.country,
          created_at: t.created_at
        }));
    }

    // Mask DB host for display
    const rawHost = process.env.DB_HOST || 'localhost';
    const maskedHost = rawHost.length > 20
      ? `${rawHost.slice(0, 10)}...${rawHost.slice(-12)}`
      : rawHost;

    res.json({
      success: true,
      data: {
        database: {
          connected: isConnected,
          engine: isConnected ? (rawHost.includes('aivencloud') ? 'Aiven Cloud MySQL' : 'MySQL Database') : 'In-Memory Store (Fallback)',
          host: maskedHost,
          latencyMs: dbLatency,
          port: process.env.DB_PORT || 3306,
          databaseName: process.env.DB_NAME || 'wandernest'
        },
        counts,
        recentTrips,
        destinationsSummary,
        services: {
          googlePlacesConfigured: Boolean(process.env.GOOGLE_PLACES_API_KEY),
          googlePlacesStatus: process.env.GOOGLE_PLACES_API_KEY ? 'Active (Live API)' : 'Active (Client & Server Fallback)',
          serverPort: process.env.PORT || 5001
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          uptimeSeconds: Math.floor(process.uptime()),
          memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          totalExecutionMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (err) {
    console.error('Admin metrics error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      data: {
        database: { connected: false, engine: 'Unavailable', host: 'unknown' },
        counts,
        recentTrips: []
      }
    });
  }
});

// GET /api/admin/ping
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    pong: true,
    timestamp: Date.now(),
    uptime: Math.floor(process.uptime())
  });
});

export default router;
