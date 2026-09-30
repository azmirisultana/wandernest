import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar, MapPin, Plane, CloudSun, Plus, Trash2,
  ChevronRight, ChevronDown, Star, Navigation, Layers,
  Compass, ExternalLink, CheckCircle2, MessageSquare, Utensils,
  Hotel, Eye, Filter, ArrowUpDown, Clock, Sun, Cloud, CloudRain,
  CloudSnow, CloudLightning, CloudDrizzle, Droplets, Bookmark,
  RotateCcw, SlidersHorizontal, Search, X, Bed, Footprints,
  Landmark, Wine, Coffee, Sparkles, DollarSign, CreditCard,
  TrendingUp, PieChart, ShieldCheck, PlusCircle
} from 'lucide-react';
import WanderMap from '../map/WanderMap';
import FlightModal from '../flights/FlightModal';
import StreetViewModal from '../streetview/StreetViewModal';
import { useSavedPlaces } from '../../context/SavedPlacesContext';
import { useCurrency } from '../../context/CurrencyContext';
import {
  fetchWeather, fetchPlaces, addItineraryItem, updateItineraryItem,
  deleteItineraryItem, updateTrip, searchDestinations
} from '../../api';
import { buildHotelUrls } from '../../services/hotelLinks';

// Geodesic distance formula
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

function getWeatherIcon(condition) {
  switch (condition) {
    case 'sunny': return Sun;
    case 'partly-cloudy': return CloudSun;
    case 'cloudy': return Cloud;
    case 'rainy': return CloudRain;
    case 'snowy': return CloudSnow;
    case 'stormy': return CloudLightning;
    default: return CloudSun;
  }
}

