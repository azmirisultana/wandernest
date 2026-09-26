import React, { useState } from 'react';
import { User, LogOut, Bookmark, MapPin, Calendar, Compass, Settings, Globe, Shield, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSavedPlaces } from '../../context/SavedPlacesContext';

export default function ProfilePage({ trips = [], onSelectTrip, onBackToWorkspace, onOpenSavedPlaces }) {
  const { currentUser, logout, updateUserProfile } = useAuth();
  const { savedPlaces } = useSavedPlaces();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || 'Traveler');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const uniqueDestinations = new Set(trips.map(t => t.destination)).size;

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (currentUser) {
      if (updateUserProfile) {
        updateUserProfile(displayName);
      } else {
        currentUser.displayName = displayName;
        localStorage.setItem('wandernest_user', JSON.stringify({ ...currentUser, displayName }));
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAF8F5] text-[#141413] py-10 px-4 sm:px-6 lg:px-8 animate-fade-in font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back Link */}
        <button
          onClick={onBackToWorkspace}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6860] hover:text-[#141413] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace Planner</span>
        </button>

        {/* Profile Header */}
        <div className="p-6 sm:p-8 bg-white border border-[#EBE7DF] rounded-3xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#F7F5F0] border border-[#EBE7DF] flex items-center justify-center text-[#C24B27] font-bold text-xl font-serif shadow-xs">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#141413]">
                  {displayName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#C24B27]/10 text-[#C24B27] border border-[#C24B27]/20 text-[10px] font-bold uppercase tracking-wider">
                  Member
                </span>
              </div>
              <p className="text-xs text-[#6B6860] mt-0.5">
                {currentUser?.email || 'traveler@wandernest.local'}
              </p>
              <p className="text-[11px] text-[#9E988F] mt-1">
                Workspace ID: {currentUser?.uid || 'local_user'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-rose-50 text-[#6B6860] hover:text-rose-600 border border-[#EBE7DF] text-xs font-semibold transition-colors shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white border border-[#EBE7DF] rounded-2xl space-y-1 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6860] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#C24B27]" />
              <span>Trips Curated</span>
            </span>
            <div className="text-2xl font-bold font-serif text-[#141413]">
              {trips.length}
            </div>
            <p className="text-[11px] text-[#6B6860]">Itineraries created in workspace</p>
          </div>

          <div 
            onClick={onOpenSavedPlaces}
            className="p-5 bg-white border border-[#EBE7DF] hover:border-[#C24B27]/40 rounded-2xl space-y-1 cursor-pointer transition-colors shadow-xs"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6860] flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-[#C24B27]" />
              <span>Saved Places</span>
            </span>
            <div className="text-2xl font-bold font-serif text-[#C24B27]">
              {savedPlaces.length}
            </div>
            <p className="text-[11px] text-[#6B6860]">Click to view bookmarked spots →</p>
          </div>

          <div className="p-5 bg-white border border-[#EBE7DF] rounded-2xl space-y-1 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6860] flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#C24B27]" />
              <span>Active Destinations</span>
            </span>
            <div className="text-2xl font-bold font-serif text-[#141413]">
              {uniqueDestinations}
            </div>
            <p className="text-[11px] text-[#6B6860]">Worldwide hubs explored</p>
          </div>
        </div>

        {/* Account Settings & Preferences */}
        <div className="p-6 sm:p-8 bg-white border border-[#EBE7DF] rounded-3xl space-y-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#EBE7DF] pb-4">
            <Settings className="w-4 h-4 text-[#C24B27]" />
            <h2 className="font-bold font-serif text-base text-[#141413]">
              Workspace Preferences
            </h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold text-[#6B6860] mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full max-w-md px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EBE7DF] text-xs font-medium text-[#141413] focus:outline-none focus:border-[#C24B27]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Itineraries Quick List */}
        <div className="p-6 sm:p-8 bg-white border border-[#EBE7DF] rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="font-bold font-serif text-base text-[#141413]">
              Your Curated Trips ({trips.length})
            </h2>
            <button
              onClick={onBackToWorkspace}
              className="text-xs text-[#C24B27] hover:underline font-semibold"
            >
              Open Workspace →
            </button>
          </div>

          {trips.length === 0 ? (
            <p className="text-xs text-[#6B6860] py-4">No trips created yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trips.map(trip => (
                <div
                  key={trip.id}
                  onClick={() => onSelectTrip(trip)}
                  className="p-3.5 bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-[#EBE7DF] rounded-xl cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="truncate">
                    <h4 className="font-semibold text-xs text-[#141413] group-hover:text-[#C24B27] truncate">
                      {trip.title}
                    </h4>
                    <p className="text-[11px] text-[#6B6860] truncate">
                      {trip.destination}, {trip.country}
                    </p>
                  </div>
                  <span className="text-xs text-[#C24B27] font-semibold pl-2">
                    Open →
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
