import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  fbSignOut, 
  onAuthStateChanged 
} from '../services/firebase';

const AuthContext = createContext();

// Deterministic UID generator: produces clean, human-readable user IDs
export function getDeterministicUid(identifier) {
  if (!identifier) return 'guest_' + Math.random().toString(36).substring(2, 9);
  const clean = identifier.toLowerCase().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return 'user_' + (clean || 'traveler');
}

// Pre-configured Dummy Admin Credentials
export const ADMIN_CONFIG = {
  email: 'admin@wandernest.com',
  password: 'admin123',
  displayName: 'WanderNest Administrator'
};

// User registry helper to ensure users retain their credentials and isolated workspaces
export function getUsersRegistry() {
  try {
    const raw = localStorage.getItem('wandernest_users_registry');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveUsersRegistry(registry) {
  try {
    localStorage.setItem('wandernest_users_registry', JSON.stringify(registry));
  } catch (e) {}
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('wandernest_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Sync with Firebase auth if valid credentials configured
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Traveler',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || user.uid}`,
          isGuest: false
        };
        setCurrentUser(userData);
        localStorage.setItem('wandernest_user', JSON.stringify(userData));
      }
      setLoading(false);
    }, (err) => {
      console.warn("Auth state observer error (falling back to local user store):", err);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      if (!auth || !googleProvider) throw new Error("Firebase not initialized");
      const res = await signInWithPopup(auth, googleProvider);
      return res.user;
    } catch (err) {
      console.warn("Google sign-in fallback:", err);
      const demoUser = {
        uid: 'demo_user_google',
        email: 'traveler@wandernest.com',
        displayName: 'Wanderer Alex',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        isGuest: false
      };
      setCurrentUser(demoUser);
      localStorage.setItem('wandernest_user', JSON.stringify(demoUser));
      return demoUser;
    }
  };

  const loginWithEmail = async (emailOrUsername, password) => {
    setAuthError(null);
    const cleanId = (emailOrUsername || '').toLowerCase().trim();
    if (!cleanId) throw new Error('Please enter your email or username.');

    // 1. Check for Dummy Admin credentials
    if (cleanId === 'admin@wandernest.com' || cleanId === 'admin') {
      if (password !== ADMIN_CONFIG.password) {
        throw new Error(`Incorrect admin password. Please use "${ADMIN_CONFIG.password}" to access the admin panel.`);
      }
      const adminUser = {
        uid: 'admin_root',
        email: ADMIN_CONFIG.email,
        displayName: ADMIN_CONFIG.displayName,
        role: 'admin',
        isAdmin: true,
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        isGuest: false,
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      const registry = getUsersRegistry();
      registry[ADMIN_CONFIG.email] = adminUser;
      saveUsersRegistry(registry);

      setCurrentUser(adminUser);
      localStorage.setItem('wandernest_user', JSON.stringify(adminUser));
      return adminUser;
    }

    try {
      if (!auth) throw new Error("Firebase not initialized");
      const res = await signInWithEmailAndPassword(auth, cleanId, password);
      return res.user;
    } catch (err) {
      console.warn("Sign-in using local user registry:", err?.message);
      
      const registry = getUsersRegistry();
      const existingUser = registry[cleanId];

      if (existingUser) {
        // Verify password if recorded
        if (existingUser.password && password && existingUser.password !== password) {
          throw new Error('Incorrect password. Please verify your credentials or create a new account.');
        }
        setCurrentUser(existingUser);
        localStorage.setItem('wandernest_user', JSON.stringify(existingUser));
        return existingUser;
      }

      // If user exists in previous legacy storage or logging in first time
      const uid = getDeterministicUid(cleanId);
      const newUser = {
        uid,
        email: cleanId.includes('@') ? cleanId : `${cleanId}@wandernest.local`,
        displayName: cleanId.split('@')[0],
        password: password || '',
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanId}`,
        isGuest: false,
        createdAt: new Date().toISOString()
      };
      registry[cleanId] = newUser;
      saveUsersRegistry(registry);

      setCurrentUser(newUser);
      localStorage.setItem('wandernest_user', JSON.stringify(newUser));
      return newUser;
    }
  };

  const loginAsAdmin = async () => {
    return loginWithEmail(ADMIN_CONFIG.email, ADMIN_CONFIG.password);
  };

  const signupWithEmail = async (emailOrUsername, password, fullName = '') => {
    setAuthError(null);
    const cleanId = (emailOrUsername || '').toLowerCase().trim();
    if (!cleanId) throw new Error('Please enter your email or username.');

    try {
      if (!auth) throw new Error("Firebase not initialized");
      const res = await createUserWithEmailAndPassword(auth, cleanId, password);
      return res.user;
    } catch (err) {
      console.warn("Sign-up using local user registry:", err?.message);

      const registry = getUsersRegistry();
      
      // Strict check: if an account with this identifier already exists, prevent accidental overwrite!
      if (registry[cleanId]) {
        throw new Error(`An account already exists for "${cleanId}". Please sign in instead.`);
      }

      const uid = getDeterministicUid(cleanId);
      const newUser = {
        uid,
        email: cleanId.includes('@') ? cleanId : `${cleanId}@wandernest.local`,
        displayName: fullName?.trim() || cleanId.split('@')[0],
        password: password || '',
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanId}`,
        isGuest: false,
        createdAt: new Date().toISOString()
      };

      registry[cleanId] = newUser;
      saveUsersRegistry(registry);

      // Clean slate for brand new user: clear any active trip, saved places or trips for this new UID
      try {
        localStorage.removeItem(`wandernest_saved_places_${uid}`);
        localStorage.removeItem(`wandernest_active_trip_${uid}`);
        localStorage.removeItem(`wandernest_trips_${uid}`);
      } catch (e) {}

      setCurrentUser(newUser);
      localStorage.setItem('wandernest_user', JSON.stringify(newUser));
      return newUser;
    }
  };

  const updateUserProfile = (newDisplayName) => {
    if (!currentUser) return;
    const updated = { ...currentUser, displayName: newDisplayName };
    setCurrentUser(updated);
    localStorage.setItem('wandernest_user', JSON.stringify(updated));

    // Update in registry
    const registry = getUsersRegistry();
    const cleanId = (currentUser.email || '').toLowerCase().trim();
    if (registry[cleanId]) {
      registry[cleanId].displayName = newDisplayName;
      saveUsersRegistry(registry);
    }
  };

  const continueAsGuest = () => {
    const guestUser = {
      uid: 'guest_' + Math.random().toString(36).substring(2, 9),
      displayName: 'Guest Adventurer',
      email: null,
      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GuestWanderer',
      isGuest: true
    };
    setCurrentUser(guestUser);
    localStorage.setItem('wandernest_user', JSON.stringify(guestUser));
    return guestUser;
  };

  const logout = async () => {
    try {
      if (auth) await fbSignOut(auth);
    } catch (e) {}
    setCurrentUser(null);
    localStorage.removeItem('wandernest_user');
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      loading, 
      authError, 
      loginWithGoogle, 
      loginWithEmail, 
      signupWithEmail, 
      loginAsAdmin,
      ADMIN_CONFIG,
      updateUserProfile,
      continueAsGuest, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
