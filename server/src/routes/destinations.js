import express from 'express';
import axios from 'axios';

const router = express.Router();

// Curated popular featured destinations for landing page
const FEATURED_DESTINATIONS = [
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    latitude: 35.6762,
    longitude: 139.6503,
    cover_image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Futuristic skyscrapers meet ancient shrines',
    highlights: ['Shibuya Crossing', 'Senso-ji Temple', 'Tokyo Skytree', 'Tsukiji Outer Market'],
    categoryTags: ['Culture', 'Sightseeing', 'Shopping']
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    latitude: 48.8566,
    longitude: 2.3522,
    cover_image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    tagline: 'The City of Light, iconic landmarks, and world-class museums',
    highlights: ['Eiffel Tower', 'Louvre Museum', 'Montmartre', 'Notre-Dame Cathedral'],
    categoryTags: ['Museums', 'Monuments', 'Architecture']
  },
  {
    id: 'rome',
    name: 'Rome',
    country: 'Italy',
    latitude: 41.9028,
    longitude: 12.4964,
    cover_image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
    tagline: 'An open-air museum of emperors and ancient wonders',
    highlights: ['Colosseum', 'Vatican City', 'Trevi Fountain', 'Pantheon'],
    categoryTags: ['Historical', 'Monuments', 'Culture']
  },
  {
    id: 'bali',
    name: 'Bali',
    country: 'Indonesia',
    latitude: -8.4095,
    longitude: 115.1889,
    cover_image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Lush terraced hills, sacred temples, and scenic coastline',
    highlights: ['Ubud Monkey Forest', 'Tanah Lot Temple', 'Tegallalang Rice Terrace', 'Seminyak Beach'],
    categoryTags: ['Nature', 'Beaches', 'Culture']
  },
  {
    id: 'new-york',
    name: 'New York City',
    country: 'United States',
    latitude: 40.7128,
    longitude: -74.0060,
    cover_image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80',
    tagline: 'The global metropolis with unmatched culture and skyline',
    highlights: ['Central Park', 'Times Square', 'Empire State Building', 'Brooklyn Bridge'],
    categoryTags: ['Cityscape', 'Museums', 'Parks']
  },
  {
    id: 'reykjavik',
    name: 'Reykjavik',
    country: 'Iceland',
    latitude: 64.1466,
    longitude: -21.9426,
    cover_image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Northern lights, geothermal lagoons, and volcanic landscapes',
    highlights: ['Blue Lagoon', 'Hallgrimskirkja', 'Golden Circle', 'Harpa Concert Hall'],
    categoryTags: ['Nature', 'Geothermal', 'Outdoors']
  }
];

// GET /api/destinations/featured
router.get('/featured', (req, res) => {
  res.json({ success: true, data: FEATURED_DESTINATIONS });
});

