import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const SavedPlacesContext = createContext();

export function SavedPlacesProvider({ children }) {
  const { currentUser } = useAuth();
  const currentUid = currentUser?.uid || null;

  // Track the current user ID to avoid writing stale data during account switches
  const currentUidRef = useRef(currentUid);

  // Helper to load isolated places for a specific user ID
  const loadPlacesForUid = (uid) => {
    if (!uid) return [];
    try {
      // 1. Primary isolated user key
      const stored = localStorage.getItem(`wandernest_saved_places_${uid}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }

      // 2. Migration fallback for legacy btoa hash keys
      const cleanEmail = currentUser?.email?.toLowerCase()?.trim();
      if (cleanEmail) {
        try {
          const legacySafeId = btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
          const legacyKey = `wandernest_saved_places_user_${legacySafeId}`;
          const legacyStored = localStorage.getItem(legacyKey);
          if (legacyStored) {
            const parsed = JSON.parse(legacyStored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Migrate to new canonical key
              localStorage.setItem(`wandernest_saved_places_${uid}`, legacyStored);
              return parsed;
            }
          }
        } catch (e) {}
      }

      return [];
    } catch (e) {
      console.warn('Failed to load saved places for UID:', uid, e);
      return [];
    }
  };

  // State initialized for current user; null user always starts with empty []
  const [savedPlaces, setSavedPlaces] = useState(() => loadPlacesForUid(currentUid));

  // Sync state whenever the active user changes (Login, Signup, Switch, Logout)
  useEffect(() => {
    currentUidRef.current = currentUid;
    if (currentUid) {
      const userPlaces = loadPlacesForUid(currentUid);
      setSavedPlaces(userPlaces);
    } else {
      // Logged out: clean slate immediately
      setSavedPlaces([]);
    }

    // Always remove any non-scoped legacy key so it never bleeds across sessions
    try {
      localStorage.removeItem('wandernest_saved_places');
    } catch (e) {}
  }, [currentUid]);

  // Persist strictly to the current user's isolated storage
  const persistForUser = (newPlaces, uid) => {
    const targetUid = uid || currentUidRef.current;
    if (!targetUid) return;
    try {
      localStorage.setItem(`wandernest_saved_places_${targetUid}`, JSON.stringify(newPlaces));
    } catch (e) {
      console.warn('Failed to persist saved places to localStorage:', e);
    }
  };

  const isSaved = (placeId) => {
    if (!placeId || !currentUid) return false;
    return savedPlaces.some(p => p.id === placeId);
  };

  const toggleSavePlace = (place) => {
    if (!place || !place.id || !currentUid) return;
    setSavedPlaces(prev => {
      const exists = prev.some(p => p.id === place.id);
      const updated = exists
        ? prev.filter(p => p.id !== place.id)
        : [{ ...place, savedAt: new Date().toISOString() }, ...prev];
      persistForUser(updated, currentUid);
      return updated;
    });
  };

  const removeSavedPlace = (placeId) => {
    if (!placeId || !currentUid) return;
    setSavedPlaces(prev => {
      const updated = prev.filter(p => p.id !== placeId);
      persistForUser(updated, currentUid);
      return updated;
    });
  };

  return (
    <SavedPlacesContext.Provider value={{
      savedPlaces,
      isSaved,
      toggleSavePlace,
      removeSavedPlace
    }}>
      {children}
    </SavedPlacesContext.Provider>
  );
}

export function useSavedPlaces() {
  const context = useContext(SavedPlacesContext);
  if (!context) {
    throw new Error('useSavedPlaces must be used within a SavedPlacesProvider');
  }
  return context;
}
