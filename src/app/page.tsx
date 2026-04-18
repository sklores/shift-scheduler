'use client';

import { AuthProvider } from '@/context/AuthContext';
import AppGate from '@/components/AppGate';

export default function Home() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}
