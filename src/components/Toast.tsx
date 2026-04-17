'use client';

interface ToastProps {
  message: string | null;
}

export default function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[600] -translate-x-1/2 bg-[var(--color-text)] text-white px-4 py-2.5 rounded-full font-medium text-[12.5px] shadow-2xl animate-[slideUp_0.25s_ease] flex items-center gap-2"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--color-green-light)]">
        <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {message}
    </div>
  );
}
