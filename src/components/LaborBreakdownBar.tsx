'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { computeLaborBreakdown } from '@/lib/utils/laborBreakdown';
import { formatCurrency, PAYROLL_TAX_RATE } from '@/lib/utils/cost';
import type { ToastTipsData } from './Scheduler';

const SALARY_KEY = 'shift_weekly_salary';
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function readNumber(key: string): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(key);
  const n = raw ? parseFloat(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

interface LaborBreakdownBarProps {
  toastTips: ToastTipsData | null;
  tipsLoading: boolean;
  tipsError: string | null;
  onRefreshTips: () => void;
}

export default function LaborBreakdownBar({ toastTips, tipsLoading, tipsError, onRefreshTips }: LaborBreakdownBarProps) {
  const { currentWeekShifts, employees, weekStats } = useSchedulerContext();

  const [salary, setSalary] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSalary(readNumber(SALARY_KEY));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(SALARY_KEY, String(salary));
  }, [salary, hydrated]);

  const tips = toastTips?.total ?? 0;

  const b = useMemo(
    () => computeLaborBreakdown(currentWeekShifts, employees, salary, tips),
    [currentWeekShifts, employees, salary, tips]
  );

  const pct = Math.round(PAYROLL_TAX_RATE * 100);

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6 py-4 flex-shrink-0">
      <div className="flex items-stretch gap-2 overflow-x-auto scrollbar-hide -mx-4 sm:-mx-6 px-4 sm:px-6">
        <Card
          label="Hourly"
          value={formatCurrency(b.hourly)}
          sublabel={`${b.hourlyHours.toFixed(0)}h regular`}
        />
        <EditableCard
          label="Salary"
          value={salary}
          onChange={setSalary}
          sublabel="Weekly pool"
        />
        <Card
          label="Overtime"
          value={formatCurrency(b.overtime)}
          sublabel={b.overtimeHours > 0
            ? `${b.overtimeHours.toFixed(0)}h at 1.5×`
            : '0h — no OT'}
          warn={b.overtime > 0}
        />
        <ToastTipsCard
          data={toastTips}
          loading={tipsLoading}
          error={tipsError}
          onRefresh={onRefreshTips}
        />
        <Card label="Payroll Tax" value={formatCurrency(b.tax)} sublabel={`~${pct}% of subtotal`} />
        <div className="flex items-center px-1 text-[var(--color-muted)] text-lg font-light flex-shrink-0" aria-hidden>=</div>
        <Card label="Total" value={formatCurrency(b.total)} sublabel="All-in weekly" big />
        <Card label="Total Hours" value={`${weekStats.totalHours.toFixed(0)}h`} sublabel={`${weekStats.totalShifts} shift${weekStats.totalShifts !== 1 ? 's' : ''}`} />
      </div>
    </div>
  );
}

function Card({
  label, value, sublabel, big = false, warn = false,
}: {
  label: string; value: string; sublabel?: string; big?: boolean; warn?: boolean;
}) {
  return (
    <div className={`${big ? 'min-w-[200px] bg-[var(--color-accent-subtle)] border-[var(--color-accent)]/20' : 'min-w-[140px] bg-[var(--color-surface-2)] border-[var(--color-border)]'} border rounded-lg px-4 py-3 flex-shrink-0 flex flex-col justify-between`}>
      <div className={`text-[10px] font-mono uppercase tracking-[0.1em] ${warn ? 'text-[var(--color-warn)]' : 'text-[var(--color-muted)]'}`}>{label}</div>
      <div className={`font-mono font-semibold leading-tight mt-2 ${big ? 'text-[28px] text-[var(--color-accent)]' : 'text-[20px] text-[var(--color-text)]'}`}>{value}</div>
      {sublabel && <div className="text-[10px] text-[var(--color-muted)] mt-1 whitespace-nowrap">{sublabel}</div>}
    </div>
  );
}

