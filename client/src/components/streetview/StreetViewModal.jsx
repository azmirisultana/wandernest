import React, { useState } from 'react';
import { X, ExternalLink, Compass, MapPin, Eye, Maximize2, RotateCw, Sparkles, Navigation } from 'lucide-react';

export default function StreetViewModal({ isOpen, onClose, place }) {
  const [heading, setHeading] = useState(0);

  if (!isOpen || !place) return null;

  const lat = place.latitude || place.lat;
  const lng = place.longitude || place.lng;
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // High-Definition Google Street View URLs
  // Modern Google Maps embed with high-resolution parameters
  const streetViewEmbedUrl = apiKey
    ? `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${lat},${lng}&heading=${heading}&pitch=0&fov=90`
    : `https://maps.google.com/maps?layer=c&cbll=${lat},${lng}&cbp=12,${heading},0,0,0&output=embed`;

  // Full-resolution native Google Maps Street View 360° Panorama
  const hdGoogleMapsPanoUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}&heading=${heading}`;

  const rotateView = () => {
    setHeading(prev => (prev + 90) % 360);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6 bg-[#141413]/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-4xl bg-white border border-borderSoft rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-slide-up text-[#141413]"
        style={{ transition: 'transform 200ms ease' }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-borderSoft bg-[#FAF8F5]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#C24B27]/10 border border-[#C24B27]/20 flex items-center justify-center text-[#C24B27] shrink-0">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white text-[#C24B27] border border-borderSoft shadow-2xs">
                  Google Street View 360° HD
                </span>
                <span className="text-xs text-mutedText hidden sm:inline font-mono">
                  {lat?.toFixed(4)}, {lng?.toFixed(4)}
                </span>
              </div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#141413] truncate mt-0.5">
                {place.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            {/* Pan Angle Button */}
            <button
              onClick={rotateView}
              title="Rotate View Angle (+90°)"
              className="p-2 rounded-xl text-mutedText hover:text-[#141413] hover:bg-white border border-transparent hover:border-borderSoft transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <RotateCw className="w-4 h-4 text-[#C24B27]" />
              <span className="hidden md:inline">{heading}° Pan</span>
            </button>

            {/* Launch HD Full Resolution Link */}
            <a
              href={hdGoogleMapsPanoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#141413] hover:bg-[#C24B27] text-white text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Google Maps (Full 4K)</span>
            </a>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full text-mutedText hover:text-[#141413] hover:bg-black/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* High-Definition 360° Viewport */}
        <div className="relative w-full h-[450px] sm:h-[540px] bg-slate-900 flex items-center justify-center overflow-hidden">
          <iframe
            key={`hd_streetview_${heading}_${lat}_${lng}`}
            title={`HD Street View of ${place.name}`}
            src={streetViewEmbedUrl}
            className="w-full h-full border-0"
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />

          {/* Floating High-Quality Badge & Quick External Launch */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-borderSoft text-xs text-[#141413] flex items-center gap-2 shadow-lg">
              <MapPin className="w-3.5 h-3.5 text-[#C24B27]" />
              <span className="truncate max-w-xs font-medium">{place.address || 'Street View Location'}</span>
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              <a
                href={hdGoogleMapsPanoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/95 hover:bg-white backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-borderSoft text-xs font-bold text-[#141413] hover:text-[#C24B27] flex items-center gap-1.5 shadow-lg transition-colors"
              >
                <span>Full Interactive Google 360°</span>
                <ExternalLink className="w-3 h-3 text-[#C24B27]" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-[#FAF8F5] border-t border-borderSoft flex items-center justify-between text-[11px] text-mutedText">
          <span>
            Explore full 360° surroundings. Drag to look around, or click "Open in Google Maps" for full 4K immersion.
          </span>
          <span className="hidden sm:inline font-mono">
            Heading: {heading}° • Latitude: {lat?.toFixed(5)}, Longitude: {lng?.toFixed(5)}
          </span>
        </div>
      </div>
    </div>
  );
}
