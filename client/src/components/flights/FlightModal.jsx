import React, { useState } from 'react';
import { Plane, X, ExternalLink, Calendar, MapPin, ArrowRight } from 'lucide-react';

export default function FlightModal({ isOpen, onClose, destination, startDate }) {
  const [origin, setOrigin] = useState('New York');
  const [targetDest, setTargetDest] = useState(destination || 'Tokyo');
  const [departDate, setDepartDate] = useState(() => {
    if (startDate) return startDate;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 14);
    return tomorrow.toISOString().split('T')[0];
  });

  if (!isOpen) return null;

  // Format requested: https://www.google.com/travel/flights?q=flights%20from%20{ORIGIN}%20to%20{DESTINATION}%20on%20{DATE}
  const constructGoogleFlightsUrl = () => {
    const orig = encodeURIComponent(origin.trim() || 'Current Location');
    const dest = encodeURIComponent(targetDest.trim() || destination);
    const date = encodeURIComponent(departDate);
    return `https://www.google.com/travel/flights?q=flights%20from%20${orig}%20to%20${dest}%20on%20${date}`;
  };

  const handleSearchFlights = () => {
    const url = constructGoogleFlightsUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header with Airplane motif */}
        <div className="bg-gradient-to-r from-brand-500 via-rose-500 to-amber-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-2">
            <Plane className="w-3.5 h-3.5" />
            <span>Live Flight Search</span>
          </div>
          <h3 className="text-2xl font-bold font-display">Find Flights to {destination}</h3>
          <p className="text-white/85 text-xs mt-1">
            Compare live real-time airfares, airlines, and non-stop routes on Google Flights.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Origin */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Flying From (Origin)</span>
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="e.g. New York, London, SFO"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-medium"
              />
            </div>

            {/* Destination */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-brand-500" />
                <span>Destination</span>
              </label>
              <input
                type="text"
                value={targetDest}
                onChange={(e) => setTargetDest(e.target.value)}
                placeholder="Destination city"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-medium"
              />
            </div>
          </div>

          {/* Departure Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Departure Date</span>
            </label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={departDate}
              onChange={(e) => setDepartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-medium"
            />
          </div>

          {/* Route Preview Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-sand-50 border border-sand-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{origin || 'Origin'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-brand-600">{targetDest}</span>
            </div>
            <span className="text-slate-500">{departDate}</span>
          </div>

          {/* Launch Button */}
          <button
            onClick={handleSearchFlights}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-medium text-sm transition-all shadow-lg shadow-slate-900/20 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>Search on Google Flights</span>
            <ExternalLink className="w-4 h-4 text-white/70" />
          </button>

          <p className="text-center text-[11px] text-slate-400">
            Opens Google Flights directly in a new tab with your trip route and dates pre-filled.
          </p>
        </div>
      </div>
    </div>
  );
}
