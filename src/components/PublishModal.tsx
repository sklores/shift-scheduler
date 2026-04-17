'use client';

import { useState } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { getPublishRecipients, buildScheduleMessage } from '@/lib/utils/schedule-message';
import { cleanPhone } from '@/lib/utils/phone';
import Modal from './Modal';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

type Phase = 'preview' | 'sending' | 'results';

interface SendResult {
  name: string;
  to: string;
  status: 'sent' | 'failed';
  reason?: string;
}

export default function PublishModal({ isOpen, onClose, onToast }: PublishModalProps) {
  const { employees, shifts, weekOffset } = useSchedulerContext();
  const [phase, setPhase] = useState<Phase>('preview');
  const [results, setResults] = useState<SendResult[]>([]);

  const { recipients, missingPhone, invalidPhone, scheduledEmps } = getPublishRecipients(employees, shifts, weekOffset);
  const sampleEmp = recipients[0]?.emp || scheduledEmps[0];
  const sampleMsg = sampleEmp ? buildScheduleMessage(sampleEmp, shifts, weekOffset) : '';

  const handleClose = () => {
    setPhase('preview');
    setResults([]);
    onClose();
  };

  const handleSend = async () => {
    setPhase('sending');
    // Stubbed — simulate sending
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockResults: SendResult[] = recipients.map(r => ({
      name: r.emp.name,
      to: r.to,
      status: 'sent' as const,
    }));
    setResults(mockResults);
    setPhase('results');
    onToast(`Sent ${mockResults.length} schedule${mockResults.length !== 1 ? 's' : ''}`);
  };

  const headerCls = "bg-[var(--color-green)] text-white";

  if (phase === 'results') {
    const sentCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.length - sentCount;

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={failedCount === 0 ? 'Schedule Sent' : 'Send Results'}
        headerClassName={headerCls}
        width="max-w-md"
        footer={
          <button onClick={handleClose} className="text-[13px] font-medium px-4 py-2 rounded-lg bg-[var(--color-text)] text-white hover:opacity-90 transition-all">
            Done
          </button>
        }
      >
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-green-light)] mb-3">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-[var(--color-green)]">
              <path d="M7 14L12 19L21 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="text-lg font-semibold text-[var(--color-text)]">
            {sentCount} schedule{sentCount !== 1 ? 's' : ''} delivered
          </div>
          {failedCount > 0 && (
            <div className="text-[13px] text-[var(--color-accent)] mt-1">{failedCount} failed</div>
          )}
        </div>
        <div className="space-y-1">
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-[var(--color-surface-2)]">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{r.name}</div>
                <div className="font-mono text-[11px] text-[var(--color-muted)]">{r.to}</div>
              </div>
              <Badge variant={r.status === 'sent' ? 'success' : 'danger'}>
                {r.status === 'sent' ? '✓ sent' : '✗ failed'}
              </Badge>
            </div>
          ))}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Publish Schedule"
      headerClassName={headerCls}
      width="max-w-md"
      footer={
        phase === 'sending' ? (
          <div className="flex items-center gap-2 text-[var(--color-muted)] text-[13px] font-medium">
            <span className="inline-block w-4 h-4 border-2 border-[var(--color-border-strong)] border-t-[var(--color-green)] rounded-full animate-spin" />
            Sending...
          </div>
        ) : (
          <>
            <button onClick={handleClose} className="text-[13px] font-medium px-4 py-2 rounded-lg bg-white text-[var(--color-text-2)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] transition-all">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={recipients.length === 0}
              className="text-[13px] font-medium px-4 py-2 rounded-lg bg-[var(--color-green)] text-white border border-[var(--color-green)] hover:bg-[var(--color-green-hover)] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              Send {recipients.length} Text{recipients.length !== 1 ? 's' : ''}
            </button>
          </>
        )
      }
    >
      {(missingPhone.length > 0 || invalidPhone.length > 0) && (
        <div className="mb-4 px-3.5 py-2.5 bg-[var(--color-warn-light)] border border-[#f3d097] rounded-lg text-[12.5px] text-[var(--color-warn)] flex items-start gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5"><path d="M7 1L13 12H1L7 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M7 5V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="7" cy="10" r="0.6" fill="currentColor"/></svg>
          <div>
            {[
              missingPhone.length > 0 ? `${missingPhone.length} missing phone` : '',
              invalidPhone.length > 0 ? `${invalidPhone.length} invalid phone format` : '',
            ].filter(Boolean).join(' · ')} — these employees will be skipped.
          </div>
        </div>
      )}

      {/* Sample message */}
      <div className="mb-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)] mb-2">Sample message</div>
        <div className="font-mono text-[12px] bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3.5 py-3 text-[var(--color-text)] leading-relaxed whitespace-pre-wrap max-h-[140px] overflow-y-auto">
          {sampleMsg || '—'}
        </div>
      </div>

      {/* Recipients */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)] mb-2.5">
          Recipients — {scheduledEmps.length} scheduled
        </div>
        <div className="space-y-1">
          {scheduledEmps.map(emp => {
            const formatted = cleanPhone(emp.phone || '');
            const ok = !!formatted;

            return (
              <div key={emp.id} className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                  style={{ backgroundColor: emp.color }}
                >
                  {initials(emp.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{emp.name}</div>
                  <div className="font-mono text-[11px] text-[var(--color-muted)]">{emp.phone || 'no phone'}</div>
                </div>
                <Badge variant={ok ? 'success' : 'warn'}>
                  {!emp.phone || !emp.phone.trim() ? 'no phone' : ok ? '✓ ready' : 'invalid'}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

function Badge({ children, variant }: { children: React.ReactNode; variant: 'success' | 'warn' | 'danger' }) {
  const cls = {
    success: 'bg-[var(--color-green-light)] text-[var(--color-green)]',
    warn: 'bg-[var(--color-warn-light)] text-[var(--color-warn)]',
    danger: 'bg-[var(--color-accent-light)] text-[var(--color-accent)]',
  }[variant];
  return (
    <span className={`text-[10.5px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${cls}`}>
      {children}
    </span>
  );
}
