// WanderNest Client API Service
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api';
  const clean = envUrl.trim().replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

const BASE_URL = getBaseUrl();

async function safeFetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    if (text.trim().startsWith('<!DOCTYPE') || text.includes('<html')) {
      console.warn(`[WanderNest] Backend API at "${url}" returned HTML instead of JSON. Ensure VITE_API_URL is set in your Vercel settings to your Render backend URL.`);
      throw new Error('API returned HTML instead of JSON. Check VITE_API_URL in Vercel settings.');
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Expected JSON but received ${contentType || 'text'}`);
    }
  }
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function fetchFeaturedDestinations() {
  return safeFetchJson(`${BASE_URL}/destinations/featured`);
}

export async function searchDestinations(query) {
  if (!query || query.trim().length < 2) return { success: true, data: [] };
  return safeFetchJson(`${BASE_URL}/destinations/search?q=${encodeURIComponent(query)}`);
}

export async function fetchWeather(lat, lng) {
  return safeFetchJson(`${BASE_URL}/weather?lat=${lat}&lng=${lng}`);
}

export async function fetchPlaces(lat, lng, category = 'all', radius = 6000) {
  return safeFetchJson(`${BASE_URL}/places?lat=${lat}&lng=${lng}&category=${category}&radius=${radius}`);
}

export async function fetchFlights(params = {}) {
  const query = new URLSearchParams(params).toString();
  return safeFetchJson(`${BASE_URL}/flights?${query}`);
}

export async function fetchTrips(userId = 'guest_default') {
  return safeFetchJson(`${BASE_URL}/trips?userId=${encodeURIComponent(userId)}`);
}

export async function fetchTrip(tripId) {
  return safeFetchJson(`${BASE_URL}/trips/${tripId}`);
}

export async function createTrip(tripData) {
  return safeFetchJson(`${BASE_URL}/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tripData),
  });
}

export async function updateTrip(tripId, updates) {
  return safeFetchJson(`${BASE_URL}/trips/${tripId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

export async function deleteTrip(tripId) {
  return safeFetchJson(`${BASE_URL}/trips/${tripId}`, {
    method: 'DELETE',
  });
}

export async function addItineraryItem(tripId, itemData) {
  return safeFetchJson(`${BASE_URL}/trips/${tripId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData),
  });
}

export async function updateItineraryItem(tripId, itemId, updates) {
  return safeFetchJson(`${BASE_URL}/trips/${tripId}/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

export async function deleteItineraryItem(tripId, itemId) {
  return safeFetchJson(`${BASE_URL}/trips/${tripId}/items/${itemId}`, {
    method: 'DELETE',
  });
}

export async function addExpense(tripId, expenseData) {
  return safeFetchJson(`${BASE_URL}/trips/${tripId}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData),
  });
}

export async function deleteExpense(tripId, expId) {
  return safeFetchJson(`${BASE_URL}/trips/${tripId}/expenses/${expId}`, {
    method: 'DELETE',
  });
}
