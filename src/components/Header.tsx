'use client';

import { useSchedulerContext } from '@/context/SchedulerContext';

interface HeaderProps {
  onOpenDrawer: () => void;
  onOpenPublish: () => void;
}

export default function Header({ onOpenDrawer, onOpenPublish }: HeaderProps) {
  const { weekLabel, changeWeek } = useSchedulerContext();

  return (
    <header className="bg-[#1a1916] text-white px-6 flex items-center justify-between h-[52px] sticky top-0 z-50">
      <div className="font-mono text-lg font-semibold tracking-tight">
        sh<span className="text-[var(--color-accent)]">i</span>ft
      </div>

      <div className="flex items-center gap-3 font-mono text-[13px] text-[#ccc]">
        <button
          onClick={() => changeWeek(-1)}
          className="w-7 h-7 border border-[#444] rounded text-white hover:border-white hover:bg-[#333] transition-all text-sm"
        >
          &#8249;
        </button>
        <span className="min-w-[140px] text-center">{weekLabel}</span>
        <button
          onClick={() => changeWeek(1)}
          className="w-7 h-7 border border-[#444] rounded text-white hover:border-white hover:bg-[#333] transition-all text-sm"
        >
          &#8250;
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenDrawer}
          className="font-mono text-xs font-medium px-3.5 py-1.5 rounded border border-[#555] text-[#ccc] hover:border-white hover:text-white transition-all flex items-center gap-1.5"
        >
          <span className="w-[7px] h-[7px] rounded-full bg-[var(--color-accent)] flex-shrink-0" />
          Manage Staff
        </button>
        <button
          onClick={onOpenPublish}
          className="font-mono text-xs font-semibold px-4 py-1.5 rounded bg-[var(--color-green)] border border-[var(--color-green)] text-white hover:bg-[#224a1e] transition-all flex items-center gap-1.5"
        >
          <span className="text-sm">&#x1F4E4;</span>
          Publish
        </button>
      </div>
    </header>
  );
}
