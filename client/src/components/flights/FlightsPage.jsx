import React, { useState, useEffect } from 'react';
import {
  Plane, Calendar, MapPin, ArrowRight, ArrowLeft, Filter,
  Clock, Shield, ExternalLink, Check, DollarSign, Sparkles, RefreshCw
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { fetchFlights } from '../../api';

export default function FlightsPage({
  activeTrip,
  onBackToWorkspace
}) {
  const { formatPrice, currency } = useCurrency();
  const currentCity = activeTrip?.destination || 'Tokyo';
  const todayStr = new Date().toISOString().split('T')[0];

  const [origin, setOrigin] = useState('New York (JFK)');
  const [destination, setDestination] = useState(currentCity);
  const [departDate, setDepartDate] = useState(() => {
    // Default to trip start date or 14 days from today
    if (activeTrip?.startDate && activeTrip.startDate >= todayStr) {
      return activeTrip.startDate;
    }
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [cabinClass, setCabinClass] = useState('Economy');
  const [flightType, setFlightType] = useState('roundtrip'); // 'roundtrip' | 'oneway'

  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flightRouteInfo, setFlightRouteInfo] = useState(null);

  // Fetch real flight options whenever origin, destination, cabin or date changes
  useEffect(() => {
    setLoading(true);
    fetchFlights({
      origin,
      destination: currentCity,
      date: departDate,
      cabin: cabinClass,
      type: flightType
    })
      .then(res => {
        if (res.success && res.data) {
          setFlights(res.data);
          setFlightRouteInfo({
            origin: res.origin,
            destination: res.destination,
            distanceKm: res.distanceKm
          });
        }
      })
      .catch(err => {
        console.warn('Failed to fetch real flights:', err);
      })
      .finally(() => setLoading(false));
  }, [origin, currentCity, departDate, cabinClass, flightType]);

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchFlights({
      origin,
      destination,
      date: departDate,
      cabin: cabinClass,
      type: flightType
    })
      .then(res => {
        if (res.success && res.data) {
          setFlights(res.data);
          setFlightRouteInfo({
            origin: res.origin,
            destination: res.destination,
            distanceKm: res.distanceKm
          });
        }
      })
      .catch(err => console.warn('Flights search error:', err))
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAF8F5] text-[#141413] py-8 px-4 sm:px-6 lg:px-8 font-sans animate-fade-in">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="space-y-1 border-b border-borderSoft pb-6">
          <button
            onClick={onBackToWorkspace}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-mutedText hover:text-[#141413] mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Trip Workspace</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C24B27]/10 border border-[#C24B27]/20 flex items-center justify-center text-[#C24B27]">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#141413] tracking-tight">
                Real Flight Routes to {currentCity}
              </h1>
              <p className="text-xs text-mutedText mt-0.5">
                Explore authentic international carrier schedules, IATA airport pairs, flight durations, and real-time Google Flights links.
              </p>
            </div>
          </div>
        </div>

        {/* Flight Search Parameters Card */}
        <form onSubmit={handleSearch} className="p-6 rounded-3xl bg-white border border-borderSoft shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Origin */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-mutedText mb-1">
                Departure City / Airport
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-borderSoft text-xs font-semibold text-[#141413]">
                <MapPin className="w-4 h-4 text-[#C24B27] shrink-0" />
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. New York (JFK), London (LHR)"
                  className="bg-transparent w-full focus:outline-none"
                />
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-mutedText mb-1">
                Arrival City
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-borderSoft text-xs font-semibold text-[#141413]">
                <MapPin className="w-4 h-4 text-[#C24B27] shrink-0" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Tokyo, Paris, Rome"
                  className="bg-transparent w-full focus:outline-none"
                />
              </div>
            </div>

            {/* Departure Date (Disabled Past Days) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-mutedText mb-1">
                Departure Date
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-borderSoft text-xs font-semibold text-[#141413]">
                <Calendar className="w-4 h-4 text-[#C24B27] shrink-0" />
                <input
                  type="date"
                  min={todayStr}
                  value={departDate}
                  onChange={(e) => setDepartDate(e.target.value)}
                  className="bg-transparent w-full focus:outline-none"
                />
              </div>
            </div>

            {/* Cabin Class */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-mutedText mb-1">
                Cabin Class
              </label>
              <select
                value={cabinClass}
                onChange={(e) => setCabinClass(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#FAF8F5] border border-borderSoft text-xs font-semibold text-[#141413] focus:outline-none cursor-pointer"
              >
                <option value="Economy">Economy</option>
                <option value="Premium Economy">Premium Economy</option>
                <option value="Business">Business Class</option>
                <option value="First">First Class</option>
              </select>
            </div>

            {/* Action */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Update Routes</span>
              </button>
            </div>
          </div>

          {/* Route Distance Banner */}
          {flightRouteInfo && (
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-xs text-amber-950 flex-wrap gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <span className="font-bold text-[#C24B27]">{flightRouteInfo.origin?.city} ({flightRouteInfo.origin?.code})</span>
                <ArrowRight className="w-3.5 h-3.5 text-mutedText" />
                <span className="font-bold text-[#C24B27]">{flightRouteInfo.destination?.city} ({flightRouteInfo.destination?.code})</span>
                <span className="text-mutedText font-normal">• approx. {flightRouteInfo.distanceKm?.toLocaleString()} km flight corridor</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                ✓ Live Route Calculated
              </span>
            </div>
          )}
        </form>

        {/* Flight Results Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-mutedText px-1">
            <span className="font-semibold text-[#141413]">
              Available Flight Carriers ({flights.length} Options)
            </span>
            <span>All estimates converted to {currency}</span>
          </div>

          {loading ? (
            <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-borderSoft">
              <div className="w-8 h-8 border-2 border-[#C24B27] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-mutedText font-semibold">Fetching carrier schedules and fare benchmarks...</p>
            </div>
          ) : flights.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-borderSoft p-8 shadow-xs">
              <Plane className="w-10 h-10 text-mutedText mx-auto opacity-40 mb-2" />
              <h3 className="font-serif font-bold text-base text-[#141413]">No routes found for this search</h3>
              <p className="text-xs text-mutedText mt-1">Try searching with a major international departure airport.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {flights.map(fl => {
                return (
                  <div
                    key={fl.id}
                    className="p-5 sm:p-6 rounded-3xl bg-white border border-borderSoft shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    {/* Airline & Timing */}
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-borderSoft flex items-center justify-center shrink-0 text-[#C24B27] font-bold text-sm">
                        {fl.carrierCode || <Plane className="w-6 h-6" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-[#141413]">
                            {fl.airline}
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#FAF8F5] text-mutedText border border-borderSoft">
                            {fl.code}
                          </span>
                          {fl.aircraft && (
                            <span className="text-[10px] text-mutedText">
                              • {fl.aircraft}
                            </span>
                          )}
                        </div>

                        {/* Times & Stops */}
                        <div className="flex items-center gap-3 text-xs text-mutedText flex-wrap">
                          <div className="text-left">
                            <span className="font-bold text-[#141413] text-sm block">{fl.departTime}</span>
                            <span className="text-[10px] text-mutedText">{fl.originAirport?.code}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-mutedText px-1">
                            <span className="w-6 sm:w-10 border-t border-borderSoft" />
                            <span className="text-[10px] font-medium text-center">{fl.duration} • {fl.stops}</span>
                            <span className="w-6 sm:w-10 border-t border-borderSoft" />
                          </div>

                          <div className="text-left">
                            <span className="font-bold text-[#141413] text-sm block">{fl.arriveTime}</span>
                            <span className="text-[10px] text-mutedText">{fl.destAirport?.code}</span>
                          </div>
                        </div>

                        {/* Real Amenities */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {(fl.amenities || []).map((am, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-borderSoft text-[10px] font-medium text-mutedText"
                            >
                              ✓ {am}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="flex items-center md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 pt-4 md:pt-0 border-borderSoft shrink-0">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-mutedText">
                          Fare Benchmark ({fl.cabinClass})
                        </span>
                        <div className="text-2xl font-serif font-bold text-[#141413]">
                          {formatPrice(fl.basePriceUSD)}
                        </div>
                        <span className="text-[10px] text-mutedText block">per traveler, taxes included</span>
                      </div>

                      {/* Google Flights Deep Search */}
                      <a
                        href={fl.googleFlightsUrl || `https://www.google.com/travel/flights?q=flights+to+${encodeURIComponent(currentCity)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2.5 px-4 py-2.5 rounded-full bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <span>Live on Google Flights</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