function EditableCard({
  label, value, onChange, sublabel,
}: {
  label: string; value: number; onChange: (n: number) => void; sublabel?: string;
}) {
  const [text, setText] = useState(value > 0 ? String(value) : '');

  useEffect(() => { setText(value > 0 ? String(value) : ''); }, [value]);

  const handleBlur = () => {
    const parsed = parseFloat(text);
    onChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
  };

  return (
    <div className="min-w-[140px] bg-[var(--color-surface-2)] border border-dashed border-[var(--color-border-strong)] rounded-lg px-4 py-3 flex-shrink-0 flex flex-col justify-between hover:border-[var(--color-accent)] transition-colors">
      <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--color-muted)] flex items-center gap-1">
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-50"><path d="M7 1L9 3L4 8H2V6L7 1Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/></svg>
      </div>
      <div className="font-mono font-semibold leading-tight mt-2 flex items-center gap-0.5">
        <span className="text-[20px] text-[var(--color-muted)]">$</span>
        <input
          type="number" inputMode="decimal" min={0} step={10} value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
          placeholder="0"
          className="w-full text-[20px] font-mono font-semibold text-[var(--color-text)] bg-transparent border-none outline-none focus:text-[var(--color-accent)] placeholder:text-[var(--color-muted)]"
        />
      </div>
      {sublabel && <div className="text-[10px] text-[var(--color-muted)] mt-1 whitespace-nowrap">{sublabel}</div>}
    </div>
  );
}

function ToastTipsCard({
  data, loading, error, onRefresh,
}: {
  data: ToastTipsData | null; loading: boolean; error: string | null; onRefresh: () => void;
}) {
  const [showDays, setShowDays] = useState(false);
  const fetchedTime = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <div
      className="min-w-[160px] bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-4 py-3 flex-shrink-0 flex flex-col justify-between relative group cursor-default"
      onMouseEnter={() => data && setShowDays(true)}
      onMouseLeave={() => setShowDays(false)}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--color-muted)] flex items-center gap-1">
          Tips
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF4C00]" title="Live from Toast" />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRefresh(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-muted)] hover:text-[var(--color-text)]"
          title="Refresh tips from Toast"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M9.5 5.5A4 4 0 1 1 5.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M5.5 1.5L7.5 3.5L5.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      <div className="font-mono font-semibold text-[20px] leading-tight mt-2 text-[var(--color-text)]">
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-[var(--color-border-strong)] border-t-[var(--color-text)] rounded-full animate-spin align-middle" />
        ) : error ? (
          <span className="text-[13px] text-[var(--color-muted)]">—</span>
        ) : (
          formatCurrency(data?.total ?? 0)
        )}
      </div>
      <div className="text-[10px] text-[var(--color-muted)] mt-1 whitespace-nowrap">
        {error ? (
          <span className="text-[var(--color-warn)]" title={error}>Toast unavailable</span>
        ) : fetchedTime ? (
          `Updated ${fetchedTime}`
        ) : (
          'Weekly total'
        )}
      </div>

      {showDays && data && (
        <div className="absolute bottom-full left-0 mb-2 z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl px-3 py-2.5 min-w-[160px]">
          <div className="text-[9px] font-mono uppercase tracking-wider text-[var(--color-muted)] mb-1.5">Tips by day</div>
          {DAY_LABELS.map(day => (
            <div key={day} className="flex justify-between items-center gap-4 py-0.5">
              <span className="text-[11px] font-mono text-[var(--color-muted)]">{day}</span>
              <span className="text-[11px] font-mono font-medium text-[var(--color-text)]">
                {data.byDay[day] > 0 ? formatCurrency(data.byDay[day]) : '—'}
              </span>
            </div>
          ))}
          <div className="border-t border-[var(--color-border)] mt-1.5 pt-1.5 flex justify-between">
            <span className="text-[11px] font-mono text-[var(--color-muted)]">Total</span>
            <span className="text-[11px] font-mono font-semibold text-[var(--color-text)]">{formatCurrency(data.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
