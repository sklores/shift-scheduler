'use client';

import { useState } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { ROLE_COLORS } from '@/lib/data/types';
import { getPublishRecipients, buildScheduleMessage } from '@/lib/utils/schedule-message';
import { cleanPhone } from '@/lib/utils/phone';

import { formatWeekStartISO } from '@/lib/utils/week';
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
type SendChannel = 'sms' | 'email';

interface SendResult {
  name: string;
  to: string;
  status: 'sent' | 'failed';
  reason?: string;
}

export default function PublishModal({ isOpen, onClose, onToast }: PublishModalProps) {
  const { employees, currentWeekShifts: shifts, weekOffset } = useSchedulerContext();
  const [phase, setPhase] = useState<Phase>('preview');
  const [lastChannel, setLastChannel] = useState<SendChannel>('sms');
  const [results, setResults] = useState<SendResult[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);

  const { recipients, missingPhone, invalidPhone, emailRecipients, missingEmail, scheduledEmps } = getPublishRecipients(employees, shifts, weekOffset);
  const sampleEmp = recipients[0]?.emp || emailRecipients[0]?.emp || scheduledEmps[0];
  const sampleMsg = sampleEmp ? buildScheduleMessage(sampleEmp, shifts, weekOffset) : '';

  const handleClose = () => {
    setPhase('preview');
    setResults([]);
    setSendError(null);
    onClose();
  };

  const handleSend = async (channel: SendChannel) => {
    setPhase('sending');
    setLastChannel(channel);
    setSendError(null);

    const fromWeekStart = formatWeekStartISO(weekOffset);

    try {
      let apiResults: Array<{ to: string; status: 'sent' | 'failed'; reason?: string }> = [];

      if (channel === 'sms') {
        const payload = { fromWeekStart, messages: recipients.map(r => ({ to: r.to, body: r.body })) };
        const res = await fetch('/api/send-schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && !Array.isArray(data?.results)) throw new Error(data?.error || `Send failed (${res.status})`);
        apiResults = Array.isArray(data.results) ? data.results : [];
        const mapped: SendResult[] = recipients.map(r => {
          const match = apiResults.find(x => x.to === r.to);
          return { name: r.emp.name, to: r.to, status: match?.status === 'sent' ? 'sent' : 'failed', reason: match?.reason };
        });
        setResults(mapped);
        setPhase('results');
        const sentCount = mapped.filter(m => m.status === 'sent').length;
        const failedCount = mapped.length - sentCount;
        onToast(failedCount === 0 ? `Sent ${sentCount} text${sentCount !== 1 ? 's' : ''}` : `Sent ${sentCount} · ${failedCount} failed`);
      } else {
        const payload = { fromWeekStart, messages: emailRecipients.map(r => ({ to: r.to, name: r.name, subject: r.subject, body: r.body })) };
        const res = await fetch('/api/send-schedule-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && !Array.isArray(data?.results)) throw new Error(data?.error || `Send failed (${res.status})`);
        apiResults = Array.isArray(data.results) ? data.results : [];
        const mapped: SendResult[] = emailRecipients.map(r => {
          const match = apiResults.find(x => x.to === r.to);
          return { name: r.emp.name, to: r.to, status: match?.status === 'sent' ? 'sent' : 'failed', reason: match?.reason };
        });
        setResults(mapped);
        setPhase('results');
        const sentCount = mapped.filter(m => m.status === 'sent').length;
        const failedCount = mapped.length - sentCount;
        onToast(failedCount === 0 ? `Sent ${sentCount} email${sentCount !== 1 ? 's' : ''}` : `Sent ${sentCount} · ${failedCount} failed`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSendError(message);
      const src = channel === 'sms' ? recipients : emailRecipients;
      setResults(src.map(r => ({ name: r.emp.name, to: r.to, status: 'failed', reason: message })));
      setPhase('results');
      onToast('Send failed');
    }
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
        {sendError && (
          <div className="mb-3 px-3.5 py-2.5 bg-[var(--color-accent-light)] border border-[var(--color-accent)]/40 rounded-lg text-[12px] text-[var(--color-accent-hover)]">
            <strong>Server error:</strong> {sendError}
          </div>
        )}
        <div className="space-y-1">
          {results.map((r, i) => (
            <div key={i} className="py-2.5 px-3 rounded-lg bg-[var(--color-surface-2)]">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{r.name}</div>
                  <div className="font-mono text-[11px] text-[var(--color-muted)]">{r.to}</div>
                </div>
                <Badge variant={r.status === 'sent' ? 'success' : 'danger'}>
                  {r.status === 'sent' ? '✓ sent' : '✗ failed'}
                </Badge>
              </div>
              {r.status === 'failed' && r.reason && (
                <div className="mt-1.5 text-[11px] text-[var(--color-muted)] font-mono leading-relaxed">
                  {r.reason}
                </div>
              )}
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
              onClick={() => handleSend('email')}
              disabled={emailRecipients.length === 0}
              className="text-[13px] font-medium px-4 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              Email {emailRecipients.length}
            </button>
            <button
              onClick={() => handleSend('sms')}
              disabled={recipients.length === 0}
              className="text-[13px] font-medium px-4 py-2 rounded-lg bg-[var(--color-green)] text-white border border-[var(--color-green)] hover:bg-[var(--color-green-hover)] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              Text {recipients.length}
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
            const phoneOk = !!cleanPhone(emp.phone || '');
            const emailOk = !!(emp.email && emp.email.trim());

            return (
              <div key={emp.id} className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                  style={{ backgroundColor: ROLE_COLORS[emp.role] }}
                >
                  {initials(emp.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{emp.name}</div>
                  <div className="font-mono text-[11px] text-[var(--color-muted)] truncate">{emp.email || emp.phone || 'no contact'}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Badge variant={phoneOk ? 'success' : 'warn'} title="SMS">
                    {phoneOk ? '✓ sms' : 'no sms'}
                  </Badge>
                  <Badge variant={emailOk ? 'success' : 'warn'} title="Email">
                    {emailOk ? '✓ email' : 'no email'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

function Badge({ children, variant, title }: { children: React.ReactNode; variant: 'success' | 'warn' | 'danger'; title?: string }) {
  const cls = {
    success: 'bg-[var(--color-green-light)] text-[var(--color-green)]',
    warn: 'bg-[var(--color-warn-light)] text-[var(--color-warn)]',
    danger: 'bg-[var(--color-accent-light)] text-[var(--color-accent)]',
  }[variant];
  return (
    <span title={title} className={`text-[10.5px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${cls}`}>
      {children}
    </span>
  );
}
