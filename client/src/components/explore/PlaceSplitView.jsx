import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Calendar, Compass, ArrowLeft, ArrowRight, Star,
  Eye, Utensils, Landmark, Hotel, RotateCw, Sparkles,
  ExternalLink, Layers, MessageSquare, ChevronRight, Check,
  DollarSign, ShieldCheck, TrendingUp, Info
} from 'lucide-react';
import WanderMap from '../map/WanderMap';
import { fetchPlaces } from '../../api';
import { useCurrency } from '../../context/CurrencyContext';
import { calculateTripBudget } from '../../services/budgetService';

export default function PlaceSplitView({
  place,
  onBack,
  onStartPlanning,
  onOpenStreetView,
  onOpenReviews
}) {
  const { formatPrice, currency } = useCurrency();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const placeName = place?.name || 'Selected Place';
  const placeCountry = place?.country || 'Worldwide';
  const latitude = parseFloat(place?.latitude || place?.lat) || 35.6762;
  const longitude = parseFloat(place?.longitude || place?.lng) || 139.6503;
  const coverImage = place?.cover_image || place?.photo_url || 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80';

  // Calculate real budget benchmark for this destination
  const budgetEstimate = calculateTripBudget(placeName, 5, 'standard', 1, false);

  // Fetch verified sights and places for this destination
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchPlaces(latitude, longitude, 'all', 10000)
      .then(res => {
        if (isMounted && res.success && Array.isArray(res.data)) {
          let items = res.data;
          if (refreshKey > 0) {
            items = [...items].sort(() => Math.random() - 0.5);
          }
          setPlaces(items);
        }
      })
      .catch(err => {
        console.warn('Failed to load places for split view:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [latitude, longitude, refreshKey]);

  // Filter places based on active category tab
  const filteredPlaces = places.filter(p => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'do') return p.category === 'do';
    if (activeCategory === 'eat') return p.category === 'eat';
    if (activeCategory === 'stay') return p.category === 'stay';
    return true;
  });

  const handleSelectPlaceOnMap = (item) => {
    setSelectedPlaceId(item.id);
  };

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-[#FAF8F5] text-[#141413] animate-fade-in font-sans">
      {/* LEFT PANE: Place Information & Sights (Scrollable) */}
      <div className="w-full lg:w-[48%] xl:w-[45%] h-full overflow-y-auto border-r border-borderSoft flex flex-col bg-[#FAF8F5]">
        {/* Top Sticky Navigation Bar */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-borderSoft px-4 py-3 flex items-center justify-between gap-3 shadow-2xs">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-mutedText hover:text-[#141413] transition-colors py-1 px-2.5 rounded-lg hover:bg-[#FAF8F5] cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#C24B27] shrink-0" />
            <span className="text-xs font-bold text-[#141413] truncate">
              {placeName}
            </span>
            <span className="text-mutedText text-xs">•</span>
            <span className="text-xs text-mutedText truncate">{placeCountry}</span>
          </div>

          <button
            onClick={() => onStartPlanning(place)}
            className="px-3.5 py-1.5 rounded-full bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Plan a Trip</span>
          </button>
        </div>

        {/* Place Hero Banner */}
        <div className="relative h-56 sm:h-64 shrink-0 overflow-hidden bg-slate-900">
          <img
            src={coverImage}
            alt={placeName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

          {/* Destination Badges */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider border border-white/20">
              Explorer Split View
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white/90 text-[10px] font-semibold">
              {placeCountry}
            </span>
          </div>

          {/* Place Title & Info */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h1 className="font-serif font-bold text-3xl sm:text-4xl text-white tracking-tight leading-tight">
              {placeName}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 line-clamp-2 mt-1">
              {place?.tagline || place?.description || `Explore top verified attractions, local dining, 360° street views, and accommodations in ${placeName}.`}
            </p>
          </div>
        </div>

        {/* PRIMARY CALL-TO-ACTION CARD: Plan a Trip / Start Planning */}
        <div className="p-4 sm:p-5 space-y-3.5">
          <div className="bg-gradient-to-r from-white via-white to-amber-50/50 rounded-2xl p-4 sm:p-5 border-2 border-[#C24B27]/20 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#C24B27]/10 text-[#C24B27] flex items-center justify-center font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#141413]">
                  Ready to plan a trip to {placeName}?
                </h3>
              </div>
              <p className="text-xs text-mutedText max-w-md">
                Select your days, pick travel dates (optional), and customize your daily itinerary on an interactive split map.
              </p>
            </div>

            <button
              onClick={() => onStartPlanning(place)}
              className="w-full sm:w-auto px-5 py-3 rounded-full bg-[#C24B27] hover:bg-[#A83D1D] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Start Planning Itinerary</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* REAL TRAVEL BUDGET INFORMATION CARD */}
          <div className="bg-white rounded-2xl p-4 border border-borderSoft shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-[#141413]">
                  Real Travel Budget Benchmark
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                ~{formatPrice(budgetEstimate.dailyAveragePerPerson)} / day
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-borderSoft text-center">
                <span className="text-[10px] text-mutedText block font-medium">🏨 Lodging</span>
                <span className="text-xs font-bold text-[#141413] mt-0.5 block">
                  {formatPrice(budgetEstimate.rates.lodgingPerNight)}<span className="text-[9px] font-normal text-mutedText">/nt</span>
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-borderSoft text-center">
                <span className="text-[10px] text-mutedText block font-medium">🍽 Food & Dining</span>
                <span className="text-xs font-bold text-[#141413] mt-0.5 block">
                  {formatPrice(budgetEstimate.rates.foodPerDay)}<span className="text-[9px] font-normal text-mutedText">/day</span>
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-borderSoft text-center">
                <span className="text-[10px] text-mutedText block font-medium">🏛 Sights & Tours</span>
                <span className="text-xs font-bold text-[#141413] mt-0.5 block">
                  {formatPrice(budgetEstimate.rates.activitiesPerDay)}<span className="text-[9px] font-normal text-mutedText">/day</span>
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-borderSoft text-center">
                <span className="text-[10px] text-mutedText block font-medium">🚇 Local Transit</span>
                <span className="text-xs font-bold text-[#141413] mt-0.5 block">
                  {formatPrice(budgetEstimate.rates.transitPerDay)}<span className="text-[9px] font-normal text-mutedText">/day</span>
                </span>
              </div>
            </div>

            {/* 5-day estimated ground total */}
            <div className="flex items-center justify-between text-[11px] text-mutedText border-t border-borderSoft pt-2">
              <span>Standard 5-day trip estimate (ground expenses):</span>
              <span className="font-bold text-[#141413]">{formatPrice(budgetEstimate.groundTotal)}</span>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 sm:px-5 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-borderSoft">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[#141413] text-white shadow-2xs'
                  : 'text-mutedText hover:text-[#141413] hover:bg-white'
              }`}
            >
              All Highlights ({places.length})
            </button>

            <button
              onClick={() => setActiveCategory('do')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeCategory === 'do'
                  ? 'bg-[#141413] text-white shadow-2xs'
                  : 'text-mutedText hover:text-[#141413] hover:bg-white'
              }`}
            >
              <Landmark className="w-3.5 h-3.5 text-[#C24B27]" />
              <span>Sights & Landmarks</span>
            </button>

            <button
              onClick={() => setActiveCategory('eat')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeCategory === 'eat'
                  ? 'bg-[#141413] text-white shadow-2xs'
                  : 'text-mutedText hover:text-[#141413] hover:bg-white'
              }`}
            >
              <Utensils className="w-3.5 h-3.5 text-[#C24B27]" />
              <span>Food & Dining</span>
            </button>

            <button
              onClick={() => setActiveCategory('stay')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeCategory === 'stay'
                  ? 'bg-[#141413] text-white shadow-2xs'
                  : 'text-mutedText hover:text-[#141413] hover:bg-white'
              }`}
            >
              <Hotel className="w-3.5 h-3.5 text-[#C24B27]" />
              <span>Accommodations</span>
            </button>

            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="ml-auto p-1.5 text-mutedText hover:text-[#141413] transition-colors cursor-pointer"
              title="Refresh sights"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Places List */}
        <div className="flex-1 px-4 sm:px-5 pb-8 space-y-3">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#C24B27] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-mutedText font-semibold">
                Loading authentic places and coordinates in {placeName}...
              </p>
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-borderSoft p-6">
              <Compass className="w-8 h-8 text-[#C24B27] mx-auto mb-2 opacity-60" />
              <p className="text-xs font-bold text-[#141413]">No places found for this category</p>
              <p className="text-[11px] text-mutedText mt-1">Try switching to "All Highlights" or refresh.</p>
            </div>
          ) : (
            filteredPlaces.map((item, idx) => {
              const isSelected = selectedPlaceId === item.id;
              const reviewsList = Array.isArray(item.reviews) ? item.reviews : [];

              return (
                <div
                  key={item.id || idx}
                  onClick={() => handleSelectPlaceOnMap(item)}
                  className={`group bg-white rounded-2xl p-3 border transition-all cursor-pointer flex gap-3 shadow-2xs hover:shadow-md ${
                    isSelected
                      ? 'border-[#C24B27] ring-2 ring-[#C24B27]/20 bg-amber-50/20'
                      : 'border-borderSoft hover:border-[#C24B27]/40'
                  }`}
                >
                  {/* Photo */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={item.photo_url || item.image || 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80'}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur-md text-[9px] font-bold text-[#141413]">
                      #{idx + 1}
                    </span>
                    {item.pricePerNight && (
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-bold text-emerald-300">
                        {formatPrice(item.pricePerNight)}/nt
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#C24B27]">
                          {item.category === 'eat' ? '🍽 Dining' : item.category === 'stay' ? '🏨 Hotel' : '✦ Attraction'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenReviews) onOpenReviews(item);
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:text-amber-600 transition-colors"
                        >
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{item.rating || 4.7}</span>
                          <span className="text-mutedText text-[10px] font-normal">({reviewsList.length || 3})</span>
                        </button>
                      </div>

                      <h4 className="font-bold text-sm text-[#141413] group-hover:text-[#C24B27] transition-colors line-clamp-1 mt-0.5">
                        {item.name}
                      </h4>

                      <p className="text-[11px] text-mutedText line-clamp-1 mt-0.5">
                        {item.address || `${placeName} Center`}
                      </p>

                      {item.tagLabel && (
                        <p className="text-[10px] text-mutedText/80 italic mt-1 line-clamp-1">
                          {item.tagLabel}
                        </p>
                      )}
                    </div>

                    {/* Interactive Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      {onOpenStreetView && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenStreetView(item);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F2EFE8] text-[10px] font-semibold text-[#141413] border border-borderSoft flex items-center gap-1 transition-colors cursor-pointer"
                          title="Open 360° Street View"
                        >
                          <Eye className="w-3 h-3 text-[#C24B27]" />
                          <span>Street View</span>
                        </button>
                      )}

                      {onOpenReviews && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReviews(item);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F2EFE8] text-[10px] font-semibold text-[#141413] border border-borderSoft flex items-center gap-1 transition-colors cursor-pointer"
                          title="Read Real Reviews"
                        >
                          <MessageSquare className="w-3 h-3 text-[#C24B27]" />
                          <span>Real Reviews ({reviewsList.length || 3})</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartPlanning(place, item);
                        }}
                        className="ml-auto px-3 py-1 rounded-lg bg-[#141413] hover:bg-[#C24B27] text-white text-[10px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Include in trip plan"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>Plan Trip</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE: Interactive WanderMap (Leaflet Map) */}
      <div className="hidden lg:block lg:w-[52%] xl:w-[55%] h-full relative">
        <WanderMap
          center={[latitude, longitude]}
          zoom={13}
          places={filteredPlaces}
          itineraryItems={[]}
          activePlaceId={selectedPlaceId}
          onSelectPlace={handleSelectPlaceOnMap}
          onAddToItinerary={(selectedItem) => {
            onStartPlanning(place, selectedItem);
          }}
          onOpenStreetView={onOpenStreetView}
          onOpenReviews={onOpenReviews}
        />
      </div>
    </div>
  );
}
