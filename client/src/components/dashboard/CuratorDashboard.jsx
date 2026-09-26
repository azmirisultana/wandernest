import React, { useState, useEffect } from 'react';
import {
  Calendar, MapPin, Plus, Share2, Settings, Users,
  ArrowUpRight, Compass, Search, ArrowRight,
  Sparkles, Coffee, Hotel, Eye, Star
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { searchDestinations, fetchFeaturedDestinations } from '../../api';

function formatTripDate(d) {
  if (!d) return null;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CuratorDashboard({
  trips = [],
  onSelectTrip,
  onStartNewTrip,
  onInitiateTripCreation
}) {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    fetchFeaturedDestinations()
      .then(res => {
        if (res.success) setFeatured(res.data);
      })
      .catch(err => console.warn('Featured error:', err));
  }, []);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchDestinations(val)
      .then(res => {
        if (res.success) setSearchResults(res.data);
      })
      .catch(err => console.warn('Search error:', err));
  };

  const hasExistingTrips = trips && trips.length > 0;
  const activeTrip = hasExistingTrips ? trips[0] : null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAF8F5] text-[#141413] py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Welcome Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#EBE7DF] text-xs font-bold text-[#C24B27] uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trip Workspace Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-[#141413] tracking-tight">
            Curate your journey, {currentUser?.displayName || 'Traveler'}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6860] max-w-xl mx-auto font-normal">
            Choose a city to explore on a live interactive map with 360° Street Views, live weather, and smart day scheduling.
          </p>
        </div>

        {/* Popular Destinations Grid */}
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-serif text-[#141413]">
              Curated Destinations
            </h2>
            <span className="text-xs text-[#6B6860]">
              180+ Territories Supported
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map(dest => (
              <div
                key={dest.id}
                onClick={() => onInitiateTripCreation(dest)}
                className="group bg-white rounded-2xl overflow-hidden border border-[#EBE7DF] hover:border-[#C24B27]/50 shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col hover:-translate-y-1"
              >
                <div className="relative h-44 overflow-hidden bg-[#EBE7DF]">
                  <img
                    src={dest.cover_image}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-md bg-white/90 backdrop-blur-md text-[#141413] text-[10px] font-bold border border-white/40 shadow-xs">
                    {dest.country}
                  </span>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="font-bold font-serif text-base leading-tight">
                      {dest.name}
                    </h3>
                    <p className="text-[11px] text-white/80 line-clamp-1 mt-0.5">
                      {dest.highlights?.join(' • ')}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 flex items-center justify-between bg-[#FAF8F5] text-xs">
                  <span className="text-[#6B6860] font-semibold text-[11px]">
                    Explore Hub
                  </span>
                  <span className="font-semibold text-[#C24B27] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Plan Itinerary</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
