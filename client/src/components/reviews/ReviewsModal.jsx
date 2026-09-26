import React, { useState } from 'react';
import {
  X, Star, MessageSquare, ExternalLink, Send, CheckCircle2,
  MapPin, Compass, ShieldCheck, UserCheck, ThumbsUp, Sparkles, Filter
} from 'lucide-react';

export default function ReviewsModal({ isOpen, onClose, place }) {
  const [activeTab, setActiveTab] = useState('verified'); // 'verified' | 'notes'
  const [ratingFilter, setRatingFilter] = useState('all'); // 'all' | 5 | 4
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [userNotes, setUserNotes] = useState([]);

  if (!isOpen || !place) return null;

  const googleMapsUrl = place.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + (place.address || ''))}`;
  const realRating = place.rating || null;
  const ratingCount = place.reviewsCount || null;
  const verifiedReviews = Array.isArray(place.reviews) ? place.reviews : [];
  const hasRealReviews = verifiedReviews.length > 0;

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;

    const newNote = {
      id: Date.now(),
      author: 'You (Trip Planner)',
      location: 'My Travel Workspace',
      rating: newReviewRating,
      relativeTime: 'Just now',
      verified: true,
      text: newReviewText.trim()
    };

    setUserNotes(prev => [newNote, ...prev]);
    setNewReviewText('');
    setActiveTab('notes');
  };

  const filteredVerifiedReviews = verifiedReviews.filter(rev => {
    if (ratingFilter === 'all') return true;
    return rev.rating === ratingFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#141413]/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="relative w-full max-w-xl bg-white border border-[#EBE7DF] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-slide-up text-[#141413]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBE7DF] bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
              <Star className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-emerald-800 border border-emerald-200 shadow-2xs flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>{hasRealReviews ? 'Google Places Reviews' : 'Google Maps Verified'}</span>
                </span>
                <span className="text-xs text-mutedText">{place.tagLabel || place.category}</span>
              </div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#141413] truncate mt-0.5">
                {place.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-mutedText hover:text-[#141413] hover:bg-black/5 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rating Overview & Live Google Verification */}
        <div className="p-6 border-b border-[#EBE7DF] bg-white space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {realRating ? (
              <div className="flex items-center gap-3.5">
                <div className="text-3xl sm:text-4xl font-serif font-bold text-[#141413]">
                  {realRating}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= Math.round(realRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-[#EBE7DF]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-mutedText mt-0.5">
                    {ratingCount ? `Based on ${ratingCount.toLocaleString()}+ reviews on Google Maps` : 'Google Maps Rating'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-serif font-bold text-base text-[#141413]">
                  Ratings & Reviews
                </p>
                <p className="text-xs text-mutedText mt-0.5">
                  Hosted and verified directly on Google Maps
                </p>
              </div>
            )}

            {/* Direct Google Maps Live Reviews Link */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-bold transition-all shadow-xs shrink-0"
            >
              <span>Open on Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Address or Overview snippet */}
          <div className="flex items-center gap-2 text-xs text-mutedText">
            <MapPin className="w-3.5 h-3.5 text-[#C24B27] shrink-0" />
            <span className="truncate">{place.address || 'Central Destination Area'}</span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between pt-1 border-t border-borderSoft">
            <div className="flex items-center gap-2">
              {hasRealReviews && (
                <button
                  type="button"
                  onClick={() => setActiveTab('verified')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'verified'
                      ? 'bg-[#141413] text-white shadow-2xs'
                      : 'bg-[#FAF8F5] text-mutedText hover:text-[#141413] border border-borderSoft'
                  }`}
                >
                  Google Reviews ({verifiedReviews.length})
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'notes' || !hasRealReviews
                    ? 'bg-[#141413] text-white shadow-2xs'
                    : 'bg-[#FAF8F5] text-mutedText hover:text-[#141413] border border-borderSoft'
                }`}
              >
                My Trip Notes ({userNotes.length})
              </button>
            </div>

            {/* Star Filter for Real Google Reviews */}
            {hasRealReviews && activeTab === 'verified' && (
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setRatingFilter('all')}
                  className={`px-2 py-1 rounded-lg font-semibold transition-colors ${
                    ratingFilter === 'all' ? 'bg-[#C24B27] text-white' : 'text-mutedText hover:text-[#141413]'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setRatingFilter(5)}
                  className={`px-2 py-1 rounded-lg font-semibold transition-colors ${
                    ratingFilter === 5 ? 'bg-[#C24B27] text-white' : 'text-mutedText hover:text-[#141413]'
                  }`}
                >
                  5★
                </button>
                <button
                  type="button"
                  onClick={() => setRatingFilter(4)}
                  className={`px-2 py-1 rounded-lg font-semibold transition-colors ${
                    ratingFilter === 4 ? 'bg-[#C24B27] text-white' : 'text-mutedText hover:text-[#141413]'
                  }`}
                >
                  4★
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FAF8F5]/50">
          {hasRealReviews && activeTab === 'verified' ? (
            filteredVerifiedReviews.length === 0 ? (
              <div className="text-center py-10 px-4 bg-white rounded-2xl border border-dashed border-[#EBE7DF] space-y-2">
                <MessageSquare className="w-8 h-8 text-mutedText mx-auto opacity-50" />
                <p className="text-xs font-semibold text-[#141413]">No reviews matching this rating filter</p>
                <p className="text-[11px] text-mutedText">
                  Switch back to "All" or open Google Maps to read all visitor reviews.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredVerifiedReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-white border border-[#EBE7DF] space-y-2 shadow-2xs hover:shadow-xs transition-shadow"
                  >
                    {/* Reviewer Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {rev.authorPhoto ? (
                          <img
                            src={rev.authorPhoto}
                            alt={rev.author}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full ${rev.avatarColor || 'bg-[#C24B27]'} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                            {rev.author?.charAt(0) || 'G'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-[#141413]">{rev.author}</span>
                            <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 rounded-md">
                              Google Maps
                            </span>
                          </div>
                          <span className="text-[11px] text-mutedText">
                            {rev.relativeTime}
                          </span>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-[#EBE7DF]'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Review Text */}
                    <p className="text-xs text-[#141413] leading-relaxed pt-1">
                      {rev.text}
                    </p>
                  </div>
                ))}
              </div>
            )
          ) : !hasRealReviews && activeTab !== 'notes' ? (
            /* Honest, Transparent Direct Google Maps Notice */
            <div className="text-center py-10 px-6 bg-white rounded-2xl border border-[#EBE7DF] space-y-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mx-auto">
                <ShieldCheck className="w-6 h-6 text-amber-600" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="font-serif font-bold text-base text-[#141413]">
                  Live Google Business Reviews
                </h4>
                <p className="text-xs text-mutedText leading-relaxed">
                  Real visitor reviews, authentic guest photos, and verified ratings for <span className="font-semibold text-[#141413]">{place.name}</span> are hosted directly on Google Maps.
                </p>
              </div>

              <div className="pt-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-bold transition-all shadow-xs"
                >
                  <span>Open Real Reviews on Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            // User Notes Section
            userNotes.length === 0 ? (
              <div className="text-center py-8 px-4 bg-white rounded-2xl border border-dashed border-[#EBE7DF] space-y-2">
                <MessageSquare className="w-8 h-8 text-mutedText mx-auto opacity-50" />
                <p className="text-xs font-semibold text-[#141413]">No trip notes recorded yet</p>
                <p className="text-[11px] text-mutedText max-w-sm mx-auto">
                  Add personal notes, booking references, or tips for this spot below.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {userNotes.map((note) => (
                  <div key={note.id} className="p-4 rounded-2xl bg-white border border-[#EBE7DF] space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#141413]">{note.author}</span>
                        <span className="text-[10px] text-mutedText">• {note.relativeTime}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${s <= note.rating ? 'fill-amber-400 text-amber-400' : 'text-[#EBE7DF]'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-[#141413] leading-relaxed">
                      {note.text}
                    </p>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Add Personal Trip Note / Review Form */}
        <div className="p-4 border-t border-[#EBE7DF] bg-[#FAF8F5]">
          <form onSubmit={handleAddNote} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-mutedText">Log your own note or rating for this spot:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewReviewRating(s)}
                    className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        s <= newReviewRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-[#EBE7DF]'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                placeholder="e.g. Best visited before 9am, quiet room on high floor, superb breakfast..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-[#EBE7DF] text-xs text-[#141413] placeholder:text-mutedText/70 focus:outline-none focus:border-[#C24B27]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs cursor-pointer"
              >
                <span>Save Note</span>
                <Send className="w-3 h-3" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
