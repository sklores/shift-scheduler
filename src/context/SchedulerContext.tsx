'use client';

import { createContext, useContext, useMemo } from 'react';
import { useScheduler, type SchedulerState } from '@/lib/hooks/useScheduler';
import { LocalStorageAdapter } from '@/lib/data/local-storage';

const SchedulerContext = createContext<SchedulerState | null>(null);

export function SchedulerProvider({ children }: { children: React.ReactNode }) {
  const adapter = useMemo(() => new LocalStorageAdapter(), []);
  const scheduler = useScheduler(adapter);

  return (
    <SchedulerContext.Provider value={scheduler}>
      {children}
    </SchedulerContext.Provider>
  );
}

export function useSchedulerContext(): SchedulerState {
  const ctx = useContext(SchedulerContext);
  if (!ctx) throw new Error('useSchedulerContext must be used within SchedulerProvider');
  return ctx;
}
