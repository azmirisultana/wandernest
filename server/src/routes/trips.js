import express from 'express';
import { getDb, memoryDb } from '../config/db.js';

const router = express.Router();

// Helper to generate IDs
const generateId = (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

// GET /api/trips?userId=...
router.get('/', async (req, res) => {
  const userId = req.query.userId || 'guest_default';
  const { pool, isConnected } = getDb();

  try {
    if (isConnected && pool) {
      const [rows] = await pool.query(
        'SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      return res.json({ success: true, data: rows });
    } else {
      const userTrips = Array.from(memoryDb.trips.values())
        .filter(t => t.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.json({ success: true, data: userTrips });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/trips/:id
router.get('/:id', async (req, res) => {
  const tripId = req.params.id;
  const { pool, isConnected } = getDb();

  try {
    if (isConnected && pool) {
      const [trips] = await pool.query('SELECT * FROM trips WHERE id = ?', [tripId]);
      if (!trips.length) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }
      const trip = trips[0];

      const [items] = await pool.query(
        'SELECT * FROM itinerary_items WHERE trip_id = ? ORDER BY day_number ASC, order_index ASC',
        [tripId]
      );
      const [expenses] = await pool.query(
        'SELECT * FROM expenses WHERE trip_id = ? ORDER BY created_at DESC',
        [tripId]
      );

      return res.json({
        success: true,
        data: {
          ...trip,
          items,
          expenses
        }
      });
    } else {
      const trip = memoryDb.trips.get(tripId);
      if (!trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }
      const items = Array.from(memoryDb.itinerary_items.values())
        .filter(i => i.trip_id === tripId)
        .sort((a, b) => a.day_number - b.day_number || a.order_index - b.order_index);
      const expenses = Array.from(memoryDb.expenses.values())
        .filter(e => e.trip_id === tripId);

      return res.json({
        success: true,
        data: {
          ...trip,
          items,
          expenses
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/trips
router.post('/', async (req, res) => {
  const {
    userId = 'guest_default',
    title,
    destination,
    country = '',
    latitude,
    longitude,
    startDate = null,
    endDate = null,
    coverImage = '',
    budget = 1500
  } = req.body;

  if (!title || !destination || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, error: 'Title, destination, latitude, and longitude are required' });
  }

  const tripId = req.body.id || generateId('trip');
  const now = new Date();
  const tripData = {
    id: tripId,
    user_id: userId,
    title,
    destination,
    country,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    start_date: startDate,
    end_date: endDate,
    cover_image: coverImage,
    budget: parseFloat(budget) || 0,
    currency: 'USD',
    created_at: now
  };

  const { pool, isConnected } = getDb();

  try {
    if (isConnected && pool) {
      await pool.query(
        `INSERT INTO trips (id, user_id, title, destination, country, latitude, longitude, start_date, end_date, cover_image, budget, currency)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tripData.id, tripData.user_id, tripData.title, tripData.destination, tripData.country,
          tripData.latitude, tripData.longitude, tripData.start_date, tripData.end_date,
          tripData.cover_image, tripData.budget, tripData.currency
        ]
      );
    } else {
      memoryDb.trips.set(tripId, tripData);
    }

    res.status(201).json({ success: true, data: tripData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/trips/:id
router.put('/:id', async (req, res) => {
  const tripId = req.params.id;
  const { title, startDate, endDate, budget, coverImage } = req.body;
  const { pool, isConnected } = getDb();

  try {
    if (isConnected && pool) {
      await pool.query(
        `UPDATE trips SET 
          title = COALESCE(?, title),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          budget = COALESCE(?, budget),
          cover_image = COALESCE(?, cover_image)
         WHERE id = ?`,
        [title, startDate, endDate, budget, coverImage, tripId]
      );
      const [updated] = await pool.query('SELECT * FROM trips WHERE id = ?', [tripId]);
      return res.json({ success: true, data: updated[0] });
    } else {
      const trip = memoryDb.trips.get(tripId);
      if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });

      if (title !== undefined) trip.title = title;
      if (startDate !== undefined) trip.start_date = startDate;
      if (endDate !== undefined) trip.end_date = endDate;
      if (budget !== undefined) trip.budget = parseFloat(budget);
      if (coverImage !== undefined) trip.cover_image = coverImage;

      memoryDb.trips.set(tripId, trip);
      return res.json({ success: true, data: trip });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/trips/:id
router.delete('/:id', async (req, res) => {
  const tripId = req.params.id;
  const { pool, isConnected } = getDb();

  try {
    if (isConnected && pool) {
      await pool.query('DELETE FROM trips WHERE id = ?', [tripId]);
    } else {
      memoryDb.trips.delete(tripId);
      // clean associated items
      for (const [key, item] of memoryDb.itinerary_items.entries()) {
        if (item.trip_id === tripId) memoryDb.itinerary_items.delete(key);
      }
      for (const [key, exp] of memoryDb.expenses.entries()) {
        if (exp.trip_id === tripId) memoryDb.expenses.delete(key);
      }
    }
    res.json({ success: true, message: 'Trip deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/trips/:id/items
router.post('/:id/items', async (req, res) => {
  const tripId = req.params.id;
  const {
    dayNumber = 1,
    placeId,
    name,
    category = 'do',
    latitude,
    longitude,
    address = '',
    photoUrl = '',
    rating = 4.5,
    userNotes = '',
    estimatedTime = ''
  } = req.body;

  if (!name || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, error: 'name, latitude, and longitude are required' });
  }

  let cleanCategory = 'do';
  if (category === 'eat' || /eat|food|restaurant|dining|cafe/i.test(category)) cleanCategory = 'eat';
  else if (category === 'stay' || /stay|hotel|lodging/i.test(category)) cleanCategory = 'stay';

  const itemId = generateId('item');
  const itemData = {
    id: itemId,
    trip_id: tripId,
    day_number: parseInt(dayNumber, 10) || 1,
    place_id: placeId || itemId,
    name,
    category: cleanCategory,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    address: address || '',
    photo_url: photoUrl || '',
    rating: parseFloat(rating) || 4.5,
    user_rating: 0,
    user_notes: userNotes || '',
    order_index: 0,
    estimated_time: estimatedTime || '1-2 hours'
  };

  const { pool, isConnected } = getDb();

  try {
    if (isConnected && pool) {
      const [existing] = await pool.query('SELECT id FROM trips WHERE id = ?', [tripId]);
      if (!existing.length) {
        await pool.query(
          `INSERT INTO trips (id, user_id, title, destination, country, latitude, longitude)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [tripId, req.body.userId || 'guest_default', 'Trip Workspace', 'Destination', 'Worldwide', itemData.latitude, itemData.longitude]
        );
      }
      await pool.query(
        `INSERT INTO itinerary_items (id, trip_id, day_number, place_id, name, category, latitude, longitude, address, photo_url, rating, user_rating, user_notes, order_index, estimated_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemData.id, itemData.trip_id, itemData.day_number, itemData.place_id, itemData.name,
          itemData.category, itemData.latitude, itemData.longitude, itemData.address,
          itemData.photo_url, itemData.rating, itemData.user_rating, itemData.user_notes,
          itemData.order_index, itemData.estimated_time
        ]
      );
    } else {
      if (!memoryDb.trips.has(tripId)) {
        memoryDb.trips.set(tripId, {
          id: tripId,
          user_id: 'guest_default',
          title: 'Trip Workspace',
          destination: 'Destination',
          country: 'Worldwide',
          latitude: itemData.latitude,
          longitude: itemData.longitude,
          created_at: new Date()
        });
      }
      memoryDb.itinerary_items.set(itemId, itemData);
    }
    res.status(201).json({ success: true, data: itemData });
  } catch (error) {
    console.error('Add itinerary item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/trips/:id/items/:itemId
router.put('/:id/items/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const { dayNumber, userNotes, userRating, orderIndex } = req.body;
  const { pool, isConnected } = getDb();

  try {
    if (isConnected && pool) {
      await pool.query(
        `UPDATE itinerary_items SET
          day_number = COALESCE(?, day_number),
          user_notes = COALESCE(?, user_notes),
          user_rating = COALESCE(?, user_rating),
          order_index = COALESCE(?, order_index)
         WHERE id = ?`,
        [dayNumber, userNotes, userRating, orderIndex, itemId]
      );
      const [updated] = await pool.query('SELECT * FROM itinerary_items WHERE id = ?', [itemId]);
      return res.json({ success: true, data: updated[0] });
    } else {
      const item = memoryDb.itinerary_items.get(itemId);
      if (!item) return res.status(404).json({ success: false, error: 'Item not found' });

      if (dayNumber !== undefined) item.day_number = parseInt(dayNumber, 10);
      if (userNotes !== undefined) item.user_notes = userNotes;
      if (userRating !== undefined) item.user_rating = parseInt(userRating, 10);
      if (orderIndex !== undefined) item.order_index = parseInt(orderIndex, 10);

      memoryDb.itinerary_items.set(itemId, item);
      return res.json({ success: true, data: item });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/trips/:id/items/:itemId
router.delete('/:id/items/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const { pool, isConnected } = getDb();

  try {
    if (isConnected && pool) {
      await pool.query('DELETE FROM itinerary_items WHERE id = ?', [itemId]);
    } else {
      memoryDb.itinerary_items.delete(itemId);
    }
    res.json({ success: true, message: 'Item removed from itinerary' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/trips/:id/expenses
router.post('/:id/expenses', async (req, res) => {
  const tripId = req.params.id;
  const { title, amount, category = 'Other', date = null } = req.body;

  if (!title || amount === undefined) {
    return res.status(400).json({ success: false, error: 'Title and amount are required' });
  }

  const expId = generateId('exp');
  const expData = {
    id: expId,
    trip_id: tripId,
    title,
    amount: parseFloat(amount),
    category,
    date: date || new Date().toISOString().split('T')[0],
    created_at: new Date()
  };

  const { pool, isConnected } = getDb();

  try {
    if (isConnected && pool) {
      await pool.query(
        'INSERT INTO expenses (id, trip_id, title, amount, category, date) VALUES (?, ?, ?, ?, ?, ?)',
        [expData.id, expData.trip_id, expData.title, expData.amount, expData.category, expData.date]
      );
    } else {
      memoryDb.expenses.set(expId, expData);
    }
    res.status(201).json({ success: true, data: expData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/trips/:id/expenses/:expId
router.delete('/:id/expenses/:expId', async (req, res) => {
  const { expId } = req.params;
  const { pool, isConnected } = getDb();

  try {
    if (isConnected && pool) {
      await pool.query('DELETE FROM expenses WHERE id = ?', [expId]);
    } else {
      memoryDb.expenses.delete(expId);
    }
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
