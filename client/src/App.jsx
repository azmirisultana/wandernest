import React, { useState, useEffect } from 'react';
import Navbar from './components/common/Navbar';
import LandingPage from './components/landing/LandingPage';
import ExploreDashboard from './components/explore/ExploreDashboard';
import PlaceSplitView from './components/explore/PlaceSplitView';
import StaysPage from './components/stays/StaysPage';
import FlightsPage from './components/flights/FlightsPage';
import TripPlanner from './components/planner/TripPlanner';
import MyTrips from './components/trips/MyTrips';
import SavedPlacesPage from './components/saved/SavedPlacesPage';
import ProfilePage from './components/profile/ProfilePage';
import AuthModal from './components/auth/AuthModal';
import CreateTripModal from './components/planner/CreateTripModal';
import StreetViewModal from './components/streetview/StreetViewModal';
import ReviewsModal from './components/reviews/ReviewsModal';
import { useAuth } from './context/AuthContext';
import { fetchTrips, fetchTrip, createTrip } from './api';


export default function App() {
  const { currentUser } = useAuth();
  
  // Navigation View:
  // If not logged in -> 'landing'
  // If logged in -> defaults to 'explore'
  const [currentView, setCurrentView] = useState(() => {
    return currentUser ? 'explore' : 'landing';
  });

  // Scoped per-user active trip: fresh users (e.g. test2) have null active trip!
  const loadActiveTripForUid = (uid) => {
    if (!uid) return null;
    try {
      const stored = localStorage.getItem(`wandernest_active_trip_${uid}`);
      if (stored) return JSON.parse(stored);

      // Check legacy migration
      const cleanEmail = currentUser?.email?.toLowerCase()?.trim();
      if (cleanEmail) {
        try {
          const legacySafeId = btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
          const legacyStored = localStorage.getItem(`wandernest_active_trip_user_${legacySafeId}`);
          if (legacyStored) {
            const parsed = JSON.parse(legacyStored);
            localStorage.setItem(`wandernest_active_trip_${uid}`, legacyStored);
            return parsed;
          }
        } catch (e) {}
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const [activeTrip, setActiveTrip] = useState(() => loadActiveTripForUid(currentUser?.uid));
  const [trips, setTrips] = useState([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialSignUp, setAuthInitialSignUp] = useState(false);
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [pendingDestination, setPendingDestination] = useState(null);
  const [pendingInitialPlace, setPendingInitialPlace] = useState(null);
  const [viewingPlace, setViewingPlace] = useState(null);

  const handleExplorePlace = (place) => {
    if (!place) return;
    setViewingPlace(place);
    setCurrentView('place-preview');
  };

  // Global modals for Street View and Reviews
  const [streetViewPlace, setStreetViewPlace] = useState(null);
  const [isStreetViewOpen, setIsStreetViewOpen] = useState(false);
  const [reviewsPlace, setReviewsPlace] = useState(null);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);

  // Track the active user UID to prevent saving stale state across user switches
  const lastUserUidRef = React.useRef(currentUser?.uid || null);

  // Sync active trip and view when auth state changes
  useEffect(() => {
    lastUserUidRef.current = currentUser?.uid || null;

    if (currentUser?.uid) {
      // Load this user's active trip from isolated key
      const userTrip = loadActiveTripForUid(currentUser.uid);
      setActiveTrip(userTrip);

      // If user just logged in while on landing, redirect to explore!
      if (currentView === 'landing') {
        setCurrentView('explore');
      }
    } else {
      // If logged out, reset to clean slate
      setActiveTrip(null);
      setTrips([]);
      setCurrentView('landing');
    }
  }, [currentUser?.uid]);

  // Save active trip to per-user localStorage strictly for the active user
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    // Prevent old user's activeTrip from writing to newly logged in user during state transitions
    if (lastUserUidRef.current !== currentUser.uid) {
      return;
    }

    if (activeTrip) {
      try {
        localStorage.setItem(`wandernest_active_trip_${currentUser.uid}`, JSON.stringify(activeTrip));
      } catch (e) {
        console.warn('Failed to save active trip to localStorage:', e);
      }
    } else {
      localStorage.removeItem(`wandernest_active_trip_${currentUser.uid}`);
    }
  }, [activeTrip, currentUser?.uid]);

  // Load trips from backend and user-isolated localStorage
  const loadTrips = async () => {
    if (!currentUser?.uid) {
      setTrips([]);
      return;
    }

    // Always initialize trips to this specific user's cache immediately
    let initialTrips = [];
    try {
      const cached = localStorage.getItem(`wandernest_trips_${currentUser.uid}`);
      if (cached) {
        initialTrips = JSON.parse(cached);
      } else {
        const cleanEmail = currentUser?.email?.toLowerCase()?.trim();
        if (cleanEmail) {
          try {
            const legacySafeId = btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
            const legacyCached = localStorage.getItem(`wandernest_trips_user_${legacySafeId}`);
            if (legacyCached) {
              initialTrips = JSON.parse(legacyCached);
              localStorage.setItem(`wandernest_trips_${currentUser.uid}`, legacyCached);
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
    setTrips(initialTrips);

    try {
      const res = await fetchTrips(currentUser.uid);
      if (res.success && Array.isArray(res.data)) {
        setTrips(res.data);
        localStorage.setItem(`wandernest_trips_${currentUser.uid}`, JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn('Trips load error (using isolated local trips):', err);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [currentUser?.uid]);

  // Handle protected actions
  const requireAuth = (callback) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return false;
    }
    if (callback) callback();
    return true;
  };

  const handleOpenAuth = (isSignUp = false) => {
    setAuthInitialSignUp(isSignUp);
    setIsAuthModalOpen(true);
  };

  // Switch destination & open workspace
  const handleSwitchDestination = (dest) => {
    if (!requireAuth()) {
      setPendingDestination(dest);
      return;
    }

    const updatedTrip = {
      id: `trip_${dest.id || Date.now()}`,
      title: `${dest.name} Itinerary`,
      destination: dest.name,
      country: dest.country || 'Worldwide',
      latitude: parseFloat(dest.latitude || dest.lat) || 35.6762,
      longitude: parseFloat(dest.longitude || dest.lng) || 139.6503,
      daysCount: dest.daysCount || 5,
      startDate: dest.startDate || null,
      endDate: dest.endDate || null,
      cover_image: dest.cover_image || dest.photo_url || null,
      hotel: dest.hotel || null,
      items: [],
      expenses: []
    };

    setActiveTrip(updatedTrip);
    if (currentUser) {
      setTrips(prev => {
        const updated = [updatedTrip, ...prev.filter(t => t.id !== updatedTrip.id)];
        try {
          localStorage.setItem(`wandernest_trips_${currentUser.uid}`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }
    setCurrentView('workspace');
  };

  const handleStartPlanning = (dest, initialPlace = null) => {
    if (!requireAuth()) {
      setPendingDestination(dest);
      setPendingInitialPlace(initialPlace);
      return;
    }
    setPendingDestination(dest);
    setPendingInitialPlace(initialPlace);
    setIsCreateTripOpen(true);
  };

  const handleConfirmTripSetup = async (newTripData) => {
    let items = newTripData.items || [];
    if (pendingInitialPlace) {
      items = [{
        id: `itin_${Date.now()}`,
        day_number: 1,
        name: pendingInitialPlace.name,
        category: pendingInitialPlace.category,
        latitude: pendingInitialPlace.latitude,
        longitude: pendingInitialPlace.longitude,
        address: pendingInitialPlace.address,
        photo_url: pendingInitialPlace.photo_url,
        rating: pendingInitialPlace.rating
      }];
    }

    const fullTrip = { ...newTripData, items };
    setActiveTrip(fullTrip);
    setIsCreateTripOpen(false);
    setPendingDestination(null);
    setPendingInitialPlace(null);

    // Save to user trips list immediately
    if (currentUser) {
      setTrips(prev => {
        const updated = [fullTrip, ...prev.filter(t => t.id !== fullTrip.id)];
        try {
          localStorage.setItem(`wandernest_trips_${currentUser.uid}`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }

    try {
      if (currentUser) {
        await createTrip({
          userId: currentUser.uid,
          title: fullTrip.title,
          destination: fullTrip.destination,
          country: fullTrip.country,
          latitude: fullTrip.latitude,
          longitude: fullTrip.longitude,
          startDate: fullTrip.startDate,
          endDate: fullTrip.endDate,
          coverImage: fullTrip.coverImage || fullTrip.cover_image,
          daysCount: fullTrip.daysCount
        });
      }
    } catch (e) {
      console.warn('Backend create trip sync skipped:', e);
    }

    setCurrentView('workspace');
    loadTrips();
  };

  const handleSelectTrip = async (tripItem) => {
    try {
      const res = await fetchTrip(tripItem.id);
      if (res.success && res.data) {
        setActiveTrip(res.data);
      } else {
        setActiveTrip(tripItem);
      }
    } catch (e) {
      setActiveTrip(tripItem);
    }
    setCurrentView('workspace');
  };

  const handleUpdateTripHotel = (hotelObj) => {
    setActiveTrip(prev => ({
      ...prev,
      hotel: hotelObj
    }));
  };

  const handleOpenStreetView = (place) => {
    setStreetViewPlace(place);
    setIsStreetViewOpen(true);
  };

  const handleOpenReviews = (place) => {
    setReviewsPlace(place);
    setIsReviewsOpen(true);
  };

  const handleAddPlaceToWorkspace = (place) => {
    if (activeTrip) {
      const newItem = {
        id: `itin_${Date.now()}`,
        day_number: 1,
        name: place.name,
        category: place.category,
        latitude: place.latitude,
        longitude: place.longitude,
        address: place.address,
        photo_url: place.photo_url,
        rating: place.rating
      };
      setActiveTrip(prev => ({
        ...prev,
        items: [...(prev.items || []), newItem]
      }));
      setCurrentView('workspace');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#141413] antialiased font-sans">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigateHome={() => setCurrentView(currentUser ? 'explore' : 'landing')}
        onNavigateView={(view) => {
          if (!currentUser && view !== 'landing') {
            setIsAuthModalOpen(true);
          } else {
            setCurrentView(view);
          }
        }}
        onOpenSavedPlaces={() => {
          if (requireAuth()) setCurrentView('saved-places');
        }}
        onOpenProfile={() => {
          if (requireAuth()) setCurrentView('profile');
        }}
        onOpenAuth={handleOpenAuth}
        onStartPlanning={handleStartPlanning}
        onExplorePlace={handleExplorePlace}
        activeTrip={activeTrip}
      />

      {/* Auth Modal with Password Verification */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialSignUp={authInitialSignUp}
      />

      {/* Create Trip & Destination Modal (Wanderlog Style) */}
      <CreateTripModal
        isOpen={isCreateTripOpen}
        onClose={() => {
          setIsCreateTripOpen(false);
          setPendingDestination(null);
          setPendingInitialPlace(null);
        }}
        initialDestination={pendingDestination}
        initialPlace={pendingInitialPlace}
        onTripCreated={handleConfirmTripSetup}
        onExploreDestination={(dest) => {
          setPendingDestination(null);
          setPendingInitialPlace(null);
          setIsCreateTripOpen(false);
          handleExplorePlace(dest);
        }}
      />

      {/* Global Street View Modal */}
      <StreetViewModal
        isOpen={isStreetViewOpen}
        onClose={() => setIsStreetViewOpen(false)}
        place={streetViewPlace}
      />

      {/* Global Reviews Modal */}
      <ReviewsModal
        isOpen={isReviewsOpen}
        onClose={() => setIsReviewsOpen(false)}
        place={reviewsPlace}
      />

      {/* Main Views */}
      <main className={`flex-1 ${currentView === 'workspace' || currentView === 'place-preview' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {/* 1. Logged-Out Landing Page */}
        {currentView === 'landing' && (
          <LandingPage
            currentUser={currentUser}
            trips={trips}
            onSelectTrip={handleSelectTrip}
            onOpenAuth={handleOpenAuth}
            onSelectDestination={handleSwitchDestination}
            onStartCustomTrip={() => handleStartPlanning(null)}
          />
        )}

        {/* 2. Logged-In Explore & Discovery Page (The Page After Logging In!) */}
        {currentView === 'explore' && currentUser && (
          <ExploreDashboard
            activeTrip={activeTrip}
            trips={trips}
            onSelectTrip={handleSelectTrip}
            onRefreshTrips={loadTrips}
            onExplorePlace={handleExplorePlace}
            onSelectDestination={handleSwitchDestination}
            onStartPlanning={handleStartPlanning}
            onOpenWorkspace={(place) => {
              if (place) handleAddPlaceToWorkspace(place);
              else setCurrentView('workspace');
            }}
            onOpenStreetView={handleOpenStreetView}
            onOpenReviews={handleOpenReviews}
            onNavigateView={(v) => setCurrentView(v)}
            onUpdateTripHotel={handleUpdateTripHotel}
          />
        )}

        {/* 3. Dedicated Stays & Accommodations Section */}
        {currentView === 'stays' && (
          <StaysPage
            activeTrip={activeTrip}
            onBackToWorkspace={() => setCurrentView('workspace')}
            onOpenStreetView={handleOpenStreetView}
            onOpenReviews={handleOpenReviews}
            onUpdateTripHotel={handleUpdateTripHotel}
            onAddToItinerary={handleAddPlaceToWorkspace}
          />
        )}

        {/* 4. Dedicated Flights Section */}
        {currentView === 'flights' && (
          <FlightsPage
            activeTrip={activeTrip}
            onBackToWorkspace={() => setCurrentView('workspace')}
          />
        )}

        {/* 5. Tool-First Split View Trip Workspace */}
        {currentView === 'workspace' && activeTrip && (
          <TripPlanner
            trip={activeTrip}
            onBack={() => setCurrentView('my-trips')}
            onUpdateTrip={(updated) => setActiveTrip(updated)}
            onSwitchDestination={handleSwitchDestination}
          />
        )}

        {/* 6. Saved Places Page */}
        {currentView === 'saved-places' && (
          <SavedPlacesPage
            onBackToWorkspace={() => setCurrentView('workspace')}
            onAddToItinerary={handleAddPlaceToWorkspace}
            onOpenStreetView={handleOpenStreetView}
            onOpenReviews={handleOpenReviews}
          />
        )}

        {/* 7. User Profile Page */}
        {currentView === 'profile' && (
          <ProfilePage
            trips={trips}
            onSelectTrip={handleSelectTrip}
            onBackToWorkspace={() => setCurrentView('workspace')}
            onOpenSavedPlaces={() => setCurrentView('saved-places')}
          />
        )}

        {/* 8. My Trips List */}
        {currentView === 'my-trips' && (
          <MyTrips
            trips={trips}
            onSelectTrip={handleSelectTrip}
            onRefreshTrips={loadTrips}
            onBackToWorkspace={() => setCurrentView('workspace')}
            onStartNewTrip={() => {
              setPendingDestination(null);
              setIsCreateTripOpen(true);
            }}
          />
        )}

        {/* 9. Place Split View (Split map & place info with Plan a Trip option) */}
        {currentView === 'place-preview' && viewingPlace && (
          <PlaceSplitView
            place={viewingPlace}
            onBack={() => setCurrentView(currentUser ? 'explore' : 'landing')}
            onStartPlanning={(targetPlace, initialPlace) => {
              handleStartPlanning(targetPlace || viewingPlace, initialPlace);
            }}
            onOpenStreetView={handleOpenStreetView}
            onOpenReviews={handleOpenReviews}
          />
        )}
      </main>
    </div>
  );
}
