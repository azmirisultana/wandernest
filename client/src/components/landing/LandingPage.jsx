import React, { useState, useEffect } from 'react';
import {
  Compass, MapPin, Calendar, ArrowRight, ShieldCheck,
  CheckCircle2, Sparkles, Navigation, Globe, Eye,
  CloudSun, Star, SlidersHorizontal, ChevronRight, Lock
} from 'lucide-react';
import { searchDestinations, fetchFeaturedDestinations } from '../../api';

export default function LandingPage({
  onSelectDestination,
  onStartCustomTrip,
  onOpenAuth,
  currentUser,
  trips = [],
  onSelectTrip
}) {
  const [destInput, setDestInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [daysCount, setDaysCount] = useState(5);
  const [stylePreference, setStylePreference] = useState('Architectural & Zen');
  const [featuredBlueprints, setFeaturedBlueprints] = useState([]);

  useEffect(() => {
    fetchFeaturedDestinations()
      .then(res => {
        if (res.success && res.data) {
          setFeaturedBlueprints(res.data);
        }
      })
      .catch(err => console.warn('Featured destinations error:', err));
  }, []);

  const handleSearchChange = (val) => {
    setDestInput(val);
    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchDestinations(val)
      .then(res => {
        if (res.success) setSearchResults(res.data);
      })
      .catch(err => console.warn('Search destinations error:', err));
  };

  const handleStartCurating = () => {
    // If not logged in, must be taken to authentication page/modal
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth(false);
      return;
    }

    if (destInput.trim()) {
      onSelectDestination({
        name: destInput.trim(),
        country: 'Worldwide',
        latitude: 35.6762,
        longitude: 139.6503,
        daysCount: parseInt(daysCount) || 5,
        mood: stylePreference
      });
    } else {
      onStartCustomTrip({
        daysCount: parseInt(daysCount) || 5,
        mood: stylePreference
      });
    }
  };

  const handleBlueprintClick = (dest) => {
    // If not logged in, must be taken to authentication page/modal
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth(false);
      return;
    }

    onSelectDestination({
      ...dest,
      daysCount: parseInt(daysCount) || 5,
      mood: stylePreference
    });
  };

  const handleLaunchWorkspaceClick = () => {
    // If not logged in, must be taken to authentication page/modal
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth(false);
      return;
    }
    onStartCustomTrip({
      daysCount: parseInt(daysCount) || 5,
      mood: stylePreference
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#141413] animate-fade-in font-sans">
      {/* 1. GRAND HERO BANNER */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 px-4 sm:px-6 lg:px-8 text-center max-w-6xl mx-auto">
        {/* Editorial Pill Tag (Cleaned: NO cartography) */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-badgeBg border border-borderSoft text-[11px] font-bold tracking-wider uppercase text-mutedText mb-8 shadow-2xs">
          <Compass className="w-3.5 h-3.5 text-[#C24B27]" />
          <span>The Modern Travel Atelier • 180+ Global Destinations</span>
        </div>

        {/* Big Grand Headline */}
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-serif text-[#141413] tracking-tight leading-[1.05] mb-6 font-normal">
          Curate the world. <br />
          <span className="italic font-normal">Plan with intention.</span>
        </h1>

        {/* Editorial Subtitle */}
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-mutedText font-normal leading-relaxed mb-12">
          A fluid, map-first workspace engineered for discerning travelers. Craft multi-day journeys, step into high-definition 360° Street Views, sync live weather, and discover architectural gems across 180+ countries.
        </p>

        {/* Floating Curating Launcher Card */}
        <div className="relative max-w-4xl mx-auto bg-white rounded-3xl p-3 sm:p-4 shadow-xl border border-borderSoft mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* DESTINATION INPUT */}
            <div className="md:col-span-5 text-left px-4 py-2 relative">
              <span className="block text-[10px] font-bold tracking-wider uppercase text-mutedText">
                Destination
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-4 h-4 text-[#C24B27] shrink-0" />
                <input
                  type="text"
                  value={destInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Where to? (e.g. Kyoto, Rome, Tokyo)..."
                  className="w-full font-bold text-sm text-[#141413] focus:outline-none bg-transparent"
                />
              </div>

              {/* Autocomplete dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-borderSoft overflow-hidden z-50 text-left max-h-60 overflow-y-auto">
                  {searchResults.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setDestInput(s.displayName || s.name);
                        setSearchResults([]);
                        if (!currentUser) {
                          if (onOpenAuth) onOpenAuth(false);
                        } else {
                          onSelectDestination({ ...s, daysCount });
                        }
                      }}
                      className="w-full px-4 py-2.5 hover:bg-[#FAF8F5] text-xs font-semibold flex items-center justify-between border-b border-borderSoft/60 last:border-0 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#C24B27]" />
                        <span>{s.displayName || s.name}</span>
                      </div>
                      <span className="text-[10px] text-[#C24B27] font-bold">Select →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* DURATION / FLEXIBLE DAYS */}
            <div className="md:col-span-3 text-left px-4 py-2 border-t md:border-t-0 md:border-l border-borderSoft">
              <span className="block text-[10px] font-bold tracking-wider uppercase text-mutedText">
                Trip Duration
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-4 h-4 text-mutedText shrink-0" />
                <select
                  value={daysCount}
                  onChange={(e) => setDaysCount(Number(e.target.value))}
                  className="w-full font-bold text-sm text-[#141413] focus:outline-none bg-transparent cursor-pointer"
                >
                  <option value={3}>3 Days Escape</option>
                  <option value={5}>5 Days Journey</option>
                  <option value={7}>7 Days Itinerary</option>
                  <option value={10}>10 Days Grand Tour</option>
                  <option value={14}>14 Days Deep Dive</option>
                </select>
              </div>
            </div>

            {/* STYLE / MOOD */}
            <div className="md:col-span-2 text-left px-4 py-2 border-t md:border-t-0 md:border-l border-borderSoft">
              <span className="block text-[10px] font-bold tracking-wider uppercase text-mutedText">
                Travel Style
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <select
                  value={stylePreference}
                  onChange={(e) => setStylePreference(e.target.value)}
                  className="w-full font-bold text-xs text-[#141413] focus:outline-none bg-transparent cursor-pointer"
                >
                  <option value="Architectural & Zen">Zen & Culture</option>
                  <option value="Culinary & Wine">Foodie & Wine</option>
                  <option value="Coastal & Marine">Coastal & Sea</option>
                  <option value="Wilderness Expedition">Adventure</option>
                </select>
              </div>
            </div>

            {/* CTA BUTTON - TRIP PLANNING BUTTON IN HERO */}
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={handleStartCurating}
                className="w-full py-3.5 px-5 rounded-full bg-[#C24B27] hover:bg-[#A83D1D] text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                title="Start Trip Planning"
              >
                {!currentUser && <Lock className="w-3.5 h-3.5 opacity-80" />}
                <Calendar className="w-3.5 h-3.5" />
                <span>Plan a Trip</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* My Trips on Landing Page if user has trips */}
        {trips && trips.length > 0 && (
          <div className="max-w-4xl mx-auto mt-10 text-left bg-white rounded-3xl p-6 border border-borderSoft shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-borderSoft pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#C24B27]" />
                <h3 className="font-serif font-bold text-lg text-[#141413]">
                  My Saved Trips ({trips.length})
                </h3>
              </div>
              <span className="text-xs text-mutedText">Click to open itinerary</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {trips.map(t => (
                <div
                  key={t.id}
                  onClick={() => onSelectTrip && onSelectTrip(t)}
                  className="group bg-[#FAF8F5] hover:bg-white border border-borderSoft hover:border-[#C24B27]/40 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                >
                  <div className="relative h-28 overflow-hidden bg-slate-200">
                    <img
                      src={t.cover_image || t.coverImage || 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80'}
                      alt={t.title || t.destination}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-bold text-[#141413]">
                      {t.daysCount || 5} Days
                    </span>
                    <p className="absolute bottom-2 left-2.5 right-2.5 font-bold text-xs text-white truncate">
                      {t.title || `${t.destination} Itinerary`}
                    </p>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <span className="text-mutedText truncate text-[11px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#C24B27] shrink-0" />
                      <span>{t.destination}</span>
                    </span>
                    <span className="text-[#C24B27] font-bold text-[11px]">Open →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 2. VALUE PROPOSITIONS STRIP */}
      <section className="border-y border-borderSoft bg-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <span className="block font-serif text-3xl sm:text-4xl font-bold text-[#141413]">
              180+
            </span>
            <span className="text-xs text-mutedText font-medium">
              Global Destinations Supported
            </span>
          </div>

          <div className="space-y-1">
            <span className="block font-serif text-3xl sm:text-4xl font-bold text-[#C24B27]">
              360°
            </span>
            <span className="text-xs text-mutedText font-medium">
              Google Street View Panoramas
            </span>
          </div>

          <div className="space-y-1">
            <span className="block font-serif text-3xl sm:text-4xl font-bold text-[#141413]">
              100%
            </span>
            <span className="text-xs text-mutedText font-medium">
              Custom Day Duration & Routing
            </span>
          </div>

          <div className="space-y-1">
            <span className="block font-serif text-3xl sm:text-4xl font-bold text-[#C24B27]">
              360° Views
            </span>
            <span className="text-xs text-mutedText font-medium">
              Interactive Street Panoramas
            </span>
          </div>
        </div>
      </section>

      {/* 3. CURATED DESTINATIONS GRID */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-borderSoft pb-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C24B27]">
              Signature Blueprints
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#141413] mt-1">
              Curated Destination Guides
            </h2>
            <p className="text-xs sm:text-sm text-mutedText mt-1">
              Select an itinerary blueprint to personalize stops, adjust pacing, and inspect street views.
            </p>
          </div>

          <button
            onClick={handleLaunchWorkspaceClick}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C24B27] hover:underline shrink-0"
          >
            <span>Custom Destination Planner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredBlueprints.map((dest) => (
            <div
              key={dest.id}
              onClick={() => handleBlueprintClick(dest)}
              className="group bg-white rounded-3xl overflow-hidden border border-borderSoft hover:border-[#C24B27]/40 shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1"
            >
              {/* Photo */}
              <div className="relative h-60 overflow-hidden bg-[#FAF8F5]">
                <img
                  src={dest.cover_image}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Top Badges */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[10px] font-bold text-[#141413] border border-white/40 shadow-xs">
                    {dest.country}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[10px] font-bold text-[#C24B27] border border-white/40 shadow-xs">
                    Explore Hub
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-serif font-bold text-2xl leading-tight">
                    {dest.name}
                  </h3>
                  <p className="text-xs text-white/80 line-clamp-1 mt-1 font-light">
                    {dest.tagline}
                  </p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-mutedText">
                    Highlights
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {dest.highlights?.map((h, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-borderSoft text-[11px] text-[#141413] font-medium"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-borderSoft flex items-center justify-between text-xs">
                  <span className="font-semibold text-mutedText">
                    5-Day Itinerary Blueprint
                  </span>
                  <span className="font-bold text-[#C24B27] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Explore Blueprint</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. WORKSPACE CAPABILITIES SHOWCASE */}
      <section className="py-20 bg-white border-t border-borderSoft px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#C24B27]">
              Crafted For Explorers
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#141413]">
              Every tool in harmony.
            </h2>
            <p className="text-xs sm:text-sm text-mutedText">
              Replace messy spreadsheets, scattered tabs, and bookmark lists with one unified canvas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-3xl bg-[#FAF8F5] border border-borderSoft space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-white border border-borderSoft flex items-center justify-center text-[#C24B27] shadow-xs">
                <Navigation className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-xl text-[#141413]">
                Precision Daily Routing
              </h3>
              <p className="text-xs text-mutedText leading-relaxed">
                Sequence stops by day with custom reordering, interactive map markers, and walking/driving connection routes.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#FAF8F5] border border-borderSoft space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-white border border-borderSoft flex items-center justify-center text-[#C24B27] shadow-xs">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-xl text-[#141413]">
                High-Definition 360° Visuals
              </h3>
              <p className="text-xs text-mutedText leading-relaxed">
                Preview the exact streetscape, entrance, and verified Google reviews for any temple, restaurant, or boutique hotel before you arrive.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#FAF8F5] border border-borderSoft space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-white border border-borderSoft flex items-center justify-center text-[#C24B27] shadow-xs">
                <CloudSun className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-xl text-[#141413]">
                Live Weather & Dynamic Ledger
              </h3>
              <p className="text-xs text-mutedText leading-relaxed">
                Open-Meteo forecasts sync high/low temperatures to each day pill, while the currency engine tracks expenses across 5 world currencies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION BANNER (Warm Light Luxury Style) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="p-10 sm:p-16 rounded-3xl bg-white text-[#141413] shadow-lg border border-borderSoft relative overflow-hidden space-y-6">
          <div className="relative z-10 max-w-xl mx-auto space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#C24B27]">
              Start Your Bespoke Journey
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold leading-tight text-[#141413]">
              Ready to curate your next voyage?
            </h2>
            <p className="text-xs sm:text-sm text-mutedText">
              Sign in to unlock your personal workspace, plan day-by-day itineraries, inspect street views, and manage trip expenses.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleLaunchWorkspaceClick}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#C24B27] hover:bg-[#A63E1F] text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {!currentUser && <Lock className="w-3.5 h-3.5 opacity-80" />}
                <span>Launch Workspace Planner</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. EDITORIAL FOOTER (NO cartography) */}
      <footer className="border-t border-borderSoft py-12 bg-white text-xs text-mutedText">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#141413] flex items-center justify-center">
              <span className="text-[#C24B27] text-xs font-bold">✦</span>
            </div>
            <span className="font-serif font-bold text-sm text-[#141413]">WanderNest</span>
            <span>— Intentional travel planning & multi-day itineraries.</span>
          </div>

          <div className="text-center sm:text-right">
            Designed for travelers who appreciate intention. 180+ Global Destinations.
          </div>
        </div>
      </footer>
    </div>
  );
}
