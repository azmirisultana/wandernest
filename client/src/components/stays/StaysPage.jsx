import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Hotel, MapPin, Star, Bed, Sparkles, Check,
  ExternalLink, Compass, ArrowLeft, Plus, Wifi, Coffee, Search,
  ShieldCheck, Moon, Calendar, SlidersHorizontal,
  ChevronDown, RotateCcw, Users, Layers, AlertCircle, X, Info,
  LayoutGrid, List, Map as MapIcon, ArrowUpRight, Award, Waves,
  Utensils, Car, Dumbbell
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { fetchPlaces, searchDestinations } from '../../api';
import { buildHotelUrls, isBasecampInCurrentCity as checkBasecampInCity } from '../../services/hotelLinks';

// Fix Leaflet marker icons in Vite bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Sleek stable hotel pin for the map (No fake price pills, shows hotel name & rating)
function createHotelPinIcon(name, rating, isSelected = false, isBasecamp = false) {
  const bg = isBasecamp ? '#D97706' : isSelected ? '#C24B27' : '#141413';
  const border = isBasecamp ? '2px solid #F59E0B' : isSelected ? '2px solid #FFFFFF' : '1.5px solid rgba(255,255,255,0.8)';
  const shadow = isSelected ? 'box-shadow: 0 8px 24px rgba(194,75,39,0.45); transform: scale(1.1);' : 'box-shadow: 0 3px 10px rgba(0,0,0,0.25);';

  const html = `
    <div style="cursor: pointer; transition: all 0.2s ease;">
      <div style="background: ${bg}; color: #FFFFFF; padding: 4px 8px; border-radius: 9999px; border: ${border}; ${shadow} font-family: 'Inter', system-ui, sans-serif; font-size: 11px; font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">
        ${isBasecamp ? '★ ' : ''}${rating ? '★ ' + rating : '🏨'}
      </div>
      <div style="position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid ${bg};"></div>
    </div>
  `;

  return L.divIcon({
    className: 'wander-hotel-pin',
    html,
    iconSize: [48, 26],
    iconAnchor: [24, 26],
    popupAnchor: [0, -26]
  });
}

// Quick pick destination chips
const POPULAR_HOTEL_HUBS = [
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, flag: '🇯🇵' },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, flag: '🇫🇷' },
  { name: 'Kyoto', lat: 35.0116, lng: 135.7681, flag: '🇯🇵' },
  { name: 'Rome', lat: 41.9028, lng: 12.4964, flag: '🇮🇹' },
  { name: 'New York', lat: 40.7128, lng: -74.0060, flag: '🇺🇸' },
  { name: 'Bali', lat: -8.4095, lng: 115.1889, flag: '🇮🇩' },
  { name: 'London', lat: 51.5074, lng: -0.1278, flag: '🇬🇧' },
  { name: 'Cancun', lat: 21.1619, lng: -86.8515, flag: '🇲🇽' }
];

