import express from 'express';
import { getPlaces } from '../services/placesService.js';

const router = express.Router();

// GET /api/places?lat=...&lng=...&category=do|eat|stay|all&radius=...
router.get('/', async (req, res) => {
  const { lat, lng, category = 'all', radius = 6000 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, error: 'lat and lng are required' });
  }

  try {
    const places = await getPlaces(lat, lng, category, radius);
    const provider = places.length > 0 && places[0].source === 'google' 
      ? 'Google Places API' 
      : 'Verified Geographic POI Engine';

    return res.json({
      success: true,
      data: places,
      count: places.length,
      provider
    });
  } catch (error) {
    console.error('Places API endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch places',
      data: []
    });
  }
});

export default router;
