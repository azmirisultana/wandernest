import React, { useState } from 'react';
import { Plus, Calendar, MapPin, Trash2, ArrowRight, Compass, ArrowLeft } from 'lucide-react';
import { createTrip, deleteTrip } from '../../api';
import { useAuth } from '../../context/AuthContext';

function formatTripDate(d) {
  if (!d) return null;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MyTrips({ trips = [], onSelectTrip, onRefreshTrips, onStartNewTrip, onBackToWorkspace }) {
  const { currentUser } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [creating, setCreating] = useState(false);

  // Fallback to local storage if trips array is empty
  const userTrips = trips.length > 0 ? trips : (() => {
    if (!currentUser) return [];
    try {
      const stored = localStorage.getItem(`wandernest_trips_${currentUser.uid}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  })();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newDestination || !newTitle) return;
    setCreating(true);

    try {
      const newTripData = {
        userId: currentUser?.uid || 'user_default',
        title: newTitle,
        destination: newDestination,
        country: 'Worldwide',
        latitude: 35.6762,
        longitude: 139.6503,
        startDate: newStartDate || null,
        endDate: newEndDate || null,
        coverImage: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80'
      };

      const res = await createTrip(newTripData);
      if (res.success) {
        setIsCreateModalOpen(false);
        setNewTitle('');
        setNewDestination('');
        if (onRefreshTrips) await onRefreshTrips();
        if (onSelectTrip) onSelectTrip(res.data);
      }
    } catch (err) {
      console.error('Failed to create trip:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, tripId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this trip itinerary?')) return;
    try {
      await deleteTrip(tripId);
      if (currentUser) {
        const remaining = userTrips.filter(t => t.id !== tripId);
        localStorage.setItem(`wandernest_trips_${currentUser.uid}`, JSON.stringify(remaining));
      }
      if (onRefreshTrips) await onRefreshTrips();
    } catch (err) {
      console.error('Failed to delete trip:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[calc(100vh-64px)] bg-[#FAF8F5] text-[#141413] animate-fade-in font-sans">
      {/* Header */}
      <div className="space-y-3 pb-8 border-b border-[#EBE7DF]">
        {onBackToWorkspace && (
          <button
            onClick={onBackToWorkspace}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6860] hover:text-[#141413] mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Workspace Planner</span>
          </button>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif text-[#141413] tracking-tight">
              My Travel Itineraries
            </h1>
            <p className="text-xs sm:text-sm text-[#6B6860] mt-1">
              Organize multiple trips, manage day schedules, and launch dual-pane map workspaces.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onStartNewTrip || (() => setIsCreateModalOpen(true))}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#141413] hover:bg-[#C24B27] text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Plan Another Trip</span>
            </button>
          </div>
        </div>
      </div>

      {/* Trips Grid */}
      {userTrips.length === 0 ? (
        <div className="py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white text-[#C24B27] border border-[#EBE7DF] flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Compass className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold font-serif text-[#141413]">No itineraries created yet</h3>
          <p className="text-xs sm:text-sm text-[#6B6860] max-w-sm mx-auto mt-1 mb-6">
            Search any destination or click below to craft your first travel plan!
          </p>
          <button
            onClick={onStartNewTrip || (() => setIsCreateModalOpen(true))}
            className="px-6 py-3 rounded-full bg-[#C24B27] hover:bg-[#A83D1D] text-white font-bold text-xs transition-all shadow-md active:scale-95"
          >
            Create Your First Trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
          {userTrips.map(trip => (
            <div
              key={trip.id}
              onClick={() => onSelectTrip(trip)}
              className="group bg-white rounded-2xl overflow-hidden border border-[#EBE7DF] hover:border-[#C24B27]/50 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col hover:-translate-y-1"
            >
              {/* Cover Image */}
              <div className="relative h-44 overflow-hidden bg-[#EBE7DF]">
                <img
                  src={trip.cover_image || 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80'}
                  alt={trip.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md bg-white/90 backdrop-blur-md text-[#141413] text-[10px] font-bold border border-white/40 shadow-xs">
                  {trip.destination || 'Destination'}
                </span>

                <button
                  onClick={(e) => handleDelete(e, trip.id)}
                  title="Delete Trip"
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/90 hover:bg-rose-600 hover:text-white text-[#6B6860] transition-colors border border-white/40 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="font-bold font-serif text-base text-white leading-tight truncate">
                    {trip.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-white/80 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 text-[#C24B27] shrink-0" />
                    <span className="truncate">{trip.destination}, {trip.country}</span>
                  </div>
                </div>
              </div>

              {/* Trip Details Footer */}
              <div className="p-4 flex items-center justify-between text-xs text-[#6B6860] bg-[#FAF8F5]">
                <span>{formatTripDate(trip.start_date) || 'Flexible Dates'}</span>
                <span className="font-semibold text-[#C24B27] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Open Planner</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Create Trip Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-[#EBE7DF] space-y-4 animate-slide-up">
            <h3 className="font-bold font-serif text-lg text-[#141413]">New Itinerary</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#6B6860] mb-1">Destination Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kyoto, Rome, Tokyo"
                  value={newDestination}
                  onChange={(e) => {
                    setNewDestination(e.target.value);
                    if (!newTitle) setNewTitle(`${e.target.value} Exploration`);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE7DF] bg-[#FAF8F5] text-xs font-medium text-[#141413] focus:outline-none focus:border-[#C24B27]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B6860] mb-1">Trip Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kyoto Zen Journey"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE7DF] bg-[#FAF8F5] text-xs font-medium text-[#141413] focus:outline-none focus:border-[#C24B27]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#EBE7DF] text-[#6B6860] font-semibold text-xs hover:bg-[#FAF8F5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-[#C24B27] hover:bg-[#A83D1D] text-white font-bold text-xs shadow-xs transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
