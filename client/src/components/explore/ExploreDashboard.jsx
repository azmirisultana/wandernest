import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, MapPin, Calendar, Compass, ArrowRight, RotateCw,
  Utensils, Landmark, Eye, Coffee, Hotel, Star,
  Bookmark, Plus, Footprints, Plane, Bed, Check, X,
  Sparkles, ExternalLink, ShoppingBag, Trees, Music, Globe, Clock, ChevronRight,
  Filter, Building, Palmtree, Mountain, Landmark as LandmarkIcon, Layers, Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSavedPlaces } from '../../context/SavedPlacesContext';
import { searchDestinations, fetchPlaces, fetchFeaturedDestinations, deleteTrip } from '../../api';
import { buildHotelUrls, isBasecampInCurrentCity as checkBasecampInCity } from '../../services/hotelLinks';

// Precise Haversine distance formula
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

// Date calculation helpers
function addDaysToDate(dateStr, days) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + (days - 1));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateDaysDifference(startStr, endStr) {
  if (!startStr || !endStr) return null;
  const s = new Date(startStr + 'T00:00:00');
  const e = new Date(endStr + 'T00:00:00');
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  const diffTime = e.getTime() - s.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 1;
}

// Popular destinations by category
const POPULAR_DESTINATIONS = [
  // Beach & Coastal
  {
    id: 'dest_bali',
    name: 'Bali',
    country: 'Indonesia',
    category: 'beach',
    categoryLabel: 'Beach & Coastal',
    latitude: -8.4095,
    longitude: 115.1889,
    cover_image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Sun-drenched beaches, sacred cliffside temples, and vibrant coastal culture',
    highlights: ['Seminyak Beach', 'Tanah Lot', 'Uluwatu Cliffs', 'Nusa Penida'],
    rating: 4.9
  },
  {
    id: 'dest_cancun',
    name: 'Cancun',
    country: 'Mexico',
    category: 'beach',
    categoryLabel: 'Beach & Coastal',
    latitude: 21.1619,
    longitude: -86.8515,
    cover_image: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Pristine Caribbean turquoise waters and Mayan seaside sanctuaries',
    highlights: ['Playa Delfines', 'Isla Mujeres', 'Tulum Seaside Ruins', 'Chichen Itza'],
    rating: 4.8
  },
  {
    id: 'dest_phuket',
    name: 'Phuket',
    country: 'Thailand',
    category: 'beach',
    categoryLabel: 'Beach & Coastal',
    latitude: 7.8804,
    longitude: 98.3923,
    cover_image: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Emerald Andaman waters, limestone karsts, and beachfront night markets',
    highlights: ['Kata Beach', 'Phi Phi Islands', 'Big Buddha', 'Old Phuket Town'],
    rating: 4.8
  },
  {
    id: 'dest_nice',
    name: 'Nice',
    country: 'France',
    category: 'beach',
    categoryLabel: 'Beach & Coastal',
    latitude: 43.7102,
    longitude: 7.2620,
    cover_image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Azure Mediterranean waters along the French Riviera and palm-lined promenades',
    highlights: ['Promenade des Anglais', 'Castle Hill', 'Old Town (Vieux Nice)', 'Monaco Day Trip'],
    rating: 4.8
  },
  // Mountains & Outdoors
  {
    id: 'dest_swiss_alps',
    name: 'Interlaken & Swiss Alps',
    country: 'Switzerland',
    category: 'mountain',
    categoryLabel: 'Mountains & Outdoors',
    latitude: 46.6863,
    longitude: 7.8632,
    cover_image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Snow-capped alpine peaks, turquoise glacial lakes, and legendary hiking passes',
    highlights: ['Jungfraujoch', 'Lake Brienz', 'Lauterbrunnen Valley', 'Harder Kulm'],
    rating: 4.9
  },
  {
    id: 'dest_banff',
    name: 'Banff National Park',
    country: 'Canada',
    category: 'mountain',
    categoryLabel: 'Mountains & Outdoors',
    latitude: 51.1784,
    longitude: -115.5708,
    cover_image: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Dramatic Canadian Rockies summits and iridescent sapphire glacial lakes',
    highlights: ['Lake Louise', 'Moraine Lake', 'Banff Gondola', 'Johnston Canyon'],
    rating: 4.9
  },
  {
    id: 'dest_queenstown',
    name: 'Queenstown',
    country: 'New Zealand',
    category: 'mountain',
    categoryLabel: 'Mountains & Outdoors',
    latitude: -45.0312,
    longitude: 168.6626,
    cover_image: 'https://images.unsplash.com/photo-1589802829985-817e51171b92?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Southern Alps alpine playground with serene fjords and crystal-clear lakes',
    highlights: ['Milford Sound', 'Lake Wakatipu', 'The Remarkables', 'Coronet Peak'],
    rating: 4.9
  },
  // Historic & Culture
  {
    id: 'dest_rome',
    name: 'Rome',
    country: 'Italy',
    category: 'historic',
    categoryLabel: 'Historic & Culture',
    latitude: 41.9028,
    longitude: 12.4964,
    cover_image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
    tagline: 'An open-air living museum of ancient emperors, basilicas, and piazzas',
    highlights: ['Colosseum', 'Vatican Museums', 'Trevi Fountain', 'Roman Forum'],
    rating: 4.9
  },
  {
    id: 'dest_kyoto',
    name: 'Kyoto',
    country: 'Japan',
    category: 'historic',
    categoryLabel: 'Historic & Culture',
    latitude: 35.0116,
    longitude: 135.7681,
    cover_image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Centuries-old Zen temples, vermilion torii corridors, and bamboo groves',
    highlights: ['Fushimi Inari', 'Kinkaku-ji', 'Arashiyama Bamboo Grove', 'Gion District'],
    rating: 4.9
  },
  {
    id: 'dest_athens',
    name: 'Athens',
    country: 'Greece',
    category: 'historic',
    categoryLabel: 'Historic & Culture',
    latitude: 37.9838,
    longitude: 23.7275,
    cover_image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=1200&q=80',
    tagline: 'The birthplace of democracy crowned by the timeless marble Parthenon',
    highlights: ['Acropolis & Parthenon', 'Plaka District', 'Temple of Zeus', 'Ancient Agora'],
    rating: 4.8
  },
  // Metropolis & City
  {
    id: 'dest_tokyo',
    name: 'Tokyo',
    country: 'Japan',
    category: 'metropolis',
    categoryLabel: 'Metropolis & City',
    latitude: 35.6762,
    longitude: 139.6503,
    cover_image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Futuristic neon skylines fused with historic neighborhood alleys and culinary mastery',
    highlights: ['Shibuya Crossing', 'Senso-ji Temple', 'Tokyo Skytree', 'Shinjuku Gyoen'],
    rating: 4.9
  },
  {
    id: 'dest_paris',
    name: 'Paris',
    country: 'France',
    category: 'metropolis',
    categoryLabel: 'Metropolis & City',
    latitude: 48.8566,
    longitude: 2.3522,
    cover_image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    tagline: 'The City of Light, celebrated art galleries, and grand Haussmannian boulevards',
    highlights: ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame', 'Champs-Élysées'],
    rating: 4.9
  },
  {
    id: 'dest_new_york',
    name: 'New York City',
    country: 'United States',
    category: 'metropolis',
    categoryLabel: 'Metropolis & City',
    latitude: 40.7128,
    longitude: -74.0060,
    cover_image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Iconic towering skyline, Broadway theaters, and world-renowned urban parks',
    highlights: ['Central Park', 'Times Square', 'Empire State Building', 'High Line'],
    rating: 4.8
  },
  // Tropical Islands
  {
    id: 'dest_santorini',
    name: 'Santorini',
    country: 'Greece',
    category: 'island',
    categoryLabel: 'Tropical Islands',
    latitude: 36.3932,
    longitude: 25.4615,
    cover_image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Whitewashed cliffside villas and dramatic sunsets overlooking volcanic calderas',
    highlights: ['Oia Sunset Point', 'Fira Cliffside', 'Red Beach', 'Akrotiri Archaeological Site'],
    rating: 4.9
  },
  {
    id: 'dest_boracay',
    name: 'Boracay',
    country: 'Philippines',
    category: 'island',
    categoryLabel: 'Tropical Islands',
    latitude: 11.9674,
    longitude: 121.9248,
    cover_image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Powder-white sand beaches and crystal clear tropical lagoon waters',
    highlights: ['White Beach', 'Puka Shell Beach', 'Willys Rock', 'Diniwid Cove'],
    rating: 4.8
  },
  // Art & Nature
  {
    id: 'dest_florence',
    name: 'Florence',
    country: 'Italy',
    category: 'art',
    categoryLabel: 'Art & Heritage',
    latitude: 43.7696,
    longitude: 11.2558,
    cover_image: 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=1200&q=80',
    tagline: 'The Renaissance cradle with iconic Brunelleschi dome and Uffizi masterpieces',
    highlights: ['Florence Duomo', 'Uffizi Gallery', 'Ponte Vecchio', 'Piazzale Michelangelo'],
    rating: 4.9
  },
  {
    id: 'dest_reykjavik',
    name: 'Reykjavik',
    country: 'Iceland',
    category: 'nature',
    categoryLabel: 'Nature & Wildlife',
    latitude: 64.1466,
    longitude: -21.9426,
    cover_image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Northern lights, geothermal lagoons, and volcanic black sand landscapes',
    highlights: ['Blue Lagoon', 'Hallgrimskirkja', 'Golden Circle', 'Harpa Concert Hall'],
    rating: 4.8
  }
];