export default function StaysPage({
  activeTrip,
  initialParams,
  onBackToWorkspace,
  onOpenStreetView,
  onUpdateTripHotel,
  onAddToItinerary
}) {
  // Destination and search parameters
  const defaultCity = initialParams?.destination || activeTrip?.destination || 'Tokyo';
  const defaultLat = parseFloat(initialParams?.latitude || activeTrip?.latitude || 35.6762);
  const defaultLng = parseFloat(initialParams?.longitude || activeTrip?.longitude || 139.6503);

  const [searchCity, setSearchCity] = useState(defaultCity);
  const [cityInput, setCityInput] = useState(defaultCity);
  const [coordinates, setCoordinates] = useState({ lat: defaultLat, lng: defaultLng });

  // Dates & Guests
  const todayStr = new Date().toISOString().split('T')[0];
  const [checkIn, setCheckIn] = useState(initialParams?.checkIn || '');
  const [checkOut, setCheckOut] = useState(initialParams?.checkOut || '');
  const [travelers, setTravelers] = useState(initialParams?.guests || '2 Guests, 1 Room');
  const [showTravelersDropdown, setShowTravelersDropdown] = useState(false);

  // Autocomplete
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const searchDebounceRef = useRef(null);
  const searchBoxRef = useRef(null);

  // Data & State
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentBaseHotel, setCurrentBaseHotel] = useState(activeTrip?.hotel || null);

  // View Mode: 'grid' | 'list' | 'map'
  const [viewMode, setViewMode] = useState('grid');
  const [selectedStay, setSelectedStay] = useState(null);

  // Filters
  const [propertyType, setPropertyType] = useState('all'); // all | luxury | boutique | resort | historic
  const [minRating, setMinRating] = useState('all'); // all | 4.5 | top
  const [selectedAmenity, setSelectedAmenity] = useState('all'); // all | pool | wifi | spa | breakfast | ac
  const [nameFilter, setNameFilter] = useState('');

  // Map Language: 'english' | 'carto'
  const [mapLanguage, setMapLanguage] = useState('english');

  const requestIdRef = useRef(0);

  // Load verified stays for current coordinates
  const loadStays = (lat, lng) => {
    const reqId = ++requestIdRef.current;
    setLoading(true);

    fetchPlaces(lat, lng, 'stay', 15000)
      .then(res => {
        if (reqId !== requestIdRef.current) return;
        if (res.success && Array.isArray(res.data)) {
          setStays(res.data);
        } else {
          setStays([]);
        }
      })
      .catch(err => {
        if (reqId !== requestIdRef.current) return;
        console.warn('Failed to fetch hotels:', err);
        setStays([]);
      })
      .finally(() => {
        if (reqId === requestIdRef.current) setLoading(false);
      });
  };

  useEffect(() => {
    loadStays(coordinates.lat, coordinates.lng);
  }, [coordinates.lat, coordinates.lng]);

  // Destination autocomplete
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
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!cityInput.trim()) return;

    searchDestinations(cityInput.trim())
      .then(res => {
        if (res.success && res.data?.[0]) {
          handleSelectDestination(res.data[0]);
        } else {
          setSearchCity(cityInput.trim());
          loadStays(coordinates.lat, coordinates.lng);
        }
      })
      .catch(() => {
        setSearchCity(cityInput.trim());
        loadStays(coordinates.lat, coordinates.lng);
      });
  };

  // Basecamp anchor handler
  const handleSetBasecamp = (stay) => {
    const hotelObj = {
      name: stay.name,
      city: stay.city || searchCity.split(',')[0].trim(),
      address: stay.address || searchCity,
      latitude: stay.latitude,
      longitude: stay.longitude,
      photo_url: stay.photo_url,
      rating: stay.rating || null,
      googleHotelsUrl: stay.googleHotelsUrl,
      googleMapsUrl: stay.googleMapsUrl
    };
    setCurrentBaseHotel(hotelObj);
    if (onUpdateTripHotel) onUpdateTripHotel(hotelObj);
  };

  const tripDays = useMemo(() => {
    const daysCount = parseInt(activeTrip?.duration_days || 3, 10);
    return Array.from({ length: Math.max(daysCount, 1) }, (_, i) => i + 1);
  }, [activeTrip?.duration_days]);

  const [toastMessage, setToastMessage] = useState(null);

  const handleAddStayToDay = (stay, targetDay = 1) => {
    if (onAddToItinerary) {
      onAddToItinerary({
        ...stay,
        category: 'stay',
        notes: `Lodging: ${stay.name}`
      }, targetDay);
      setToastMessage(`✓ Added "${stay.name}" to Day ${targetDay}`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Check whether active basecamp hotel is actually in the currently searched city
  const isBasecampInCurrentCity = useMemo(() => {
    return checkBasecampInCity(currentBaseHotel, coordinates.lat, coordinates.lng, 60);
  }, [currentBaseHotel, coordinates.lat, coordinates.lng]);

  // Filter stays
  const filteredStays = useMemo(() => {
    let result = [...stays];

    // Name filter
    if (nameFilter.trim()) {
      const q = nameFilter.toLowerCase();
      result = result.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q)
      );
    }

    // Property style filter
    if (propertyType !== 'all') {
      result = result.filter(s => {
        const text = `${s.name} ${s.tagLabel || ''} ${s.roomType || ''}`.toLowerCase();
        if (propertyType === 'luxury') return /luxury|5-star|palace|ritz|aman|fourseasons|grand/i.test(text);
        if (propertyType === 'boutique') return /boutique|inn|bed|ryokan/i.test(text);
        if (propertyType === 'resort') return /resort|spa|villas|beach/i.test(text);
        if (propertyType === 'historic') return /historic|heritage|palace|traditional/i.test(text);
        return true;
      });
    }

    // Rating filter
    if (minRating === '4.5') {
      result = result.filter(s => s.rating && s.rating >= 4.5);
    } else if (minRating === 'top') {
      result = result.filter(s => s.rating && s.rating >= 4.7);
    }

    // Amenity filter
    if (selectedAmenity !== 'all') {
      result = result.filter(s => {
        const ams = (s.amenities || []).join(' ').toLowerCase();
        if (selectedAmenity === 'pool') return ams.includes('pool');
        if (selectedAmenity === 'wifi') return ams.includes('wi-fi') || ams.includes('wifi') || ams.includes('internet');
        if (selectedAmenity === 'spa') return ams.includes('spa') || ams.includes('wellness') || ams.includes('hot spring');
        if (selectedAmenity === 'breakfast') return ams.includes('breakfast');
        if (selectedAmenity === 'ac') return ams.includes('air conditioning') || ams.includes('climate');
        return true;
      });
    }

    // Sort by rating descending (highest rated first)
    result.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviewsCount || 0) - (a.reviewsCount || 0));

    return result;
  }, [stays, nameFilter, propertyType, minRating, selectedAmenity]);

  // Top-rated curated subset (4.7+ rating)
  const topRatedHighlights = useMemo(() => {
    return filteredStays.filter(s => s.rating && s.rating >= 4.7).slice(0, 3);
  }, [filteredStays]);

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
    <div className="min-h-screen bg-[#FAF8F5] text-[#141413] flex flex-col font-sans pb-24">
      {/* 1. TOP HEADER & HOTEL SEARCH ENGINE CONTROLS */}
      <header className="sticky top-0 z-40 bg-white border-b border-borderSoft shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-3">
          {/* Top Brand Bar & Back Navigation */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onBackToWorkspace}
                className="p-2 rounded-xl hover:bg-[#FAF8F5] border border-borderSoft text-mutedText hover:text-[#141413] transition-colors cursor-pointer"
                title="Back to previous page"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#C24B27]/10 text-[#C24B27] flex items-center justify-center font-bold">
                  <Hotel className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-serif font-bold text-xl text-[#141413] leading-tight">
                    Hotels & Accommodations
                  </h1>
                  <p className="text-xs text-mutedText">
                    Real Google Business listings & Google Hotels live rate checks in <strong>{searchCity}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Destination Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mutedText shrink-0 mr-1 hidden sm:inline">
                Top Hubs:
              </span>
              {POPULAR_HOTEL_HUBS.map(hub => (
                <button
                  key={hub.name}
                  onClick={() => handleSelectDestination(hub)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    searchCity.toLowerCase().includes(hub.name.toLowerCase())
                      ? 'bg-[#141413] text-white shadow-xs'
                      : 'bg-[#FAF8F5] hover:bg-[#EBE7DF] text-[#141413] border border-borderSoft'
                  }`}
                >
                  <span>{hub.flag} {hub.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Inputs: Where • Check-in • Check-out • Travelers • Search */}
          <form onSubmit={handleSearchSubmit} className="pt-1">
            <div className="p-2 bg-[#FAF8F5] rounded-2xl sm:rounded-full border border-borderSoft flex flex-col sm:flex-row items-center gap-2 shadow-2xs">
              {/* WHERE INPUT */}
              <div ref={searchBoxRef} className="relative flex-1 w-full">
                <div className="flex items-center gap-2.5 px-4 py-2 bg-white rounded-xl sm:rounded-full border border-borderSoft/80 focus-within:border-[#C24B27] transition-all">
                  <MapPin className="w-4 h-4 text-[#C24B27] shrink-0" />
                  <div className="w-full">
                    <span className="block text-[9px] uppercase font-bold text-mutedText leading-none">Where to?</span>
                    <input
                      type="text"
                      value={cityInput}
                      onChange={handleCityInputChange}
                      onFocus={() => {
                        if (destSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      placeholder="Destination city or neighborhood..."
                      className="w-full bg-transparent text-xs font-semibold text-[#141413] focus:outline-none placeholder:text-mutedText truncate"
                    />
                  </div>
                  {isSearchingDest && (
                    <div className="w-3.5 h-3.5 border-2 border-[#C24B27] border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {showSuggestions && destSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-borderSoft rounded-2xl shadow-xl z-50 overflow-hidden py-1 max-h-60 overflow-y-auto">
                    {destSuggestions.map((dest, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectDestination(dest)}
                        className="w-full px-4 py-2.5 text-left text-xs hover:bg-[#FAF8F5] flex items-center justify-between gap-2 border-b border-borderSoft/40 last:border-b-0 cursor-pointer"
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

              {/* CHECK-IN & CHECK-OUT DATES */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl sm:rounded-full border border-borderSoft/80 text-xs w-full sm:w-auto">
                <Calendar className="w-4 h-4 text-[#C24B27] shrink-0" />
                <div className="flex items-center gap-2">
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
              <div className="relative w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowTravelersDropdown(!showTravelersDropdown)}
                  className="w-full flex items-center justify-between sm:justify-start gap-2 px-3 py-2 bg-white rounded-xl sm:rounded-full border border-borderSoft/80 text-xs hover:border-[#C24B27] transition-colors cursor-pointer text-left"
                >
                  <Users className="w-4 h-4 text-[#C24B27] shrink-0" />
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-mutedText leading-none">Guests</span>
                    <span className="font-semibold text-xs text-[#141413] whitespace-nowrap">{travelers}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-mutedText" />
                </button>

                {showTravelersDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-borderSoft rounded-2xl shadow-xl z-50 p-2 space-y-1">
                    {[
                      '1 Guest, 1 Room',
                      '2 Guests, 1 Room',
                      '2 Guests, 2 Rooms',
                      'Family / 3+ Guests'
                    ].map((opt) => (
                      <button
                        key={opt}
                        type="button"
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

              {/* SEARCH BUTTON */}
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl sm:rounded-full bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Hotels</span>
              </button>
            </div>
          </form>

          {/* Filters & View Switcher Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-borderSoft/60 text-xs">
            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Property Style */}
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="px-3 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#EBE7DF] border border-borderSoft font-semibold text-[#141413] text-xs focus:outline-none cursor-pointer"
              >
                <option value="all">Property Style: All</option>
                <option value="luxury">Luxury 5-Star Hotel</option>
                <option value="boutique">Boutique & Ryokan</option>
                <option value="resort">Resort & Suites</option>
                <option value="historic">Historic Heritage</option>
              </select>

              {/* Rating Filter */}
              <select
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="px-3 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#EBE7DF] border border-borderSoft font-semibold text-[#141413] text-xs focus:outline-none cursor-pointer"
              >
                <option value="all">Google Rating: All</option>
                <option value="4.5">★ 4.5+ on Google</option>
                <option value="top">★ 4.7+ Top Tier</option>
              </select>

              {/* Amenity Filter */}
              <select
                value={selectedAmenity}
                onChange={(e) => setSelectedAmenity(e.target.value)}
                className="px-3 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#EBE7DF] border border-borderSoft font-semibold text-[#141413] text-xs focus:outline-none cursor-pointer"
              >
                <option value="all">Amenities: Any</option>
                <option value="pool">🏊 Swimming Pool</option>
                <option value="spa">🧖 Luxury Spa / Onsen</option>
                <option value="breakfast">🍳 Breakfast Included</option>
                <option value="wifi">📶 Free Wi-Fi</option>
                <option value="ac">❄️ Air Conditioning</option>
              </select>

              {/* Search by Name */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF8F5] border border-borderSoft text-xs">
                <Search className="w-3.5 h-3.5 text-mutedText" />
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Hotel name..."
                  className="bg-transparent focus:outline-none text-xs w-28 sm:w-32 text-[#141413] placeholder:text-mutedText"
                />
                {nameFilter && (
                  <button onClick={() => setNameFilter('')} className="text-mutedText hover:text-[#141413]">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {(propertyType !== 'all' || minRating !== 'all' || selectedAmenity !== 'all' || nameFilter) && (
                <button
                  onClick={() => {
                    setPropertyType('all');
                    setMinRating('all');
                    setSelectedAmenity('all');
                    setNameFilter('');
                  }}
                  className="text-[#C24B27] hover:underline flex items-center gap-1 font-semibold text-xs ml-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* View Mode Toggle: Grid • List • Map */}
            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-full border border-borderSoft">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#141413] text-white shadow-2xs'
                    : 'text-mutedText hover:text-[#141413]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#141413] text-white shadow-2xs'
                    : 'text-mutedText hover:text-[#141413]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode(prev => prev === 'map' ? 'grid' : 'map')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'map'
                    ? 'bg-[#C24B27] text-white shadow-2xs'
                    : 'text-mutedText hover:text-[#141413]'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Map Preview</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8 flex-1 w-full">
        {/* Active Basecamp Hotel Notification (if selected and in this city) */}
        {currentBaseHotel && isBasecampInCurrentCity && (
          <div className="p-4 rounded-3xl bg-amber-50/80 border border-amber-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                ★
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-950 bg-amber-200/70 px-2 py-0.5 rounded-md">
                  Active Trip Basecamp for {searchCity}
                </span>
                <h4 className="font-serif font-bold text-base text-[#141413] mt-0.5">
                  {currentBaseHotel.name}
                </h4>
                <p className="text-xs text-mutedText">{currentBaseHotel.address || searchCity} • All spot walking distances in {searchCity} are anchored here</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={buildHotelUrls(currentBaseHotel, searchCity, checkIn, checkOut).hotelsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-[#141413] border border-amber-300 text-xs font-bold flex items-center gap-1 transition-colors"
                title="View live rates on Google Hotels"
              >
                <span>Check Live Rates</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#C24B27]" />
              </a>
              <a
                href={buildHotelUrls(currentBaseHotel, searchCity).mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-[#141413] border border-amber-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="View Google Business Profile & guest reviews"
              >
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Profile</span>
              </a>
            </div>
          </div>
        )}

        {/* Informational note if active basecamp belongs to a different destination */}
        {currentBaseHotel && !isBasecampInCurrentCity && (
          <div className="p-3.5 px-4 rounded-2xl bg-[#FAF8F5] border border-borderSoft flex items-center justify-between gap-3 text-xs text-mutedText">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Your active trip is anchored at <strong className="text-[#141413]">{currentBaseHotel.name}</strong> ({currentBaseHotel.city || 'other trip'}). Select any hotel below to anchor your stay in {searchCity}.
              </span>
            </div>
          </div>
        )}

        {/* TOP RATED SPOTLIGHT CAROUSEL (If viewing top rated and available) */}
        {!loading && topRatedHighlights.length > 0 && viewMode !== 'map' && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C24B27]">
              <Award className="w-4 h-4" />
              <span>Top Rated by Travelers on Google Hotels</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {topRatedHighlights.map(stay => {
                const { hotelsUrl: gHotelsUrl, mapsUrl: gMapsUrl } = buildHotelUrls(stay, searchCity, checkIn, checkOut);
                const isBasecamp = isBasecampInCurrentCity && (currentBaseHotel?.name === stay.name);

                return (
                  <div
                    key={`highlight_${stay.id}`}
                    className="relative bg-white rounded-3xl overflow-hidden border border-amber-200/80 shadow-sm hover:shadow-lg transition-all group flex flex-col justify-between"
                  >
                    <div className="relative h-44 overflow-hidden bg-slate-900">
                      <img
                        src={stay.photo_url}
                        alt={stay.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                      
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          <span>Top Pick</span>
                        </span>
                      </div>

                      {stay.rating && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{stay.rating}</span>
                          {stay.reviewsCount && <span className="text-[10px] text-white/70">({stay.reviewsCount})</span>}
                        </div>
                      )}

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h3 className="font-serif font-bold text-base leading-tight truncate">
                          {stay.name}
                        </h3>
                        <p className="text-[11px] text-white/80 truncate mt-0.5">
                          {stay.address || searchCity}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {(stay.amenities || ['Free Wi-Fi', 'Breakfast', 'Concierge']).slice(0, 3).map((am, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-[#FAF8F5] text-[10px] font-semibold text-[#141413] border border-borderSoft">
                              ✓ {am}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-borderSoft/60 flex items-center gap-2">
                        <a
                          href={gHotelsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-3 rounded-xl bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                          title="Check live rates & availability on Google Hotels"
                        >
                          <span>Check Live Rates</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <a
                          href={gMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-[#FAF8F5] hover:bg-[#EBE7DF] border border-borderSoft text-xs font-bold transition-all text-blue-600"
                          title="View Google Business Profile"
                        >
                          <MapPin className="w-4 h-4" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleSetBasecamp(stay)}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isBasecamp
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-[#FAF8F5] hover:bg-[#EBE7DF] text-[#141413] border-borderSoft'
                          }`}
                          title={isBasecamp ? 'Active Basecamp' : 'Set as Basecamp'}
                        >
                          <Bed className="w-4 h-4 text-inherit" />
                        </button>
                      </div>

                      {onAddToItinerary && (
                        <div className="pt-2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAddStayToDay(stay, 1)}
                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add to Day 1</span>
                          </button>
                          {tripDays.length > 1 && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddStayToDay(stay, Number(e.target.value));
                                  e.target.value = '';
                                }
                              }}
                              defaultValue=""
                              className="py-1.5 px-2 rounded-xl bg-[#FAF8F5] hover:bg-[#EBE7DF] border border-borderSoft text-[11px] font-bold text-[#141413] cursor-pointer"
                              title="Add to specific itinerary day"
                            >
                              <option value="" disabled>Day ▾</option>
                              {tripDays.map(d => (
                                <option key={d} value={d}>Day {d}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* RESULTS HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-borderSoft pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#141413]">
              Available Lodgings in {searchCity}
            </h2>
            <p className="text-xs text-mutedText mt-0.5">
              Showing verified hotels, resorts, and lodgings. Live pricing & booking powered directly by Google Hotels.
            </p>
          </div>

          <span className="text-xs font-semibold text-mutedText">
            {loading ? 'Searching...' : `${filteredStays.length} verified stays found`}
          </span>
        </div>

        {/* LOADING SPINNER */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#C24B27] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-mutedText font-semibold">Loading verified accommodations in {searchCity}...</p>
          </div>
        ) : filteredStays.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-borderSoft p-8 shadow-xs max-w-lg mx-auto">
            <Hotel className="w-12 h-12 text-mutedText mx-auto opacity-30 mb-3" />
            <h3 className="font-serif font-bold text-lg text-[#141413]">No hotels matched your filters</h3>
            <p className="text-xs text-mutedText mt-1">
              Try resetting the rating or property style filters to discover all verified stays in {searchCity}.
            </p>
            <button
              onClick={() => {
                setPropertyType('all');
                setMinRating('all');
                setSelectedAmenity('all');
                setNameFilter('');
              }}
              className="mt-4 px-5 py-2.5 rounded-xl bg-[#C24B27] text-white text-xs font-bold hover:bg-[#A83D1D] transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : viewMode === 'map' ? (
          /* 3. STABLE MAP VIEW (Completely isolated, zero vibration / re-render loops) */
          <div className="space-y-4">
            <div className="h-[550px] rounded-3xl overflow-hidden border border-borderSoft shadow-md relative">
              <MapContainer
                key={`stable_map_${coordinates.lat}_${coordinates.lng}`}
                center={[coordinates.lat, coordinates.lng]}
                zoom={13}
                scrollWheelZoom={true}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> & Esri'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                />

                {filteredStays.map(stay => {
                  if (!stay.latitude || !stay.longitude) return null;
                  const isBasecamp = isBasecampInCurrentCity && currentBaseHotel?.name === stay.name;
                  const isSelected = selectedStay?.id === stay.id;
                  const { hotelsUrl: gHotelsUrl, mapsUrl: gMapsUrl } = buildHotelUrls(stay, searchCity, checkIn, checkOut);

                  return (
                    <Marker
                      key={stay.id}
                      position={[stay.latitude, stay.longitude]}
                      icon={createHotelPinIcon(stay.name, stay.rating, isSelected, isBasecamp)}
                      eventHandlers={{
                        click: () => setSelectedStay(stay)
                      }}
                    >
                      <Popup className="wander-hotel-popup">
                        <div className="w-60 p-1 space-y-2 font-sans">
                          <div className="h-28 rounded-xl overflow-hidden bg-slate-900 relative">
                            <img src={stay.photo_url} alt={stay.name} className="w-full h-full object-cover" />
                            {stay.rating && (
                              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-amber-400 text-[11px] font-bold">
                                ★ {stay.rating}
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-serif font-bold text-xs text-[#141413] line-clamp-1">{stay.name}</h4>
                            <p className="text-[10px] text-mutedText truncate mt-0.5">{stay.address || searchCity}</p>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1">
                            <a
                              href={gHotelsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-1.5 px-2 rounded-lg bg-[#C24B27] hover:bg-[#A83D1D] text-white text-[10px] font-bold flex items-center justify-center gap-1"
                              title="Check live rates & availability on Google Hotels"
                            >
                              <span>Rates</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <a
                              href={gMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-1.5 px-2 rounded-lg bg-[#FAF8F5] hover:bg-[#EBE7DF] text-blue-600 border border-borderSoft text-[10px] font-bold flex items-center gap-1"
                              title="Google Business Profile & reviews"
                            >
                              <MapPin className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleSetBasecamp(stay)}
                              className={`py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                                isBasecamp ? 'bg-amber-500 text-white' : 'bg-[#FAF8F5] text-[#141413] border border-borderSoft'
                              }`}
                              title={isBasecamp ? 'Active Basecamp' : 'Set as Basecamp'}
                            >
                              <Bed className="w-3 h-3" />
                            </button>
                          </div>

                          {onAddToItinerary && (
                            <button
                              type="button"
                              onClick={() => handleAddStayToDay(stay, 1)}
                              className="w-full py-1.5 px-2 rounded-lg bg-[#141413] hover:bg-[#C24B27] text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add to Itinerary (Day 1)</span>
                            </button>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
            <p className="text-xs text-mutedText text-center">
              Click on any hotel marker to inspect its verified profile and live Google Hotels booking link.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* 4. HOTEL GRID VIEW (Default, state of the art) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStays.map(stay => {
              const isBasecamp = isBasecampInCurrentCity && currentBaseHotel?.name === stay.name;
              const { hotelsUrl: gHotelsUrl, mapsUrl: gMapsUrl } = buildHotelUrls(stay, searchCity, checkIn, checkOut);

              return (
                <div
                  key={stay.id}
                  className={`bg-white rounded-3xl overflow-hidden border shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 ${
                    isBasecamp ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-borderSoft hover:border-[#C24B27]/40'
                  }`}
                >
                  <div>
                    {/* Hotel Image & Badges */}
                    <div className="relative h-52 overflow-hidden bg-slate-900">
                      <img
                        src={stay.photo_url}
                        alt={stay.name}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                      {/* Tag pill top left */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-md text-[10px] font-bold text-[#141413] shadow-xs">
                          {stay.tagLabel || 'Hotel'}
                        </span>
                        {isBasecamp && (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-bold shadow-xs">
                            ★ Active Basecamp
                          </span>
                        )}
                      </div>

                      {/* Authentic Google Rating bottom right */}
                      {stay.rating ? (
                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{stay.rating}</span>
                          {stay.reviewsCount && (
                            <span className="text-[10px] text-white/70">({stay.reviewsCount})</span>
                          )}
                        </div>
                      ) : (
                        <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-medium text-emerald-300">
                          Google Verified
                        </div>
                      )}
                    </div>

                    {/* Hotel Information */}
                    <div className="p-5 space-y-2">
                      <h3 className="font-serif font-bold text-lg text-[#141413] line-clamp-1 hover:text-[#C24B27] transition-colors">
                        {stay.name}
                      </h3>
                      <p className="text-xs text-mutedText flex items-center gap-1 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 text-[#C24B27] shrink-0" />
                        <span>{stay.address || searchCity}</span>
                      </p>

                      {/* Room style */}
                      {stay.roomType && (
                        <div className="pt-1">
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FAF8F5] border border-borderSoft text-[11px] font-semibold text-[#141413]">
                            🛏 {stay.roomType}
                          </span>
                        </div>
                      )}

                      {/* Amenities */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                        {(stay.amenities && stay.amenities.length > 0
                          ? stay.amenities.slice(0, 3)
                          : ['Free High-Speed Wi-Fi', '24/7 Concierge', 'Air Conditioning']
                        ).map((am, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-borderSoft text-[10px] font-medium text-[#141413]"
                          >
                            ✓ {am}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Google Hotels Link */}
                  <div className="p-5 pt-0 space-y-2">
                    {/* Primary Button: Check Live Rates on Google Hotels */}
                    <a
                      href={gHotelsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
                    >
                      <span>Check Live Rates on Google Hotels</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {onAddToItinerary && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleAddStayToDay(stay, 1)}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Itinerary</span>
                        </button>
                        {tripDays.length > 1 && (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddStayToDay(stay, Number(e.target.value));
                                e.target.value = '';
                              }
                            }}
                            defaultValue=""
                            className="py-2 px-2 rounded-xl bg-[#FAF8F5] hover:bg-[#EBE7DF] border border-borderSoft text-xs font-bold text-[#141413] cursor-pointer"
                            title="Add to specific itinerary day"
                          >
                            <option value="" disabled>Day ▾</option>
                            {tripDays.map(d => (
                              <option key={d} value={d}>Day {d}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {/* Google Business Profile */}
                      <a
                        href={gMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#EBE7DF] border border-borderSoft text-xs font-semibold text-[#141413] flex items-center justify-center gap-1.5 transition-colors"
                        title="View Google Maps profile with photos and guest reviews"
                      >
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>Google Profile</span>
                      </a>

                      {/* Set as Basecamp */}
                      <button
                        type="button"
                        onClick={() => handleSetBasecamp(stay)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isBasecamp
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-[#FAF8F5] hover:bg-[#EBE7DF] text-[#141413] border border-borderSoft'
                        }`}
                        title="Anchor your trip itinerary distances to this hotel"
                      >
                        <Bed className="w-3.5 h-3.5 text-[#C24B27]" />
                        <span>{isBasecamp ? 'Active Base' : 'Set Basecamp'}</span>
                      </button>
                    </div>

                    {/* Street view trigger */}
                    {onOpenStreetView && (
                      <button
                        type="button"
                        onClick={() => onOpenStreetView(stay)}
                        className="w-full py-1.5 px-3 rounded-xl hover:bg-[#FAF8F5] text-mutedText hover:text-[#141413] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5 text-[#C24B27]" />
                        <span>360° Street View & Vicinity</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* 5. HOTEL LIST VIEW */
          <div className="space-y-4">
            {filteredStays.map(stay => {
              const isBasecamp = isBasecampInCurrentCity && currentBaseHotel?.name === stay.name;
              const { hotelsUrl: gHotelsUrl, mapsUrl: gMapsUrl } = buildHotelUrls(stay, searchCity, checkIn, checkOut);

              return (
                <div
                  key={stay.id}
                  className={`bg-white rounded-3xl border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row justify-between ${
                    isBasecamp ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-borderSoft hover:border-[#C24B27]/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-5 flex-1">
                    <div className="relative w-full sm:w-56 h-40 rounded-2xl overflow-hidden bg-slate-900 shrink-0">
                      <img
                        src={stay.photo_url}
                        alt={stay.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-white/95 text-[10px] font-bold text-[#141413]">
                        {stay.tagLabel || 'Hotel'}
                      </div>
                      {stay.rating && (
                        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 text-amber-400 text-xs font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{stay.rating}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      <div>
                        <h3 className="font-serif font-bold text-lg text-[#141413] hover:text-[#C24B27] transition-colors">
                          {stay.name}
                        </h3>
                        <p className="text-xs text-mutedText flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-[#C24B27] shrink-0" />
                          <span>{stay.address || searchCity}</span>
                        </p>
                      </div>

                      {stay.roomType && (
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FAF8F5] border border-borderSoft text-[11px] font-semibold text-[#141413]">
                          🛏 {stay.roomType}
                        </span>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {(stay.amenities || []).map((am, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-borderSoft text-[10px] font-medium text-[#141413]">
                            ✓ {am}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 md:border-l md:border-borderSoft flex flex-col justify-center gap-2.5 sm:min-w-[220px]">
                    <a
                      href={gHotelsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
                    >
                      <span>Check Live Rates</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={gMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#EBE7DF] border border-borderSoft text-xs font-semibold text-[#141413] text-center"
                      >
                        Profile
                      </a>
                      <button
                        type="button"
                        onClick={() => handleSetBasecamp(stay)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                          isBasecamp ? 'bg-amber-500 text-white' : 'bg-[#FAF8F5] hover:bg-[#EBE7DF] text-[#141413] border border-borderSoft'
                        }`}
                      >
                        {isBasecamp ? 'Basecamp ✓' : 'Set Base'}
                      </button>
                    </div>

                    {onAddToItinerary && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleAddStayToDay(stay, 1)}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Itinerary</span>
                        </button>
                        {tripDays.length > 1 && (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddStayToDay(stay, Number(e.target.value));
                                e.target.value = '';
                              }
                            }}
                            defaultValue=""
                            className="py-2 px-2 rounded-xl bg-[#FAF8F5] hover:bg-[#EBE7DF] border border-borderSoft text-xs font-bold text-[#141413] cursor-pointer"
                            title="Add to specific itinerary day"
                          >
                            <option value="" disabled>Day ▾</option>
                            {tripDays.map(d => (
                              <option key={d} value={d}>Day {d}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Real-time Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#141413] text-white shadow-2xl border border-white/10 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
