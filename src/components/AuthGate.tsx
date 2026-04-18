'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function AuthGate() {
  const { signIn } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    const result = await signIn(password);
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
        <div className="flex justify-center mb-5">
          <div className="font-mono text-[24px] font-semibold tracking-[-0.02em] text-[var(--color-text)]">
            sh<span className="text-[var(--color-accent)]">i</span>ft
          </div>
        </div>

        <div className="text-center mb-5">
          <h1 className="text-[15px] font-semibold text-[var(--color-text)]">Beta Access</h1>
          <p className="text-[12.5px] text-[var(--color-muted)] mt-1">
            Enter the team password to continue.
          </p>
        </div>

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
          {loading ? 'Signing in…' : 'Enter'}
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
