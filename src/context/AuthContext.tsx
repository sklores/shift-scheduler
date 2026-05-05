'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

export type UserRole = 'owner' | 'employee';

interface AuthState {
  session: Session | null;
  loading: boolean;
  supabase: SupabaseClient;
  role: UserRole;
  isOwner: boolean;
  isEmbedded: boolean;
  /** Sign in via the beta password gate. Returns { ok: true } or { error }. */
  signIn: (password: string, role: UserRole) => Promise<{ ok: true } | { error: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Read URL search params safely (SSR guard). */
function getParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(key);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => getSupabase());
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(() => {
    try { return (localStorage.getItem('shift-role') as UserRole) ?? 'owner'; } catch { return 'owner'; }
  });

  // Detect embedded mode from URL: ?embedded=true&role=owner&k=PASSWORD
  const isEmbedded = typeof window !== 'undefined' && getParam('embedded') === 'true';

  useEffect(() => {
    const embeddedPass = getParam('k');
    const embeddedRole = getParam('role') as UserRole | null;

    // Auto-sign-in when running inside the And Done desktop iframe
    if (isEmbedded && embeddedPass) {
      const autoSignIn = async () => {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: embeddedPass }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.access_token) {
          await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
          const resolvedRole: UserRole =
            embeddedRole === 'employee' ? 'employee' : 'owner';
          setRole(resolvedRole);
        }
        setLoading(false);
      };
      autoSignIn();
      return;
    }

    // Normal flow — restore any existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [supabase, isEmbedded]);

  const signIn = useCallback(async (password: string, selectedRole: UserRole = 'owner') => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.access_token) {
      return { error: data?.error || 'Sign-in failed' };
    }
    const { error } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (error) return { error: error.message };
    setRole(selectedRole);
    try { localStorage.setItem('shift-role', selectedRole); } catch { /* ignore */ }
    return { ok: true as const };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setRole('owner');
    try { localStorage.removeItem('shift-role'); } catch { /* ignore */ }
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ session, loading, supabase, role, isOwner: role === 'owner', isEmbedded, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
