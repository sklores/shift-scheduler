'use client';

interface ToastProps {
  message: string | null;
}

export default function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div
      className="fixed bottom-5 left-1/2 z-[600] -translate-x-1/2 bg-[var(--color-green)] text-white px-5 py-2 rounded-full font-mono text-xs shadow-lg animate-[slideUp_0.25s_ease]"
    >
      {message}
    </div>
  );
}
