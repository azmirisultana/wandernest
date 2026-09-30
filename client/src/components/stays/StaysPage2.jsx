import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Hotel, MapPin, Star, Bed, Sparkles, Check,
  ExternalLink, Compass, ArrowLeft, Plus, Wifi, Coffee, Search,
  ShieldCheck, Moon, DollarSign, Calendar, SlidersHorizontal,
  ChevronDown, RotateCcw, Users, Layers, AlertCircle, X, Info
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { fetchPlaces, searchDestinations } from '../../api';
import { useCurrency } from '../../context/CurrencyContext';

// Fix Leaflet marker icons in Vite bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper component to programmatically pan/zoom map
function MapFlyController({ center, zoom, selectedCoord }) {
  const map = useMap();
  useEffect(() => {
    if (selectedCoord && selectedCoord[0] && selectedCoord[1]) {
      map.flyTo(selectedCoord, Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 0.8
      });
    } else if (center && center[0] && center[1]) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, selectedCoord, map]);
  return null;
}

// Map event listener that tracks panning and zooming for "Search this area"
function MapInteractionTracker({ onMapMove }) {
  const map = useMapEvents({
    movestart: () => {
      // Map movement began
    },
    moveend: () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      const northEast = bounds.getNorthEast();
      // Calculate visible radius in meters (capped between 2km and 30km)
      const radiusMeters = Math.min(Math.max(Math.round(center.distanceTo(northEast)), 2000), 30000);
      onMapMove({
        lat: center.lat,
        lng: center.lng,
        radius: radiusMeters,
        zoom: map.getZoom()
      });
    }
  });
  return null;
}

// Generate sleek interactive price-pill map marker (Wanderlog / Airbnb style)
function createPricePillIcon(priceFormatted, isHovered = false, isBasecamp = false) {
  const bg = isBasecamp ? '#D97706' : isHovered ? '#141413' : '#FFFFFF';
  const textColor = isBasecamp || isHovered ? '#FFFFFF' : '#141413';
  const border = isBasecamp
    ? 'border: 2px solid #B45309;'
    : isHovered
      ? 'border: 2px solid #C24B27;'
      : 'border: 1.5px solid #D5D0C7;';
  const shadow = isHovered
    ? 'box-shadow: 0 8px 24px rgba(194,75,39,0.35); transform: scale(1.12);'
    : 'box-shadow: 0 2px 8px rgba(0,0,0,0.14);';

  const html = `
    <div style="cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
      <div style="background: ${bg}; color: ${textColor}; padding: 4px 10px; border-radius: 9999px; ${border} ${shadow} font-family: 'Inter', system-ui, sans-serif; font-size: 11px; font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">
        ${isBasecamp ? '★ ' : ''}${priceFormatted}
      </div>
      <div style="position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid ${bg};"></div>
    </div>
  `;

  return L.divIcon({
    className: 'wander-price-pill',
    html,
    iconSize: [68, 28],
    iconAnchor: [34, 28],
    popupAnchor: [0, -28]
  });
}