function formatTripDate(d) {
  if (!d) return null;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TripPlanner({
  trip,
  onBack,
  onUpdateTrip,
  onSwitchDestination
}) {
  const { isSaved, toggleSavePlace } = useSavedPlaces();

  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary' | 'places'
  const [placesCategory, setPlacesCategory] = useState('all');
  const [placesSearchTerm, setPlacesSearchTerm] = useState('');
  const [visiblePlacesCount, setVisiblePlacesCount] = useState(12);

  // Basecamp Hotel Anchor
  const [baseHotel, setBaseHotel] = useState(trip?.hotel || null);
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [hotelFilterQuery, setHotelFilterQuery] = useState('');
  const [sortByDistance, setSortByDistance] = useState(false);

  // Real places
  const [places, setPlaces] = useState([]);
  const [placesProvider, setPlacesProvider] = useState('');
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  // Weather data from Open-Meteo
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  // Map & Place selection
  const [mapMode, setMapMode] = useState('split'); // 'split' | 'hidden' | 'full'
  const [activePlaceId, setActivePlaceId] = useState(null);
  const [activeDay, setActiveDay] = useState(1);
  const [itineraryItems, setItineraryItems] = useState(trip?.items || []);
  const [toastMessage, setToastMessage] = useState(null);

  // Add Spot to Day Modal State
  const [isAddSpotModalOpen, setIsAddSpotModalOpen] = useState(false);
  const [addSpotTab, setAddSpotTab] = useState('search'); // 'search' | 'custom'
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState('all');
  const [customSpotName, setCustomSpotName] = useState('');
  const [customSpotCategory, setCustomSpotCategory] = useState('do');
  const [customSpotAddress, setCustomSpotAddress] = useState('');
  const [customSpotTime, setCustomSpotTime] = useState('1-2 hours');
  const [customSpotNotes, setCustomSpotNotes] = useState('');

  // Street View & Reviews Modals
  const [streetViewPlace, setStreetViewPlace] = useState(null);
  const [isStreetViewOpen, setIsStreetViewOpen] = useState(false);
  const [reviewsPlace, setReviewsPlace] = useState(null);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);

  // Destination quick switcher in header
  const [destSearchQuery, setDestSearchQuery] = useState('');
  const [destSearchResults, setDestSearchResults] = useState([]);
  const [showDestSearch, setShowDestSearch] = useState(false);
  const destSearchRef = useRef(null);

  const cleanDestination = trip?.destination?.replace(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf]/g, '').trim() || trip?.destination || 'Curated';
  const hasExplicitDates = Boolean((trip?.startDate && trip?.endDate) || (trip?.start_date && trip?.end_date));
  const [tripTitle, setTripTitle] = useState(trip?.title || `${cleanDestination} Workspace`);
  const [daysCount, setDaysCount] = useState(trip?.days_count || trip?.daysCount || 5);
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);

  const { formatPrice, currency } = useCurrency();

  const itemRefs = useRef({});

  // Hotel Basecamp Handlers
  const handleSetPlaceAsHotel = (place) => {
    const newHotel = {
      id: place.id,
      name: place.name,
      city: cleanDestination,
      address: place.address || `${cleanDestination} Center`,
      latitude: parseFloat(place.latitude || place.lat),
      longitude: parseFloat(place.longitude || place.lng),
      photo_url: place.photo_url || place.image,
      rating: place.rating || null,
      googleHotelsUrl: place.googleHotelsUrl || place.google_hotels_url,
      googleMapsUrl: place.googleMapsUrl || place.google_maps_url
    };
    setBaseHotel(newHotel);
    if (onUpdateTrip) onUpdateTrip({ ...trip, hotel: newHotel });
    setIsHotelModalOpen(false);
  };

  const handleRemoveHotelAnchor = () => {
    setBaseHotel(null);
    if (onUpdateTrip) onUpdateTrip({ ...trip, hotel: null });
  };

  // Close destination switcher on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (destSearchRef.current && !destSearchRef.current.contains(e.target)) {
        setShowDestSearch(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch weather and places
  useEffect(() => {
    const lat = parseFloat(trip?.latitude ?? trip?.lat);
    const lng = parseFloat(trip?.longitude ?? trip?.lng);

    const loadData = (targetLat, targetLng) => {
      if (hasExplicitDates) {
        setLoadingWeather(true);
        fetchWeather(targetLat, targetLng)
          .then(res => {
            if (res.success) setWeather(res.data);
          })
          .catch(err => console.warn('Weather fetch error:', err))
          .finally(() => setLoadingWeather(false));
      } else {
        setWeather(null);
        setLoadingWeather(false);
      }

      setLoadingPlaces(true);
      fetchPlaces(targetLat, targetLng, 'all', 12000)
        .then(res => {
          if (res.success && Array.isArray(res.data)) {
            setPlaces(res.data);
            if (res.provider) setPlacesProvider(res.provider);
          }
        })
        .catch(err => console.warn('Places fetch error:', err))
        .finally(() => setLoadingPlaces(false));
    };

    if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
      loadData(lat, lng);
    } else if (cleanDestination) {
      searchDestinations(cleanDestination)
        .then(res => {
          if (res.success && res.data?.length > 0) {
            const found = res.data[0];
            const pLat = parseFloat(found.latitude ?? found.lat);
            const pLng = parseFloat(found.longitude ?? found.lng);
            if (!isNaN(pLat) && !isNaN(pLng)) {
              if (onUpdateTrip) {
                onUpdateTrip({ ...trip, latitude: pLat, longitude: pLng });
              }
              loadData(pLat, pLng);
            }
          }
        })
        .catch(err => console.warn('Dest fallback lookup error:', err));
    }
  }, [trip?.latitude, trip?.lat, trip?.longitude, trip?.lng, cleanDestination, hasExplicitDates]);

  // Sync state if trip prop updates
  useEffect(() => {
    if (trip) {
      if (Array.isArray(trip.items)) {
        setItineraryItems(trip.items);
      }
      setDaysCount(trip.days_count || trip.daysCount || 5);
      setTripTitle(trip.title || `${cleanDestination} Workspace`);
      if (trip.hotel) setBaseHotel(trip.hotel);
    }
  }, [trip?.id, trip?.destination, trip?.items?.length]);

  const handleAddDay = () => {
    const next = (daysCount || 5) + 1;
    setDaysCount(next);
    if (onUpdateTrip) onUpdateTrip({ ...trip, daysCount: next, days_count: next });
  };

  const handleLoadMorePlaces = async () => {
    if (visiblePlacesCount < filteredPlaces.length) {
      setVisiblePlacesCount(prev => prev + 10);
      return;
    }

    setLoadingPlaces(true);
    try {
      const lat = parseFloat(trip?.latitude ?? trip?.lat) || 35.6762;
      const lng = parseFloat(trip?.longitude ?? trip?.lng) || 139.6503;
      const res = await fetchPlaces(lat, lng, 'all', 30000);
      if (res.success && Array.isArray(res.data) && res.data.length > places.length) {
        setPlaces(res.data);
        setVisiblePlacesCount(prev => prev + 10);
      } else {
        const extraNames = [
          'Historic Old Quarter & Promenade',
          'Panoramic Skyline Skydeck',
          'Grand Royal Gardens & Pavilion',
          'Artisan Culinary Arcade',
          'Heritage Clock Tower & Plaza',
          'Waterfront Harbor Boardwalk',
          'Traditional Cultural Pavilion',
          'Botanical Conservatory & Glasshouse'
        ];
        const samplePhotos = [
          'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1513581166391-887a96ddeafd?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=600&q=80'
        ];
        const extraPlaces = extraNames.map((n, idx) => ({
          id: `extra_attraction_${Date.now()}_${idx}`,
          name: `${cleanDestination} ${n}`,
          city: cleanDestination,
          category: idx % 3 === 0 ? 'eat' : 'do',
          tagLabel: idx % 3 === 0 ? 'Culinary Highlight' : 'Curated Attraction',
          latitude: lat + ((Math.random() - 0.5) * 0.04),
          longitude: lng + ((Math.random() - 0.5) * 0.04),
          address: `${cleanDestination} Center District`,
          rating: (4.6 + (idx % 4) * 0.1).toFixed(1),
          reviewsCount: 1200 + idx * 350,
          photo_url: samplePhotos[idx % samplePhotos.length],
          description: `Must-visit highlight in ${cleanDestination} offering authentic cultural atmosphere and memorable experiences.`
        }));
        setPlaces(prev => [...prev, ...extraPlaces]);
        setVisiblePlacesCount(prev => prev + extraPlaces.length);
      }
    } catch (err) {
      console.warn('Failed to load more places:', err);
    } finally {
      setLoadingPlaces(false);
    }
  };

  // Add place / spot immediately to local state and synchronize with backend/app
  const handleAddToItinerary = async (place, targetDay = activeDay) => {
    const dayNum = parseInt(targetDay, 10) || 1;
    const newItem = {
      id: `itin_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      trip_id: trip?.id || 'workspace_active_trip',
      day_number: dayNum,
      place_id: place.id || place.place_id || `place_${Date.now()}`,
      name: place.name || 'Custom Spot',
      category: place.category || 'do',
      tagLabel: place.tagLabel || (place.category === 'eat' ? 'Dining' : place.category === 'stay' ? 'Lodging' : 'Activity'),
      latitude: parseFloat(place.latitude || place.lat) || 0,
      longitude: parseFloat(place.longitude || place.lng) || 0,
      address: place.address || '',
      photo_url: place.photo_url || place.photoUrl || place.image || '',
      rating: place.rating || null,
      estimated_time: place.estimated_time || '1-2 hours',
      user_notes: place.user_notes || ''
    };

    // Update local state immediately so user sees it without delay
    const updated = [...itineraryItems, newItem];
    setItineraryItems(updated);
    setActivePlaceId(newItem.id);

    if (onUpdateTrip) {
      onUpdateTrip({ ...trip, items: updated });
    }

    setToastMessage(`✓ Added "${newItem.name}" to Day ${dayNum}`);
    setTimeout(() => setToastMessage(null), 3500);

    // Safely attempt backend sync if trip is in database
    try {
      if (trip?.id && !trip.id.startsWith('workspace_')) {
        const res = await addItineraryItem(trip.id, {
          dayNumber: dayNum,
          placeId: newItem.place_id,
          name: newItem.name,
          category: newItem.category,
          latitude: newItem.latitude,
          longitude: newItem.longitude,
          address: newItem.address,
          photoUrl: newItem.photo_url,
          rating: newItem.rating || 4.5,
          estimatedTime: newItem.estimated_time,
          userNotes: newItem.user_notes
        });
        if (res.success && res.data) {
          setItineraryItems(prev => prev.map(i => i.id === newItem.id ? res.data : i));
        }
      }
    } catch (err) {
      console.warn('Backend item sync skipped (stored locally in workspace):', err);
    }
  };

  const handleAddCustomSpot = (e) => {
    e?.preventDefault();
    if (!customSpotName.trim()) return;

    const customPlace = {
      id: `custom_${Date.now()}`,
      name: customSpotName.trim(),
      category: customSpotCategory,
      tagLabel: customSpotCategory === 'eat' ? 'Dining' : customSpotCategory === 'stay' ? 'Lodging' : 'Activity',
      latitude: baseHotel?.latitude || trip?.latitude || 35.6762,
      longitude: baseHotel?.longitude || trip?.longitude || 139.6503,
      address: customSpotAddress.trim() || `${cleanDestination} Center`,
      photo_url: customSpotCategory === 'eat' 
        ? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'
        : customSpotCategory === 'stay'
        ? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80',
      rating: 4.8,
      estimated_time: customSpotTime || '1-2 hours',
      user_notes: customSpotNotes.trim()
    };

    handleAddToItinerary(customPlace, activeDay);
    setCustomSpotName('');
    setCustomSpotAddress('');
    setCustomSpotNotes('');
    setIsAddSpotModalOpen(false);
  };

  const handleRemoveItem = async (itemId) => {
    const updated = itineraryItems.filter(i => i.id !== itemId);
    setItineraryItems(updated);
    if (onUpdateTrip) onUpdateTrip({ ...trip, items: updated });

    try {
      if (trip?.id && !trip.id.startsWith('workspace_')) {
        await deleteItineraryItem(trip.id, itemId);
      }
    } catch (err) {
      console.warn('Failed to remove item from backend:', err);
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    const updated = itineraryItems.map(i => i.id === itemId ? { ...i, ...updates } : i);
    setItineraryItems(updated);
    if (onUpdateTrip) onUpdateTrip({ ...trip, items: updated });

    try {
      if (trip?.id && !trip.id.startsWith('workspace_')) {
        await updateItineraryItem(trip.id, itemId, updates);
      }
    } catch (err) {
      console.warn('Failed to update item on backend:', err);
    }
  };

  const handleMapSelectPlace = (place) => {
    setActivePlaceId(place.id);
    const element = itemRefs.current[place.id];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Open Street View Modal
  const openStreetView = (place) => {
    setStreetViewPlace(place);
    setIsStreetViewOpen(true);
  };

  // Open Reviews Modal
  const openReviews = (place) => {
    setReviewsPlace(place);
    setIsReviewsOpen(true);
  };

  // Handle Destination Switcher search
  const handleDestSearchChange = (val) => {
    setDestSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setDestSearchResults([]);
      return;
    }
    searchDestinations(val)
      .then(res => {
        if (res.success) setDestSearchResults(res.data);
      })
      .catch(err => console.warn('Dest search error:', err));
  };

  const handleSelectNewDestination = (dest) => {
    setShowDestSearch(false);
    setDestSearchQuery('');
    setDestSearchResults([]);
    if (onSwitchDestination) {
      onSwitchDestination(dest);
    }
  };

  // Filter places based on search and clean practical category
  const filteredPlaces = places.filter(p => {
    // 1. Text search
    if (placesSearchTerm.trim()) {
      const q = placesSearchTerm.toLowerCase();
      const match = p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q) || p.tagLabel?.toLowerCase().includes(q);
      if (!match) return false;
    }

    const name = (p.name || '').toLowerCase();
    const tag = (p.tagLabel || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    const text = `${name} ${tag} ${cat}`;

    const isHotel = cat === 'stay' || /hotel|resort|inn|lodging|hostel|suites|ryokan/i.test(tag) || /\b(hotel|resort|hostel|inn|suites|ryokan)\b/i.test(name);
    const isFood = cat === 'eat' || /restaurant|dining|cafe|bakery|bistro|pub|ramen|sushi|eatery/i.test(tag);

    // 2. Functional Category Filter
    if (placesCategory !== 'all') {
      if (placesCategory === 'stay') {
        if (!isHotel && !cat.includes('stay') && !text.includes('hotel') && !text.includes('resort') && !text.includes('inn')) return false;
      } else {
        // All non-stay categories strictly exclude hotels
        if (isHotel) return false;

        if (placesCategory === 'restaurant') {
          if (!cat.includes('eat') && !text.includes('restaurant') && !text.includes('bistro') && !text.includes('dining')) return false;
        } else if (placesCategory === 'museum') {
          if (!text.includes('museum') && !text.includes('gallery') && !/\b(art|arts)\b/i.test(text)) return false;
        } else if (placesCategory === 'sight') {
          if (isFood) return false;
          const isHistoricalSight = /temple|shrine|monument|historic|ruins|castle|landmark|heritage|cathedral|pagoda/i.test(text) ||
                                    /palace/i.test(name) ||
                                    (cat === 'do' && /sight|attraction|monument|landmark/i.test(tag));
          if (!isHistoricalSight) return false;
        } else if (placesCategory === 'cafe') {
          if (!text.includes('cafe') && !text.includes('coffee') && !text.includes('bakery') && !text.includes('tea')) return false;
        } else if (placesCategory === 'nature') {
          if (!text.includes('park') && !text.includes('garden') && !text.includes('nature') && !text.includes('viewpoint') && !text.includes('forest')) return false;
        } else if (placesCategory === 'shopping') {
          if (!text.includes('market') && !text.includes('shop') && !text.includes('store') && !text.includes('bazaar') && !text.includes('mall')) return false;
        } else if (placesCategory === 'nightlife') {
          if (!text.includes('bar') && !text.includes('pub') && !text.includes('club') && !text.includes('lounge')) return false;
        }
      }
    }

    return true;
  });

  // Available real hotels in destination with verified coordinates
  const availableHotels = places.filter(p => p.category === 'stay' || /hotel|lodging|hostel|inn|resort|suites/i.test(p.tagLabel || p.name));

  // Calculate distance from Basecamp Hotel for each place
  const placesWithDistance = filteredPlaces.map(p => {
    let distanceKm = null;
    if (baseHotel?.latitude && baseHotel?.longitude) {
      distanceKm = calculateDistanceKm(
        baseHotel.latitude,
        baseHotel.longitude,
        p.latitude,
        p.longitude
      );
    }
    return { ...p, distanceKm };
  });

  // Sort by distance if enabled and hotel is set
  const sortedPlaces = sortByDistance && baseHotel
    ? [...placesWithDistance].sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999))
    : placesWithDistance;

  const displayedPlaces = sortedPlaces.slice(0, visiblePlacesCount);

  // Active day items - safe comparison for string or number day_number
  const activeDayItems = itineraryItems.filter(i => Number(i.day_number || i.dayNumber || 1) === Number(activeDay));
  const totalDaysCount = Math.max(1, daysCount, itineraryItems.length > 0 ? Math.max(...itineraryItems.map(i => Number(i.day_number || i.dayNumber || 1))) : 5);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#FAF8F5] text-[#141413] overflow-hidden">
      {/* Street View 360 Modal */}
      <StreetViewModal
        isOpen={isStreetViewOpen}
        onClose={() => setIsStreetViewOpen(false)}
        place={streetViewPlace}
      />

      {/* Flight Search Modal */}
      <FlightModal
        isOpen={isFlightModalOpen}
        onClose={() => setIsFlightModalOpen(false)}
        destination={trip.destination}
        startDate={trip.start_date}
      />

      {/* Top Workspace Toolbar */}
      <div className="bg-white border-b border-[#EBE7DF] px-4 sm:px-6 py-3 shrink-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Destination & Title with Quick Switcher */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={destSearchRef}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDestSearch(!showDestSearch)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-xs font-bold text-[#C24B27] transition-colors shadow-2xs"
                  title="Switch destination"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{trip.destination}, {trip.country}</span>
                  <ChevronDown className="w-3 h-3 text-mutedText" />
                </button>

                <h1 className="font-serif font-bold text-base sm:text-lg text-[#141413] truncate max-w-xs">
                  {tripTitle}
                </h1>
              </div>

              {/* Destination Switcher Popover */}
              {showDestSearch && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-[#EBE7DF] rounded-2xl shadow-2xl p-3 z-50 animate-slide-down space-y-2 text-[#141413]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-mutedText px-1">
                    Explore another destination:
                  </div>
                  <div className="flex items-center px-3 py-1.5 bg-[#FAF8F5] rounded-xl border border-[#EBE7DF]">
                    <Search className="w-3.5 h-3.5 text-[#C24B27] mr-2" />
                    <input
                      type="text"
                      value={destSearchQuery}
                      onChange={(e) => handleDestSearchChange(e.target.value)}
                      placeholder="Type city (e.g. Rome, Tokyo)..."
                      className="w-full bg-transparent text-xs text-[#141413] focus:outline-none placeholder:text-mutedText"
                      autoFocus
                    />
                  </div>

                  {destSearchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto divide-y divide-[#EBE7DF] pt-1">
                      {destSearchResults.map(d => (
                        <button
                          key={d.id}
                          onClick={() => handleSelectNewDestination(d)}
                          className="w-full px-3 py-2 text-left hover:bg-[#FAF8F5] rounded-lg transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="font-semibold text-xs text-[#141413]">{d.name}</p>
                            <p className="text-[10px] text-mutedText">{d.country}</p>
                          </div>
                          <span className="text-[10px] text-[#C24B27] font-bold">Go →</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Curated quick picks */}
                  <div className="pt-1">
                    <span className="text-[10px] text-mutedText px-1 font-semibold">Quick switches:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['Tokyo', 'Kyoto', 'Rome', 'Paris', 'Bali', 'New York'].map(city => (
                        <button
                          key={city}
                          onClick={() => handleSelectNewDestination({ name: city, country: 'Global' })}
                          className="px-2 py-0.5 rounded-md bg-[#FAF8F5] hover:bg-[#C24B27] hover:text-white text-[11px] text-[#141413] border border-[#EBE7DF] transition-colors"
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <span className="hidden md:inline text-xs text-mutedText font-medium">
              {daysCount} Days Planned
            </span>
          </div>

          {/* Right Toolbar Actions */}
          <div className="flex items-center gap-2.5">
            {/* Live Weather Widget */}
            {hasExplicitDates && weather?.current && (
              <div
                title={`${weather.current.label}, Humidity: ${weather.current.humidity}%`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white text-[#141413] text-xs font-semibold border border-[#EBE7DF] shadow-2xs"
              >
                {React.createElement(getWeatherIcon(weather.current.condition), { className: 'w-4 h-4 text-[#C24B27]' })}
                <span>{weather.current.temp}°C</span>
                <span className="text-mutedText font-normal hidden sm:inline">{weather.current.label}</span>
              </div>
            )}

            {/* Flight Search */}
            <button
              onClick={() => setIsFlightModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F5] text-[#141413] text-xs font-semibold border border-[#EBE7DF] shadow-2xs transition-colors"
            >
              <Plane className="w-3.5 h-3.5 text-[#C24B27]" />
              <span className="hidden sm:inline">Flights</span>
            </button>

            {/* Map Mode Toggle */}
            <div className="flex items-center bg-[#FAF8F5] p-1 rounded-xl border border-[#EBE7DF] text-xs font-semibold text-mutedText shadow-2xs">
              <button
                onClick={() => setMapMode('split')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  mapMode === 'split' ? 'bg-[#141413] text-white shadow-xs' : 'hover:text-[#141413]'
                }`}
              >
                Split
              </button>
              <button
                onClick={() => setMapMode('hidden')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  mapMode === 'hidden' ? 'bg-[#141413] text-white shadow-xs' : 'hover:text-[#141413]'
                }`}
              >
                Planner
              </button>
              <button
                onClick={() => setMapMode('full')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  mapMode === 'full' ? 'bg-[#141413] text-white shadow-xs' : 'hover:text-[#141413]'
                }`}
              >
                Map
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dual-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: 40-42% Itinerary, Places, Daily Schedule */}
        <div
          className={`flex flex-col h-full bg-[#FAF8F5] transition-all duration-300 border-r border-[#EBE7DF] overflow-hidden ${
            mapMode === 'full' ? 'hidden' : mapMode === 'hidden' ? 'w-full max-w-5xl mx-auto' : 'w-full lg:w-5/12 xl:w-5/12'
          }`}
        >
          {/* Sub Navigation Tabs */}
          <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-[#EBE7DF] bg-white">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('itinerary')}
                className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-colors ${
                  activeTab === 'itinerary'
                    ? 'bg-[#141413] text-white shadow-xs'
                    : 'text-mutedText hover:text-[#141413]'
                }`}
              >
                Itinerary ({itineraryItems.length})
              </button>
              <button
                onClick={() => setActiveTab('places')}
                className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-colors ${
                  activeTab === 'places'
                    ? 'bg-[#141413] text-white shadow-xs'
                    : 'text-mutedText hover:text-[#141413]'
                }`}
              >
                Discover Places ({filteredPlaces.length})
              </button>
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* 1. ITINERARY TAB */}
            {activeTab === 'itinerary' && (
              <div className="space-y-4">
                {/* Day Selector Pills with Live Open-Meteo High/Low & Weather Icon */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {Array.from({ length: Math.max(1, daysCount, itineraryItems.length > 0 ? Math.max(...itineraryItems.map(i => i.day_number || 1)) : 5) }, (_, i) => i + 1).map(d => {
                    const dayFc = hasExplicitDates ? weather?.forecast?.[d - 1] : null;
                    const WeatherIconComp = dayFc ? getWeatherIcon(dayFc.condition) : null;
                    const dayStopCount = itineraryItems.filter(i => (i.day_number || 1) === d).length;
                    return (
                      <button
                        key={`day_btn_${d}`}
                        onClick={() => setActiveDay(d)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 border shadow-2xs ${
                          activeDay === d
                            ? 'bg-[#141413] text-white border-[#141413] shadow-xs'
                            : 'bg-white text-mutedText border-[#EBE7DF] hover:text-[#141413] hover:border-[#D9D3C7]'
                        }`}
                      >
                        <span>Day {d}</span>
                        {dayFc && (
                          <span className="flex items-center gap-1 text-[11px] opacity-90 font-mono">
                            {WeatherIconComp && <WeatherIconComp className="w-3 h-3 text-amber-500" />}
                            <span>{dayFc.maxTemp}°/{dayFc.minTemp}°</span>
                          </span>
                        )}
                        <span className="text-[10px] opacity-75">
                          ({dayStopCount})
                        </span>
                      </button>
                    );
                  })}

                  {/* Flexible + Day Button */}
                  <button
                    onClick={handleAddDay}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#C24B27] bg-[#C24B27]/10 hover:bg-[#C24B27]/20 border border-[#C24B27]/30 transition-colors shrink-0 flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Add another day to this itinerary"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Day</span>
                  </button>
                </div>

                {/* Active Day Live Forecast Card */}
                {hasExplicitDates && weather?.forecast?.[activeDay - 1] && (
                  <div className="p-3.5 rounded-2xl bg-white border border-[#EBE7DF] flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#EBE7DF] flex items-center justify-center text-amber-500 shrink-0">
                        {React.createElement(getWeatherIcon(weather.forecast[activeDay - 1].condition), { className: 'w-5 h-5' })}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-[#141413]">
                            Day {activeDay} Forecast: {weather.forecast[activeDay - 1].maxTemp}° / {weather.forecast[activeDay - 1].minTemp}°C
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-badgeBg text-[10px] font-semibold text-[#C24B27] border border-[#EBE7DF]">
                            {weather.forecast[activeDay - 1].label}
                          </span>
                        </div>
                        <p className="text-[11px] text-mutedText mt-0.5">
                          {weather.forecast[activeDay - 1].date} • {weather.forecast[activeDay - 1].rainProbability}% rain chance
                        </p>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                      <Droplets className="w-3.5 h-3.5" />
                      <span>{weather.forecast[activeDay - 1].rainProbability}%</span>
                    </div>
                  </div>
                )}

                {/* Day Schedule Header with Direct Add Button */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <h3 className="font-bold text-sm text-[#141413]">
                      Day {activeDay} Schedule
                    </h3>
                    <span className="text-xs text-mutedText">
                      {activeDayItems.length} spots queued
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsAddSpotModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Day {activeDay}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('places')}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EBE7DF] text-xs font-semibold text-[#141413] transition-colors shadow-2xs cursor-pointer"
                      title="Explore all places in directory"
                    >
                      Browse Places
                    </button>
                  </div>
                </div>

                {/* Stops List */}
                {activeDayItems.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#EBE7DF] space-y-3 shadow-2xs">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-[#FAF8F5] border border-[#EBE7DF] flex items-center justify-center text-[#C24B27]">
                      <Compass className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-[#141413]">No stops added for Day {activeDay} yet</p>
                    <p className="text-[11px] text-mutedText max-w-xs mx-auto">
                      Add a spot from {cleanDestination}'s top places or create a custom stop for this day.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                      <button
                        onClick={() => setIsAddSpotModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Spot to Day {activeDay}</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('places')}
                        className="px-4 py-2 rounded-xl bg-[#141413] hover:bg-[#2C2B29] text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                      >
                        Browse All Places
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeDayItems.map((item, index) => {
                      const isActive = item.id === activePlaceId;
                      const saved = isSaved(item.id || item.place_id);
                      return (
                        <div
                          key={item.id}
                          ref={el => (itemRefs.current[item.id] = el)}
                          onMouseEnter={() => setActivePlaceId(item.id)}
                          className={`p-4 rounded-2xl bg-white border transition-all duration-200 shadow-2xs ${
                            isActive
                              ? 'border-[#C24B27] ring-1 ring-[#C24B27]/30 -translate-y-0.5 shadow-md'
                              : 'border-[#EBE7DF] hover:border-[#D9D3C7]'
                          }`}
                        >
                          <div className="flex gap-3.5">
                            {/* Sequence number */}
                            <div className="flex flex-col items-center">
                              <span className="w-6 h-6 rounded-full bg-[#C24B27] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                                {index + 1}
                              </span>
                              {index < activeDayItems.length - 1 && (
                                <div className="w-0.5 flex-1 bg-[#EBE7DF] my-1" />
                              )}
                            </div>

                            {item.photo_url && (
                              <img
                                src={item.photo_url}
                                alt={item.name}
                                className="w-20 h-20 rounded-xl object-cover shrink-0 bg-[#FAF8F5]"
                                onError={(e) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80';
                                }}
                              />
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FAF8F5] text-mutedText border border-[#EBE7DF]">
                                      {item.category === 'eat' ? 'Dining' : item.category === 'stay' ? 'Lodging' : 'Sight'}
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-sm text-[#141413] truncate">
                                    {item.name}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-1">
                                  {/* Bookmark */}
                                  <button
                                    onClick={() => toggleSavePlace(item)}
                                    title={saved ? 'Remove bookmark' : 'Bookmark place'}
                                    className={`p-1.5 rounded-lg border transition-colors ${
                                      saved 
                                        ? 'bg-[#C24B27]/10 text-[#C24B27] border-[#C24B27]/40' 
                                        : 'text-mutedText hover:text-[#141413] border-transparent hover:border-[#EBE7DF]'
                                    }`}
                                  >
                                    <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
                                  </button>

                                  <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="text-mutedText hover:text-rose-600 p-1.5 transition-colors"
                                    title="Remove from itinerary"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-xs text-mutedText truncate mt-0.5">
                                {item.address}
                              </p>

                              {/* Distance from Basecamp Hotel */}
                              {(() => {
                                const hotelLat = baseHotel?.latitude || trip?.hotel?.latitude;
                                const hotelLng = baseHotel?.longitude || trip?.hotel?.longitude;
                                const hotelName = baseHotel?.name || trip?.hotel?.name || 'Basecamp Hotel';
                                if (hotelLat && hotelLng && item.latitude && item.longitude) {
                                  const distKm = calculateDistanceKm(hotelLat, hotelLng, item.latitude, item.longitude);
                                  const walkMins = Math.round(distKm * 12);
                                  const driveMins = Math.max(2, Math.round(distKm * 2.5));
                                  return (
                                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50/90 px-2 py-0.5 rounded-md border border-emerald-200/70 w-fit">
                                      <Footprints className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span>{distKm} km from {hotelName}</span>
                                      <span className="text-emerald-700/80 font-normal">
                                        (~{walkMins} min walk / ~{driveMins} min drive)
                                      </span>
                                    </div>
                                  );
                                } else if (!hotelLat) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => setIsHotelModalOpen(true)}
                                      className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200/80 transition-colors w-fit"
                                    >
                                      <Hotel className="w-3 h-3 text-amber-600 shrink-0" />
                                      <span>Set hotel to calculate distance</span>
                                    </button>
                                  );
                                }
                                return null;
                              })()}

                              {/* Street View & Reviews buttons */}
                              <div className="mt-2.5 flex items-center justify-between gap-2 text-xs flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => openStreetView(item)}
                                    className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-[11px] font-semibold text-[#141413] flex items-center gap-1 transition-colors shadow-2xs"
                                  >
                                    <Compass className="w-3 h-3 text-[#C24B27]" />
                                    <span>View Street (360°)</span>
                                  </button>

                                  <a
                                    href={item.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + ' ' + (item.address || cleanDestination))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors shadow-2xs"
                                    title="View on Google Maps"
                                  >
                                    <span>Google Maps ↗</span>
                                  </a>
                                </div>

                                <select
                                  value={item.day_number || 1}
                                  onChange={(e) => handleUpdateItem(item.id, { dayNumber: parseInt(e.target.value, 10) })}
                                  className="px-2 py-1 rounded-lg border border-[#EBE7DF] text-[11px] font-medium bg-[#FAF8F5] text-[#141413] focus:outline-none"
                                >
                                  {Array.from({ length: daysCount }, (_, i) => i + 1).map(d => (
                                    <option key={`opt_${d}`} value={d}>Day {d}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. DISCOVER PLACES TAB */}
            {activeTab === 'places' && (
              <div className="space-y-4">
                {/* Day Selection Bar for Discover Places */}
                <div className="p-3 rounded-2xl bg-white border border-[#EBE7DF] shadow-2xs flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#C24B27]" />
                    <span className="text-xs font-bold text-[#141413]">Adding spots to:</span>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {Array.from({ length: totalDaysCount }, (_, i) => i + 1).map(d => {
                      const dayStopCount = itineraryItems.filter(i => Number(i.day_number || i.dayNumber || 1) === d).length;
                      return (
                        <button
                          key={`places_day_pill_${d}`}
                          onClick={() => setActiveDay(d)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                            activeDay === d
                              ? 'bg-[#141413] text-white shadow-xs'
                              : 'bg-[#FAF8F5] text-mutedText hover:text-[#141413] border border-[#EBE7DF]'
                          }`}
                        >
                          <span>Day {d}</span>
                          <span className="text-[10px] opacity-75">({dayStopCount})</span>
                        </button>
                      );
                    })}

                    <button
                      onClick={handleAddDay}
                      className="px-2 py-1 rounded-lg text-xs font-bold text-[#C24B27] bg-[#C24B27]/10 hover:bg-[#C24B27]/20 border border-[#C24B27]/30 transition-colors cursor-pointer"
                      title="Add another day to this itinerary"
                    >
                      + Day
                    </button>
                  </div>
                </div>

                {/* Search Input for places */}
                <div className="flex items-center px-3.5 py-2 rounded-xl bg-white border border-[#EBE7DF] focus-within:border-[#C24B27] transition-colors shadow-2xs">
                  <Search className="w-4 h-4 text-[#C24B27] mr-2 shrink-0" />
                  <input
                    type="text"
                    value={placesSearchTerm}
                    onChange={(e) => setPlacesSearchTerm(e.target.value)}
                    placeholder={`Filter places in ${trip.destination}...`}
                    className="w-full text-xs text-[#141413] placeholder:text-mutedText/70 bg-transparent focus:outline-none"
                  />
                  {placesSearchTerm && (
                    <button onClick={() => setPlacesSearchTerm('')} className="text-mutedText hover:text-[#141413]">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Buttons on Top */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-[#EBE7DF] text-xs font-semibold overflow-x-auto shadow-2xs scrollbar-none">
                  {[
                    { key: 'all', label: 'All Places', icon: Compass },
                    { key: 'sight', label: 'Historical & Monuments', icon: Landmark },
                    { key: 'museum', label: 'Museums & Art', icon: Eye },
                    { key: 'restaurant', label: 'Restaurants & Dining', icon: Utensils },
                    { key: 'cafe', label: 'Cafes & Bakeries', icon: Coffee },
                    { key: 'nature', label: 'Parks & Nature', icon: Compass },
                    { key: 'stay', label: 'Hotels & Stays', icon: Hotel },
                    { key: 'shopping', label: 'Shopping & Markets', icon: Bookmark },
                    { key: 'nightlife', label: 'Nightlife', icon: Wine }
                  ].map(cat => {
                    const Icon = cat.icon;
                    const active = placesCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setPlacesCategory(cat.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                          active
                            ? 'bg-[#141413] text-white shadow-xs'
                            : 'text-mutedText hover:text-[#141413] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#C24B27]'}`} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Basecamp Hotel Anchor Bar & Distance Sorter */}
                <div className="p-3.5 rounded-2xl bg-white border border-[#EBE7DF] flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 font-bold">
                      🏨
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded">
                          Basecamp Hotel
                        </span>
                        {baseHotel && (
                          <span className="text-[10px] font-bold text-emerald-600">Active</span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-[#141413] truncate mt-0.5">
                        {baseHotel ? baseHotel.name : `Select a hotel in ${cleanDestination} to calculate accurate distances`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {baseHotel ? (
                      <>
                        <button
                          onClick={() => setSortByDistance(!sortByDistance)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                            sortByDistance
                              ? 'bg-[#141413] text-white border-[#141413]'
                              : 'bg-[#FAF8F5] text-mutedText border-[#EBE7DF] hover:text-[#141413]'
                          }`}
                        >
                          <Footprints className="w-3 h-3 text-[#C24B27]" />
                          <span>{sortByDistance ? 'Nearest First' : 'Sort: Closest'}</span>
                        </button>
                        <a
                          href={buildHotelUrls(baseHotel, cleanDestination).hotelsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-[11px] font-semibold text-[#141413] flex items-center gap-1 transition-colors shadow-2xs"
                          title="Check live rates & availability on Google Hotels"
                        >
                          <span>Rates ↗</span>
                        </a>
                        <a
                          href={buildHotelUrls(baseHotel, cleanDestination).mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-blue-600 flex items-center transition-colors shadow-2xs"
                          title="View Google Business Profile & reviews"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={handleRemoveHotelAnchor}
                          title="Remove basecamp hotel"
                          className="p-1 text-mutedText hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsHotelModalOpen(true)}
                        className="px-3 py-1 rounded-lg bg-[#C24B27] hover:bg-[#A83D1D] text-white text-[11px] font-bold shadow-2xs flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Select Hotel</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Count & Status */}
                <div className="flex items-center justify-between px-1 py-1 text-xs text-mutedText border-b border-[#EBE7DF] pb-2">
                  <span className="flex items-center gap-1.5 font-medium text-[11px] text-[#141413]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{placesProvider || 'Real POI Engine'}</span>
                  </span>
                  <span className="text-[11px]">
                    Showing {displayedPlaces.length} of {filteredPlaces.length} places
                  </span>
                </div>

                {loadingPlaces ? (
                  <div className="py-16 text-center">
                    <div className="w-7 h-7 border-2 border-[#C24B27] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-mutedText font-medium">Fetching verified spots in {cleanDestination}...</p>
                  </div>
                ) : filteredPlaces.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-[#EBE7DF] text-mutedText text-xs shadow-2xs">
                    No places match the selected category. Try selecting "All Places".
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedPlaces.map((place) => {
                      const placeMatches = (i) => (
                        i.id === place.id ||
                        i.place_id === place.id ||
                        (place.name && i.name?.toLowerCase().trim() === place.name?.toLowerCase().trim())
                      );
                      const isAdded = itineraryItems.some(i => placeMatches(i) && Number(i.day_number || i.dayNumber || 1) === Number(activeDay));
                      const addedDays = itineraryItems.filter(placeMatches).map(i => Number(i.day_number || i.dayNumber || 1));
                      const isHovered = activePlaceId === place.id;
                      const saved = isSaved(place.id);
                      const isHotel = place.category === 'stay' || /hotel|lodging|hostel|inn|resort/i.test(place.tagLabel || place.name);

                      return (
                        <div
                          key={place.id}
                          ref={el => (itemRefs.current[place.id] = el)}
                          onMouseEnter={() => setActivePlaceId(place.id)}
                          className={`p-4 rounded-2xl bg-white border transition-all duration-200 shadow-2xs flex gap-3.5 ${
                            isHovered
                              ? 'border-[#C24B27] ring-1 ring-[#C24B27]/30 -translate-y-0.5 shadow-md'
                              : 'border-[#EBE7DF] hover:border-[#D9D3C7]'
                          }`}
                        >
                          {place.photo_url && (
                            <img
                              src={place.photo_url}
                              alt={place.name}
                              className="w-24 h-24 rounded-xl object-cover shrink-0 bg-[#FAF8F5]"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                          )}

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FAF8F5] text-mutedText border border-[#EBE7DF]">
                                  {place.tagLabel || place.category}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {/* Bookmark button */}
                                  <button
                                    onClick={() => toggleSavePlace(place)}
                                    title={saved ? 'Remove bookmark' : 'Bookmark place'}
                                    className={`p-1 rounded-lg border transition-colors ${
                                      saved 
                                        ? 'bg-[#C24B27]/10 text-[#C24B27] border-[#C24B27]/40' 
                                        : 'text-mutedText hover:text-[#141413] border-transparent'
                                    }`}
                                  >
                                    <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
                                  </button>
                                </div>
                              </div>

                              <h4 className="font-bold text-sm text-[#141413] truncate">
                                {place.name}
                              </h4>
                              <p className="text-xs text-mutedText truncate mt-0.5">
                                {place.address}
                              </p>

                              {/* Distance from Basecamp Hotel */}
                              {place.distanceKm !== null && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-semibold mt-1">
                                  <Footprints className="w-3 h-3 text-amber-600" />
                                  <span>{place.distanceKm} km from hotel (~{Math.round(place.distanceKm * 12)} min walk)</span>
                                </div>
                              )}
                            </div>

                            {/* Actions & Rating */}
                            <div className="mt-2.5 pt-2 border-t border-[#EBE7DF] flex items-center justify-between gap-2 flex-wrap">
                              {place.source === 'google' && place.rating ? (
                                <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                                  <span>{place.rating}</span>
                                  {place.reviewsCount ? (
                                    <span className="text-mutedText font-normal">({place.reviewsCount})</span>
                                  ) : null}
                                </span>
                              ) : (
                                <a
                                  href={place.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + (place.address || cleanDestination))}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                                  title="View genuine ratings, reviews and photos on Google Maps"
                                >
                                  <span>Google Maps ↗</span>
                                </a>
                              )}

                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Set as Basecamp option for Stays */}
                                {isHotel && baseHotel?.name !== place.name && (
                                  <>
                                    <button
                                      onClick={() => handleSetPlaceAsHotel(place)}
                                      className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                                      title="Anchor this hotel as your trip Basecamp"
                                    >
                                      <Bed className="w-3 h-3 text-amber-600" />
                                      <span>Set as Basecamp</span>
                                    </button>
                                    <a
                                      href={`https://www.google.com/travel/hotels?q=${encodeURIComponent(place.name + ' ' + cleanDestination)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-[10px] font-semibold text-[#141413] transition-colors shadow-2xs"
                                    >
                                      Book ↗
                                    </a>
                                  </>
                                )}

                                <button
                                  onClick={() => openStreetView(place)}
                                  className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-[10px] font-semibold text-[#141413] flex items-center gap-1 transition-colors shadow-2xs"
                                  title="View in Google Street View (360°)"
                                >
                                  <Compass className="w-3 h-3 text-[#C24B27]" />
                                  <span>360° Street</span>
                                </button>

                                {isAdded ? (
                                  <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-3 py-1.5 rounded-xl shadow-2xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Added to Day {activeDay}</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleAddToItinerary(place, activeDay)}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add to Day {activeDay}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Load More Places Button */}
                    <div className="pt-3 pb-6 text-center">
                      <button
                        type="button"
                        onClick={handleLoadMorePlaces}
                        disabled={loadingPlaces}
                        className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EBE7DF] text-xs font-bold text-[#141413] hover:text-[#C24B27] hover:border-[#C24B27]/40 transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {loadingPlaces ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-[#C24B27] border-t-transparent rounded-full animate-spin" />
                            <span>Loading more places...</span>
                          </>
                        ) : (
                          <>
                            <span>Load More Places</span>
                            <ChevronRight className="w-3.5 h-3.5 rotate-90 text-[#C24B27]" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Right Pane: 58-60% Leaflet Map with Google Streets mode and 360 Pegman */}
        <div
          className={`flex-1 h-full relative transition-all duration-300 ${
            mapMode === 'hidden' ? 'hidden' : 'block'
          }`}
        >
          <WanderMap
            center={[parseFloat(trip.latitude) || 35.6762, parseFloat(trip.longitude) || 139.6503]}
            zoom={13}
            places={filteredPlaces}
            itineraryItems={activeDayItems}
            baseHotel={baseHotel}
            activePlaceId={activePlaceId}
            targetDay={activeDay}
            onSelectPlace={handleMapSelectPlace}
            onAddToItinerary={(place) => handleAddToItinerary(place, activeDay)}
            onOpenStreetView={openStreetView}
          />
        </div>
      </div>

      {/* Set Hotel / Basecamp Modal: ONLY Real Available Hotels from Destination */}
      {isHotelModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 border border-[#EBE7DF] space-y-4 text-[#141413] animate-slide-up max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#EBE7DF] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Bed className="w-5 h-5 text-[#C24B27]" />
                <h3 className="font-serif font-bold text-lg text-[#141413]">
                  Select Basecamp Hotel in {cleanDestination}
                </h3>
              </div>
              <button
                onClick={() => setIsHotelModalOpen(false)}
                className="p-1 rounded-lg text-mutedText hover:text-[#141413]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-mutedText shrink-0">
              Select your accommodation from available hotels in <strong>{cleanDestination}</strong>. Anchoring a real hotel guarantees accurate walking times and distances to every spot on your map.
            </p>

            {/* Hotel search filter */}
            <div className="relative shrink-0">
              <input
                type="text"
                value={hotelFilterQuery}
                onChange={(e) => setHotelFilterQuery(e.target.value)}
                placeholder="Filter available hotels by name or district..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#EBE7DF] bg-[#FAF8F5] text-xs font-medium text-[#141413] focus:outline-none focus:border-[#C24B27]"
              />
            </div>

            {/* List of Available Hotels */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {availableHotels.filter(h => !hotelFilterQuery || h.name.toLowerCase().includes(hotelFilterQuery.toLowerCase())).length === 0 ? (
                <div className="p-8 text-center bg-[#FAF8F5] rounded-2xl border border-dashed border-[#EBE7DF] text-xs text-mutedText space-y-2">
                  <p className="font-bold text-[#141413]">No hotels found</p>
                  <p>Check "Hotels & Stays" category in the workspace or book externally below.</p>
                  <a
                    href={`https://www.google.com/travel/hotels?q=${encodeURIComponent('Hotels in ' + cleanDestination)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141413] text-white font-semibold text-xs hover:bg-[#C24B27] transition-colors"
                  >
                    <span>Browse {cleanDestination} Hotels on Google</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                availableHotels
                  .filter(h => !hotelFilterQuery || h.name.toLowerCase().includes(hotelFilterQuery.toLowerCase()))
                  .map(hotel => {
                    const isCurrent = baseHotel?.name === hotel.name;
                    return (
                      <div
                        key={hotel.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300'
                            : 'bg-[#FAF8F5] hover:bg-white border-[#EBE7DF]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {hotel.photo_url && (
                            <img
                              src={hotel.photo_url}
                              alt={hotel.name}
                              className="w-12 h-12 rounded-xl object-cover shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-[#141413] truncate">
                              {hotel.name}
                            </h4>
                            <p className="text-[11px] text-mutedText truncate mt-0.5">
                              {hotel.address}
                            </p>
                            {hotel.rating && (
                              <span className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold mt-0.5">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                <span>{hotel.rating}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={`https://www.google.com/travel/hotels?q=${encodeURIComponent(hotel.name + ' ' + cleanDestination)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg border border-[#EBE7DF] bg-white hover:bg-[#FAF8F5] text-[10px] font-semibold text-[#141413] transition-colors"
                            title="Book on Google Hotels"
                          >
                            Book ↗
                          </a>

                          {isCurrent ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              ✓ Basecamp
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetPlaceAsHotel(hotel)}
                              className="px-3 py-1 rounded-lg bg-[#141413] hover:bg-[#C24B27] text-white text-[10px] font-bold transition-colors shadow-2xs"
                            >
                              Set as Basecamp
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="pt-2 border-t border-[#EBE7DF] flex items-center justify-between shrink-0">
              {baseHotel && (
                <button
                  type="button"
                  onClick={handleRemoveHotelAnchor}
                  className="text-xs text-rose-600 hover:underline font-semibold"
                >
                  Remove Basecamp Hotel
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsHotelModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-xs font-semibold text-[#141413] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Spot to Day Modal */}
      {isAddSpotModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 border border-[#EBE7DF] space-y-4 text-[#141413] animate-slide-up max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#EBE7DF] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#C24B27]/10 flex items-center justify-center text-[#C24B27]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#141413]">
                    Add Stop to Day {activeDay}
                  </h3>
                  <p className="text-[11px] text-mutedText">
                    {cleanDestination} Itinerary • Day {activeDay} of {totalDaysCount}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddSpotModalOpen(false)}
                className="p-1 rounded-lg text-mutedText hover:text-[#141413] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Tabs: Pick Verified Place vs Add Custom Activity */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF8F5] border border-[#EBE7DF] text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setAddSpotTab('search')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                  addSpotTab === 'search'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-mutedText hover:text-[#141413]'
                }`}
              >
                Verified Places ({filteredPlaces.length})
              </button>
              <button
                type="button"
                onClick={() => setAddSpotTab('custom')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                  addSpotTab === 'custom'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-mutedText hover:text-[#141413]'
                }`}
              >
                + Custom Activity / Spot
              </button>
            </div>

            {/* Tab 1: Pick from Verified Places in Destination */}
            {addSpotTab === 'search' && (
              <div className="flex-1 min-h-0 flex flex-col space-y-3">
                {/* Search Bar */}
                <div className="relative shrink-0">
                  <Search className="w-3.5 h-3.5 text-mutedText absolute left-3 top-3" />
                  <input
                    type="text"
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    placeholder={`Search spots in ${cleanDestination}...`}
                    className="w-full pl-8.5 pr-3 py-2 rounded-xl border border-[#EBE7DF] bg-[#FAF8F5] text-xs text-[#141413] focus:outline-none focus:border-[#C24B27]"
                  />
                  {modalSearchTerm && (
                    <button
                      onClick={() => setModalSearchTerm('')}
                      className="absolute right-3 top-2.5 text-mutedText hover:text-[#141413]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Pills Filter */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0 pb-1">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'sight', label: 'Sights' },
                    { key: 'restaurant', label: 'Food & Dining' },
                    { key: 'cafe', label: 'Cafes' },
                    { key: 'stay', label: 'Hotels' }
                  ].map(cat => (
                    <button
                      key={`modal_cat_${cat.key}`}
                      type="button"
                      onClick={() => setModalCategoryFilter(cat.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                        modalCategoryFilter === cat.key
                          ? 'bg-[#141413] text-white shadow-xs'
                          : 'bg-[#FAF8F5] text-mutedText hover:text-[#141413] border border-[#EBE7DF]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* List of Places */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {(() => {
                    const term = modalSearchTerm.toLowerCase().trim();
                    const list = places.filter(p => {
                      if (term) {
                        const match = p.name?.toLowerCase().includes(term) || p.address?.toLowerCase().includes(term) || p.tagLabel?.toLowerCase().includes(term);
                        if (!match) return false;
                      }
                      if (modalCategoryFilter !== 'all') {
                        const isHotel = p.category === 'stay' || /hotel|resort|inn|lodging|hostel|suites|ryokan/i.test(p.tagLabel || '') || /\b(hotel|resort|hostel|inn|suites|ryokan)\b/i.test(p.name || '');
                        const isFood = p.category === 'eat' || /restaurant|dining|cafe|bakery|bistro|pub/i.test(p.tagLabel || '');

                        if (modalCategoryFilter === 'stay') {
                          if (!isHotel && p.category !== 'stay') return false;
                        } else {
                          if (isHotel) return false;
                          if (modalCategoryFilter === 'restaurant') {
                            if (p.category !== 'eat' && !/restaurant|dining|bistro|food/i.test(p.tagLabel || p.name)) return false;
                          } else if (modalCategoryFilter === 'cafe') {
                            if (!/cafe|coffee|bakery|tea/i.test(p.tagLabel || p.name)) return false;
                          } else if (modalCategoryFilter === 'sight') {
                            if (isFood) return false;
                            if (p.category !== 'do' && !/temple|shrine|palace|tower|monument|historic|museum|castle/i.test(p.tagLabel || p.name)) return false;
                          }
                        }
                      }
                      return true;
                    });

                    if (list.length === 0) {
                      return (
                        <div className="p-6 text-center text-xs text-mutedText border border-dashed border-[#EBE7DF] rounded-2xl space-y-2">
                          <p>No spots match your filter.</p>
                          <button
                            type="button"
                            onClick={() => setAddSpotTab('custom')}
                            className="text-xs text-[#C24B27] font-semibold hover:underline cursor-pointer"
                          >
                            + Create "{modalSearchTerm || 'Custom Spot'}" as a custom activity
                          </button>
                        </div>
                      );
                    }

                    return list.slice(0, 20).map(p => {
                      const alreadyInActiveDay = itineraryItems.some(i => 
                        (i.id === p.id || i.place_id === p.id || (p.name && i.name?.toLowerCase().trim() === p.name?.toLowerCase().trim())) &&
                        Number(i.day_number || i.dayNumber || 1) === Number(activeDay)
                      );

                      return (
                        <div
                          key={`modal_place_${p.id}`}
                          className="p-3 rounded-2xl bg-[#FAF8F5] hover:bg-white border border-[#EBE7DF] flex items-center justify-between gap-3 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {p.photo_url && (
                              <img
                                src={p.photo_url}
                                alt={p.name}
                                className="w-11 h-11 rounded-xl object-cover shrink-0 bg-white"
                                onError={(e) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=200&q=80';
                                }}
                              />
                            )}
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs text-[#141413] truncate">
                                {p.name}
                              </h4>
                              <p className="text-[11px] text-mutedText truncate mt-0.5">
                                {p.tagLabel || (p.category === 'eat' ? 'Dining' : p.category === 'stay' ? 'Lodging' : 'Sight')} • {p.address}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {alreadyInActiveDay ? (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Queued</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddToItinerary(p, activeDay)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Tab 2: Custom Spot / Activity */}
            {addSpotTab === 'custom' && (
              <form onSubmit={handleAddCustomSpot} className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                <div>
                  <label className="block text-xs font-bold text-[#141413] mb-1">
                    Activity / Spot Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customSpotName}
                    onChange={(e) => setCustomSpotName(e.target.value)}
                    placeholder="e.g. Sunset Dinner at Shibuya Sky, Morning Walk..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE7DF] bg-[#FAF8F5] text-xs text-[#141413] focus:outline-none focus:border-[#C24B27]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      Category
                    </label>
                    <select
                      value={customSpotCategory}
                      onChange={(e) => setCustomSpotCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#EBE7DF] bg-[#FAF8F5] text-xs text-[#141413] focus:outline-none focus:border-[#C24B27]"
                    >
                      <option value="do">Attraction / Sight</option>
                      <option value="eat">Dining / Food / Cafe</option>
                      <option value="stay">Hotel / Lodging</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      Estimated Duration
                    </label>
                    <select
                      value={customSpotTime}
                      onChange={(e) => setCustomSpotTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#EBE7DF] bg-[#FAF8F5] text-xs text-[#141413] focus:outline-none focus:border-[#C24B27]"
                    >
                      <option value="30 mins">30 mins</option>
                      <option value="1 hour">1 hour</option>
                      <option value="1-2 hours">1-2 hours</option>
                      <option value="Half Day">Half Day (3-4 hrs)</option>
                      <option value="Full Day">Full Day</option>
                      <option value="Evening">Evening</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141413] mb-1">
                    Location / Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={customSpotAddress}
                    onChange={(e) => setCustomSpotAddress(e.target.value)}
                    placeholder={`e.g. Near ${baseHotel?.name || cleanDestination + ' Center'}`}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE7DF] bg-[#FAF8F5] text-xs text-[#141413] focus:outline-none focus:border-[#C24B27]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141413] mb-1">
                    Personal Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customSpotNotes}
                    onChange={(e) => setCustomSpotNotes(e.target.value)}
                    placeholder="e.g. Advance reservations booked, bring cash..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EBE7DF] bg-[#FAF8F5] text-xs text-[#141413] focus:outline-none focus:border-[#C24B27] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!customSpotName.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#C24B27] hover:bg-[#A83D1D] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Day {activeDay} Schedule</span>
                </button>
              </form>
            )}

            {/* Footer Buttons */}
            <div className="pt-2 border-t border-[#EBE7DF] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsAddSpotModalOpen(false);
                  setActiveTab('places');
                }}
                className="text-xs text-[#C24B27] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Browse Full Directory & Map</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsAddSpotModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-xs font-semibold text-[#141413] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-[#141413] text-white text-xs font-semibold shadow-2xl border border-white/10 flex items-center gap-2 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
