'use client';

import { useState } from 'react';
import { useAuth, type UserRole } from '@/context/AuthContext';

export default function AuthGate() {
  const { signIn } = useAuth();
  const [role, setRole] = useState<UserRole>('owner');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    const result = await signIn(password, role);
    if ('error' in result) {
      setError(result.error);
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--color-bg)] p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs bg-white rounded-xl shadow-lg border border-[var(--color-border)] p-6"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="font-mono text-[24px] font-semibold tracking-[-0.02em] text-[var(--color-text)]">
            <span className="text-[var(--color-accent)]">&amp;</span>shift
          </div>
        </div>

        {/* Role selector */}
        <div className="mb-5">
          <p className="text-[11px] font-medium text-[var(--color-muted)] uppercase tracking-wider mb-2">I am a…</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole('owner')}
              className={`py-3 px-4 rounded-lg border text-[13px] font-medium transition-all text-left ${
                role === 'owner'
                  ? 'bg-[var(--color-accent-subtle)] border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'bg-white border-[var(--color-border-strong)] text-[var(--color-text-2)] hover:border-[var(--color-accent)]/50'
              }`}
            >
              <div className="text-[18px] mb-1">👔</div>
              <div>Owner</div>
              <div className="text-[10.5px] text-[var(--color-muted)] font-normal mt-0.5">Full access</div>
            </button>
            <button
              type="button"
              onClick={() => setRole('employee')}
              className={`py-3 px-4 rounded-lg border text-[13px] font-medium transition-all text-left ${
                role === 'employee'
                  ? 'bg-[var(--color-accent-subtle)] border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'bg-white border-[var(--color-border-strong)] text-[var(--color-text-2)] hover:border-[var(--color-accent)]/50'
              }`}
            >
              <div className="text-[18px] mb-1">👤</div>
              <div>Employee</div>
              <div className="text-[10.5px] text-[var(--color-muted)] font-normal mt-0.5">Schedule only</div>
            </button>
          </div>
        </div>

        {/* Password */}
        <label className="block mb-3">
          <span className="sr-only">Password</span>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••"
            className="w-full border border-[var(--color-border-strong)] rounded-lg px-3.5 py-3 text-[16px] font-mono text-center bg-white text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none transition-colors tracking-widest"
          />
        </label>

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full text-[13px] font-semibold px-4 py-2.5 rounded-lg bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? 'Signing in…' : `Enter as ${role === 'owner' ? 'Owner' : 'Employee'}`}
        </button>

        {error && (
          <div className="mt-3 text-[12px] text-[var(--color-accent)] text-center">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
