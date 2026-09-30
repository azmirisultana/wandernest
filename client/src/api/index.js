// WanderNest Client API Service
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function fetchFeaturedDestinations() {
  const res = await fetch(`${BASE_URL}/destinations/featured`);
  if (!res.ok) throw new Error('Failed to fetch featured destinations');
  return res.json();
}

export async function searchDestinations(query) {
  if (!query || query.trim().length < 2) return { success: true, data: [] };
  const res = await fetch(`${BASE_URL}/destinations/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search destinations');
  return res.json();
}

export async function fetchWeather(lat, lng) {
  const res = await fetch(`${BASE_URL}/weather?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error('Failed to fetch weather');
  return res.json();
}

export async function fetchPlaces(lat, lng, category = 'all', radius = 6000) {
  const res = await fetch(`${BASE_URL}/places?lat=${lat}&lng=${lng}&category=${category}&radius=${radius}`);
  if (!res.ok) throw new Error('Failed to fetch places');
  return res.json();
}

export async function fetchFlights(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/flights?${query}`);
  if (!res.ok) throw new Error('Failed to fetch flights');
  return res.json();
}

export async function fetchTrips(userId = 'guest_default') {
  const res = await fetch(`${BASE_URL}/trips?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to fetch trips');
  return res.json();
}

export async function fetchTrip(tripId) {
  const res = await fetch(`${BASE_URL}/trips/${tripId}`);
  if (!res.ok) throw new Error('Failed to fetch trip');
  return res.json();
}

export async function createTrip(tripData) {
  const res = await fetch(`${BASE_URL}/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tripData),
  });
  if (!res.ok) throw new Error('Failed to create trip');
  return res.json();
}

export async function updateTrip(tripId, updates) {
  const res = await fetch(`${BASE_URL}/trips/${tripId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update trip');
  return res.json();
}

export async function deleteTrip(tripId) {
  const res = await fetch(`${BASE_URL}/trips/${tripId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete trip');
  return res.json();
}

export async function addItineraryItem(tripId, itemData) {
  const res = await fetch(`${BASE_URL}/trips/${tripId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData),
  });
  if (!res.ok) throw new Error('Failed to add itinerary item');
  return res.json();
}

export async function updateItineraryItem(tripId, itemId, updates) {
  const res = await fetch(`${BASE_URL}/trips/${tripId}/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update itinerary item');
  return res.json();
}

export async function deleteItineraryItem(tripId, itemId) {
  const res = await fetch(`${BASE_URL}/trips/${tripId}/items/${itemId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove itinerary item');
  return res.json();
}

export async function addExpense(tripId, expenseData) {
  const res = await fetch(`${BASE_URL}/trips/${tripId}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData),
  });
  if (!res.ok) throw new Error('Failed to add expense');
  return res.json();
}

export async function deleteExpense(tripId, expId) {
  const res = await fetch(`${BASE_URL}/trips/${tripId}/expenses/${expId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete expense');
  return res.json();
}
