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
import ReviewsModal from '../reviews/ReviewsModal';
import { useSavedPlaces } from '../../context/SavedPlacesContext';
import { useCurrency } from '../../context/CurrencyContext';
import { calculateTripBudget } from '../../services/budgetService';
import {
  fetchWeather, fetchPlaces, addItineraryItem, updateItineraryItem,
  deleteItineraryItem, updateTrip, searchDestinations
} from '../../api';

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

  // Trip details
  const cleanDestination = trip?.destination?.replace(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf]/g, '').trim() || trip?.destination || 'Curated';
  const [tripTitle, setTripTitle] = useState(trip?.title || `${cleanDestination} Workspace`);
  const [daysCount, setDaysCount] = useState(trip?.days_count || trip?.daysCount || 5);
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);

  const { formatPrice, currency } = useCurrency();

  // Budget & Expense Intelligence State
  const [travelStyle, setTravelStyle] = useState('standard'); // 'budget' | 'standard' | 'luxury'
  const [includeFlightsInBudget, setIncludeFlightsInBudget] = useState(false);
  const [targetBudgetInput, setTargetBudgetInput] = useState(trip?.target_budget || null);
  const [expenses, setExpenses] = useState(trip?.expenses || [
    {
      id: 'exp_1',
      title: `${trip?.hotel?.name || 'Basecamp Stay'} (Estimated)`,
      amount: trip?.hotel?.pricePerNight ? trip.hotel.pricePerNight * Math.max(1, (daysCount || 5) - 1) : 480,
      category: 'Lodging',
      date: trip?.startDate || new Date().toISOString().split('T')[0]
    },
    {
      id: 'exp_2',
      title: 'Airport Transit & Metro Pass',
      amount: 45,
      category: 'Transit',
      date: trip?.startDate || new Date().toISOString().split('T')[0]
    }
  ]);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpCategory, setNewExpCategory] = useState('Dining');
  const [newExpDate, setNewExpDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Compute live budget estimates
  const budgetEstimate = calculateTripBudget(
    cleanDestination,
    daysCount || 5,
    travelStyle,
    1,
    includeFlightsInBudget
  );

  const totalLoggedExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const targetBudgetAmount = targetBudgetInput || budgetEstimate.grandTotal;
  const remainingBudget = Math.max(0, targetBudgetAmount - totalLoggedExpenses);
  const budgetUsagePercent = Math.min(100, Math.round((totalLoggedExpenses / (targetBudgetAmount || 1)) * 100));

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newExpTitle.trim() || !newExpAmount) return;

    const newExpense = {
      id: `exp_${Date.now()}`,
      title: newExpTitle.trim(),
      amount: parseFloat(newExpAmount) || 0,
      category: newExpCategory,
      date: newExpDate || new Date().toISOString().split('T')[0]
    };

    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    if (onUpdateTrip) onUpdateTrip({ ...trip, expenses: updated });

    setNewExpTitle('');
    setNewExpAmount('');
    setIsAddExpenseOpen(false);
  };

  const handleDeleteExpense = (expId) => {
    const updated = expenses.filter(e => e.id !== expId);
    setExpenses(updated);
    if (onUpdateTrip) onUpdateTrip({ ...trip, expenses: updated });
  };

  const itemRefs = useRef({});

  // Hotel Basecamp Handlers
  const handleSetPlaceAsHotel = (place) => {
    const newHotel = {
      id: place.id,
      name: place.name,
      address: place.address || `${cleanDestination} Center`,
      latitude: parseFloat(place.latitude || place.lat),
      longitude: parseFloat(place.longitude || place.lng),
      photo_url: place.photo_url || place.image,
      rating: place.rating || 4.7
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
    if (!trip?.latitude || !trip?.longitude) return;

    setLoadingWeather(true);
    fetchWeather(trip.latitude, trip.longitude)
      .then(res => {
        if (res.success) setWeather(res.data);
      })
      .catch(err => console.warn('Weather fetch error:', err))
      .finally(() => setLoadingWeather(false));

    setLoadingPlaces(true);
    fetchPlaces(trip.latitude, trip.longitude, 'all', 12000)
      .then(res => {
        if (res.success) {
          setPlaces(res.data);
          if (res.provider) setPlacesProvider(res.provider);
        }
      })
      .catch(err => console.warn('Places fetch error:', err))
      .finally(() => setLoadingPlaces(false));
  }, [trip?.latitude, trip?.longitude]);

  // Sync state if trip prop updates
  useEffect(() => {
    if (trip) {
      setItineraryItems(trip.items || []);
      setDaysCount(trip.days_count || trip.daysCount || 5);
      setTripTitle(trip.title || `${cleanDestination} Workspace`);
      if (trip.hotel) setBaseHotel(trip.hotel);
    }
  }, [trip?.id, trip?.destination]);

  // Fix: handleAddToItinerary adds immediately to local state and updates active trip
  const handleAddToItinerary = async (place, targetDay = activeDay) => {
    const newItem = {
      id: `itin_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      trip_id: trip?.id || 'workspace_active_trip',
      day_number: targetDay,
      place_id: place.id,
      name: place.name,
      category: place.category || 'do',
      tagLabel: place.tagLabel,
      latitude: parseFloat(place.latitude || place.lat) || 0,
      longitude: parseFloat(place.longitude || place.lng) || 0,
      address: place.address || '',
      photo_url: place.photo_url || place.photoUrl || place.image || '',
      rating: place.rating || 4.6,
      estimated_time: '1-2 hours'
    };

    // Update local state immediately so user sees it without delay
    setItineraryItems(prev => {
      const updated = [...prev, newItem];
      if (onUpdateTrip) onUpdateTrip({ ...trip, items: updated });
      return updated;
    });
    setActivePlaceId(newItem.id);

    // Safely attempt backend sync if trip is in database
    try {
      if (trip?.id && !trip.id.startsWith('trip_') && !trip.id.startsWith('workspace_')) {
        const res = await addItineraryItem(trip.id, {
          dayNumber: targetDay,
          placeId: place.id,
          name: place.name,
          category: place.category,
          latitude: place.latitude,
          longitude: place.longitude,
          address: place.address,
          photoUrl: place.photo_url,
          rating: place.rating,
          estimatedTime: '1-2 hours'
        });
        if (res.success && res.data) {
          setItineraryItems(prev => prev.map(i => i.id === newItem.id ? res.data : i));
        }
      }
    } catch (err) {
      console.warn('Backend item sync skipped (stored locally in workspace):', err);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setItineraryItems(prev => {
      const updated = prev.filter(i => i.id !== itemId);
      if (onUpdateTrip) onUpdateTrip({ ...trip, items: updated });
      return updated;
    });

    try {
      if (trip?.id && !trip.id.startsWith('trip_') && !trip.id.startsWith('workspace_')) {
        await deleteItineraryItem(trip.id, itemId);
      }
    } catch (err) {
      console.warn('Failed to remove item from backend:', err);
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    setItineraryItems(prev => {
      const updated = prev.map(i => i.id === itemId ? { ...i, ...updates } : i);
      if (onUpdateTrip) onUpdateTrip({ ...trip, items: updated });
      return updated;
    });

    try {
      if (trip?.id && !trip.id.startsWith('trip_') && !trip.id.startsWith('workspace_')) {
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

    // 2. Functional Category Filter
    if (placesCategory !== 'all') {
      if (placesCategory === 'restaurant') {
        if (!cat.includes('eat') && !text.includes('restaurant') && !text.includes('bistro') && !text.includes('dining')) return false;
      } else if (placesCategory === 'museum') {
        if (!text.includes('museum') && !text.includes('gallery') && !text.includes('art')) return false;
      } else if (placesCategory === 'sight') {
        if (!cat.includes('do') && !text.includes('temple') && !text.includes('shrine') && !text.includes('palace') && !text.includes('tower') && !text.includes('monument') && !text.includes('historic')) return false;
      } else if (placesCategory === 'cafe') {
        if (!text.includes('cafe') && !text.includes('coffee') && !text.includes('bakery') && !text.includes('tea')) return false;
      } else if (placesCategory === 'stay') {
        if (!cat.includes('stay') && !text.includes('hotel') && !text.includes('resort') && !text.includes('inn')) return false;
      } else if (placesCategory === 'nature') {
        if (!text.includes('park') && !text.includes('garden') && !text.includes('nature') && !text.includes('viewpoint')) return false;
      } else if (placesCategory === 'shopping') {
        if (!text.includes('market') && !text.includes('shop') && !text.includes('store') && !text.includes('bazaar')) return false;
      } else if (placesCategory === 'nightlife') {
        if (!text.includes('bar') && !text.includes('pub') && !text.includes('club') && !text.includes('lounge')) return false;
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

  // Active day items
  const activeDayItems = itineraryItems.filter(i => (i.day_number || 1) === activeDay);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#FAF8F5] text-[#141413] overflow-hidden">
      {/* Street View 360 Modal */}
      <StreetViewModal
        isOpen={isStreetViewOpen}
        onClose={() => setIsStreetViewOpen(false)}
        place={streetViewPlace}
      />

      {/* Google Reviews Modal */}
      <ReviewsModal
        isOpen={isReviewsOpen}
        onClose={() => setIsReviewsOpen(false)}
        place={reviewsPlace}
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
            {weather?.current && (
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
              <button
                onClick={() => setActiveTab('budget')}
                className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'budget'
                    ? 'bg-[#141413] text-white shadow-xs'
                    : 'text-mutedText hover:text-[#141413]'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <span>Budget & Costs</span>
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
                    const dayFc = weather?.forecast?.[d - 1];
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
                    onClick={() => setDaysCount(prev => prev + 1)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#C24B27] bg-[#C24B27]/10 hover:bg-[#C24B27]/20 border border-[#C24B27]/30 transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                    title="Add another day to this itinerary"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Day</span>
                  </button>
                </div>

                {/* Active Day Live Forecast Card */}
                {weather?.forecast?.[activeDay - 1] && (
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

                  <button
                    onClick={() => setActiveTab('places')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Day {activeDay}</span>
                  </button>
                </div>

                {/* Stops List */}
                {activeDayItems.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#EBE7DF] space-y-3 shadow-2xs">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-[#FAF8F5] border border-[#EBE7DF] flex items-center justify-center text-[#C24B27]">
                      <Compass className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-[#141413]">No stops added for Day {activeDay} yet</p>
                    <p className="text-[11px] text-mutedText max-w-xs mx-auto">
                      Switch to "Discover Places" or select points on the map to curate your day.
                    </p>
                    <button
                      onClick={() => setActiveTab('places')}
                      className="px-4 py-2 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-semibold transition-colors shadow-2xs"
                    >
                      Discover Places in {trip.destination}
                    </button>
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

                                  <button
                                    onClick={() => openReviews(item)}
                                    className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-[11px] font-semibold text-[#141413] flex items-center gap-1 transition-colors shadow-2xs"
                                  >
                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    <span>Reviews</span>
                                  </button>
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
                          href={`https://www.google.com/travel/hotels?q=${encodeURIComponent(baseHotel.name + ' ' + cleanDestination)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-[11px] font-semibold text-[#141413] flex items-center gap-1 transition-colors shadow-2xs"
                          title="Book on Google Hotels"
                        >
                          <span>Book ↗</span>
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
                      const isAdded = itineraryItems.some(i => (i.id === place.id || i.place_id === place.id) && (i.day_number || 1) === activeDay);
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
                              <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                                <Star className="w-3.5 h-3.5 fill-amber-500" />
                                <span>{place.rating} ({place.reviewsCount || 120})</span>
                              </span>

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

                                <button
                                  onClick={() => openReviews(place)}
                                  className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-[10px] font-semibold text-[#141413] flex items-center gap-1 transition-colors shadow-2xs"
                                  title="Read Google Reviews"
                                >
                                  <span>Reviews</span>
                                </button>

                                {isAdded ? (
                                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold px-2 py-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Added to Day {activeDay}</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleAddToItinerary(place, activeDay)}
                                    className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white font-semibold text-xs transition-colors shadow-xs"
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

                    {/* Load More Button */}
                    {visiblePlacesCount < filteredPlaces.length && (
                      <div className="pt-2 text-center">
                        <button
                          onClick={() => setVisiblePlacesCount(prev => prev + 12)}
                          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EBE7DF] text-xs font-semibold text-[#141413] transition-colors shadow-2xs"
                        >
                          Load More Places ({filteredPlaces.length - visiblePlacesCount} remaining)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. REAL BUDGET & EXPENSE INTELLIGENCE TAB */}
            {activeTab === 'budget' && (
              <div className="space-y-5 animate-fade-in pb-8">
                {/* Benchmark Summary Card */}
                <div className="p-5 rounded-3xl bg-white border border-[#EBE7DF] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Destination Budget Benchmark</span>
                    </span>
                    <span className="text-xs text-mutedText">
                      {daysCount} Days Itinerary • {cleanDestination}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-4 border-b border-[#EBE7DF] pb-4">
                    <div>
                      <span className="text-xs text-mutedText block font-medium">Estimated Total Budget</span>
                      <div className="text-3xl sm:text-4xl font-serif font-bold text-[#141413]">
                        {formatPrice(budgetEstimate.grandTotal)}
                      </div>
                      <span className="text-[11px] text-mutedText mt-0.5 block">
                        ~{formatPrice(budgetEstimate.dailyAveragePerPerson)} / day per traveler
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-mutedText block mb-1">
                        Active Currency
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#EBE7DF] font-mono font-bold text-xs text-[#141413]">
                        {currency}
                      </span>
                    </div>
                  </div>

                  {/* Travel Style Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-mutedText">
                      Travel Style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'budget', label: '🎒 Backpacker', desc: 'Hostels & Local Eats' },
                        { id: 'standard', label: '☕ Standard', desc: 'Boutique & Cafes' },
                        { id: 'luxury', label: '✨ Luxury', desc: '5-Star & Fine Dining' }
                      ].map(style => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setTravelStyle(style.id)}
                          className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            travelStyle === style.id
                              ? 'bg-[#141413] text-white border-[#141413] shadow-xs'
                              : 'bg-[#FAF8F5] text-[#141413] border-[#EBE7DF] hover:bg-[#F2EFE8]'
                          }`}
                        >
                          <span className="font-bold text-xs block truncate">{style.label}</span>
                          <span className={`text-[10px] block truncate mt-0.5 ${
                            travelStyle === style.id ? 'text-white/70' : 'text-mutedText'
                          }`}>
                            {style.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Include Flight Estimate Checkbox */}
                  <label className="flex items-center gap-2.5 pt-1 text-xs text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeFlightsInBudget}
                      onChange={(e) => setIncludeFlightsInBudget(e.target.checked)}
                      className="w-4 h-4 rounded text-[#C24B27] focus:ring-[#C24B27]"
                    />
                    <span className="font-semibold">
                      Include return flight benchmark in total estimate (+{formatPrice(budgetEstimate.rates.flightPerPerson)})
                    </span>
                  </label>
                </div>

                {/* Category Cost Breakdown Grid */}
                <div className="p-5 rounded-3xl bg-white border border-[#EBE7DF] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-bold text-sm text-[#141413]">
                      Expense Category Breakdown
                    </h4>
                    <span className="text-[11px] text-mutedText">
                      Based on {daysCount} days
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Lodging */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-[#141413]">
                          <span>🏨</span>
                          <span>Lodging ({budgetEstimate.nightsCount} nights @ {formatPrice(budgetEstimate.rates.lodgingPerNight)}/nt)</span>
                        </span>
                        <span className="font-bold text-[#141413]">{formatPrice(budgetEstimate.subtotals.lodging)}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#FAF8F5] overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${budgetEstimate.breakdownPercent.lodging}%` }}
                        />
                      </div>
                    </div>

                    {/* Food */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-[#141413]">
                          <span>🍽</span>
                          <span>Dining & Drinks ({daysCount} days @ {formatPrice(budgetEstimate.rates.foodPerDay)}/day)</span>
                        </span>
                        <span className="font-bold text-[#141413]">{formatPrice(budgetEstimate.subtotals.food)}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#FAF8F5] overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${budgetEstimate.breakdownPercent.food}%` }}
                        />
                      </div>
                    </div>

                    {/* Activities */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-[#141413]">
                          <span>🏛</span>
                          <span>Sightseeing & Admissions ({daysCount} days @ {formatPrice(budgetEstimate.rates.activitiesPerDay)}/day)</span>
                        </span>
                        <span className="font-bold text-[#141413]">{formatPrice(budgetEstimate.subtotals.activities)}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#FAF8F5] overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${budgetEstimate.breakdownPercent.activities}%` }}
                        />
                      </div>
                    </div>

                    {/* Transit */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-[#141413]">
                          <span>🚇</span>
                          <span>Local Transit ({daysCount} days @ {formatPrice(budgetEstimate.rates.transitPerDay)}/day)</span>
                        </span>
                        <span className="font-bold text-[#141413]">{formatPrice(budgetEstimate.subtotals.transit)}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#FAF8F5] overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${budgetEstimate.breakdownPercent.transit}%` }}
                        />
                      </div>
                    </div>

                    {/* Flights */}
                    {includeFlightsInBudget && (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-medium text-[#141413]">
                            <span>✈</span>
                            <span>Return Airfare Benchmark</span>
                          </span>
                          <span className="font-bold text-[#141413]">{formatPrice(budgetEstimate.subtotals.flights)}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#FAF8F5] overflow-hidden">
                          <div className="h-full bg-[#C24B27] rounded-full w-full" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Spending & Expense Tracker */}
                <div className="p-5 rounded-3xl bg-white border border-[#EBE7DF] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-[#141413]">
                        Logged Expenses & Budget Health
                      </h4>
                      <p className="text-[11px] text-mutedText">
                        Track reservations, tickets, and bookings against your trip target
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddExpenseOpen(!isAddExpenseOpen)}
                      className="px-3 py-1.5 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Log Expense</span>
                    </button>
                  </div>

                  {/* Budget Health Bar */}
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EBE7DF] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-mutedText block">Total Logged</span>
                        <span className="font-bold text-sm text-[#141413]">{formatPrice(totalLoggedExpenses)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-mutedText block">Remaining Target</span>
                        <span className={`font-bold text-sm ${remainingBudget > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {formatPrice(remainingBudget)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          budgetUsagePercent > 95 ? 'bg-rose-500' : budgetUsagePercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${budgetUsagePercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-mutedText">
                      <span>{budgetUsagePercent}% of estimated target committed</span>
                      <span>Target: {formatPrice(targetBudgetAmount)}</span>
                    </div>
                  </div>

                  {/* Log Expense Form (Expandable) */}
                  {isAddExpenseOpen && (
                    <form onSubmit={handleAddExpense} className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3 animate-slide-up">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950">Record New Expense</span>
                        <button
                          type="button"
                          onClick={() => setIsAddExpenseOpen(false)}
                          className="text-mutedText hover:text-[#141413]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-mutedText mb-0.5">Title / Item</label>
                          <input
                            type="text"
                            value={newExpTitle}
                            onChange={(e) => setNewExpTitle(e.target.value)}
                            placeholder="e.g. Hotel reservation, Dinner at Sushi Dai"
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#EBE7DF] text-xs font-semibold text-[#141413] focus:outline-none focus:border-[#C24B27]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-mutedText mb-0.5">Amount ({currency})</label>
                          <input
                            type="number"
                            step="any"
                            value={newExpAmount}
                            onChange={(e) => setNewExpAmount(e.target.value)}
                            placeholder="e.g. 185"
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#EBE7DF] text-xs font-semibold text-[#141413] focus:outline-none focus:border-[#C24B27]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-mutedText mb-0.5">Category</label>
                          <select
                            value={newExpCategory}
                            onChange={(e) => setNewExpCategory(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#EBE7DF] text-xs font-semibold text-[#141413] focus:outline-none"
                          >
                            <option value="Lodging">🏨 Lodging</option>
                            <option value="Dining">🍽 Food & Dining</option>
                            <option value="Activities">🏛 Sightseeing</option>
                            <option value="Transit">🚇 Transit</option>
                            <option value="Flights">✈ Flights</option>
                            <option value="Other">✦ Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-mutedText mb-0.5">Date</label>
                          <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={newExpDate}
                            onChange={(e) => setNewExpDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#EBE7DF] text-xs font-semibold text-[#141413] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddExpenseOpen(false)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-mutedText hover:text-[#141413]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-xl bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          Save Expense
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Expense Items List */}
                  <div className="space-y-2">
                    {expenses.length === 0 ? (
                      <p className="text-xs text-mutedText text-center py-4">No expenses logged yet. Add your bookings above.</p>
                    ) : (
                      expenses.map(exp => (
                        <div
                          key={exp.id}
                          className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EBE7DF] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="w-7 h-7 rounded-xl bg-white border border-[#EBE7DF] flex items-center justify-center shrink-0">
                              {exp.category === 'Lodging' ? '🏨' : exp.category === 'Dining' ? '🍽' : exp.category === 'Transit' ? '🚇' : exp.category === 'Flights' ? '✈' : '✦'}
                            </span>
                            <div className="truncate">
                              <span className="font-bold text-[#141413] block truncate">{exp.title}</span>
                              <span className="text-[10px] text-mutedText">{exp.category} • {exp.date}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-sm text-[#141413]">
                              {formatPrice(parseFloat(exp.amount) || 0)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1 rounded-lg text-mutedText hover:text-rose-600 transition-colors"
                              title="Delete expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Destination Money-Saving Tips */}
                {budgetEstimate.tips && budgetEstimate.tips.length > 0 && (
                  <div className="p-4 rounded-3xl bg-amber-50/70 border border-amber-200/80 space-y-2 text-xs text-amber-950">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-[#C24B27] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{cleanDestination} Travel Budget Tips</span>
                    </span>
                    <ul className="space-y-1.5 text-xs text-amber-900 list-disc list-inside">
                      {budgetEstimate.tips.map((tip, idx) => (
                        <li key={idx} className="leading-relaxed">{tip}</li>
                      ))}
                    </ul>
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
            center={[trip.latitude || 35.6762, trip.longitude || 139.6503]}
            zoom={13}
            places={filteredPlaces}
            itineraryItems={activeDayItems}
            baseHotel={baseHotel}
            activePlaceId={activePlaceId}
            onSelectPlace={handleMapSelectPlace}
            onAddToItinerary={(place) => handleAddToItinerary(place, activeDay)}
            onOpenStreetView={openStreetView}
            onOpenReviews={openReviews}
          />
        </div>
      </div>

      {/* Set Hotel / Basecamp Modal: ONLY Real Available Hotels from Destination */}
      {isHotelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
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
                            <span className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold mt-0.5">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span>{hotel.rating || 4.7}</span>
                            </span>
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
                className="ml-auto px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-xs font-semibold text-[#141413] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
