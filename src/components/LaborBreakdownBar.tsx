'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { computeLaborBreakdown } from '@/lib/utils/laborBreakdown';
import { formatCurrency, PAYROLL_TAX_RATE } from '@/lib/utils/cost';

const SALARY_KEY = 'shift_weekly_salary';
const TIPS_KEY = 'shift_weekly_tips';

function readNumber(key: string): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(key);
  const n = raw ? parseFloat(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export default function LaborBreakdownBar() {
  const { shifts, employees } = useSchedulerContext();

  // User-entered pools (persisted in localStorage)
  const [salary, setSalary] = useState<number>(0);
  const [tips, setTips] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSalary(readNumber(SALARY_KEY));
    setTips(readNumber(TIPS_KEY));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(SALARY_KEY, String(salary));
  }, [salary, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(TIPS_KEY, String(tips));
  }, [tips, hydrated]);

  const b = useMemo(
    () => computeLaborBreakdown(shifts, employees, salary, tips),
    [shifts, employees, salary, tips]
  );

  const pct = Math.round(PAYROLL_TAX_RATE * 100);

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6 py-4 flex-shrink-0">
      <div className="flex items-stretch gap-2 overflow-x-auto scrollbar-hide -mx-4 sm:-mx-6 px-4 sm:px-6">
        <Card label="Hourly" value={formatCurrency(b.hourly)} sublabel="Regular ≤40h" />
        <EditableCard
          label="Salary"
          value={salary}
          onChange={setSalary}
          sublabel="Weekly pool"
        />
        <Card label="Overtime" value={formatCurrency(b.overtime)} sublabel="Hours >40 at 1.5×" warn={b.overtime > 0} />
        <EditableCard
          label="Tips"
          value={tips}
          onChange={setTips}
          sublabel="Weekly pool"
        />
        <Card label="Payroll Tax" value={formatCurrency(b.tax)} sublabel={`~${pct}% of subtotal`} />
        <div className="flex items-center px-1 text-[var(--color-muted)] text-lg font-light flex-shrink-0" aria-hidden>=</div>
        <Card label="Total" value={formatCurrency(b.total)} sublabel="All-in weekly" big />
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  sublabel,
  big = false,
  warn = false,
}: {
  label: string;
  value: string;
  sublabel?: string;
  big?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={`${big ? 'min-w-[200px] bg-[var(--color-accent-subtle)] border-[var(--color-accent)]/20' : 'min-w-[140px] bg-[var(--color-surface-2)] border-[var(--color-border)]'} border rounded-lg px-4 py-3 flex-shrink-0 flex flex-col justify-between`}
    >
      <div className={`text-[10px] font-mono uppercase tracking-[0.1em] ${warn ? 'text-[var(--color-warn)]' : 'text-[var(--color-muted)]'}`}>
        {label}
      </div>
      <div className={`font-mono font-semibold leading-tight mt-2 ${big ? 'text-[28px] text-[var(--color-accent)]' : 'text-[20px] text-[var(--color-text)]'}`}>
        {value}
      </div>
      {sublabel && (
        <div className="text-[10px] text-[var(--color-muted)] mt-1 whitespace-nowrap">
          {sublabel}
        </div>
      )}
    </div>
  );
}

function EditableCard({
  label,
  value,
  onChange,
  sublabel,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  sublabel?: string;
}) {
  const [text, setText] = useState(value > 0 ? String(value) : '');

  useEffect(() => {
    setText(value > 0 ? String(value) : '');
  }, [value]);

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
          type="number"
          inputMode="decimal"
          min={0}
          step={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
          placeholder="0"
          className="w-full text-[20px] font-mono font-semibold text-[var(--color-text)] bg-transparent border-none outline-none focus:text-[var(--color-accent)] placeholder:text-[var(--color-muted)]"
        />
      </div>
      {sublabel && (
        <div className="text-[10px] text-[var(--color-muted)] mt-1 whitespace-nowrap">
          {sublabel}
        </div>
      )}
    </div>
  );
}
