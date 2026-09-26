
import React, { useState } from 'react';
import { Calendar, MapPin, X, ArrowRight, Clock, Sparkles } from 'lucide-react';

export default function TripSetupModal({
  isOpen,
  onClose,
  destination,
  onConfirmTrip
}) {
  if (!isOpen || !destination) return null;

  const defaultTitle = `${destination.name} Exploration`;
  const [title, setTitle] = useState(defaultTitle);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysCount, setDaysCount] = useState(5);

  // Handle Quick Day pill selection
  const handleQuickDays = (num) => {
    setDaysCount(num);
    if (startDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + num);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  // If start date is chosen, compute end date
  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (val) {
      const start = new Date(val);
      const end = new Date(start);
      end.setDate(end.getDate() + daysCount);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  const handleCreate = (isSkipped = false) => {
    const finalTripData = {
      title: title.trim() || defaultTitle,
      destination: destination.name,
      country: destination.country || 'Global',
      latitude: destination.latitude,
      longitude: destination.longitude,
      startDate: isSkipped ? null : (startDate || null),
      endDate: isSkipped ? null : (endDate || null),
      daysCount: isSkipped ? 5 : daysCount,
      coverImage: destination.cover_image || 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80'
    };

    onConfirmTrip(finalTripData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141413]/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#FAF8F5] rounded-3xl shadow-2xl border border-borderSoft overflow-hidden text-[#141413]">
        {/* Cover Preview Header */}
        <div className="relative h-36 overflow-hidden bg-slate-900">
          <img
            src={destination.cover_image || 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80'}
            alt={destination.name}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141413] via-[#141413]/30 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-4 left-6 right-6 text-white">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider">
              {destination.country || 'Worldwide'}
            </span>
            <h3 className="font-serif font-bold text-2xl text-white mt-1 leading-tight">
              Plan Your Trip to {destination.name}
            </h3>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Trip Name */}
          <div>
            <label className="block text-xs font-semibold text-[#141413] mb-1">
              Trip Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rome Highlights & Culinary Walk"
              className="w-full px-3.5 py-2.5 rounded-xl border border-borderSoft bg-white font-serif font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[#C24B27]"
            />
          </div>

          {/* Quick Duration Buttons */}
          <div>
            <label className="block text-xs font-semibold text-[#141413] mb-1.5 flex items-center justify-between">
              <span>How many days?</span>
              <span className="text-mutedText font-normal text-[11px]">{daysCount} Days Itinerary</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[3, 5, 7, 10, 14].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleQuickDays(d)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${daysCount === d
                      ? 'bg-[#141413] text-white shadow-xs'
                      : 'bg-white border border-borderSoft text-mutedText hover:border-[#141413]'
                    }`}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>

          {/* Optional Calendar Date Range */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-mutedText mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#C24B27]" />
                <span>Start Date (Optional)</span>
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-borderSoft bg-white text-xs font-medium focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-mutedText mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-mutedText" />
                <span>End Date (Optional)</span>
              </label>
              <input
                type="date"
                min={startDate || new Date().toISOString().split('T')[0]}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-borderSoft bg-white text-xs font-medium focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleCreate(true)}
              className="flex-1 py-3 rounded-full border border-borderSoft hover:bg-white text-mutedText hover:text-[#141413] text-xs font-bold transition-all"
            >
              Skip & Plan Flexible Days
            </button>
            <button
              type="button"
              onClick={() => handleCreate(false)}
              className="flex-1 py-3 rounded-full bg-[#C24B27] hover:bg-[#A63E1F] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Create Itinerary</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-center text-[11px] text-mutedText">
            Dates and days can be changed anytime inside the itinerary builder.
          </p>
        </div>
      </div>
    </div>
  );
}
