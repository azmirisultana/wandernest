/**
 * High-precision Google Hotels & Google Maps URL builder and Basecamp Isolation Utilities
 */

/**
 * Clean a hotel name to maximize Google Entity Knowledge Graph matching
 * @param {string} rawName 
 * @returns {string}
 */
export function cleanHotelName(rawName) {
  if (!rawName) return '';
  return rawName
    .replace(/\s*[\(\[\{].*?[\)\]\}]/g, '') // remove parenthetical notes
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract a simple, clean city name (e.g., 'Tokyo' from 'Tokyo, Japan' or an address)
 * @param {string} cityOrAddress 
 * @returns {string}
 */
export function cleanCityName(cityOrAddress) {
  if (!cityOrAddress) return '';
  // If comma separated, take the primary city part
  const parts = cityOrAddress.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  // Avoid postal codes or country-only if city is available
  return parts[0];
}

/**
 * Builds high-precision links that open the exact hotel details on Google Hotels & Google Maps
 * @param {object} hotel - Hotel or stay object
 * @param {string} fallbackCity - Current search or viewing city
 * @param {string} checkIn - Optional check-in date (YYYY-MM-DD)
 * @param {string} checkOut - Optional check-out date (YYYY-MM-DD)
 * @returns {{ hotelsUrl: string, mapsUrl: string, searchUrl: string }}
 */
export function buildHotelUrls(hotel, fallbackCity = '', checkIn = '', checkOut = '') {
  if (!hotel) {
    return { hotelsUrl: '', mapsUrl: '', searchUrl: '' };
  }

  const name = cleanHotelName(hotel.name);
  let city = hotel.city ? cleanCityName(hotel.city) : cleanCityName(fallbackCity);

  if (!city && hotel.address) {
    city = cleanCityName(hotel.address);
  }

  // Exact Google Knowledge Graph query: "Hotel Name, City"
  const entityQuery = city ? `${name}, ${city}` : name;
  const encodedQuery = encodeURIComponent(entityQuery);

  // 1. Google Hotels: Exact hotel overview, booking rates, and dates
  let hotelsUrl = hotel.googleHotelsUrl || hotel.google_hotels_url;
  if (!hotelsUrl) {
    hotelsUrl = `https://www.google.com/travel/hotels?q=${encodedQuery}`;
  }

  // Append dates if provided and not already present
  if (checkIn && checkOut && !hotelsUrl.includes('dates=')) {
    const sep = hotelsUrl.includes('?') ? '&' : '?';
    hotelsUrl += `${sep}dates=${encodeURIComponent(checkIn)}%2C${encodeURIComponent(checkOut)}`;
  }

  // 2. Google Maps / Google Profile: Opens the exact Google Business Profile card
  let mapsUrl = hotel.googleMapsUrl || hotel.google_maps_url;
  if (!mapsUrl) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
  }

  // 3. Direct Google Search fallback
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(entityQuery + ' hotel')}`;

  return {
    hotelsUrl,
    mapsUrl,
    searchUrl
  };
}

/**
 * Checks whether a basecamp hotel is in the same geographic metropolitan area as the target coordinates
 * Prevents distance bleeding across different cities or trips (e.g. Tokyo hotel showing 9,800 km in Paris)
 * @param {object} baseHotel - The active basecamp hotel
 * @param {number} targetLat - Target city or sight latitude
 * @param {number} targetLng - Target city or sight longitude
 * @param {number} maxRadiusKm - Max radius to consider within the same city (default 60 km)
 * @returns {boolean}
 */
export function isBasecampInCurrentCity(baseHotel, targetLat, targetLng, maxRadiusKm = 60) {
  if (!baseHotel?.latitude || !baseHotel?.longitude) return false;
  const hLat = parseFloat(baseHotel.latitude);
  const hLng = parseFloat(baseHotel.longitude);
  const tLat = parseFloat(targetLat);
  const tLng = parseFloat(targetLng);

  if (isNaN(hLat) || isNaN(hLng) || isNaN(tLat) || isNaN(tLng)) return false;

  const dLat = (hLat - tLat) * 111.32;
  const dLng = (hLng - tLng) * 111.32 * Math.cos((tLat * Math.PI) / 180);
  const distKm = Math.hypot(dLat, dLng);

  return distKm <= maxRadiusKm;
}
