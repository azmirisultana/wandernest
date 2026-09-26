import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Plus, Star, MapPin, ExternalLink, Compass, Layers, Eye } from 'lucide-react';

// Fix Leaflet default icon path issues in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Smoothly re-center map when coordinates change or place selected
function MapController({ center, zoom, selectedCoord }) {
  const map = useMap();
  useEffect(() => {
    if (selectedCoord && selectedCoord[0] && selectedCoord[1]) {
      map.flyTo(selectedCoord, Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 0.8
      });
    } else if (center && center[0] && center[1]) {
      map.setView(center, zoom);
    }
  }, [center, zoom, selectedCoord, map]);
  return null;
}

// Generate realistic Google Maps & Editorial styled Pin
function createSleekMarkerIcon(item, isItinerary = false, sequenceNumber = null, isActive = false) {
  const { category = 'do', name = 'Place' } = item;
  
  if (isItinerary && sequenceNumber !== null) {
    const truncatedName = name.length > 18 ? name.slice(0, 16) + '...' : name;
    const activeBorder = isActive ? 'border: 2px solid #C24B27; box-shadow: 0 0 16px rgba(194,75,39,0.5); transform: scale(1.08);' : 'border: 1.5px solid #EBE7DF; box-shadow: 0 4px 14px rgba(0,0,0,0.1);';

    const html = `
      <div style="position: relative; display: inline-flex; align-items: center; cursor: pointer; transition: all 0.2s ease;">
        <div style="display: flex; align-items: center; gap: 6px; background: #FFFFFF; color: #141413; padding: 4px 10px 4px 4px; border-radius: 9999px; ${activeBorder}">
          <span style="width: 22px; height: 22px; border-radius: 50%; background: #C24B27; color: white; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(194,75,39,0.4);">
            ${sequenceNumber}
          </span>
          <span style="font-size: 11px; font-weight: 600; font-family: 'Inter', sans-serif; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; color: #141413;">
            ${truncatedName}
          </span>
        </div>
        <div style="position: absolute; bottom: -5px; left: 14px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #FFFFFF;"></div>
      </div>
    `;

    return L.divIcon({
      className: 'sleek-pill-marker',
      html,
      iconSize: [160, 32],
      iconAnchor: [15, 30],
      popupAnchor: [60, -28]
    });
  }

  // Google Maps category pins
  let dotColor = '#8B5CF6'; // Violet for Attractions / Sights
  let pinIcon = '✦';
  if (category === 'eat') {
    dotColor = '#F43F5E'; // Crimson for Dining / Cafes
    pinIcon = '🍽';
  } else if (category === 'stay') {
    dotColor = '#C24B27'; // Terracotta for Lodgings
    pinIcon = '🏨';
  }

  const activeScale = isActive 
    ? 'transform: translateY(-5px) scale(1.2); filter: drop-shadow(0 0 12px rgba(194,75,39,0.8));' 
    : 'filter: drop-shadow(0 2px 8px rgba(0,0,0,0.25));';

  const html = `
    <div style="position: relative; width: 28px; height: 32px; transition: all 0.2s ease; ${activeScale}">
      <div style="width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: ${dotColor}; border: 2px solid #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
        <div style="transform: rotate(45deg); width: 10px; height: 10px; border-radius: 50%; background: #FFFFFF;"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'sleek-dot-marker',
    html,
    iconSize: [28, 32],
    iconAnchor: [14, 30],
    popupAnchor: [0, -28]
  });
}

// Generate Basecamp Hotel Pin
function createHotelMarkerIcon(hotel) {
  const html = `
    <div style="position: relative; display: inline-flex; align-items: center; cursor: pointer; transition: all 0.2s ease;">
      <div style="display: flex; align-items: center; gap: 6px; background: #FEF3C7; color: #78350F; padding: 4px 10px 4px 6px; border-radius: 9999px; border: 2px solid #F59E0B; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
        <span style="width: 22px; height: 22px; border-radius: 50%; background: #F59E0B; color: white; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center;">
          🏨
        </span>
        <span style="font-size: 11px; font-weight: 700; font-family: 'Inter', sans-serif; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; color: #78350F;">
          ${hotel.name || 'Basecamp Hotel'}
        </span>
      </div>
      <div style="position: absolute; bottom: -5px; left: 14px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #F59E0B;"></div>
    </div>
  `;
  return L.divIcon({
    className: 'sleek-hotel-marker',
    html,
    iconSize: [160, 32],
    iconAnchor: [15, 30],
    popupAnchor: [60, -28]
  });
}

// Available Real Map Styles
const MAP_TILES = {
  streets: {
    name: 'Google Streets',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri & OpenStreetMap Street Engine'
  },
  dark: {
    name: 'Carto Light',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap & CartoDB'
  },
  satellite: {
    name: 'Satellite View',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery'
  }
};

export default function WanderMap({
  center = [35.6762, 139.6503],
  zoom = 13,
  places = [],
  itineraryItems = [],
  baseHotel = null,
  activePlaceId = null,
  onSelectPlace,
  onAddToItinerary,
  onOpenStreetView,
  onOpenReviews
}) {
  const mapRef = useRef(null);
  const [mapStyle, setMapStyle] = useState('streets'); // 'streets' | 'dark' | 'satellite'

  const centerCoord = [
    parseFloat(center?.[0]) || 35.6762,
    parseFloat(center?.[1]) || 139.6503
  ];

  const activePlace = [...itineraryItems, ...places].find(p => p.id === activePlaceId);
  const selectedCoord = activePlace && activePlace.latitude && activePlace.longitude
    ? [parseFloat(activePlace.latitude), parseFloat(activePlace.longitude)]
    : null;

  const itineraryCoords = itineraryItems
    .filter(item => item.latitude && item.longitude)
    .map(item => [parseFloat(item.latitude), parseFloat(item.longitude)]);

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden rounded-2xl border border-[#EBE7DF] shadow-md bg-[#FAF8F5]">
      <MapContainer
        center={centerCoord}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
        ref={mapRef}
      >
        <TileLayer
          attribution={MAP_TILES[mapStyle].attribution}
          url={MAP_TILES[mapStyle].url}
          maxZoom={19}
        />

        <MapController center={centerCoord} zoom={zoom} selectedCoord={selectedCoord} />

        {/* Route Polyline connecting scheduled places */}
        {itineraryCoords.length > 1 && (
          <Polyline
            positions={itineraryCoords}
            pathOptions={{
              color: '#C24B27',
              weight: 4,
              opacity: 0.9,
              dashArray: '6, 6',
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        )}

        {/* Markers for Scheduled Itinerary items */}
        {itineraryItems.map((item, idx) => {
          if (!item.latitude || !item.longitude) return null;
          const isActive = item.id === activePlaceId;
          return (
            <Marker
              key={`itin_${item.id}`}
              position={[parseFloat(item.latitude), parseFloat(item.longitude)]}
              icon={createSleekMarkerIcon(item, true, idx + 1, isActive)}
              eventHandlers={{
                click: () => onSelectPlace && onSelectPlace(item)
              }}
            >
              <Popup>
                <div className="w-64 overflow-hidden bg-white text-[#141413] rounded-2xl border border-[#EBE7DF] shadow-xl">
                  {item.photo_url && (
                    <div className="relative h-28 w-full bg-[#FAF8F5]">
                      <img
                        src={item.photo_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                    </div>
                  )}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#C24B27] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                        {idx + 1}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-mutedText">
                        Day {item.day_number || 1} Stop
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-[#141413] leading-tight truncate">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-mutedText truncate">
                      {item.address || 'Selected Location'}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#EBE7DF]">
                      {item.rating ? (
                        <span className="flex items-center gap-1 text-amber-500 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{item.rating}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-mutedText">
                          Spot
                        </span>
                      )}
                      <span className="text-[11px] text-mutedText capitalize">
                        {item.category === 'eat' ? 'Dining' : item.category === 'stay' ? 'Lodging' : 'Attraction'}
                      </span>
                    </div>

                    {/* Action buttons inside popup */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => onOpenStreetView && onOpenStreetView(item)}
                        className="py-1.5 px-2 rounded-lg bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-[10px] font-semibold text-[#141413] flex items-center justify-center gap-1 transition-colors shadow-2xs"
                      >
                        <Compass className="w-3 h-3 text-[#C24B27]" />
                        <span>360° Street</span>
                      </button>

                      <button
                        onClick={() => onOpenReviews && onOpenReviews(item)}
                        className="py-1.5 px-2 rounded-lg bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-[10px] font-semibold text-[#141413] flex items-center justify-center gap-1 transition-colors shadow-2xs"
                      >
                        <Star className="w-3 h-3 text-amber-500" />
                        <span>Reviews</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Basecamp Hotel Anchor Marker */}
        {baseHotel?.latitude && baseHotel?.longitude && (
          <Marker
            key={`basecamp_${baseHotel.name}`}
            position={[parseFloat(baseHotel.latitude), parseFloat(baseHotel.longitude)]}
            icon={createHotelMarkerIcon(baseHotel)}
            eventHandlers={{
              click: () => onSelectPlace && onSelectPlace(baseHotel)
            }}
          >
            <Popup>
              <div className="w-60 overflow-hidden bg-white text-[#141413] rounded-2xl border border-amber-300 shadow-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center">★</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">My Basecamp Hotel</span>
                </div>
                <h4 className="font-serif font-bold text-sm text-[#141413]">{baseHotel.name}</h4>
                <p className="text-xs text-mutedText">{baseHotel.address || 'Staying Location'}</p>
                <div className="text-[11px] text-amber-900 bg-amber-50 rounded-lg p-2 border border-amber-200">
                  Daily routes and walking distances in the workspace are anchored from here.
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Markers for Discovered Places */}
        {places.map((place) => {
          if (!place.latitude || !place.longitude) return null;
          if (itineraryItems.some(i => i.id === place.id || i.place_id === place.id)) return null;
          
          const isActive = place.id === activePlaceId;
          return (
            <Marker
              key={`place_${place.id}`}
              position={[parseFloat(place.latitude), parseFloat(place.longitude)]}
              icon={createSleekMarkerIcon(place, false, null, isActive)}
              eventHandlers={{
                click: () => onSelectPlace && onSelectPlace(place)
              }}
            >
              <Popup>
                <div className="w-64 overflow-hidden bg-white text-[#141413] rounded-2xl border border-[#EBE7DF] shadow-xl">
                  {place.photo_url && (
                    <div className="relative h-28 w-full bg-[#FAF8F5]">
                      <img
                        src={place.photo_url}
                        alt={place.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-md text-[10px] font-bold text-[#141413] border border-[#EBE7DF] shadow-2xs">
                        {place.tagLabel || place.category}
                      </span>
                    </div>
                  )}

                  <div className="p-3.5 space-y-2">
                    <h4 className="font-bold text-sm text-[#141413] leading-tight truncate">
                      {place.name}
                    </h4>
                    <p className="text-[11px] text-mutedText truncate">
                      {place.address}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#EBE7DF]">
                      {place.rating ? (
                        <>
                          <span className="flex items-center gap-1 text-amber-500 font-semibold">
                            <Star className="w-3.5 h-3.5 fill-amber-500" />
                            <span>{place.rating}</span>
                            {place.reviewsCount ? (
                              <span className="text-mutedText font-normal">({place.reviewsCount})</span>
                            ) : null}
                          </span>
                          <span className="text-[11px] text-mutedText font-medium">
                            {place.tagLabel || 'Spot'}
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-mutedText font-medium">
                          {place.tagLabel || 'Spot'}
                        </span>
                      )}
                    </div>

                    {/* Street View & Reviews */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => onOpenStreetView && onOpenStreetView(place)}
                        className="py-1.5 px-2 rounded-lg bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-[10px] font-semibold text-[#141413] flex items-center justify-center gap-1 transition-colors shadow-2xs"
                      >
                        <Compass className="w-3 h-3 text-[#C24B27]" />
                        <span>360° Street</span>
                      </button>

                      <button
                        onClick={() => onOpenReviews && onOpenReviews(place)}
                        className="py-1.5 px-2 rounded-lg bg-[#FAF8F5] hover:bg-[#F1EDE4] border border-[#EBE7DF] text-[10px] font-semibold text-[#141413] flex items-center justify-center gap-1 transition-colors shadow-2xs"
                      >
                        <Star className="w-3 h-3 text-amber-500" />
                        <span>Reviews</span>
                      </button>
                    </div>

                    {onAddToItinerary && (
                      <button
                        onClick={() => onAddToItinerary(place)}
                        className="w-full py-2 px-3 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white font-semibold text-xs flex items-center justify-center gap-1 transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Itinerary Day</span>
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Map Controls & Street View Mode Pegman */}
      <div className="absolute top-4 left-4 z-[400] flex items-center gap-2">
        {/* Map Tile Style Switcher */}
        <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl border border-[#EBE7DF] shadow-lg flex items-center gap-1 text-xs text-[#141413]">
          <button
            onClick={() => setMapStyle('streets')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              mapStyle === 'streets'
                ? 'bg-[#141413] text-white shadow-xs'
                : 'text-mutedText hover:text-[#141413]'
            }`}
          >
            Google Streets
          </button>
          <button
            onClick={() => setMapStyle('dark')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              mapStyle === 'dark'
                ? 'bg-[#141413] text-white shadow-xs'
                : 'text-mutedText hover:text-[#141413]'
            }`}
          >
            Carto Light
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              mapStyle === 'satellite'
                ? 'bg-[#141413] text-white shadow-xs'
                : 'text-mutedText hover:text-[#141413]'
            }`}
          >
            Satellite
          </button>
        </div>
      </div>

      {/* Street View Pegman & Quick 360 Action */}
      <div className="absolute bottom-6 right-4 z-[400] flex flex-col gap-2">
        <button
          onClick={() => {
            const target = activePlace || itineraryItems[0] || places[0] || {
              name: 'Map Center',
              latitude: centerCoord[0],
              longitude: centerCoord[1],
              address: 'Current Map Location'
            };
            if (onOpenStreetView) onOpenStreetView(target);
          }}
          title="Open Google Street View (360°)"
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#141413] hover:bg-[#C24B27] text-white font-semibold text-xs shadow-xl border border-[#141413] transition-all hover:scale-105 active:scale-95"
        >
          <Compass className="w-4 h-4 text-[#C24B27]" />
          <span>Street View (360°)</span>
        </button>
      </div>

      {/* Floating Map Legend */}
      <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md border border-[#EBE7DF] text-[11px] font-semibold text-[#141413] flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C24B27]" />
          <span>Itinerary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]" />
          <span>Dining</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C24B27]" />
          <span>Stays</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
          <span>Sights</span>
        </div>
      </div>
    </div>
  );
}