// GET /api/destinations/search?q=...
router.get('/search', async (req, res) => {
  const rawQuery = req.query.q;
  if (!rawQuery || rawQuery.trim().length < 2) {
    return res.json({ success: true, data: [] });
  }

  const query = rawQuery.trim();
  const queryVariants = [query];
  
  // 1. Generate apostrophe variant (e.g., "coxs bazar" -> "cox's bazar", "st johns" -> "st john's")
  const withApos = query.replace(/\b(\w+)(s)\b/gi, "$1'$2");
  if (withApos.toLowerCase() !== query.toLowerCase() && !queryVariants.includes(withApos)) {
    queryVariants.push(withApos);
  }
  // 2. Generate de-punctuated variant (e.g., "cox's bazar" -> "coxs bazar")
  const cleanPunct = query.replace(/['"’`]/g, '');
  if (cleanPunct.toLowerCase() !== query.toLowerCase() && !queryVariants.includes(cleanPunct)) {
    queryVariants.push(cleanPunct);
  }

function resolveTypeLabel(type, name, country, addresstype) {
  const t = (type || addresstype || '').toLowerCase();
  const n = (name || '').toLowerCase().trim();
  const c = (country || '').toLowerCase().trim();
  if (t === 'country' || (c && n === c)) return 'Country';
  if (t === 'state' || t === 'province') return 'State';
  if (t === 'administrative' || t === 'region' || t === 'prefecture' || t === 'county') return 'Region';
  if (t === 'island') return 'Island';
  if (t === 'city' || t === 'town' || t === 'municipality' || t === 'village') return 'City';
  return 'City';
}

const TOP_COUNTRY_HUBS = {
  japan: [
    { name: 'Japan', displayName: 'Japan', country: 'Japan', state: '', latitude: 36.2048, longitude: 138.2529, type: 'country', typeLabel: 'Country' },
    { name: 'Tokyo', displayName: 'Tokyo, Tokyo Prefecture, Japan', country: 'Japan', state: 'Tokyo Prefecture', latitude: 35.6762, longitude: 139.6503, type: 'region', typeLabel: 'Region', cover_image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80' },
    { name: 'Kyoto', displayName: 'Kyoto, Kyoto Prefecture, Japan', country: 'Japan', state: 'Kyoto Prefecture', latitude: 35.0116, longitude: 135.7681, type: 'city', typeLabel: 'City', cover_image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80' },
    { name: 'Osaka', displayName: 'Osaka, Osaka Prefecture, Japan', country: 'Japan', state: 'Osaka Prefecture', latitude: 34.6937, longitude: 135.5023, type: 'city', typeLabel: 'City', cover_image: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=1200&q=80' },
    { name: 'Hokkaido', displayName: 'Hokkaido, Japan', country: 'Japan', state: 'Hokkaido', latitude: 43.2203, longitude: 142.8635, type: 'state', typeLabel: 'State', cover_image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1200&q=80' },
    { name: 'Yokohama', displayName: 'Yokohama, Kanagawa Prefecture, Japan', country: 'Japan', state: 'Kanagawa Prefecture', latitude: 35.4437, longitude: 139.6380, type: 'city', typeLabel: 'City' },
    { name: 'Sapporo', displayName: 'Sapporo, Hokkaido, Japan', country: 'Japan', state: 'Hokkaido', latitude: 43.0618, longitude: 141.3545, type: 'city', typeLabel: 'City' }
  ],
  france: [
    { name: 'France', displayName: 'France', country: 'France', state: '', latitude: 46.2276, longitude: 2.2137, type: 'country', typeLabel: 'Country' },
    { name: 'Paris', displayName: 'Paris, Île-de-France, France', country: 'France', state: 'Île-de-France', latitude: 48.8566, longitude: 2.3522, type: 'city', typeLabel: 'City', cover_image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80' },
    { name: 'Nice', displayName: 'Nice, Provence-Alpes-Côte d\'Azur, France', country: 'France', state: 'Provence-Alpes-Côte d\'Azur', latitude: 43.7102, longitude: 7.2620, type: 'city', typeLabel: 'City', cover_image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80' },
    { name: 'Lyon', displayName: 'Lyon, Auvergne-Rhône-Alpes, France', country: 'France', state: 'Auvergne-Rhône-Alpes', latitude: 45.7640, longitude: 4.8357, type: 'city', typeLabel: 'City' },
    { name: 'Marseille', displayName: 'Marseille, France', country: 'France', state: 'Provence', latitude: 43.2965, longitude: 5.3698, type: 'city', typeLabel: 'City' }
  ],
  italy: [
    { name: 'Italy', displayName: 'Italy', country: 'Italy', state: '', latitude: 41.8719, longitude: 12.5674, type: 'country', typeLabel: 'Country' },
    { name: 'Rome', displayName: 'Rome, Lazio, Italy', country: 'Italy', state: 'Lazio', latitude: 41.9028, longitude: 12.4964, type: 'city', typeLabel: 'City', cover_image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80' },
    { name: 'Florence', displayName: 'Florence, Tuscany, Italy', country: 'Italy', state: 'Tuscany', latitude: 43.7696, longitude: 11.2558, type: 'city', typeLabel: 'City', cover_image: 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=1200&q=80' },
    { name: 'Venice', displayName: 'Venice, Veneto, Italy', country: 'Italy', state: 'Veneto', latitude: 45.4408, longitude: 12.3155, type: 'city', typeLabel: 'City' },
    { name: 'Milan', displayName: 'Milan, Lombardy, Italy', country: 'Italy', state: 'Lombardy', latitude: 45.4642, longitude: 9.1900, type: 'city', typeLabel: 'City' }
  ],
  usa: [
    { name: 'United States', displayName: 'United States', country: 'United States', state: '', latitude: 37.0902, longitude: -95.7129, type: 'country', typeLabel: 'Country' },
    { name: 'New York City', displayName: 'New York, New York, United States', country: 'United States', state: 'New York', latitude: 40.7128, longitude: -74.0060, type: 'city', typeLabel: 'City', cover_image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80' },
    { name: 'Los Angeles', displayName: 'Los Angeles, California, United States', country: 'United States', state: 'California', latitude: 34.0522, longitude: -118.2437, type: 'city', typeLabel: 'City' },
    { name: 'San Francisco', displayName: 'San Francisco, California, United States', country: 'United States', state: 'California', latitude: 37.7749, longitude: -122.4194, type: 'city', typeLabel: 'City' },
    { name: 'Hawaii', displayName: 'Hawaii, United States', country: 'United States', state: 'Hawaii', latitude: 19.8968, longitude: -155.5828, type: 'state', typeLabel: 'State' }
  ]
};

  const results = [];
  const seenKeys = new Set();

  const addResult = (item) => {
    const key = `${(item.name || '').toLowerCase()}_${item.latitude?.toFixed(2)}_${item.longitude?.toFixed(2)}`;
    if (!seenKeys.has(key) && item.name && item.latitude && item.longitude) {
      seenKeys.add(key);
      const label = item.typeLabel || resolveTypeLabel(item.type, item.name, item.country, item.addresstype);
      results.push({
        ...item,
        typeLabel: label
      });
    }
  };

  // Check top country hubs for instant rich matches
  const lowerQ = query.toLowerCase();
  for (const [cKey, hubs] of Object.entries(TOP_COUNTRY_HUBS)) {
    if (lowerQ.includes(cKey) || cKey.includes(lowerQ)) {
      for (const hub of hubs) {
        addResult(hub);
      }
    }
  }

  // Helper to query Nominatim for a query string
  const queryNominatim = async (qStr) => {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: qStr,
          format: 'json',
          addressdetails: 1,
          namedetails: 1,
          limit: 10
        },
        headers: {
          'User-Agent': 'WanderNest-Travel-App/1.0 (contact@wandernest.local)',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 4500
      });

      const list = response.data || [];
      const placeTypes = ['city', 'town', 'administrative', 'suburb', 'municipality', 'district', 'village', 'state', 'country', 'island', 'beach', 'national_park', 'region', 'county'];
      const roadTypes = ['residential', 'trunk', 'secondary', 'primary', 'tertiary', 'service', 'footway', 'track', 'unclassified'];

      // Sort places: prioritize administrative boundaries and cities over roads
      const sortedList = [...list].sort((a, b) => {
        const aIsPlace = placeTypes.includes(a.type) || placeTypes.includes(a.addresstype);
        const bIsPlace = placeTypes.includes(b.type) || placeTypes.includes(b.addresstype);
        const aIsRoad = roadTypes.includes(a.type);
        const bIsRoad = roadTypes.includes(b.type);
        if (aIsPlace && !bIsPlace) return -1;
        if (!aIsPlace && bIsPlace) return 1;
        if (!aIsRoad && bIsRoad) return -1;
        if (aIsRoad && !bIsRoad) return 1;
        return (b.importance || 0) - (a.importance || 0);
      });

      for (const item of sortedList) {
        const namedetails = item.namedetails || {};
        const address = item.address || {};

        // Extract city/town name, skipping road names if address has district/city
        let cityName = namedetails['name:en'] || namedetails['name'] || address.city || address.town || address.municipality || address.district || address.state;
        if (!cityName || roadTypes.includes(item.type)) {
          cityName = address.city || address.town || address.municipality || address.district || namedetails['name:en'] || namedetails['name'] || item.display_name.split(',')[0];
        }

        const countryName = namedetails['country:en'] || address.country || '';
        const stateName = address.state || address.province || address.county || '';

        if (cityName) {
          const parts = [cityName.trim()];
          if (stateName && stateName.trim() !== cityName.trim()) parts.push(stateName.trim());
          if (countryName && countryName.trim() !== cityName.trim()) parts.push(countryName.trim());
          const display = parts.join(', ');

          const typeLabel = resolveTypeLabel(item.type, cityName, countryName, item.addresstype);

          addResult({
            id: item.place_id.toString(),
            name: cityName.trim(),
            displayName: display,
            country: countryName,
            state: stateName,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            type: item.type,
            typeLabel
          });
        }
      }
    } catch (err) {
      // Nominatim query failure ignored to allow fallbacks
    }
  };

  // Try Nominatim with query variants
  for (const q of queryVariants) {
    await queryNominatim(q);
    // If we found solid city/place results, break early
    if (results.some(r => r.type === 'administrative' || r.type === 'city' || r.type === 'town')) {
      break;
    }
  }

  // 3. Fallback/Augment: Wikipedia OpenSearch (resolves typos, phonetic spelling, missing apostrophes worldwide)
  if (results.length === 0 || !results.some(r => ['administrative', 'city', 'town'].includes(r.type))) {
    try {
      const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&format=json`;
      const wikiRes = await axios.get(wikiSearchUrl, {
        headers: { 'User-Agent': 'WanderNestApp/1.0 (contact@wandernest.local)' },
        timeout: 4000
      });

      const titles = wikiRes.data?.[1] || [];
      for (const title of titles.slice(0, 3)) {
        try {
          const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
          const sRes = await axios.get(summaryUrl, {
            headers: { 'User-Agent': 'WanderNestApp/1.0 (contact@wandernest.local)' },
            timeout: 3500
          });
          const summary = sRes.data;
          if (summary.coordinates?.lat && summary.coordinates?.lon) {
            const desc = summary.description || '';
            let country = 'Worldwide';
            const countryMatch = desc.match(/in\s+([A-Z][a-zA-Z\s]+)/);
            if (countryMatch) country = countryMatch[1].trim();

            addResult({
              id: `wiki_dest_${summary.pageid || Date.now()}`,
              name: summary.title,
              displayName: desc ? `${summary.title} (${desc})` : summary.title,
              country,
              state: '',
              latitude: summary.coordinates.lat,
              longitude: summary.coordinates.lon,
              type: 'city',
              cover_image: summary.thumbnail?.source || summary.originalimage?.source || null
            });
          }
        } catch (e) {
          // ignore single wiki summary error
        }
      }
    } catch (err) {
      // Wikipedia error ignored
    }
  }

  // 4. Sort results to prioritize exact matching cities and administrative areas
  results.sort((a, b) => {
    const aNorm = (a.name || '').toLowerCase().replace(/['"’`\s]/g, '');
    const bNorm = (b.name || '').toLowerCase().replace(/['"’`\s]/g, '');
    const qNorm = query.toLowerCase().replace(/['"’`\s]/g, '');
    const aExact = aNorm.includes(qNorm) || qNorm.includes(aNorm);
    const bExact = bNorm.includes(qNorm) || qNorm.includes(bNorm);
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    const placeTypes = ['city', 'town', 'administrative', 'municipality', 'district', 'village', 'state', 'country'];
    const aIsPlace = placeTypes.includes(a.type);
    const bIsPlace = placeTypes.includes(b.type);
    if (aIsPlace && !bIsPlace) return -1;
    if (!aIsPlace && bIsPlace) return 1;
    return 0;
  });

  // 5. Featured destinations match if still empty
  if (results.length === 0) {
    const fallback = FEATURED_DESTINATIONS.filter(d => 
      d.name.toLowerCase().includes(query.toLowerCase()) || 
      d.country.toLowerCase().includes(query.toLowerCase())
    );
    return res.json({ success: true, data: fallback });
  }

  res.json({ success: true, data: results });
});

export default router;
