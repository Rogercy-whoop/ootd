
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured, isLoginEnabled } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, pass: string) => Promise<User | null>;
  login: (email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const UnconfiguredFirebase = () => (
    <div className="flex h-screen items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-2xl">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Firebase Not Configured</AlertTitle>
          <AlertDescription>
            <p className="mb-4">
                The application cannot connect to Firebase. This is usually because the required
                environment variables are missing from your <code>.env</code> file.
            </p>
            <p className="mb-2">
                To fix this, find your Firebase project's web app configuration keys in the Firebase Console (Project Settings &gt; General &gt; Your apps) and add them to the <code>.env</code> file. Then, restart the development server.
            </p>
            <pre className="mt-4 rounded-md bg-muted p-4 text-xs font-mono overflow-x-auto">
{`NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...`}
            </pre>
          </AlertDescription>
        </Alert>
    </div>
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoginEnabled || !auth) {
      setLoading(false);
      return;
    }
    // onAuthStateChanged is the single source of truth for the user's auth state.
    // It fires on initial load, and whenever the user signs in or out.
    // It correctly sets the user and loading state for the whole app.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const guardNotConfigured = () => {
      if (!isFirebaseConfigured || !auth) {
          const err = new Error("Firebase is not configured. Please check your .env file.");
          console.error(err);
          throw err;
      }
      return auth;
  }

  const signup = useCallback(async (email: string, pass: string) => {
    const authInstance = guardNotConfigured();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, pass);
      // onAuthStateChanged will handle setting user and setting loading to false.
      return userCredential.user;
    } catch (error) {
      console.error("Signup Error:", error);
      setLoading(false); // Set loading false only on error.
      throw error;
    }
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    const authInstance = guardNotConfigured();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(authInstance, email, pass);
      // onAuthStateChanged will handle setting user and setting loading to false.
      return userCredential.user;
    } catch (error) {
      console.error("Login Error:", error);
      setLoading(false); // Set loading false only on error.
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    const authInstance = guardNotConfigured();
    setLoading(true);
    try {
      await signOut(authInstance);
      // onAuthStateChanged will handle setting user to null and loading to false.
    } catch (error) {
      console.error("Logout Error:", error);
      setLoading(false); // Set loading false only on error.
      throw error;
    }
  }, []);

  // Only a problem when accounts were switched on but the Firebase settings are missing.
  if (process.env.NEXT_PUBLIC_ENABLE_LOGIN === 'true' && !isFirebaseConfigured) {
    return <UnconfiguredFirebase />;
  }

  const value = { user, loading, signup, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
