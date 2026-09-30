import React, { useState } from 'react';
import { Bookmark, MapPin, Trash2, Plus, Star, Eye, Utensils, Hotel, ArrowLeft, ExternalLink, Compass, FileText } from 'lucide-react';
import { useSavedPlaces } from '../../context/SavedPlacesContext';

export default function SavedPlacesPage({ onBackToWorkspace, onAddToItinerary, onOpenStreetView }) {
  const { savedPlaces, removeSavedPlace, updatePlaceNote } = useSavedPlaces();
  const [filterCat, setFilterCat] = useState('all');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [tempNote, setTempNote] = useState('');

  const filtered = savedPlaces.filter(p => {
    if (filterCat === 'all') return true;
    return p.category === filterCat;
  });

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAF8F5] text-[#141413] py-8 px-4 sm:px-6 lg:px-8 animate-fade-in font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBE7DF] pb-6">
          <div className="space-y-1">
            <button
              onClick={onBackToWorkspace}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6860] hover:text-[#141413] mb-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Workspace Planner</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C24B27]/10 border border-[#C24B27]/20 flex items-center justify-center text-[#C24B27]">
                <Bookmark className="w-5 h-5 fill-[#C24B27]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#141413] tracking-tight">
                  Saved Places
                </h1>
                <p className="text-xs text-[#6B6860] mt-0.5">
                  {savedPlaces.length} bookmarked spots ready to be scheduled into your itineraries.
                </p>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-[#EBE7DF] text-xs font-medium shadow-xs">
            <button
              onClick={() => setFilterCat('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterCat === 'all'
                  ? 'bg-[#C24B27] text-white shadow-xs'
                  : 'text-[#6B6860] hover:text-[#141413]'
              }`}
            >
              All ({savedPlaces.length})
            </button>
            <button
              onClick={() => setFilterCat('do')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterCat === 'do'
                  ? 'bg-[#C24B27] text-white shadow-xs'
                  : 'text-[#6B6860] hover:text-[#141413]'
              }`}
            >
              Sights
            </button>
            <button
              onClick={() => setFilterCat('eat')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterCat === 'eat'
                  ? 'bg-[#C24B27] text-white shadow-xs'
                  : 'text-[#6B6860] hover:text-[#141413]'
              }`}
            >
              Dining
            </button>
            <button
              onClick={() => setFilterCat('stay')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterCat === 'stay'
                  ? 'bg-[#C24B27] text-white shadow-xs'
                  : 'text-[#6B6860] hover:text-[#141413]'
              }`}
            >
              Stays
            </button>
          </div>
        </div>

        {/* Content Grid */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-[#EBE7DF] p-8 space-y-4 shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FAF8F5] border border-[#EBE7DF] flex items-center justify-center text-[#6B6860]">
              <Bookmark className="w-6 h-6 opacity-40 text-[#C24B27]" />
            </div>
            <h3 className="text-base font-semibold font-serif text-[#141413]">No saved places yet</h3>
            <p className="text-xs text-[#6B6860] max-w-sm mx-auto">
              Click the bookmark icon on any place card or map popup in the workspace to save it here for future planning.
            </p>
            <button
              onClick={onBackToWorkspace}
              className="px-5 py-2.5 rounded-xl bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Explore Places in Workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((place) => (
              <div
                key={place.id}
                className="bg-white border border-[#EBE7DF] hover:border-[#C24B27]/40 rounded-2xl overflow-hidden shadow-xs hover:shadow-md flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Photo & Badges */}
                  <div className="relative h-44 overflow-hidden bg-[#EBE7DF]">
                    <img
                      src={place.photo_url || 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80'}
                      alt={place.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[10px] font-bold text-[#141413] border border-white/40 shadow-xs">
                        {place.tagLabel || place.category}
                      </span>
                    </div>

                    <button
                      onClick={() => removeSavedPlace(place.id)}
                      title="Remove bookmark"
                      className="absolute top-3 right-3 p-2 rounded-xl bg-white/90 backdrop-blur-md text-[#C24B27] hover:text-rose-600 border border-white/40 shadow-xs transition-colors cursor-pointer"
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </button>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <span className="text-[11px] font-semibold text-[#141413] bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/40 shadow-xs">
                        {place.tagLabel || (place.category === 'eat' ? 'Dining' : place.category === 'stay' ? 'Lodging' : 'Spot')}
                      </span>
                      {place.source === 'google' && place.rating ? (
                        <span className="flex items-center gap-1 text-amber-600 font-bold bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/40 shadow-xs">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          <span>{place.rating}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-base text-[#141413] truncate font-serif">
                      {place.name}
                    </h3>
                    <p className="text-xs text-[#6B6860] truncate flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#C24B27] shrink-0" />
                      <span>{place.address || 'Selected Spot'}</span>
                    </p>

                    {/* Personal Note Box */}
                    <div className="pt-2 border-t border-[#EBE7DF]/80">
                      {editingNoteId === place.id ? (
                        <div className="space-y-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EBE7DF]">
                          <label className="block text-[11px] font-semibold text-[#141413] flex items-center gap-1">
                            <FileText className="w-3 h-3 text-[#C24B27]" />
                            <span>My Personal Note:</span>
                          </label>
                          <textarea
                            value={tempNote}
                            onChange={(e) => setTempNote(e.target.value)}
                            placeholder="Add your note, tips, or reminder for this place..."
                            className="w-full text-xs p-2 rounded-lg border border-[#EBE7DF] bg-white focus:outline-none focus:border-[#C24B27] resize-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                updatePlaceNote(place.id, tempNote);
                                setEditingNoteId(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#141413] hover:bg-[#C24B27] text-white text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Save Note
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingNoteId(null)}
                              className="px-2.5 py-1 rounded-lg bg-[#EBE7DF] hover:bg-gray-300 text-[#6B6860] text-[10px] font-semibold transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : place.note ? (
                        <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EBE7DF] space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-[#C24B27] uppercase tracking-wider flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span>My Note</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setTempNote(place.note || '');
                                setEditingNoteId(place.id);
                              }}
                              className="text-[#6B6860] hover:text-[#141413] font-medium underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                          <p className="text-xs text-[#141413] break-words italic">
                            "{place.note}"
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTempNote('');
                            setEditingNoteId(place.id);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-[#6B6860] hover:text-[#C24B27] transition-colors font-medium cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>+ Add personal note</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onOpenStreetView && onOpenStreetView(place)}
                      className="py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-[#EBE7DF] text-[11px] font-semibold text-[#141413] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5 text-[#C24B27]" />
                      <span>Street View</span>
                    </button>
                    <a
                      href={place.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + (place.address || ''))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-[#EBE7DF] text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                      title="View on Google Maps"
                    >
                      <span>Google Maps ↗</span>
                    </a>
                  </div>

                    {onAddToItinerary && (
                      <button
                        onClick={() => onAddToItinerary(place)}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#C24B27] hover:bg-[#A83D1D] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Itinerary Day</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
