import React, { useState, useEffect, useRef } from 'react';
import {
  Search, MapPin, X, Calendar, ArrowRight, Sparkles,
  Compass, Check, Globe, Clock, Plus, Minus
} from 'lucide-react';
import { searchDestinations } from '../../api';

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

export default function CreateTripModal({
  isOpen,
  onClose,
  onTripCreated,
  initialDestination = null,
  initialPlace = null,
  onExploreDestination = null
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDest, setSelectedDest] = useState(null);
  const [daysCount, setDaysCount] = useState(5);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Sync initialDestination when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialDestination) {
        setSelectedDest(initialDestination);
        const displayName = initialDestination.displayName || 
          (initialDestination.country ? `${initialDestination.name}, ${initialDestination.country}` : initialDestination.name);
        setSearchQuery(displayName);
        if (initialDestination.daysCount) {
          setDaysCount(Number(initialDestination.daysCount));
        } else {
          setDaysCount(5);
        }
        if (initialDestination.startDate) setStartDate(initialDestination.startDate);
        if (initialDestination.endDate) setEndDate(initialDestination.endDate);
      } else {
        setSelectedDest(null);
        setSearchQuery('');
        setDaysCount(5);
        setStartDate('');
        setEndDate('');
      }
      setSearchResults([]);
      setIsDropdownOpen(false);
    }
  }, [isOpen, initialDestination]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Search input change handler
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setSelectedDest(null);

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
        console.warn('Search destinations error:', err);
        setSearchResults([]);
      })
      .finally(() => setIsSearching(false));
  };

  // Select a destination from dropdown
  const handleSelectDestination = (dest) => {
    setSelectedDest(dest);
    setSearchQuery(dest.displayName || (dest.country ? `${dest.name}, ${dest.country}` : dest.name));
    setIsDropdownOpen(false);
  };

  // Start planning submit handler
  const handleStartPlanning = async (e) => {
    if (e) e.preventDefault();

    let targetDest = selectedDest;
    if (!targetDest && searchQuery.trim()) {
      try {
        const searchRes = await searchDestinations(searchQuery.trim());
        if (searchRes.success && searchRes.data?.length > 0) {
          targetDest = searchRes.data[0];
        }
      } catch (err) {
        console.warn('Geocoding destination failed in CreateTripModal:', err);
      }
      if (!targetDest) {
        targetDest = {
          name: searchQuery.trim(),
          country: 'Worldwide'
        };
      }
    }

    if (!targetDest) return;

    setSubmitting(true);
    try {
      const finalDays = Math.max(1, parseInt(daysCount) || calculateDaysDifference(startDate, endDate) || 5);
      const parsedLat = parseFloat(targetDest.latitude || targetDest.lat);
      const parsedLng = parseFloat(targetDest.longitude || targetDest.lng);

      const tripData = {
        id: `trip_${Date.now()}`,
        title: `${targetDest.name} Trip`,
        destination: targetDest.name,
        country: targetDest.country || 'Global',
        latitude: !isNaN(parsedLat) ? parsedLat : null,
        longitude: !isNaN(parsedLng) ? parsedLng : null,
        startDate: startDate || null,
        endDate: endDate || null,
        daysCount: finalDays,
        cover_image: targetDest.cover_image || targetDest.photo_url || null,
        hotel: targetDest.hotel || null
      };

      await onTripCreated(tripData);
      onClose();
    } catch (err) {
      console.error('Failed to create trip:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div 
        ref={dropdownRef}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-borderSoft overflow-visible text-[#141413] animate-slide-up flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 p-2 rounded-xl text-mutedText hover:text-[#141413] hover:bg-[#FAF8F5] transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FAF8F5] border border-borderSoft text-[11px] font-bold uppercase tracking-wider text-[#C24B27] mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Itinerary Setup</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#141413] tracking-tight">
              Plan a new trip
            </h2>
            <p className="text-xs text-mutedText mt-1">
              Select your destination, set duration, and choose optional travel dates.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleStartPlanning} className="space-y-4">
            {/* Field 1: Where to? */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-bold text-[#141413]">
                Where to?
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setIsDropdownOpen(true);
                  }}
                  placeholder="e.g. Paris, Kyoto, Rome, Tokyo"
                  autoFocus={!initialDestination}
                  className="w-full px-4 py-3 rounded-xl border border-borderSoft bg-white text-sm font-semibold text-[#141413] placeholder:text-mutedText/60 focus:outline-none focus:border-[#C24B27] focus:ring-1 focus:ring-[#C24B27]/30 transition-all shadow-2xs"
                />

                {isSearching && (
                  <div className="absolute right-3.5 top-3.5 w-4 h-4 border-2 border-[#C24B27] border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {isDropdownOpen && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-borderSoft rounded-2xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto divide-y divide-borderSoft/60 text-left">
                  {searchResults.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      onClick={() => handleSelectDestination(item)}
                      className="px-4 py-3 hover:bg-[#FAF8F5] cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div className="pr-3 truncate">
                        <p className="font-bold text-sm text-[#141413] group-hover:text-[#C24B27] transition-colors truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-mutedText truncate">
                          {item.displayName || item.country}
                        </p>
                      </div>

                      <span className="shrink-0 px-2.5 py-0.5 rounded-md bg-[#FAF8F5] border border-borderSoft text-[11px] font-semibold text-mutedText group-hover:bg-white group-hover:border-[#C24B27]/30 group-hover:text-[#C24B27] transition-colors">
                        {item.typeLabel || 'City'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Field 2: How many days? */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#141413]">
                  How many days?
                </label>
                <span className="text-xs font-bold text-[#C24B27]">
                  {daysCount} {daysCount === 1 ? 'Day' : 'Days'} Itinerary
                </span>
              </div>

              {/* Quick Day Selector Pills + Stepper */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[3, 5, 7, 10, 14].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setDaysCount(num);
                      if (startDate) {
                        setEndDate(addDaysToDate(startDate, num));
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      daysCount === num
                        ? 'bg-[#141413] text-white shadow-xs'
                        : 'bg-[#FAF8F5] text-[#141413] hover:bg-[#F2EFE8] border border-borderSoft'
                    }`}
                  >
                    {num} Days
                  </button>
                ))}

                {/* Custom Stepper */}
                <div className="flex items-center ml-auto border border-borderSoft rounded-xl overflow-hidden bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(1, daysCount - 1);
                      setDaysCount(next);
                      if (startDate) setEndDate(addDaysToDate(startDate, next));
                    }}
                    className="px-2.5 py-1 text-xs font-bold hover:bg-[#FAF8F5] text-mutedText hover:text-[#141413] transition-colors"
                  >
                    -
                  </button>
                  <span className="px-2 text-xs font-bold text-[#141413] min-w-7 text-center">
                    {daysCount}d
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = daysCount + 1;
                      setDaysCount(next);
                      if (startDate) setEndDate(addDaysToDate(startDate, next));
                    }}
                    className="px-2.5 py-1 text-xs font-bold hover:bg-[#FAF8F5] text-mutedText hover:text-[#141413] transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Field 3: Calendar for Start & End Dates (Optional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#141413]">
                  Dates <span className="font-normal text-mutedText">(optional)</span>
                </label>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="text-[11px] text-[#C24B27] hover:underline font-semibold"
                  >
                    Clear dates
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 rounded-xl border border-borderSoft bg-white overflow-hidden divide-x divide-borderSoft shadow-2xs focus-within:border-[#C24B27]">
                {/* Start Date */}
                <div className="flex items-center px-3 py-2.5 gap-2">
                  <Calendar className="w-4 h-4 text-mutedText shrink-0" />
                  <div className="w-full">
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={startDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStartDate(val);
                        if (val) {
                          setEndDate(addDaysToDate(val, daysCount));
                        }
                      }}
                      className="w-full text-xs font-semibold text-[#141413] bg-transparent focus:outline-none"
                      placeholder="Start date"
                    />
                  </div>
                </div>

                {/* End Date */}
                <div className="flex items-center px-3 py-2.5 gap-2">
                  <Calendar className="w-4 h-4 text-mutedText shrink-0" />
                  <div className="w-full">
                    <input
                      type="date"
                      min={startDate || new Date().toISOString().split('T')[0]}
                      value={endDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEndDate(val);
                        if (startDate && val) {
                          const diff = calculateDaysDifference(startDate, val);
                          if (diff) setDaysCount(diff);
                        }
                      }}
                      className="w-full text-xs font-semibold text-[#141413] bg-transparent focus:outline-none"
                      placeholder="End date"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-mutedText">
                Calendar dates are optional — you can plan now and pick dates later.
              </p>
            </div>

            {/* Initial Place Pill if passed */}
            {initialPlace && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 text-[#C24B27] shrink-0" />
                  <span className="truncate">Will add <strong>{initialPlace.name}</strong> to Day 1</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                  Included
                </span>
              </div>
            )}

            {/* Signature Coral CTA: "Start planning" */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || (!selectedDest && !searchQuery.trim())}
                className="w-full py-3.5 px-6 rounded-full bg-[#C24B27] hover:bg-[#A83D1D] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Start planning ({daysCount} {daysCount === 1 ? 'Day' : 'Days'})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Subtext: "Or explore destination sights first" */}
          {selectedDest && onExploreDestination && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  onExploreDestination(selectedDest);
                  onClose();
                }}
                className="text-xs text-mutedText hover:text-[#C24B27] font-semibold transition-colors underline underline-offset-4"
              >
                Or explore {selectedDest.name} travel guide & sights first
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
