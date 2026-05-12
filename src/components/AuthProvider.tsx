"use client";

import { onIdTokenChanged, type User as FirebaseUser } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearAuthTokenCache } from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase";

type AuthContextValue = {
  firebaseUser: FirebaseUser | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({ firebaseUser: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    return onIdTokenChanged(auth, (user) => {
      clearAuthTokenCache();
      setFirebaseUser(user);
      setLoading(false);
    });
  }, []);

  const value = useMemo(() => ({ firebaseUser, loading }), [firebaseUser, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
