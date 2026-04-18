'use client';

import { useAuth } from '@/context/AuthContext';
import { SchedulerProvider } from '@/context/SchedulerContext';
import AuthGate from './AuthGate';
import Scheduler from './Scheduler';

export default function AppGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="font-mono text-sm text-[var(--color-muted)]">Loading…</div>
      </div>
    );
  }

  if (!session) {
    return <AuthGate />;
  }

  return (
    <SchedulerProvider>
      <Scheduler />
    </SchedulerProvider>
  );
}