// High-Level Destination Tabs
const DESTINATION_EXPLORE_TABS = [
  { key: 'all', label: 'All Highlights', icon: Compass },
  { key: 'do', label: 'Top Sights & Things to Do', icon: Landmark },
  { key: 'eat', label: 'Where to Eat & Drink', icon: Utensils }
];

const SUB_CATEGORIES = [
  { key: 'all', label: 'All Categories' },
  { key: 'historical', label: 'Historical & Monuments', icon: Landmark },
  { key: 'museum', label: 'Museums & Art', icon: Eye },
  { key: 'restaurant', label: 'Restaurants & Dining', icon: Utensils },
  { key: 'cafe', label: 'Cafes & Bakeries', icon: Coffee },
  { key: 'nature', label: 'Parks & Nature', icon: Trees },
  { key: 'shopping', label: 'Shopping & Markets', icon: ShoppingBag },
  { key: 'nightlife', label: 'Nightlife', icon: Music }
];

export default function ExploreDashboard({
  activeTrip,
  trips = [],
  onSelectTrip,
  onRefreshTrips,
  onExplorePlace,
  onSelectDestination,
  onStartPlanning,
  onOpenWorkspace,
  onOpenStreetView,
  onNavigateView,
  onUpdateTripHotel
}) {
  const { currentUser } = useAuth();
  const { isSaved, toggleSavePlace } = useSavedPlaces();

  // User trips resolved with fallback to user-isolated localStorage
  const userTrips = trips && trips.length > 0 ? trips : (() => {
    if (!currentUser?.uid) return [];
    try {
      const stored = localStorage.getItem(`wandernest_trips_${currentUser.uid}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  })();

  const handleDeleteTrip = async (e, tripId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this trip itinerary?')) return;
    try {
      await deleteTrip(tripId);
      if (currentUser?.uid) {
        const remaining = userTrips.filter(t => t.id !== tripId);
        localStorage.setItem(`wandernest_trips_${currentUser.uid}`, JSON.stringify(remaining));
      }
      if (onRefreshTrips) await onRefreshTrips();
    } catch (err) {
      console.warn('Failed to delete trip:', err);
    }
  };

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchDropdownRef = useRef(null);

  // Viewing Destination
  const [viewingDest, setViewingDest] = useState(() => {
    if (activeTrip) {
      return {
        id: activeTrip.id,
        name: activeTrip.destination || 'Tokyo',
        country: activeTrip.country || 'Japan',
        latitude: activeTrip.latitude || 35.6762,
        longitude: activeTrip.longitude || 139.6503,
        cover_image: activeTrip.cover_image || null
      };
    }
    return POPULAR_DESTINATIONS[8]; // Kyoto default for fresh exploration
  });

  const viewingCity = viewingDest.name;
  const viewingCountry = viewingDest.country;
  const viewingLat = viewingDest.latitude;
  const viewingLng = viewingDest.longitude;

  // Real Places in Viewing City
  const [places, setPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // High-Level Tab: 'all' | 'do' | 'eat' | 'stay' | 'flight'
  const [highLevelTab, setHighLevelTab] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  const [sortByDistance, setSortByDistance] = useState(false);

  // Persistent Sticky Floating Dock State with session persistence
  const [showStickyDock, setShowStickyDock] = useState(false);
  const [isStickyDismissed, setIsStickyDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('wandernest_trip_toast_dismissed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleDismissStickyDock = () => {
    setIsStickyDismissed(true);
    try {
      sessionStorage.setItem('wandernest_trip_toast_dismissed', 'true');
    } catch (e) { }
  };

  // Basecamp Hotel Anchor
  const [baseHotel, setBaseHotel] = useState(activeTrip?.hotel || null);
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [availableHotels, setAvailableHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [hotelFilterTerm, setHotelFilterTerm] = useState('');

  // Check whether active basecamp hotel is actually located in the currently viewed city
  const isBasecampInCurrentCity = useMemo(() => {
    return checkBasecampInCity(baseHotel, viewingLat, viewingLng, 60);
  }, [baseHotel, viewingLat, viewingLng]);

  // Hotel Search with Preferences State
  const [prefHotelCity, setPrefHotelCity] = useState(viewingCity);
  const [prefCheckIn, setPrefCheckIn] = useState('');
  const [prefCheckOut, setPrefCheckOut] = useState('');
  const [prefGuests, setPrefGuests] = useState('2 Guests, 1 Room');
  const [prefHotelsList, setPrefHotelsList] = useState([]);
  const [prefLoadingHotels, setPrefLoadingHotels] = useState(false);

  // Popular destinations category filter
  const [selectedPopularCategory, setSelectedPopularCategory] = useState('all');
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [popularSearchTerm, setPopularSearchTerm] = useState('');
  const [showAllPopular, setShowAllPopular] = useState(false);

  // Fallback Destination Setup Flow Modal State
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [setupTargetDest, setSetupTargetDest] = useState(null);
  const [setupStep, setSetupStep] = useState('dates');
  const [setupDays, setSetupDays] = useState(5);
  const [setupStartDate, setSetupStartDate] = useState('');
  const [setupEndDate, setSetupEndDate] = useState('');
  const [setupSelectedHotel, setSetupSelectedHotel] = useState(null);
  const [setupHotelsList, setSetupHotelsList] = useState([]);
  const [setupLoadingHotels, setSetupLoadingHotels] = useState(false);

  const placesSectionRef = useRef(null);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
        setIsSearchDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll listener for persistent "Start Planning" floating dock
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 260) {
        setShowStickyDock(true);
      } else {
        setShowStickyDock(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-dismiss floating toast after 3 seconds when shown
  useEffect(() => {
    if (showStickyDock && !isStickyDismissed) {
      const timer = setTimeout(() => {
        setIsStickyDismissed(true);
        try {
          sessionStorage.setItem('wandernest_trip_toast_dismissed', 'true');
        } catch (e) { }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showStickyDock, isStickyDismissed]);

  // Sync when activeTrip changes
  useEffect(() => {
    if (activeTrip) {
      setViewingDest({
        id: activeTrip.id,
        name: activeTrip.destination || 'Tokyo',
        country: activeTrip.country || 'Japan',
        latitude: activeTrip.latitude || 35.6762,
        longitude: activeTrip.longitude || 139.6503,
        cover_image: activeTrip.cover_image || null
      });
      setBaseHotel(activeTrip.hotel || null);
    }
  }, [activeTrip?.id, activeTrip?.destination]);

  // Sync hotel city input with viewing city
  useEffect(() => {
    setPrefHotelCity(viewingCity);
  }, [viewingCity]);

  // Fetch Real Places in Viewing City
  useEffect(() => {
    let isMounted = true;
    setLoadingPlaces(true);

    fetchPlaces(viewingLat, viewingLng, 'all', 10000)
      .then(res => {
        if (isMounted && res.success && res.data) {
          let items = res.data;
          if (refreshKey > 0) {
            items = [...items].sort(() => Math.random() - 0.5);
          }
          setPlaces(items);
        }
      })
      .catch(err => console.warn('Places fetch error:', err))
      .finally(() => {
        if (isMounted) setLoadingPlaces(false);
      });

    return () => {
      isMounted = false;
    };
  }, [viewingLat, viewingLng, refreshKey]);

  // Load Real Hotels for Hotel Preference Module
  useEffect(() => {
    setPrefLoadingHotels(true);
    fetchPlaces(viewingLat, viewingLng, 'stay', 10000)
      .then(res => {
        if (res.success && res.data) {
          setPrefHotelsList(res.data);
        }
      })
      .catch(err => console.warn('Pref hotels fetch error:', err))
      .finally(() => setPrefLoadingHotels(false));
  }, [viewingLat, viewingLng]);

  // Handle hotel city search directly
  const handleSearchHotelsByCity = async (e) => {
    if (e) e.preventDefault();
    const city = (prefHotelCity || viewingCity).trim();
    if (!city) return;
    setPrefLoadingHotels(true);
    try {
      const searchRes = await searchDestinations(city);
      if (searchRes.success && searchRes.data?.length > 0) {
        const dest = searchRes.data[0];
        const lat = parseFloat(dest.latitude || dest.lat) || viewingLat;
        const lng = parseFloat(dest.longitude || dest.lng) || viewingLng;
        const res = await fetchPlaces(lat, lng, 'stay', 15000);
        if (res.success && res.data) {
          setPrefHotelsList(res.data);
        }
      } else {
        const res = await fetchPlaces(viewingLat, viewingLng, 'stay', 15000);
        if (res.success && res.data) {
          setPrefHotelsList(res.data);
        }
      }
    } catch (err) {
      console.warn('Failed searching hotels for city:', err);
    } finally {
      setPrefLoadingHotels(false);
    }
  };

  // Load available hotels for Basecamp Modal when opened
  useEffect(() => {
    if (isHotelModalOpen) {
      setLoadingHotels(true);
      fetchPlaces(viewingLat, viewingLng, 'stay', 10000)
        .then(res => {
          if (res.success && res.data) {
            setAvailableHotels(res.data);
          }
        })
        .catch(err => console.warn('Hotels fetch error:', err))
        .finally(() => setLoadingHotels(false));
    }
  }, [isHotelModalOpen, viewingLat, viewingLng]);

  // Search input change handler
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      setIsSearchDropdownOpen(false);
      return;
    }
    setIsSearching(true);
    setIsSearchDropdownOpen(true);
    searchDestinations(val.trim())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
      })
      .catch(err => {
        console.warn('Search destinations error:', err);
        setSearchResults([]);
      })
      .finally(() => setIsSearching(false));
  };

  // Distinct Action 1: Explore Destination (Directly navigate to split-view Explorer)
  const handleExploreDestination = (destObj) => {
    setSearchResults([]);
    setSearchQuery('');
    setIsSearchDropdownOpen(false);
    setIsStickyDismissed(false);

    const lat = parseFloat(destObj.latitude ?? destObj.lat);
    const lng = parseFloat(destObj.longitude ?? destObj.lng);

    const destinationPayload = {
      id: destObj.id || `dest_${Date.now()}`,
      name: destObj.name,
      country: destObj.country || destObj.displayName || 'Worldwide',
      latitude: !isNaN(lat) ? lat : viewingLat,
      longitude: !isNaN(lng) ? lng : viewingLng,
      cover_image: destObj.cover_image || destObj.photo_url || null,
      displayName: destObj.displayName || destObj.name
    };

    if (onExplorePlace) {
      onExplorePlace(destinationPayload);
    } else {
      setViewingDest(destinationPayload);
      if (placesSectionRef.current) {
        placesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Distinct Action 2: Start Planning
  const handleStartPlanningAction = (destObj = null, initialPlace = null) => {
    const target = destObj || viewingDest;
    if (onStartPlanning) {
      onStartPlanning(target, initialPlace);
    } else if (onSelectDestination) {
      onSelectDestination(target);
    } else {
      handleInitiateDestination(target);
    }
  };

  // Search Form Submit: hitting Enter directly explores the destination
  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (searchResults.length > 0) {
      handleExploreDestination(searchResults[0]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await searchDestinations(query);
      if (res.success && res.data?.length > 0) {
        handleExploreDestination(res.data[0]);
      } else {
        handleExploreDestination({
          name: query,
          country: 'Worldwide',
          latitude: viewingLat,
          longitude: viewingLng
        });
      }
    } catch (err) {
      console.warn('Search submit error:', err);
      handleExploreDestination({
        name: query,
        country: 'Worldwide',
        latitude: viewingLat,
        longitude: viewingLng
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Fallback setup destination handler
  const handleInitiateDestination = (destObj) => {
    setSearchResults([]);
    setSearchQuery('');
    setIsSearchDropdownOpen(false);
    setSetupTargetDest(destObj);
    setSetupStep('dates');
    setSetupDays(5);
    setSetupStartDate('');
    setSetupEndDate('');
    setSetupSelectedHotel(null);
    setSetupModalOpen(true);

    const destLat = parseFloat(destObj.latitude || destObj.lat) || viewingLat;
    const destLng = parseFloat(destObj.longitude || destObj.lng) || viewingLng;
    setSetupLoadingHotels(true);
    fetchPlaces(destLat, destLng, 'stay', 10000)
      .then(res => {
        if (res.success && res.data) {
          setSetupHotelsList(res.data);
        }
      })
      .catch(err => console.warn('Failed loading hotels for setup:', err))
      .finally(() => setSetupLoadingHotels(false));
  };

  const handleFinishSetup = (skipHotel = false) => {
    if (!setupTargetDest) return;
    const chosenHotel = skipHotel ? null : setupSelectedHotel;
    if (chosenHotel) {
      setBaseHotel(chosenHotel);
      if (onUpdateTripHotel) onUpdateTripHotel(chosenHotel);
    }

    onSelectDestination({
      id: setupTargetDest.id || `dest_${Date.now()}`,
      name: setupTargetDest.name,
      country: setupTargetDest.country || 'Global',
      latitude: parseFloat(setupTargetDest.latitude || setupTargetDest.lat) || viewingLat,
      longitude: parseFloat(setupTargetDest.longitude || setupTargetDest.lng) || viewingLng,
      cover_image: setupTargetDest.cover_image || null,
      daysCount: setupDays,
      startDate: setupStartDate || null,
      endDate: setupEndDate || null,
      hotel: chosenHotel
    });

    setSetupModalOpen(false);
  };

  const handleSetBasecampHotel = (stay) => {
    const hotelObj = {
      name: stay.name,
      city: stay.city || viewingCity.split(',')[0].trim(),
      address: stay.address || viewingCity,
      latitude: stay.latitude,
      longitude: stay.longitude,
      photo_url: stay.photo_url,
      rating: stay.rating || null,
      googleHotelsUrl: stay.googleHotelsUrl || stay.google_hotels_url,
      googleMapsUrl: stay.googleMapsUrl || stay.google_maps_url
    };
    setBaseHotel(hotelObj);
    if (onUpdateTripHotel) onUpdateTripHotel(hotelObj);
    setIsHotelModalOpen(false);
  };

  // Filtering places
  const filteredPlaces = places.filter(p => {
    if (highLevelTab === 'do') {
      if (p.category !== 'do') return false;
    } else if (highLevelTab === 'eat') {
      if (p.category !== 'eat') return false;
    } else if (highLevelTab === 'stay') {
      if (p.category !== 'stay') return false;
    }

    if (selectedSubCategory === 'all') return true;
    const name = (p.name || '').toLowerCase();
    const tag = (p.tagLabel || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    const text = `${name} ${tag} ${cat}`;

    const isHotel = cat === 'stay' || /hotel|resort|inn|lodging|hostel|suites|ryokan/i.test(tag) || /\b(hotel|resort|hostel|inn|suites|ryokan)\b/i.test(name);
    const isFood = cat === 'eat' || /restaurant|dining|cafe|bakery|bistro|pub/i.test(tag);

    if (selectedSubCategory === 'historical') {
      if (isHotel || isFood) return false;
      return text.includes('temple') || text.includes('shrine') || text.includes('monument') ||
        text.includes('historic') || text.includes('castle') || text.includes('ruins') ||
        text.includes('palace') || text.includes('cathedral') || text.includes('church');
    }
    if (selectedSubCategory === 'museum') {
      if (isHotel || isFood) return false;
      return text.includes('museum') || text.includes('gallery') || /\b(art|arts)\b/i.test(text) ||
        text.includes('exhibition');
    }
    if (selectedSubCategory === 'restaurant') {
      if (isHotel) return false;
      return cat.includes('eat') && !text.includes('cafe') && !text.includes('bakery');
    }
    if (selectedSubCategory === 'cafe') {
      if (isHotel) return false;
      return text.includes('cafe') || text.includes('coffee') || text.includes('bakery') ||
        text.includes('tea') || text.includes('roastery');
    }
    if (selectedSubCategory === 'nature') {
      if (isHotel) return false;
      return text.includes('park') || text.includes('garden') || text.includes('nature') ||
        text.includes('mountain') || text.includes('forest') || text.includes('beach') ||
        text.includes('lake') || text.includes('river');
    }
    if (selectedSubCategory === 'shopping') {
      if (isHotel) return false;
      return text.includes('market') || text.includes('shop') || text.includes('mall') ||
        text.includes('bazaar') || text.includes('store');
    }
    if (selectedSubCategory === 'nightlife') {
      if (isHotel) return false;
      return text.includes('bar') || text.includes('pub') || text.includes('club') ||
        text.includes('night') || text.includes('lounge');
    }
    return true;
  });

  const placesWithDistance = filteredPlaces.map(p => {
    let distanceKm = null;
    if (isBasecampInCurrentCity && baseHotel?.latitude && baseHotel?.longitude) {
      distanceKm = calculateDistanceKm(
        baseHotel.latitude,
        baseHotel.longitude,
        p.latitude,
        p.longitude
      );
    }
    return { ...p, distanceKm };
  });

  const displayedPlaces = sortByDistance && baseHotel && isBasecampInCurrentCity
    ? [...placesWithDistance].sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999))
    : placesWithDistance;

  // Filter popular destinations
  const filteredPopularDestinations = POPULAR_DESTINATIONS.filter(dest => {
    const matchesCat = selectedPopularCategory === 'all' || dest.category === selectedPopularCategory;
    const matchesSearch = !popularSearchTerm.trim() ||
      dest.name.toLowerCase().includes(popularSearchTerm.toLowerCase()) ||
      dest.country.toLowerCase().includes(popularSearchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const displayedPopularDestinations = showAllPopular
    ? filteredPopularDestinations
    : filteredPopularDestinations.slice(0, 6);


  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#141413] animate-fade-in font-sans pb-32">
      {/* 1. TOP HERO: Centered Search Bar with Wanderlog Autocomplete Dropdown */}
      <section className="bg-gradient-to-b from-white via-white to-[#FAF8F5] border-b border-borderSoft pt-12 pb-12 px-4 sm:px-6 lg:px-8 shadow-2xs">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FAF8F5] border border-borderSoft text-[11px] font-bold uppercase tracking-wider text-[#C24B27] shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>WanderNest Travel Explorer</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-[#141413] tracking-tight leading-tight">
            Where to next, {currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'Traveler'}?
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm lg:text-base text-mutedText max-w-2xl mx-auto leading-relaxed">
            Search any destination worldwide to explore verified sights, browse authentic accommodations, or start planning your custom itinerary.
          </p>

          {/* Active Trip Quick Banner (If user has an active trip) */}
          {activeTrip && (
            <div className="inline-flex items-center gap-3 p-2 pl-4 pr-3 rounded-full bg-amber-50 border border-amber-200/80 text-xs font-semibold text-amber-950 shadow-2xs">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#C24B27]" />
                <span>Active Itinerary: <strong>{activeTrip.destination}</strong> ({activeTrip.daysCount || 5} Days)</span>
              </span>
              <button
                onClick={() => onNavigateView('workspace')}
                className="px-3.5 py-1 rounded-full bg-[#141413] hover:bg-[#C24B27] text-white text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Open Workspace</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Wanderlog-Style Clean Search Input with Country/Region/City Dropdown */}
          <div ref={searchDropdownRef} className="pt-2 max-w-2xl mx-auto relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="bg-white rounded-full p-2 pl-6 sm:p-2.5 sm:pl-7 border-2 border-white ring-1 ring-black/10 shadow-xl flex items-center gap-3 transition-all focus-within:ring-2 focus-within:ring-[#C24B27]/40">
                <MapPin className="w-5 h-5 text-[#C24B27] shrink-0" />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setIsSearchDropdownOpen(true);
                  }}
                  placeholder="Search destination to explore (e.g. Kyoto, Rome, Paris, Bali, New York)..."
                  className="w-full text-xs sm:text-sm font-semibold text-[#141413] bg-transparent focus:outline-none placeholder:text-mutedText/60"
                />

                {isSearching && (
                  <div className="w-4 h-4 border-2 border-[#C24B27] border-t-transparent rounded-full animate-spin shrink-0 mr-1" />
                )}

                {/* Two Distinct Actions: Explore Places vs Plan Trip */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* <button
                    type="submit"
                    title="Explore places and sights for this destination"
                    className="px-4 py-2.5 rounded-full bg-[#FAF8F5] hover:bg-[#F2EFE8] text-[#141413] font-bold text-xs border border-borderSoft shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5 text-[#C24B27]" />
                    <span className="hidden sm:inline">Explore Places</span>
                  </button> */}

                  <button
                    type="button"
                    onClick={() => {
                      if (searchQuery.trim()) {
                        handleStartPlanningAction({ name: searchQuery.trim(), country: 'Global' });
                      } else {
                        handleStartPlanningAction(viewingDest);
                      }
                    }}
                    title="Start planning your custom itinerary"
                    className="px-4 py-2.5 rounded-full bg-[#C24B27] hover:bg-[#A83D1D] text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Plan Trip</span>
                  </button>
                </div>
              </div>

              {/* Autocomplete Dropdown with Wanderlog Type Badges (Country / Region / City / State) */}
              {isSearchDropdownOpen && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2.5 bg-white rounded-3xl shadow-2xl border border-borderSoft overflow-hidden z-50 max-h-80 overflow-y-auto divide-y divide-borderSoft/60 text-left">
                  {searchResults.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      onClick={() => handleExploreDestination(item)}
                      className="px-4 py-3 hover:bg-[#FAF8F5] cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-3 pr-2 truncate">
                        <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] group-hover:bg-white border border-borderSoft flex items-center justify-center text-[#C24B27] shrink-0 transition-colors">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-sm text-[#141413] group-hover:text-[#C24B27] transition-colors truncate">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-mutedText truncate">
                            {item.displayName || item.country}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Wanderlog Type Badge */}
                        <span className="px-2.5 py-0.5 rounded-md bg-[#FAF8F5] border border-borderSoft text-[11px] font-semibold text-mutedText group-hover:bg-white group-hover:border-[#C24B27]/30 group-hover:text-[#C24B27] transition-colors">
                          {item.typeLabel || 'City'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-mutedText group-hover:text-[#C24B27] transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* 1.5 MY TRIPS SECTION ON HOME PAGE (Immediately visible after creating a trip) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-borderSoft shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-borderSoft pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#C24B27]/10 text-[#C24B27] flex items-center justify-center font-bold shadow-2xs">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#141413]">
                    My Trips
                  </h2>
                  {userTrips.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#C24B27]/10 text-[#C24B27]">
                      {userTrips.length} {userTrips.length === 1 ? 'Trip' : 'Trips'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-mutedText">
                  Your customized travel plans and daily itineraries. Click any trip to resume planning.
                </p>
              </div>
            </div>

            <button
              onClick={() => onStartPlanning && onStartPlanning(null)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0 self-start sm:self-center cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Plan a New Trip</span>
            </button>
          </div>

          {userTrips.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-borderSoft text-[#C24B27] flex items-center justify-center mx-auto mb-2">
                <Compass className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm text-[#141413]">No trip plans yet</p>
              <p className="text-xs text-mutedText max-w-sm mx-auto">
                Search any destination above or click "+ Plan a New Trip" to craft your first travel blueprint!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userTrips.map(t => (
                <div
                  key={t.id}
                  onClick={() => onSelectTrip && onSelectTrip(t)}
                  className="group bg-[#FAF8F5] hover:bg-white rounded-2xl overflow-hidden border border-borderSoft hover:border-[#C24B27]/50 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                >
                  <div className="relative h-36 overflow-hidden bg-slate-200">
                    <img
                      src={t.cover_image || t.coverImage || 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80'}
                      alt={t.title || t.destination}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-[10px] font-bold text-[#141413] shadow-xs">
                      {t.daysCount || t.days_count || 5} Days
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteTrip(e, t.id)}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/40 hover:bg-rose-600 text-white/90 hover:text-white transition-colors cursor-pointer"
                      title="Delete trip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="absolute bottom-2.5 left-3 right-3 text-white">
                      <p className="font-serif font-bold text-base leading-snug truncate text-white">
                        {t.title || `${t.destination} Itinerary`}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#141413]">
                        <MapPin className="w-3.5 h-3.5 text-[#C24B27] shrink-0" />
                        <span className="truncate">{t.destination}</span>
                        {t.country && <span className="text-mutedText font-normal truncate">• {t.country}</span>}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-mutedText">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>
                          {t.startDate || t.start_date
                            ? `${t.startDate || t.start_date}${t.endDate || t.end_date ? ` to ${t.endDate || t.end_date}` : ''}`
                            : 'Flexible Dates'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-borderSoft/60 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-semibold text-mutedText">
                        {(t.items || []).length} {(t.items || []).length === 1 ? 'place' : 'places'} planned
                      </span>
                      <span className="text-[11px] font-bold text-[#C24B27] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Open Workspace</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. POPULAR WORLDWIDE DESTINATIONS & FILTERS */}
      <section id="popular-destinations-section" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-borderSoft pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C24B27]/10 text-[11px] font-bold uppercase tracking-wider text-[#C24B27] mb-2">
              <Globe className="w-3.5 h-3.5" />
              <span>Worldwide Travel Hubs</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#141413]">
              Explore Popular Destinations
            </h2>
            <p className="text-xs sm:text-sm text-mutedText mt-1">
              Browse world-class destinations filtered by vibe and scenery. Click "Explore" to inspect city sights or "Plan Trip" to launch an itinerary.
            </p>
          </div>

          {/* Search bar specifically for popular places */}
          {/* <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-4 h-4 text-mutedText absolute left-3.5 top-3" />
            <input
              type="text"
              value={popularSearchTerm}
              onChange={(e) => setPopularSearchTerm(e.target.value)}
              placeholder="search"
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white border border-borderSoft text-xs font-semibold text-[#141413] focus:outline-none focus:border-[#C24B27] shadow-2xs"
            />
          </div> */}
        </div>

        {/* Categories Bar */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-wrap">
            <button
              onClick={() => setSelectedPopularCategory('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-2xs cursor-pointer ${selectedPopularCategory === 'all'
                ? 'bg-[#141413] text-white shadow-xs'
                : 'bg-white hover:bg-[#FAF8F5] text-mutedText border border-borderSoft'
                }`}
            >
              🌟 All Destinations
            </button>

            <button
              onClick={() => setSelectedPopularCategory('beach')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${selectedPopularCategory === 'beach'
                ? 'bg-[#141413] text-white shadow-xs'
                : 'bg-white hover:bg-[#FAF8F5] text-mutedText border border-borderSoft'
                }`}
            >
              <Palmtree className="w-3.5 h-3.5 text-amber-500" />
              <span>Beach & Coastal</span>
            </button>

            <button
              onClick={() => setSelectedPopularCategory('mountain')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${selectedPopularCategory === 'mountain'
                ? 'bg-[#141413] text-white shadow-xs'
                : 'bg-white hover:bg-[#FAF8F5] text-mutedText border border-borderSoft'
                }`}
            >
              <Mountain className="w-3.5 h-3.5 text-emerald-500" />
              <span>Mountains & Outdoors</span>
            </button>

            <button
              onClick={() => setSelectedPopularCategory('historic')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${selectedPopularCategory === 'historic'
                ? 'bg-[#141413] text-white shadow-xs'
                : 'bg-white hover:bg-[#FAF8F5] text-mutedText border border-borderSoft'
                }`}
            >
              <Landmark className="w-3.5 h-3.5 text-[#C24B27]" />
              <span>Historic & Culture</span>
            </button>

            <button
              onClick={() => setSelectedPopularCategory('metropolis')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${selectedPopularCategory === 'metropolis'
                ? 'bg-[#141413] text-white shadow-xs'
                : 'bg-white hover:bg-[#FAF8F5] text-mutedText border border-borderSoft'
                }`}
            >
              <Building className="w-3.5 h-3.5 text-blue-500" />
              <span>Metropolis & City</span>
            </button>

            <button
              onClick={() => setSelectedPopularCategory('island')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${selectedPopularCategory === 'island'
                ? 'bg-[#141413] text-white shadow-xs'
                : 'bg-white hover:bg-[#FAF8F5] text-mutedText border border-borderSoft'
                }`}
            >
              <Palmtree className="w-3.5 h-3.5 text-teal-500" />
              <span>Tropical Islands</span>
            </button>

            <button
              onClick={() => setShowMoreCategories(!showMoreCategories)}
              className="px-4 py-2 rounded-full text-xs font-bold bg-[#FAF8F5] hover:bg-[#F2EFE8] text-[#C24B27] border border-[#C24B27]/30 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>{showMoreCategories ? '− Less' : '+ More Categories'}</span>
            </button>
          </div>

          {/* Expanded Categories */}
          {showMoreCategories && (
            <div className="flex items-center gap-2 pt-2 animate-fade-in flex-wrap">
              <button
                onClick={() => setSelectedPopularCategory('art')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${selectedPopularCategory === 'art'
                  ? 'bg-[#141413] text-white shadow-xs'
                  : 'bg-white hover:bg-[#FAF8F5] text-mutedText border border-borderSoft'
                  }`}
              >
                🏰 Art & Architecture
              </button>

              <button
                onClick={() => setSelectedPopularCategory('nature')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${selectedPopularCategory === 'nature'
                  ? 'bg-[#141413] text-white shadow-xs'
                  : 'bg-white hover:bg-[#FAF8F5] text-mutedText border border-borderSoft'
                  }`}
              >
                🌲 Nature & Wildlife
              </button>
            </div>
          )}
        </div>

        {/* Popular Destinations Cards Grid (6 by default or all when expanded) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {displayedPopularDestinations.map(dest => (
            <div
              key={dest.id}
              className="group bg-white rounded-3xl overflow-hidden border border-borderSoft hover:border-[#C24B27]/50 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
            >
              <div>
                <div className="relative h-48 overflow-hidden bg-[#FAF8F5]">
                  <img
                    src={dest.cover_image}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[10px] font-bold text-[#141413] border border-white/40 shadow-xs">
                    {dest.categoryLabel || dest.country}
                  </span>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="font-serif font-bold text-xl leading-tight">
                      {dest.name}
                    </h3>
                    <p className="text-[11px] text-white/80 line-clamp-1 mt-0.5">
                      {dest.tagline}
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(dest.highlights || []).slice(0, 3).map((h, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-[#FAF8F5] text-mutedText border border-borderSoft text-[10px] font-medium">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Two Distinct Actions: Explore Sights vs Plan Trip */}
              <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleExploreDestination(dest)}
                  className="py-2.5 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F2EFE8] text-[#141413] border border-borderSoft text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#C24B27]" />
                  <span>Explore</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartPlanningAction(dest)}
                  className="py-2.5 px-3 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <span>Plan Trip</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* View More / Show Fewer Button */}
        {filteredPopularDestinations.length > 6 && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setShowAllPopular(prev => !prev)}
              className="px-6 py-3 rounded-full bg-white hover:bg-[#FAF8F5] border border-borderSoft text-xs font-bold text-[#141413] hover:text-[#C24B27] hover:border-[#C24B27]/40 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>
                {showAllPopular
                  ? '− Show Fewer Destinations'
                  : `+ View More Destinations (${filteredPopularDestinations.length - 6} more)`}
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${showAllPopular ? '-rotate-90' : 'rotate-90'}`} />
            </button>
          </div>
        )}
      </section>

      {/* 5. DESTINATION EXPLORATION HUB: Sights, Culture & Attractions in Viewing City */}
      <section ref={placesSectionRef} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 space-y-8">
        {/* Destination Hero & Travel Guide Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-borderSoft shadow-xl">
          <div className="relative h-64 sm:h-72 overflow-hidden">
            <img
              src={viewingDest.cover_image || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1400&q=80'}
              alt={viewingCity}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />

            {/* Badges */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold tracking-wide uppercase border border-white/20">
                ✨ City Guide & Travel Explorer
              </span>
              <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white/90 text-[11px] font-semibold">
                {viewingCountry}
              </span>
            </div>

            {/* Destination Title & Prominent "Start planning" CTA */}
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white">
              <div className="max-w-2xl space-y-1">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white tracking-tight leading-tight">
                  Explore {viewingCity}
                </h2>
                <p className="text-xs sm:text-sm text-white/80 line-clamp-2">
                  {viewingDest.tagline || `Discover verified landmarks, cultural treasures, and authentic dining in ${viewingCity}, ${viewingCountry}.`}
                </p>
              </div>

              {/* Start Planning Option In Hero */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleStartPlanningAction(viewingDest)}
                  className="px-5 py-3 rounded-full bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs sm:text-sm font-bold shadow-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer ring-2 ring-white/20 hover:ring-white/40"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Start planning a trip to {viewingCity}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Top Rated Stays in Featured City */}
        <div id="explore-stays-section" className="space-y-6 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-borderSoft pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C24B27]/10 text-[11px] font-bold uppercase tracking-wider text-[#C24B27] mb-2">
                <Hotel className="w-3.5 h-3.5" />
                <span>Hotels & Accommodations</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#141413]">
                Top Rated Stays in {prefHotelCity || viewingCity}
              </h2>
              <p className="text-xs sm:text-sm text-mutedText mt-1 max-w-2xl">
                Verified top-rated hotels with authentic Google Business ratings, guest reviews, and direct links to check live availability.
              </p>
            </div>
          </div>

          {/* Hotel Search Preferences Form */}
          <form onSubmit={handleSearchHotelsByCity} className="p-5 rounded-3xl bg-white border border-borderSoft shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-mutedText mb-1">
                  Destination City
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-borderSoft text-xs font-semibold text-[#141413] focus-within:border-[#C24B27]">
                  <MapPin className="w-4 h-4 text-[#C24B27] shrink-0" />
                  <input
                    type="text"
                    value={prefHotelCity}
                    onChange={(e) => setPrefHotelCity(e.target.value)}
                    className="bg-transparent w-full focus:outline-none"
                    placeholder="e.g. Kyoto, Tokyo, Paris..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-mutedText mb-1">
                  Check-in Date
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-borderSoft text-xs font-semibold text-[#141413]">
                  <Calendar className="w-4 h-4 text-[#C24B27] shrink-0" />
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={prefCheckIn}
                    onChange={(e) => {
                      setPrefCheckIn(e.target.value);
                      if (e.target.value && !prefCheckOut) {
                        setPrefCheckOut(addDaysToDate(e.target.value, 4));
                      }
                    }}
                    className="bg-transparent w-full focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-mutedText mb-1">
                  Check-out Date
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-borderSoft text-xs font-semibold text-[#141413]">
                  <Calendar className="w-4 h-4 text-[#C24B27] shrink-0" />
                  <input
                    type="date"
                    min={prefCheckIn || new Date().toISOString().split('T')[0]}
                    value={prefCheckOut}
                    onChange={(e) => setPrefCheckOut(e.target.value)}
                    className="bg-transparent w-full focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-mutedText mb-1">
                  Guests & Room
                </label>
                <select
                  value={prefGuests}
                  onChange={(e) => setPrefGuests(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#FAF8F5] border border-borderSoft text-xs font-semibold text-[#141413] focus:outline-none cursor-pointer"
                >
                  <option value="1 Guest, 1 Room">1 Guest, 1 Room</option>
                  <option value="2 Guests, 1 Room">2 Guests, 1 Room</option>
                  <option value="2 Guests, 2 Rooms">2 Guests, 2 Rooms</option>
                  <option value="Family / 3+ Guests">Family / 3+ Guests</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-mutedText">
                Real hotels curated from Google Business profiles & verified hospitality databases.
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Hotels</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateView && onNavigateView('stays', {
                    destination: prefHotelCity || viewingCity,
                    latitude: viewingLat,
                    longitude: viewingLng,
                    checkIn: prefCheckIn,
                    checkOut: prefCheckOut,
                    guests: prefGuests
                  })}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-borderSoft text-xs font-bold text-[#141413] transition-all cursor-pointer"
                >
                  <span>Explore Stays</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C24B27]" />
                </button>
              </div>
            </div>
          </form>

          {/* Hotels Grid */}
          {prefLoadingHotels ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-7 h-7 border-2 border-[#C24B27] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-mutedText font-semibold">Loading top rated hotels...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {prefHotelsList.slice(0, 6).map(hotel => {
                const isBasecamp = isBasecampInCurrentCity && baseHotel?.name === hotel.name;
                const { hotelsUrl: gHotelsUrl, mapsUrl: gMapsUrl } = buildHotelUrls(hotel, viewingCity, prefCheckIn, prefCheckOut);
                const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name + ' ' + (hotel.city || viewingCity))}`;

                return (
                  <div
                    key={hotel.id}
                    className={`bg-white rounded-3xl overflow-hidden border shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${isBasecamp ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-borderSoft hover:border-[#C24B27]/40'
                      }`}
                  >
                    <div>
                      <div className="relative h-48 overflow-hidden bg-[#FAF8F5]">
                        <img src={hotel.photo_url} alt={hotel.name} className="w-full h-full object-cover" />
                        {isBasecamp && (
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-bold shadow-xs">
                            Active Basecamp
                          </span>
                        )}
                        {hotel.rating && (
                          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-bold text-amber-400 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{hotel.rating}</span>
                            {hotel.reviews_count && (
                              <span className="text-[10px] text-white/80 font-normal">({hotel.reviews_count.toLocaleString()})</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="p-5 space-y-1.5">
                        <h4 className="font-serif font-bold text-base text-[#141413] truncate">{hotel.name}</h4>
                        <p className="text-xs text-mutedText truncate flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#C24B27] shrink-0" />
                          <span>{hotel.address || viewingCity}</span>
                        </p>
                        {hotel.amenities && hotel.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {hotel.amenities.slice(0, 3).map((am, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-borderSoft text-[10px] font-medium text-mutedText">
                                {am}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-5 pt-0 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={gHotelsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          title="Check live rates & availability on Google Hotels"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                          <span>Google Hotels</span>
                        </a>

                        <a
                          href={gMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#EBE7DF] border border-borderSoft text-xs font-semibold text-[#141413] flex items-center justify-center gap-1.5 transition-colors"
                          title="View Google Business Profile & guest reviews"
                        >
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          <span>Google Profile</span>
                        </a>
                      </div>

                      <button
                        onClick={() => handleSetBasecampHotel(hotel)}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${isBasecamp
                          ? 'bg-amber-500 text-white'
                          : 'bg-[#141413] hover:bg-[#C24B27] text-white'
                          }`}
                      >
                        <Bed className="w-3.5 h-3.5" />
                        <span>{isBasecamp ? '✓ Current Basecamp Anchor' : 'Set as Basecamp Hotel'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* High-Level Destination Tabs */}
        <div className="flex items-center justify-between border-b border-borderSoft pb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {DESTINATION_EXPLORE_TABS.map(tab => {
              const Icon = tab.icon;
              const isCurrent = highLevelTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setHighLevelTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-2xs cursor-pointer ${isCurrent
                    ? 'bg-[#141413] text-white shadow-xs'
                    : 'bg-white hover:bg-[#FAF8F5] text-mutedText border border-borderSoft'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isCurrent ? 'text-[#C24B27]' : 'text-mutedText'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF8F5] border border-borderSoft text-xs font-semibold text-[#141413] shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="Refresh authentic places"
            >
              <RotateCw className={`w-3.5 h-3.5 text-[#C24B27] ${loadingPlaces ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* PLACES, SIGHTS & ATTRACTIONS */}
        <div className="space-y-6">
          {/* Secondary Subcategory Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-wrap">
            {SUB_CATEGORIES.map(sub => {
              const isSub = selectedSubCategory === sub.key;
              return (
                <button
                  key={sub.key}
                  onClick={() => setSelectedSubCategory(sub.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isSub
                    ? 'bg-[#C24B27]/15 text-[#C24B27] border border-[#C24B27]/40'
                    : 'bg-white hover:bg-[#FAF8F5] text-mutedText border border-borderSoft'
                    }`}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>

          {/* Basecamp Hotel Anchor Bar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-borderSoft shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${baseHotel && isBasecampInCurrentCity
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'bg-[#FAF8F5] text-mutedText border-borderSoft'
                }`}>
                <Bed className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-mutedText block">
                  Basecamp Hotel Anchor
                </span>
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#141413]">
                  {baseHotel && isBasecampInCurrentCity
                    ? baseHotel.name
                    : baseHotel && !isBasecampInCurrentCity
                      ? `Active Trip Basecamp: ${baseHotel.name}`
                      : `Where are you staying in ${viewingCity}?`}
                </h3>
                <p className="text-xs text-mutedText">
                  {baseHotel && isBasecampInCurrentCity
                    ? `${baseHotel.address || viewingCity} • All spot distances are measured from this hotel.`
                    : baseHotel && !isBasecampInCurrentCity
                      ? `Anchored to ${baseHotel.city || activeTrip?.destination || 'other trip'}. Select a local hotel in ${viewingCity} to calculate accurate walking and transit distances.`
                      : 'Select an available hotel in the destination to calculate exact walking distances.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {baseHotel && isBasecampInCurrentCity ? (
                <button
                  onClick={() => setIsHotelModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-borderSoft text-xs font-semibold text-[#141413] transition-colors cursor-pointer"
                >
                  Change Basecamp
                </button>
              ) : (
                <button
                  onClick={() => setIsHotelModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{baseHotel ? `Set Basecamp for ${viewingCity}` : 'Select from Available Hotels'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Places Grid */}
          {loadingPlaces ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#C24B27] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-mutedText">Retrieving verified authentic spots in {viewingCity}...</p>
            </div>
          ) : displayedPlaces.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-borderSoft p-8 shadow-xs">
              <Compass className="w-10 h-10 text-mutedText mx-auto opacity-40 mb-2" />
              <h3 className="font-serif font-bold text-base text-[#141413]">No places found for this category</h3>
              <p className="text-xs text-mutedText mt-1">Try switching to "All Spots" to discover all verified attractions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedPlaces.map(place => {
                const saved = isSaved(place.id);
                const isCuratingThisCity = activeTrip && activeTrip.destination?.toLowerCase() === viewingCity.toLowerCase();

                return (
                  <div
                    key={place.id}
                    className="group bg-white rounded-3xl overflow-hidden border border-borderSoft hover:border-[#C24B27]/40 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Place Photo */}
                      <div className="relative h-52 overflow-hidden bg-[#FAF8F5]">
                        <img
                          src={place.photo_url || 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80'}
                          alt={place.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-md text-[10px] font-bold text-[#141413] border border-white/40 shadow-xs">
                            {place.tagLabel || (place.category === 'eat' ? 'Dining' : place.category === 'stay' ? 'Hotel' : 'Landmark')}
                          </span>
                        </div>

                        {/* Bookmark Icon */}
                        <button
                          onClick={() => toggleSavePlace(place)}
                          className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all shadow-xs cursor-pointer ${saved
                            ? 'bg-[#C24B27] text-white'
                            : 'bg-white/90 text-[#141413] hover:bg-white'
                            }`}
                          title={saved ? 'Remove from saved' : 'Save place'}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
                        </button>

                        {/* Source Verification Badge & Rating */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                          <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-semibold text-emerald-300">
                            {place.provider === 'wikipedia' ? 'Wikipedia Verified' : 'OSM Verified'}
                          </span>
                          {place.source === 'google' && place.rating ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-bold text-amber-400">
                              <Star className="w-3 h-3 fill-amber-400" />
                              <span>{place.rating}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Place Body */}
                      <div className="p-5 space-y-2">
                        <h3 className="font-serif font-bold text-base text-[#141413] truncate">
                          {place.name}
                        </h3>
                        <p className="text-xs text-mutedText truncate flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#C24B27] shrink-0" />
                          <span>{place.address || viewingCity}</span>
                        </p>

                        {/* Distance from Basecamp Hotel */}
                        {place.distanceKm !== null && (
                          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 w-fit">
                            <Footprints className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{place.distanceKm} km from {baseHotel.name}</span>
                            <span className="text-emerald-700/80 font-normal">
                              (~{Math.round(place.distanceKm * 12)} min walk)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions: Street View, Google Maps & Start planning */}
                    <div className="p-5 pt-0 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => onOpenStreetView(place)}
                          className="py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-borderSoft text-[11px] font-semibold text-[#141413] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5 text-[#C24B27]" />
                          <span>360° Street View</span>
                        </button>

                        <a
                          href={place.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + (place.address || viewingCity))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-borderSoft text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="View on Google Maps"
                        >
                          <span>Google Maps ↗</span>
                        </a>
                      </div>

                      {/* Start planning / Add to Plan button */}
                      {isCuratingThisCity ? (
                        <button
                          onClick={() => onOpenWorkspace(place)}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Active Itinerary</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartPlanningAction(viewingDest, place)}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Start planning with this spot</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4. PERSISTENT FLOATING DOCK: BOTTOM-RIGHT WITH AUTO-DISMISS & SESSION PERSISTENCE */}
      {showStickyDock && !isStickyDismissed && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-40 max-w-lg w-[calc(100%-2rem)] sm:w-auto bg-[#141413]/95 backdrop-blur-md text-white rounded-full p-2 pl-3.5 pr-2.5 shadow-2xl border border-white/15 flex items-center justify-between gap-3 animate-slide-up">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/20 bg-[#2B2B28]">
              <img
                src={viewingDest.cover_image || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80'}
                alt={viewingCity}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="truncate">
              <p className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                <span>Planning a trip to {viewingCity}?</span>
              </p>
              <p className="text-[11px] text-white/70 truncate hidden sm:block">
                Build your custom itinerary with these sights mapped out.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleStartPlanningAction(viewingDest)}
              className="px-4 py-2 rounded-full bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer ring-1 ring-white/20"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Start planning</span>
            </button>

            <button
              onClick={handleDismissStickyDock}
              className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. MODAL: AVAILABLE HOTELS SELECTOR FOR BASECAMP */}
      {isHotelModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 border border-borderSoft space-y-4 animate-slide-up flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-borderSoft pb-3">
              <div className="flex items-center gap-2">
                <Bed className="w-5 h-5 text-[#C24B27]" />
                <h3 className="font-serif font-bold text-lg text-[#141413]">
                  Select Basecamp Hotel in {viewingCity}
                </h3>
              </div>
              <button
                onClick={() => setIsHotelModalOpen(false)}
                className="p-1.5 rounded-lg text-mutedText hover:text-[#141413] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-mutedText">
              Basecamp hotel must be chosen from available stays so WanderNest can compute accurate walking distances and itinerary routes.
            </p>

            <div className="relative">
              <Search className="w-4 h-4 text-mutedText absolute left-3.5 top-3" />
              <input
                type="text"
                value={hotelFilterTerm}
                onChange={(e) => setHotelFilterTerm(e.target.value)}
                placeholder="Filter available hotels by name..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-borderSoft bg-[#FAF8F5] text-xs font-medium text-[#141413] focus:outline-none focus:border-[#C24B27]"
              />
            </div>

            {loadingHotels ? (
              <div className="py-12 text-center">
                <div className="w-6 h-6 border-2 border-[#C24B27] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-mutedText">Loading available hotels in {viewingCity}...</p>
              </div>
            ) : availableHotels.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Hotel className="w-8 h-8 text-mutedText mx-auto opacity-50" />
                <p className="text-xs text-mutedText">No hotels returned for this area.</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-80 pr-1 divide-y divide-borderSoft/60">
                {availableHotels
                  .filter(h => !hotelFilterTerm.trim() || (h.name || '').toLowerCase().includes(hotelFilterTerm.toLowerCase()))
                  .map(hotel => {
                    const isCurrent = baseHotel?.name === hotel.name;
                    return (
                      <div
                        key={hotel.id}
                        className="pt-3 first:pt-0 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#FAF8F5] shrink-0 border border-borderSoft">
                            <img src={hotel.photo_url} alt={hotel.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="truncate">
                            <h4 className="font-bold text-xs text-[#141413] truncate">{hotel.name}</h4>
                            <p className="text-[11px] text-mutedText truncate">{hotel.address || viewingCity}</p>
                            {hotel.rating && (
                              <span className="flex items-center gap-1 text-[10px] text-amber-600 font-bold mt-0.5">
                                <Star className="w-3 h-3 fill-amber-400" />
                                <span>{hotel.rating}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={buildHotelUrls(hotel, viewingCity).hotelsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-800 text-[10px] font-bold border border-blue-200 hover:bg-blue-100 flex items-center gap-1"
                            title="Check live rates & availability on Google Hotels"
                          >
                            <ExternalLink className="w-3 h-3 text-blue-600" />
                            <span>Book</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleSetBasecampHotel(hotel)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${isCurrent
                              ? 'bg-amber-500 text-white'
                              : 'bg-[#141413] hover:bg-[#C24B27] text-white'
                              }`}
                          >
                            {isCurrent ? '✓ Active Basecamp' : 'Set as Basecamp'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. MODAL: TRIP ATELIER SETUP FALLBACK */}
      {setupModalOpen && setupTargetDest && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-borderSoft overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
            <div className="relative p-6 bg-gradient-to-r from-[#141413] to-[#2B2B28] text-white">
              <button
                onClick={() => setSetupModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Trip Atelier Setup
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold mt-0.5">
                Configure Trip to {setupTargetDest.name}
              </h2>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-mutedText mb-1">
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={setupStartDate}
                    onChange={(e) => setSetupStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-borderSoft bg-[#FAF8F5] text-xs font-medium text-[#141413] focus:outline-none focus:border-[#C24B27]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-mutedText mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    min={setupStartDate || new Date().toISOString().split('T')[0]}
                    value={setupEndDate}
                    onChange={(e) => setSetupEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-borderSoft bg-[#FAF8F5] text-xs font-medium text-[#141413] focus:outline-none focus:border-[#C24B27]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleFinishSetup(true)}
                  className="flex-1 py-3 rounded-2xl bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Start planning</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
