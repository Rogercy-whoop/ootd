'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import type { Gender, UserPreferences } from '@/lib/types';

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updateGender: (gender: Gender) => Promise<void>;
  updatePreferences: (newPreferences: Partial<UserPreferences>) => Promise<void>;
  loading: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

const defaultPreferences: UserPreferences = {
  gender: undefined,
  stylePreferences: [],
  sizePreferences: {},
  colorPreferences: [],
  occasionPreferences: []
};

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    let unsubscribe = () => {};

    if (user && db) {
      // USER IS LOGGED IN
      setLoading(true);

      const preferencesRef = doc(db, 'users', user.uid, 'preferences', 'user');
      
      unsubscribe = onSnapshot(preferencesRef, (doc) => {
        if (doc.exists()) {
          setPreferences(doc.data() as UserPreferences);
        } else {
          // Create default preferences document
          setDoc(preferencesRef, defaultPreferences);
          setPreferences(defaultPreferences);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error listening to preferences:", error);
        setLoading(false);
      });

    } else {
      // USER IS A GUEST
      setLoading(true);
      try {
        const storedPreferences = localStorage.getItem('userPreferences');
        setPreferences(storedPreferences ? JSON.parse(storedPreferences) : defaultPreferences);
      } catch (error) {
        console.error("Failed to load preferences from localStorage", error);
        setPreferences(defaultPreferences);
      } finally {
        setLoading(false);
      }
    }

    return () => {
      unsubscribe();
    };
  }, [user, authLoading]);

  const updateGender = useCallback(async (gender: Gender) => {
    const newPreferences = { ...preferences, gender };
    setPreferences(newPreferences);

    if (user && db) {
      const preferencesRef = doc(db, 'users', user.uid, 'preferences', 'user');
      await setDoc(preferencesRef, newPreferences, { merge: true });
    } else {
      localStorage.setItem('userPreferences', JSON.stringify(newPreferences));
    }
  }, [preferences, user]);

  const updatePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    const updatedPreferences = { ...preferences, ...newPreferences };
    setPreferences(updatedPreferences);

    if (user && db) {
      const preferencesRef = doc(db, 'users', user.uid, 'preferences', 'user');
      await setDoc(preferencesRef, updatedPreferences, { merge: true });
    } else {
      localStorage.setItem('userPreferences', JSON.stringify(updatedPreferences));
    }
  }, [preferences, user]);

  return (
    <UserPreferencesContext.Provider value={{ preferences, updateGender, updatePreferences, loading }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
} 