'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { hasLocalStorageData, migrateLocalStorageToSupabase } from '@/lib/data/migrate-localstorage';

/**
 * Shown after first authed load if the browser has localStorage data from
 * the pre-Supabase beta. Offers one-click import.
 */
export default function MigrationBanner() {
  const { supabase } = useAuth();
  const { employees } = useSchedulerContext();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    // Only offer migration if:
    //  - localStorage has data
    //  - AND the Supabase org is empty (don't duplicate)
    if (hasLocalStorageData() && employees.length === 0) setShow(true);
  }, [employees.length]);

  if (!show) return null;

  const handleImport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await migrateLocalStorageToSupabase(supabase);
      setResult(`Imported ${r.employees} staff, ${r.shifts} shifts, ${r.templates} templates. Reloading…`);
      // Reload so scheduler re-fetches from Supabase with the newly imported data
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setResult(`Import failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('shift_migrated_to_supabase', '1');
    setShow(false);
  };

  return (
    <div className="bg-[var(--color-accent-subtle)] border-b border-[var(--color-accent)]/30 px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-[200px]">
        <div className="text-[13px] font-medium text-[var(--color-text)]">
          {result ? result : 'Import your beta schedule data?'}
        </div>
        {!result && (
          <div className="text-[12px] text-[var(--color-text-2)] mt-0.5">
            We found your saved employees and shifts from before we added the cloud backend. Import once, then it&apos;s synced across devices.
          </div>
        )}
      </div>
      {!result && (
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleSkip}
            disabled={busy}
            className="text-[13px] font-medium px-3 py-1.5 rounded-md bg-transparent text-[var(--color-text-2)] border border-[var(--color-border-strong)] hover:bg-white transition-all"
          >
            Skip
          </button>
          <button
            onClick={handleImport}
            disabled={busy}
            className="text-[13px] font-medium px-4 py-1.5 rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-all shadow-sm disabled:opacity-50"
          >
            {busy ? 'Importing…' : 'Import now'}
          </button>
        </div>
      )}
    </div>
  );
}