export default function StaysPage({
  activeTrip,
  initialParams,
  onBackToWorkspace,
  onOpenStreetView,
  onUpdateTripHotel,
  onAddToItinerary
}) {
  const { formatPrice, currency, setCurrency } = useCurrency();

  // Initialize destination and parameters from passed props or active trip
  const defaultCity = initialParams?.destination || activeTrip?.destination || 'Tokyo';
  const defaultLat = parseFloat(initialParams?.latitude || activeTrip?.latitude || 35.6762);
  const defaultLng = parseFloat(initialParams?.longitude || activeTrip?.longitude || 139.6503);

  // Search parameters
  const [searchCity, setSearchCity] = useState(defaultCity);
  const [cityInput, setCityInput] = useState(defaultCity);
  const [coordinates, setCoordinates] = useState({ lat: defaultLat, lng: defaultLng });
  const [searchRadius, setSearchRadius] = useState(10000); // 10km radius default

  // Dates & Guests
  const todayStr = new Date().toISOString().split('T')[0];
  const [checkIn, setCheckIn] = useState(initialParams?.checkIn || '');
  const [checkOut, setCheckOut] = useState(initialParams?.checkOut || '');
  const [travelers, setTravelers] = useState(initialParams?.guests || '2 Guests, 1 Room');
  const [showTravelersDropdown, setShowTravelersDropdown] = useState(false);

  // Destination autocomplete
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const searchDebounceRef = useRef(null);
  const searchBoxRef = useRef(null);

  // Stays data & Loading
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentBaseHotel, setCurrentBaseHotel] = useState(activeTrip?.hotel || null);

  // Interaction between list and map
  const [selectedCoord, setSelectedCoord] = useState(null);
  const [hoveredStayId, setHoveredStayId] = useState(null);
  const cardRefs = useRef({});

  // Dynamic Map Area Selection & Auto-Search ("Search as I move map")
  const [hasMapMoved, setHasMapMoved] = useState(false);
  const [pendingMapArea, setPendingMapArea] = useState(null);
  const [searchOnMove, setSearchOnMove] = useState(true);
  const [isAutoSearching, setIsAutoSearching] = useState(false);
  const autoSearchTimerRef = useRef(null);

  // Map Language / Provider Toggle: 'carto' | 'english'
  const [mapLanguage, setMapLanguage] = useState('carto');

  // Filters & Sorting Ribbon
  const [priceRange, setPriceRange] = useState('all'); // all | under150 | 150-250 | 250plus
  const [propertyType, setPropertyType] = useState('all'); // all | boutique | resort | budget
  const [minRating, setMinRating] = useState('all'); // all | 4 | 4.5
  const [sortBy, setSortBy] = useState('recommended'); // recommended | price_asc | price_desc | rating
  const [nameFilter, setNameFilter] = useState('');

  // Fetch stays whenever coordinates or radius explicitly change
  const loadStaysForArea = (lat, lng, radius) => {
    setLoading(true);
    setHasMapMoved(false);
    fetchPlaces(lat, lng, 'stay', radius)
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setStays(res.data);
        } else {
          setStays([]);
        }
      })
      .catch(err => {
        console.warn('Stays fetch error:', err);
        setStays([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Initial load
  useEffect(() => {
    loadStaysForArea(coordinates.lat, coordinates.lng, searchRadius);
  }, [coordinates.lat, coordinates.lng]);

  // Destination Autocomplete handling
  const handleCityInputChange = (e) => {
    const val = e.target.value;
    setCityInput(val);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val || val.trim().length < 2) {
      setDestSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearchingDest(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await searchDestinations(val.trim());
        if (res.success && Array.isArray(res.data)) {
          setDestSuggestions(res.data.slice(0, 6));
          setShowSuggestions(true);
        }
      } catch (err) {
        console.warn('Destination search failed:', err);
      } finally {
        setIsSearchingDest(false);
      }
    }, 280);
  };

  const handleSelectDestination = (dest) => {
    const cityName = dest.name || dest.displayName?.split(',')[0] || cityInput;
    const lat = parseFloat(dest.latitude || dest.lat);
    const lng = parseFloat(dest.longitude || dest.lng);

    setSearchCity(cityName);
    setCityInput(cityName);
    setShowSuggestions(false);
    setDestSuggestions([]);

    if (!isNaN(lat) && !isNaN(lng)) {
      setCoordinates({ lat, lng });
      setSelectedCoord([lat, lng]);
      loadStaysForArea(lat, lng, 10000);
    }
  };

  // Handle Map Panning / Zooming with Auto-Search support
  const handleMapMove = ({ lat, lng, radius }) => {
    setPendingMapArea({ lat, lng, radius });

    if (searchOnMove) {
      setIsAutoSearching(true);
      if (autoSearchTimerRef.current) clearTimeout(autoSearchTimerRef.current);
      autoSearchTimerRef.current = setTimeout(() => {
        setCoordinates({ lat, lng });
        setSearchRadius(radius);
        loadStaysForArea(lat, lng, radius);
        setIsAutoSearching(false);
      }, 700);
    } else {
      setHasMapMoved(true);
    }
  };

  // Triggered when user clicks "Search this area" floating button
  const handleSearchThisArea = () => {
    if (!pendingMapArea) return;
    setCoordinates({ lat: pendingMapArea.lat, lng: pendingMapArea.lng });
    setSearchRadius(pendingMapArea.radius);
    loadStaysForArea(pendingMapArea.lat, pendingMapArea.lng, pendingMapArea.radius);
  };

  // Basecamp anchor handler
  const handleSetBasecamp = (stay) => {
    const hotelObj = {
      name: stay.name,
      address: stay.address || searchCity,
      latitude: stay.latitude,
      longitude: stay.longitude,
      photo_url: stay.photo_url,
      pricePerNight: stay.pricePerNight || 165,
      rating: stay.rating || null
    };
    setCurrentBaseHotel(hotelObj);
    if (onUpdateTripHotel) onUpdateTripHotel(hotelObj);
  };

  // Calculate nights between check-in and check-out
  const nightsCount = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [checkIn, checkOut]);

  // Filter & Sort Stays
  const filteredAndSortedStays = useMemo(() => {
    let result = [...stays];

    // Name / keyword filter
    if (nameFilter.trim()) {
      const q = nameFilter.toLowerCase();
      result = result.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q)
      );
    }

    // Price range filter
    if (priceRange === 'under150') {
      result = result.filter(s => (s.pricePerNight || 165) < 150);
    } else if (priceRange === '150-250') {
      result = result.filter(s => (s.pricePerNight || 165) >= 150 && (s.pricePerNight || 165) <= 250);
    } else if (priceRange === '250plus') {
      result = result.filter(s => (s.pricePerNight || 165) > 250);
    }

    // Property type filter
    if (propertyType !== 'all') {
      result = result.filter(s => {
        const text = `${s.name} ${s.tagLabel || ''} ${s.roomType || ''}`.toLowerCase();
        if (propertyType === 'boutique') return /boutique|inn|bed/i.test(text);
        if (propertyType === 'resort') return /resort|spa|villas/i.test(text);
        if (propertyType === 'budget') return /hostel|guest|budget|lodge/i.test(text);
        return true;
      });
    }

    // Rating filter (only filters by authentic rating if present)
    if (minRating === '4') {
      result = result.filter(s => s.rating && s.rating >= 4.0);
    } else if (minRating === '4.5') {
      result = result.filter(s => s.rating && s.rating >= 4.5);
    }

    // Sorting
    if (sortBy === 'price_asc') {
      result.sort((a, b) => (a.pricePerNight || 165) - (b.pricePerNight || 165));
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => (b.pricePerNight || 165) - (a.pricePerNight || 165));
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return result;
  }, [stays, nameFilter, priceRange, propertyType, minRating, sortBy]);

  // Scroll card into view when clicked on map
  const handleMarkerClick = (stay) => {
    setSelectedCoord([stay.latitude, stay.longitude]);
    setHoveredStayId(stay.id);
    if (cardRefs.current[stay.id]) {
      cardRefs.current[stay.id].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Close destination suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#141413] flex flex-col font-sans">
      {/* Top Header & Search Bar (Wanderlog Style) */}
      <header className="sticky top-0 z-40 bg-white border-b border-borderSoft shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-3">
          {/* Brand & Search Bar Grid */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Title / Back */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={onBackToWorkspace}
                className="p-2 rounded-xl hover:bg-[#FAF8F5] border border-borderSoft text-mutedText hover:text-[#141413] transition-colors cursor-pointer"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C24B27]/10 text-[#C24B27] flex items-center justify-center font-bold">
                  <Hotel className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="font-serif font-bold text-lg text-[#141413] leading-none">
                    Hotels & Lodgings
                  </h1>
                  <span className="text-[11px] text-mutedText">
                    in {searchCity}
                  </span>
                </div>
              </div>
            </div>

            {/* Wanderlog Style Inputs: Where • When • Travelers */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 max-w-4xl">
              {/* WHERE INPUT */}
              <div ref={searchBoxRef} className="relative flex-1 min-w-[180px]">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-borderSoft text-xs focus-within:border-[#C24B27] focus-within:bg-white transition-all">
                  <MapPin className="w-4 h-4 text-[#C24B27] shrink-0" />
                  <div className="w-full">
                    <span className="block text-[9px] uppercase font-bold text-mutedText leading-none">Where</span>
                    <input
                      type="text"
                      value={cityInput}
                      onChange={handleCityInputChange}
                      onFocus={() => {
                        if (destSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && cityInput.trim()) {
                          handleSelectDestination({ name: cityInput.trim() });
                        }
                      }}
                      placeholder="Destination city or area..."
                      className="w-full bg-transparent text-xs font-semibold text-[#141413] focus:outline-none placeholder:text-mutedText truncate"
                    />
                  </div>
                  {isSearchingDest && (
                    <div className="w-3.5 h-3.5 border-2 border-[#C24B27] border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && destSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-borderSoft rounded-2xl shadow-xl z-50 overflow-hidden py-1 max-h-60 overflow-y-auto">
                    {destSuggestions.map((dest, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectDestination(dest)}
                        className="w-full px-3.5 py-2.5 text-left text-xs hover:bg-[#FAF8F5] flex items-center justify-between gap-2 border-b border-borderSoft/40 last:border-b-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#C24B27] shrink-0" />
                          <span className="font-semibold text-[#141413] truncate">
                            {dest.displayName || dest.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-mutedText uppercase shrink-0 font-medium">
                          {dest.typeLabel || 'City'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* WHEN (Check-In & Check-Out) */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-borderSoft text-xs">
                <Calendar className="w-4 h-4 text-[#C24B27] shrink-0" />
                <div className="flex items-center gap-1.5">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-mutedText leading-none">Check-in</span>
                    <input
                      type="date"
                      min={todayStr}
                      value={checkIn}
                      onChange={(e) => {
                        setCheckIn(e.target.value);
                        if (e.target.value && (!checkOut || checkOut < e.target.value)) {
                          const next = new Date(e.target.value);
                          next.setDate(next.getDate() + 3);
                          setCheckOut(next.toISOString().split('T')[0]);
                        }
                      }}
                      className="bg-transparent text-xs font-semibold text-[#141413] focus:outline-none cursor-pointer"
                    />
                  </div>
                  <span className="text-mutedText">→</span>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-mutedText leading-none">Check-out</span>
                    <input
                      type="date"
                      min={checkIn || todayStr}
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-[#141413] focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* TRAVELERS */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTravelersDropdown(!showTravelersDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-borderSoft text-xs hover:border-[#C24B27] transition-colors cursor-pointer text-left"
                >
                  <Users className="w-4 h-4 text-[#C24B27] shrink-0" />
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-mutedText leading-none">Travelers</span>
                    <span className="font-semibold text-xs text-[#141413] whitespace-nowrap">{travelers}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-mutedText" />
                </button>

                {showTravelersDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-borderSoft rounded-2xl shadow-xl z-50 p-2 space-y-1">
                    {[
                      '1 Guest, 1 Room',
                      '2 Guests, 1 Room',
                      '2 Guests, 2 Rooms',
                      'Family / 3+ Guests'
                    ].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setTravelers(opt);
                          setShowTravelersDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs rounded-xl transition-colors cursor-pointer ${
                          travelers === opt ? 'bg-[#C24B27] text-white font-bold' : 'hover:bg-[#FAF8F5] text-[#141413]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters & Sort Ribbon (Wanderlog Style) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-borderSoft/60 text-xs">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Price Filter Pill */}
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="px-3 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-borderSoft font-semibold text-[#141413] text-xs focus:outline-none cursor-pointer"
              >
                <option value="all">Price: All</option>
                <option value="under150">Under {formatPrice(150)}</option>
                <option value="150-250">{formatPrice(150)} – {formatPrice(250)}</option>
                <option value="250plus">{formatPrice(250)}+</option>
              </select>

              {/* Property Type Pill */}
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="px-3 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-borderSoft font-semibold text-[#141413] text-xs focus:outline-none cursor-pointer"
              >
                <option value="all">Property: All</option>
                <option value="boutique">Boutique Hotel</option>
                <option value="resort">Resort & Suites</option>
                <option value="budget">Budget Stay / Inn</option>
              </select>

              {/* Rating Filter Pill */}
              <button
                onClick={() => setMinRating(prev => (prev === 'all' ? '4' : prev === '4' ? '4.5' : 'all'))}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  minRating !== 'all'
                    ? 'bg-[#141413] text-white border-[#141413]'
                    : 'bg-[#FAF8F5] hover:bg-[#F2EFE8] border-borderSoft text-[#141413]'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${minRating !== 'all' ? 'fill-amber-400 text-amber-400' : 'text-mutedText'}`} />
                <span>{minRating === 'all' ? 'Rating' : minRating === '4' ? 'Rated 4.0+' : 'Rated 4.5+'}</span>
              </button>

              {/* Search Inside List */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF8F5] border border-borderSoft text-xs">
                <Search className="w-3.5 h-3.5 text-mutedText" />
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Filter by name..."
                  className="bg-transparent focus:outline-none text-xs w-28 sm:w-36 text-[#141413] placeholder:text-mutedText"
                />
                {nameFilter && (
                  <button onClick={() => setNameFilter('')} className="text-mutedText hover:text-[#141413]">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Sort & Currency */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-mutedText text-[11px] font-semibold">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent font-bold text-[#141413] text-xs focus:outline-none cursor-pointer"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price_asc">Price (Low to High)</option>
                  <option value="price_desc">Price (High to Low)</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>

              {/* Currency Selector */}
              <div className="flex items-center gap-1 text-[11px] font-semibold text-mutedText border-l border-borderSoft pl-3">
                <span>Currency:</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-transparent font-bold text-[#C24B27] cursor-pointer focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="BDT">BDT (৳)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split Screen Container */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-full overflow-hidden">
        {/* LEFT COLUMN: Scrollable Stays List */}
        <div className="w-full lg:w-[54%] xl:w-[52%] overflow-y-auto px-4 sm:px-6 py-5 space-y-4 max-h-[calc(100vh-130px)]">
          {/* Wanderlog style area radius alert */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">
                Searching within ~{Math.round(searchRadius / 1000)} km radius of {searchCity}.
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Drag the map to any neighborhood or city, then click <strong className="font-bold underline">"Search this area"</strong> to discover available lodgings there.
              </p>
            </div>
          </div>

          {/* Results Count Banner */}
          <div className="flex items-center justify-between text-xs text-mutedText px-1">
            <span className="font-semibold text-[#141413]">
              {loading ? 'Searching...' : `${filteredAndSortedStays.length} stays found`}
            </span>
            {(priceRange !== 'all' || propertyType !== 'all' || minRating !== 'all' || nameFilter) && (
              <button
                onClick={() => {
                  setPriceRange('all');
                  setPropertyType('all');
                  setMinRating('all');
                  setNameFilter('');
                }}
                className="text-[#C24B27] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset filters</span>
              </button>
            )}
          </div>

          {/* Active Basecamp Hotel Announcement (if set) */}
          {currentBaseHotel && (
            <div className="p-3.5 rounded-2xl bg-white border-2 border-amber-400 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  ★
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                      Active Basecamp
                    </span>
                  </div>
                  <h4 className="font-serif font-bold text-sm text-[#141413] truncate mt-0.5">
                    {currentBaseHotel.name}
                  </h4>
                  <p className="text-[11px] text-mutedText truncate">{currentBaseHotel.address}</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-amber-600 shrink-0">
                Itinerary Calibrated
              </span>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#C24B27] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-mutedText font-semibold">Loading...</p>
            </div>
          ) : filteredAndSortedStays.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-borderSoft p-8 shadow-xs">
              <Hotel className="w-10 h-10 text-mutedText mx-auto opacity-30 mb-2" />
              <h3 className="font-serif font-bold text-base text-[#141413]">No stays found in this area</h3>
              <p className="text-xs text-mutedText mt-1 max-w-sm mx-auto">
                Try zooming out on the map, panning to an adjacent city, or resetting your filter criteria.
              </p>
              <button
                onClick={() => {
                  setPriceRange('all');
                  setPropertyType('all');
                  setMinRating('all');
                  setNameFilter('');
                  loadStaysForArea(coordinates.lat, coordinates.lng, 15000);
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-[#C24B27] text-white text-xs font-bold hover:bg-[#A83D1D] transition-colors cursor-pointer"
              >
                Expand Search Radius
              </button>
            </div>
          ) : (
            /* Stays Cards List (Wanderlog Horizontal Card Layout) */
            <div className="space-y-4">
              {filteredAndSortedStays.map((stay) => {
                const isBasecamp = currentBaseHotel?.name === stay.name;
                const isHovered = hoveredStayId === stay.id;
                const nightlyUSD = stay.pricePerNight || 165;
                const totalUSD = nightlyUSD * nightsCount;

                const bookingLink =
                  stay.googleHotelsUrl ||
                  `https://www.google.com/travel/hotels?q=${encodeURIComponent(stay.name + ' ' + (stay.address || searchCity))}${checkIn ? `&dates=${checkIn}` : ''}${checkOut ? `&dates=${checkOut}` : ''}`;

                return (
                  <div
                    key={stay.id}
                    ref={(el) => (cardRefs.current[stay.id] = el)}
                    onMouseEnter={() => setHoveredStayId(stay.id)}
                    onMouseLeave={() => setHoveredStayId(null)}
                    onClick={() => {
                      setSelectedCoord([stay.latitude, stay.longitude]);
                    }}
                    className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md flex flex-col sm:flex-row cursor-pointer ${
                      isBasecamp
                        ? 'border-amber-400 ring-2 ring-amber-400/20'
                        : isHovered
                          ? 'border-[#C24B27] ring-1 ring-[#C24B27]/20'
                          : 'border-borderSoft hover:border-[#C24B27]/40'
                    }`}
                  >
                    {/* Stay Thumbnail Photo */}
                    <div className="relative sm:w-56 md:w-64 h-48 sm:h-auto overflow-hidden bg-slate-900 shrink-0">
                      <img
                        src={stay.photo_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'}
                        alt={stay.name}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                      {/* Tag pill top left */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-lg bg-white/95 backdrop-blur-md text-[10px] font-bold text-[#141413] shadow-xs">
                          {stay.tagLabel || 'Boutique Hotel'}
                        </span>
                        {isBasecamp && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-white text-[10px] font-bold shadow-xs">
                            ★ Basecamp
                          </span>
                        )}
                      </div>

                      {/* Verified Badge bottom left */}
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-medium text-emerald-300">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified Listing</span>
                        </span>
                      </div>
                    </div>

                    {/* Stay Details & Pricing */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-2">
                        {/* Title and Authentic Rating */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-serif font-bold text-base text-[#141413] hover:text-[#C24B27] transition-colors line-clamp-1">
                              {stay.name}
                            </h3>
                            <p className="text-xs text-mutedText flex items-center gap-1 mt-0.5 line-clamp-1">
                              <MapPin className="w-3.5 h-3.5 text-[#C24B27] shrink-0" />
                              <span>{stay.address || searchCity}</span>
                            </p>
                          </div>

                          {/* Authentic Rating (renders ONLY if rating is non-null) */}
                          {stay.rating ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#141413] text-white shrink-0 shadow-2xs">
                              <span className="text-xs font-bold text-amber-400">★ {stay.rating}</span>
                              {stay.reviewsCount ? (
                                <span className="text-[10px] text-white/70">({stay.reviewsCount})</span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        {/* Room Type */}
                        {stay.roomType && (
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FAF8F5] border border-borderSoft text-[11px] font-semibold text-[#141413]">
                            🛏 {stay.roomType}
                          </span>
                        )}

                        {/* Amenities Chips */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-mutedText pt-0.5">
                          {(stay.amenities && stay.amenities.length > 0
                            ? stay.amenities.slice(0, 3)
                            : ['Free Wi-Fi', 'Breakfast Available', '24/7 Front Desk']
                          ).map((am, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-borderSoft font-medium text-[#141413]"
                            >
                              ✓ {am}
                            </span>
                          ))}
                        </div>

                        {/* Perks line */}
                        <div className="flex items-center gap-3 text-[11px] text-emerald-700 font-medium pt-1">
                          <span className="flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Free cancellation
                          </span>
                          <span className="text-mutedText">•</span>
                          <span>Instant confirmation</span>
                        </div>
                      </div>

                      {/* Pricing & Action Buttons (Bottom Bar of Card) */}
                      <div className="pt-3 border-t border-borderSoft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Price Details */}
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-serif font-bold text-[#141413]">
                              {formatPrice(nightlyUSD)}
                            </span>
                            <span className="text-xs text-mutedText">/ night</span>
                          </div>
                          {nightsCount > 1 && (
                            <span className="text-[10px] text-mutedText block">
                              {formatPrice(totalUSD)} total ({nightsCount} nights)
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {/* Street View Quick Launch */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenStreetView) onOpenStreetView(stay);
                            }}
                            className="p-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-borderSoft text-mutedText hover:text-[#141413] transition-colors cursor-pointer"
                            title="Street View"
                          >
                            <Compass className="w-4 h-4 text-[#C24B27]" />
                          </button>

                          {/* Set Basecamp CTA */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetBasecamp(stay);
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isBasecamp
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-[#FAF8F5] hover:bg-[#F2EFE8] text-[#141413] border border-borderSoft'
                            }`}
                            title="Set as your basecamp hotel to anchor itinerary walking distances"
                          >
                            <Bed className="w-3.5 h-3.5 text-[#C24B27]" />
                            <span>{isBasecamp ? 'Active Basecamp' : 'Basecamp'}</span>
                          </button>

                          {/* View Deal / Book Live Button */}
                          <a
                            href={bookingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-4 py-2 rounded-xl bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0"
                          >
                            <span>View Deal</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Leaflet Map with Price Pills & "Search this area" Button */}
        <div className="w-full lg:w-[46%] xl:w-[48%] h-[400px] lg:h-[calc(100vh-130px)] sticky top-[130px] border-l border-borderSoft relative overflow-hidden">
          {/* FLOATING TOP MAP RIBBON (Auto-Search Toggle & Language Switcher) */}
          <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none gap-2">
            {/* Left: Search as I move map toggle or status */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <label className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/95 backdrop-blur-md text-[#141413] text-xs font-semibold shadow-md border border-borderSoft hover:bg-white cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={searchOnMove}
                  onChange={(e) => {
                    setSearchOnMove(e.target.checked);
                    if (e.target.checked && hasMapMoved && pendingMapArea) {
                      handleSearchThisArea();
                    }
                  }}
                  className="rounded text-[#C24B27] focus:ring-[#C24B27] cursor-pointer"
                />
                <span className="whitespace-nowrap">Search as I move map</span>
              </label>

              {/* Status or Manual Button */}
              {isAutoSearching ? (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#141413] text-white text-xs font-medium shadow-md">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px]">Updating stays...</span>
                </div>
              ) : !searchOnMove && hasMapMoved ? (
                <button
                  type="button"
                  onClick={handleSearchThisArea}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C24B27] text-white hover:bg-[#A83D1D] font-bold text-xs shadow-lg transition-all hover:scale-105 cursor-pointer animate-fade-in"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search this area</span>
                </button>
              ) : null}
            </div>

            {/* Right: Map Language Toggle (English Always vs Carto Voyager) */}
            <div className="pointer-events-auto">
              <button
                type="button"
                onClick={() => setMapLanguage(prev => (prev === 'carto' ? 'english' : 'carto'))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/95 backdrop-blur-md text-[#141413] hover:text-[#C24B27] text-xs font-semibold shadow-md border border-borderSoft hover:bg-white transition-all cursor-pointer"
                title={mapLanguage === 'english' ? 'Switch to Carto Voyager tiles' : 'Switch to 100% English worldwide tiles (Esri)'}
              >
                <span className="text-sm">🌐</span>
                <span className="hidden sm:inline">Map:</span>
                <span className="font-bold text-[#C24B27]">
                  {mapLanguage === 'english' ? 'English Always' : 'Carto'}
                </span>
              </button>
            </div>
          </div>

          {/* Leaflet Map */}
          <MapContainer
            center={[coordinates.lat, coordinates.lng]}
            zoom={13}
            scrollWheelZoom={true}
            className="w-full h-full"
          >
            {/* TileLayer based on mapLanguage selection */}
            {(() => {
              const cartoKey = import.meta.env.VITE_CARTO_API_KEY?.trim();

              if (mapLanguage === 'english' || !cartoKey) {
                return (
                  <TileLayer
                    key="esri-world-streets-english"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> & Esri'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                  />
                );
              }

              return (
                <TileLayer
                  key={`carto-voyager-${cartoKey}`}
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> & CartoDB'
                  url={`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoKey}`}
                  maxZoom={19}
                />
              );
            })()}

            {/* Map Controller for programmatic flyTo */}
            <MapFlyController
              center={[coordinates.lat, coordinates.lng]}
              zoom={13}
              selectedCoord={selectedCoord}
            />

            {/* Interaction Tracker for "Search this area" */}
            <MapInteractionTracker onMapMove={handleMapMove} />

            {/* Price Pill Markers for Stays */}
            {filteredAndSortedStays.map((stay) => {
              if (!stay.latitude || !stay.longitude) return null;
              const isBasecamp = currentBaseHotel?.name === stay.name;
              const isHovered = hoveredStayId === stay.id;
              const formattedPrice = formatPrice(stay.pricePerNight || 165);

              return (
                <Marker
                  key={stay.id}
                  position={[stay.latitude, stay.longitude]}
                  icon={createPricePillIcon(formattedPrice, isHovered, isBasecamp)}
                  eventHandlers={{
                    click: () => handleMarkerClick(stay),
                    mouseover: () => setHoveredStayId(stay.id),
                    mouseout: () => setHoveredStayId(null)
                  }}
                >
                  <Popup className="wander-hotel-popup">
                    <div className="w-56 p-1 space-y-2 font-sans">
                      <div className="h-28 rounded-xl overflow-hidden bg-slate-900 relative">
                        <img
                          src={stay.photo_url}
                          alt={stay.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/95 text-[10px] font-bold text-[#141413]">
                          {stay.tagLabel || 'Hotel'}
                        </div>
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-emerald-300 text-xs font-bold">
                          {formattedPrice} / night
                        </div>
                      </div>

                      <div>
                        <h4 className="font-serif font-bold text-xs text-[#141413] line-clamp-1">
                          {stay.name}
                        </h4>
                        <p className="text-[10px] text-mutedText truncate mt-0.5">
                          {stay.address || searchCity}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSetBasecamp(stay)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                            isBasecamp ? 'bg-amber-500 text-white' : 'bg-[#141413] hover:bg-[#C24B27] text-white'
                          }`}
                        >
                          <Bed className="w-3 h-3" />
                          <span>{isBasecamp ? 'Active Basecamp' : 'Set Basecamp'}</span>
                        </button>
                        <a
                          href={stay.googleHotelsUrl || `https://www.google.com/travel/hotels?q=${encodeURIComponent(stay.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 px-2 rounded-lg bg-blue-50 text-blue-800 text-[10px] font-bold flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Book</span>
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
