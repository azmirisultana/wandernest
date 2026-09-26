import React, { useState, useEffect, useRef } from 'react';
import {
  User, LogOut, Compass, Hotel, Plane, Bookmark, MapPin,
  Search, X, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSavedPlaces } from '../../context/SavedPlacesContext';
import { searchDestinations } from '../../api';

export default function Navbar({
  onOpenAuth,
  onNavigateHome,
  onOpenProfile,
  onNavigateView,
  onStartPlanning,
  onExplorePlace,
  currentView,
  activeTrip
}) {
  const { currentUser, logout } = useAuth();
  const { savedPlaces } = useSavedPlaces();

  // Header Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    setIsDropdownOpen(true);

    searchDestinations(val.trim())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
      })
      .catch(err => {
        console.warn('Navbar search error:', err);
        setSearchResults([]);
      })
      .finally(() => setIsSearching(false));
  };

  const handleSelectToExplore = (place) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    if (onExplorePlace) {
      onExplorePlace(place);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchResults.length > 0) {
      handleSelectToExplore(searchResults[0]);
    } else {
      handleSelectToExplore({
        name: searchQuery.trim(),
        country: 'Worldwide',
        latitude: 35.6762,
        longitude: 139.6503
      });
    }
  };

  const handleSignOut = async () => {
    await logout();
    if (onNavigateHome) onNavigateHome();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FAF8F5]/95 backdrop-blur-md border-b border-borderSoft transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Logo */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 text-left group shrink-0 focus:outline-none cursor-pointer"
          title="WanderNest Home"
        >
          <div className="w-9 h-9 rounded-xl bg-[#141413] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-5 h-5">
              <path d="M50 15 Q50 50 85 50 Q50 50 50 85 Q50 50 15 50 Q50 50 50 15 Z" fill="#C24B27" />
              <circle cx="50" cy="50" r="5" fill="#FAF8F5" />
            </svg>
          </div>
          <div>
            <span className="font-serif font-bold text-xl text-[#141413] tracking-tight flex items-baseline">
              Wander<span className="text-[#C24B27] font-normal italic ml-0.5">Nest</span>
            </span>
          </div>
        </button>

        {/* Center: Navigation Links (When logged in) */}
        {currentUser ? (
          <nav className="hidden md:flex items-center gap-1 bg-white/80 border border-borderSoft rounded-full p-1 shadow-2xs">
            <button
              onClick={() => onNavigateView && onNavigateView('explore')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'explore'
                  ? 'bg-[#141413] text-white shadow-xs'
                  : 'text-mutedText hover:text-[#141413] hover:bg-[#FAF8F5]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-[#C24B27]" />
              <span>Explore</span>
            </button>

            <button
              onClick={() => onNavigateView && onNavigateView('stays')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'stays'
                  ? 'bg-[#141413] text-white shadow-xs'
                  : 'text-mutedText hover:text-[#141413] hover:bg-[#FAF8F5]'
              }`}
            >
              <Hotel className="w-3.5 h-3.5 text-[#C24B27]" />
              <span>Stays</span>
            </button>

            <button
              onClick={() => onNavigateView && onNavigateView('flights')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'flights'
                  ? 'bg-[#141413] text-white shadow-xs'
                  : 'text-mutedText hover:text-[#141413] hover:bg-[#FAF8F5]'
              }`}
            >
              <Plane className="w-3.5 h-3.5 text-[#C24B27]" />
              <span>Flights</span>
            </button>

            <button
              onClick={() => onNavigateView && onNavigateView('my-trips')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'my-trips'
                  ? 'bg-[#141413] text-white shadow-xs'
                  : 'text-mutedText hover:text-[#141413] hover:bg-[#FAF8F5]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-[#C24B27]" />
              <span>My Trips</span>
            </button>

            <button
              onClick={() => onNavigateView && onNavigateView('saved-places')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'saved-places'
                  ? 'bg-[#141413] text-white shadow-xs'
                  : 'text-mutedText hover:text-[#141413] hover:bg-[#FAF8F5]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-[#C24B27]" />
              <span>Saved</span>
              {savedPlaces?.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#C24B27]/10 text-[#C24B27]">
                  {savedPlaces.length}
                </span>
              )}
            </button>

            {activeTrip ? (
              <button
                onClick={() => onNavigateView && onNavigateView('workspace')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'workspace'
                    ? 'bg-[#C24B27] text-white shadow-xs'
                    : 'text-mutedText hover:text-[#141413] hover:bg-[#FAF8F5]'
                }`}
                title={`Active: ${activeTrip.destination}`}
              >
                <MapPin className="w-3.5 h-3.5 text-white sm:text-inherit" />
                <span>Workspace ({activeTrip.destination})</span>
              </button>
            ) : null}
          </nav>
        ) : null}

        {/* Right Side: Search Button/Bar on the Right + Profile / Sign Out OR Login / Sign Up */}
        <div className="flex items-center gap-3 shrink-0">
          {/* HEADER SEARCH BAR TO EXPLORE PLACES (Moved to the Right) */}
          <div ref={searchRef} className="relative">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <div className="relative flex items-center bg-white rounded-full border border-borderSoft shadow-2xs hover:border-[#C24B27]/40 focus-within:border-[#C24B27] focus-within:ring-2 focus-within:ring-[#C24B27]/20 transition-all pl-3 pr-1 py-1 w-44 sm:w-56 md:w-64 focus-within:w-56 sm:focus-within:w-68 md:focus-within:w-76">
                <Search className="w-4 h-4 text-[#C24B27] shrink-0 mr-1.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setIsDropdownOpen(true);
                  }}
                  placeholder="Explore places..."
                  className="w-full text-xs font-semibold text-[#141413] bg-transparent focus:outline-none placeholder:text-mutedText/70"
                />

                {isSearching ? (
                  <div className="w-3.5 h-3.5 border-2 border-[#C24B27] border-t-transparent rounded-full animate-spin shrink-0 mx-1.5" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setIsDropdownOpen(false);
                    }}
                    className="p-1 text-mutedText hover:text-[#141413] mr-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : null}

                {/* Explore Search Button on the Header */}
                <button
                  type="submit"
                  className="px-3 py-1 rounded-full bg-[#141413] hover:bg-[#C24B27] text-white text-[11px] font-bold transition-all shadow-2xs shrink-0 flex items-center gap-1 cursor-pointer"
                  title="Search places to explore"
                >
                  <span>Explore</span>
                </button>
              </div>
            </form>

            {/* Autocomplete Dropdown - Cleanly aligned right, with Trip Plan button removed */}
            {isDropdownOpen && searchResults.length > 0 && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-borderSoft overflow-hidden z-50 max-h-80 overflow-y-auto divide-y divide-borderSoft/60 text-left animate-slide-up">
                <div className="px-3.5 py-2 bg-[#FAF8F5] border-b border-borderSoft flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-mutedText">
                    Destinations & Places ({searchResults.length})
                  </span>
                  <span className="text-[10px] text-mutedText">Click to explore</span>
                </div>

                {searchResults.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    onClick={() => handleSelectToExplore(item)}
                    className="px-3.5 py-2.5 hover:bg-[#FAF8F5] cursor-pointer flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 pr-2 truncate">
                      <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] group-hover:bg-white border border-borderSoft flex items-center justify-center text-[#C24B27] shrink-0 transition-colors">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-xs text-[#141413] group-hover:text-[#C24B27] transition-colors truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-mutedText truncate">
                          {item.displayName || item.country}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-[#FAF8F5] group-hover:bg-white border border-borderSoft text-[10px] font-semibold text-mutedText group-hover:text-[#C24B27] transition-colors">
                        {item.typeLabel || 'City'}
                      </span>
                      <span className="text-xs font-bold text-[#C24B27] ml-1 group-hover:translate-x-0.5 transition-transform">
                        Explore →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile Circle & Sign Out OR Login & Sign Up */}
          {currentUser ? (
            <div className="flex items-center gap-2.5">
              {/* Profile Circle */}
              <button
                onClick={onOpenProfile}
                title={`Profile: ${currentUser.displayName || currentUser.email || 'Traveler'}`}
                className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs transition-all shadow-2xs focus:outline-none cursor-pointer ${
                  currentView === 'profile'
                    ? 'border-[#C24B27] ring-2 ring-[#C24B27]/20 bg-[#C24B27] text-white'
                    : 'border-borderSoft hover:border-[#141413] bg-white text-[#141413]'
                }`}
              >
                {currentUser.displayName ? (
                  <span>{currentUser.displayName.slice(0, 2).toUpperCase()}</span>
                ) : (
                  <User className="w-4 h-4 text-[#C24B27]" />
                )}
              </button>

              {/* Sign Out Option */}
              <button
                onClick={handleSignOut}
                title="Sign out of WanderNest"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-mutedText hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth(false)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#141413] hover:bg-white border border-transparent hover:border-borderSoft transition-colors cursor-pointer"
              >
                Log In
              </button>

              <button
                onClick={() => onOpenAuth(true)}
                className="px-4 py-1.5 rounded-full bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
