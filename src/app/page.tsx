'use client';

import { SchedulerProvider } from '@/context/SchedulerContext';
import Scheduler from '@/components/Scheduler';

// Auth gates (login, role selector, employee portal) are stubbed.
// When ready: wrap <Scheduler /> with an AuthProvider + route guards.

export default function Home() {
  return (
    <SchedulerProvider>
      <Scheduler />
    </SchedulerProvider>
  );
}
