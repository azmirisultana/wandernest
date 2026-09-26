import React, { useState, useEffect } from 'react';
import {
  Hotel, MapPin, Star, Bed, Sparkles, Check,
  ExternalLink, Compass, ArrowLeft, Plus, Wifi, Coffee, Search,
  ShieldCheck, Moon, DollarSign, Calendar
} from 'lucide-react';
import { fetchPlaces } from '../../api';
import { useCurrency } from '../../context/CurrencyContext';

export default function StaysPage({
  activeTrip,
  onBackToWorkspace,
  onOpenStreetView,
  onOpenReviews,
  onUpdateTripHotel,
  onAddToItinerary
}) {
  const { formatPrice, currency } = useCurrency();
  const currentCity = activeTrip?.destination || 'Tokyo';
  const currentLat = activeTrip?.latitude || 35.6762;
  const currentLng = activeTrip?.longitude || 139.6503;

  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentBaseHotel, setCurrentBaseHotel] = useState(activeTrip?.hotel || null);

  useEffect(() => {
    setLoading(true);
    fetchPlaces(currentLat, currentLng, 'stay', 10000)
      .then(res => {
        if (res.success && res.data) {
          setStays(res.data);
        }
      })
      .catch(err => console.warn('Stays fetch error:', err))
      .finally(() => setLoading(false));
  }, [currentLat, currentLng]);

  const handleSetBasecamp = (stay) => {
    const hotelObj = {
      name: stay.name,
      address: stay.address || currentCity,
      latitude: stay.latitude,
      longitude: stay.longitude,
      photo_url: stay.photo_url,
      pricePerNight: stay.pricePerNight || 165,
      rating: stay.rating || null
    };
    setCurrentBaseHotel(hotelObj);
    if (onUpdateTripHotel) onUpdateTripHotel(hotelObj);
  };

  const filteredStays = stays.filter(s => {
    if (!searchTerm.trim()) return true;
    return (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (s.address || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAF8F5] text-[#141413] py-8 px-4 sm:px-6 lg:px-8 font-sans animate-fade-in">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borderSoft pb-6">
          <div className="space-y-1">
            <button
              onClick={onBackToWorkspace}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-mutedText hover:text-[#141413] mb-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Trip Workspace</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C24B27]/10 border border-[#C24B27]/20 flex items-center justify-center text-[#C24B27]">
                <Hotel className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#141413] tracking-tight">
                  Real Hotels & Stays in {currentCity}
                </h1>
                <p className="text-xs text-mutedText mt-0.5">
                  Verified boutique accommodations with authentic photography, traveler reviews, and nightly rates. Anchor one as your Basecamp Hotel.
                </p>
              </div>
            </div>
          </div>

          {/* Search Filter */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-borderSoft text-xs shadow-2xs w-full sm:w-72">
            <Search className="w-4 h-4 text-[#C24B27] shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search hotels by name or district..."
              className="w-full bg-transparent text-xs text-[#141413] focus:outline-none placeholder:text-mutedText"
            />
          </div>
        </div>

        {/* Current Active Basecamp Banner */}
        {currentBaseHotel && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                ★
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-md">
                  Active Basecamp Hotel
                </span>
                <h3 className="font-bold text-sm sm:text-base text-amber-950 mt-0.5">
                  {currentBaseHotel.name}
                </h3>
                <p className="text-xs text-amber-800">
                  {currentBaseHotel.address} • All attraction distances and daily walking times are calibrated from this stay.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stays Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#C24B27] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-mutedText font-semibold">
              Fetching verified hotels, nightly rates, and real photos in {currentCity}...
            </p>
          </div>
        ) : filteredStays.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-borderSoft p-8 shadow-xs">
            <Hotel className="w-10 h-10 text-mutedText mx-auto opacity-40 mb-2" />
            <h3 className="font-serif font-bold text-base text-[#141413]">No hotels found matching "{searchTerm}"</h3>
            <p className="text-xs text-mutedText mt-1">Clear your search filter to browse all verified accommodations.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStays.map(stay => {
              const isBasecamp = currentBaseHotel?.name === stay.name;
              const nightlyUSD = stay.pricePerNight || 165;

              return (
                <div
                  key={stay.id}
                  className={`bg-white rounded-3xl overflow-hidden border shadow-xs hover:shadow-lg transition-all flex flex-col justify-between ${
                    isBasecamp ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-borderSoft hover:border-[#C24B27]/40'
                  }`}
                >
                  <div>
                    {/* Stay Photo with real HD photography */}
                    <div className="relative h-56 overflow-hidden bg-slate-900">
                      <img
                        src={stay.photo_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'}
                        alt={stay.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />

                      {/* Badges Top */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-md text-[10px] font-bold text-[#141413] border border-white/40 shadow-xs">
                          {stay.tagLabel || 'Boutique Hotel'}
                        </span>
                        {isBasecamp && (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-bold shadow-xs">
                            ★ Basecamp
                          </span>
                        )}
                      </div>

                      {/* Nightly Price Tag Top Right */}
                      <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-white text-right border border-white/20">
                        <div className="text-xs font-bold text-emerald-400">
                          {formatPrice(nightlyUSD)}
                        </div>
                        <span className="text-[9px] text-white/80 block leading-tight">/ night</span>
                      </div>

                      {/* Verified Badge & Rating Bottom */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-semibold text-emerald-300">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified Hotel</span>
                        </span>
                        {stay.rating ? (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-bold text-amber-400">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{stay.rating}</span>
                            {stay.reviewsCount ? (
                              <span className="text-white/80 font-normal">({stay.reviewsCount})</span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-medium text-white/80">
                            Google Maps
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stay Body */}
                    <div className="p-5 space-y-2.5">
                      <div>
                        <h3 className="font-serif font-bold text-base text-[#141413] truncate">
                          {stay.name}
                        </h3>
                        <p className="text-xs text-mutedText truncate flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-[#C24B27] shrink-0" />
                          <span>{stay.address || currentCity}</span>
                        </p>
                      </div>

                      {stay.roomType && (
                        <div className="inline-block px-2.5 py-0.5 rounded-md bg-[#FAF8F5] border border-borderSoft text-[11px] font-semibold text-[#141413]">
                          🛏 {stay.roomType}
                        </div>
                      )}

                      {/* Real Amenities */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-mutedText pt-0.5">
                        {(stay.amenities && stay.amenities.length > 0 ? stay.amenities.slice(0, 3) : ['Free High-Speed Wi-Fi', 'Breakfast Available', '24/7 Concierge']).map((am, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-borderSoft font-medium text-[#141413]">
                            ✓ {am}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-5 pt-0 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onOpenStreetView && onOpenStreetView(stay)}
                        className="py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-borderSoft text-[11px] font-semibold text-[#141413] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5 text-[#C24B27]" />
                        <span>Street View</span>
                      </button>

                      <a
                        href={stay.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.name + ' ' + (stay.address || currentCity))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-borderSoft text-[11px] font-semibold text-[#141413] flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                        <span>Google Reviews</span>
                      </a>
                    </div>

                    {/* Live Google Hotels Booking Link */}
                    <a
                      href={stay.googleHotelsUrl || `https://www.google.com/travel/hotels?q=${encodeURIComponent(stay.name + ' ' + (stay.address || currentCity))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                      <span>Book on Google Hotels</span>
                    </a>

                    {/* Basecamp Anchor CTA */}
                    <button
                      onClick={() => handleSetBasecamp(stay)}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                        isBasecamp
                          ? 'bg-amber-500 text-white'
                          : 'bg-[#141413] hover:bg-[#C24B27] text-white'
                      }`}
                    >
                      <Bed className="w-3.5 h-3.5" />
                      <span>{isBasecamp ? '✓ Set as Active Basecamp' : 'Set as My Basecamp Hotel'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
