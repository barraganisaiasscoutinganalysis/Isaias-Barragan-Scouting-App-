import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface AppUser {
  id: string;
  uid: string; // for compatibility with existing components
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: string;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error?: string; message?: string }>;
  signInAsDemoScout: (scoutId: 'A' | 'B') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => ({}),
  signInWithEmail: async () => ({}),
  signUpWithEmail: async () => ({}),
  signInAsDemoScout: async () => {},
  signOut: async () => {}
});

function formatSupabaseUser(su: SupabaseUser | null): AppUser | null {
  if (!su) return null;
  return {
    id: su.id,
    uid: su.id,
    email: su.email || null,
    displayName: su.user_metadata?.full_name || su.user_metadata?.name || su.email?.split('@')[0] || 'Scout Autorizado',
    photoURL: su.user_metadata?.avatar_url || su.user_metadata?.picture || null,
    provider: su.app_metadata?.provider || 'supabase'
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(formatSupabaseUser(session?.user ?? null));
      setLoading(false);
    });

    // 2. Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(formatSupabaseUser(session?.user ?? null));
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        return { error: error.message };
      }
      return {};
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      return { error: err.message || 'Error de autenticación con Google' };
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        return { error: error.message };
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Error al iniciar sesión' };
    }
  };

  const signUpWithEmail = async (email: string, password: string): Promise<{ error?: string; message?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: email.split('@')[0]
          }
        }
      });
      if (error) {
        return { error: error.message };
      }
      if (data.session) {
        return { message: 'Cuenta creada e iniciada exitosamente.' };
      }
      return { message: 'Revisa tu correo electrónico para confirmar el registro.' };
    } catch (err: any) {
      return { error: err.message || 'Error al registrar usuario' };
    }
  };

  /**
   * Helper to quickly log in / switch as Demo Scout A or Demo Scout B for RLS Isolation testing.
   * Creates or signs in with dummy deterministic accounts on Supabase.
   */
  const signInAsDemoScout = async (scoutId: 'A' | 'B'): Promise<void> => {
    const email = `scout_${scoutId.toLowerCase()}@scoutingstudio.io`;
    const password = `ProScoutPass2026!_${scoutId}`;

    // Try signing in
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      // If user doesn't exist, sign up
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `Scout Profesional ${scoutId}`
          }
        }
      });
      await supabase.auth.signInWithPassword({ email, password });
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signInAsDemoScout,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
