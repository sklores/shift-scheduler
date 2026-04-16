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
    // Stubbed: simulate sending with 1s delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockResults: SendResult[] = recipients.map(r => ({
      name: r.emp.name,
      to: r.to,
      status: 'sent' as const,
    }));
    setResults(mockResults);
    setPhase('results');
    const sentCount = mockResults.filter(r => r.status === 'sent').length;
    onToast(`Sent ${sentCount} / Failed 0`);
  };

  if (phase === 'results') {
    const sentCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.length - sentCount;

    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={failedCount === 0 ? '&#10003; Schedule Sent!' : 'Send Results'} headerClassName="bg-[var(--color-green)] text-white" width="max-w-lg"
        footer={
          <button onClick={handleClose} className="text-[13px] font-medium px-3.5 py-[7px] rounded-md bg-transparent text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-all">
            Close
          </button>
        }
      >
        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-2.5">
          Sent {sentCount} / Failed {failedCount}
        </div>
        <div className="space-y-0">
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2.5 py-2 border-b border-[var(--color-border)] last:border-b-0">
              <div className="flex-1 text-[13px] font-medium">{r.name}</div>
              <div className="font-mono text-[11px] text-[var(--color-muted)]">{r.to}</div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                r.status === 'sent' ? 'bg-[var(--color-green-light)] text-[var(--color-green)]' : 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
              }`}>
                {r.status === 'sent' ? '&#10003; sent' : '&#10007; failed'}
              </span>
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
      headerClassName="bg-[var(--color-green)] text-white"
      width="max-w-lg"
      footer={
        phase === 'sending' ? (
          <div className="flex items-center gap-2 text-[var(--color-muted)] text-xs font-mono">
            <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-[var(--color-green)] rounded-full animate-spin" />
            Sending...
          </div>
        ) : (
          <>
            <button onClick={handleClose} className="text-[13px] font-medium px-3.5 py-[7px] rounded-md bg-transparent text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-all">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={recipients.length === 0}
              className="text-[13px] font-medium px-3.5 py-[7px] rounded-md bg-[var(--color-green)] text-white border border-[var(--color-green)] hover:bg-[#224a1e] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send {recipients.length} Text{recipients.length !== 1 ? 's' : ''}
            </button>
          </>
        )
      }
    >
      {(missingPhone.length > 0 || invalidPhone.length > 0) && (
        <div className="mb-4 px-3.5 py-2.5 bg-[#fff3e0] border border-[#f5c97a] rounded text-xs text-[#7a4a00]">
          &#9888; {[
            missingPhone.length > 0 ? `${missingPhone.length} missing phone` : '',
            invalidPhone.length > 0 ? `${invalidPhone.length} invalid phone format` : '',
          ].filter(Boolean).join(' · ')} — these employees will be skipped.
        </div>
      )}

      {/* Sample message */}
      <div className="mb-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-2">Sample message preview</div>
        <div className="font-mono text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-3 py-2.5 text-[var(--color-text)] leading-relaxed whitespace-pre-wrap max-h-[120px] overflow-y-auto">
          {sampleMsg || '—'}
        </div>
      </div>

      {/* Recipients */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-2.5">
          Recipients ({scheduledEmps.length} scheduled this week)
        </div>
        {scheduledEmps.map(emp => {
          const formatted = cleanPhone(emp.phone || '');
          const ok = !!formatted;
          const status = !emp.phone || !emp.phone.trim() ? 'no phone' : ok ? 'will receive SMS' : 'invalid phone';

          return (
            <div key={emp.id} className="flex items-center gap-2.5 py-2 border-b border-[var(--color-border)] last:border-b-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: emp.color }}
              >
                {initials(emp.name)}
              </div>
              <div className="flex-1 text-[13px] font-medium">{emp.name}</div>
              <div className="font-mono text-xs text-[var(--color-muted)]">{emp.phone || '—'}</div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                ok ? 'bg-[var(--color-green-light)] text-[var(--color-green)]' : 'bg-[#fff3e0] text-[#b45a00]'
              }`}>
                {status}
              </span>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
