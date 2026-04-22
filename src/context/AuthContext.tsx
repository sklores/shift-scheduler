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
  /** Sign in via the beta password gate. Returns { ok: true } or { error }. */
  signIn: (password: string, role: UserRole) => Promise<{ ok: true } | { error: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => getSupabase());
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(() => {
    try { return (localStorage.getItem('shift-role') as UserRole) ?? 'owner'; } catch { return 'owner'; }
  });

  useEffect(() => {
    // Restore any existing session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    // Stay in sync with sign in / sign out / token refresh
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [supabase]);

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
    <AuthContext.Provider value={{ session, loading, supabase, role, isOwner: role === 'owner', signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
