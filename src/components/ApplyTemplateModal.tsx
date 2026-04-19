'use client';

import { useState, useEffect } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import Modal from './Modal';

interface ApplyTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export default function ApplyTemplateModal({ isOpen, onClose, onToast }: ApplyTemplateModalProps) {
  const { templates, applyTemplate, deleteTemplate } = useSchedulerContext();
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (isOpen && templates.length > 0) {
      setSelectedId(prev => templates.find(t => t.id === prev) ? prev : templates[0].id);
    }
  }, [isOpen, templates]);

  const handleApply = async () => {
    if (!selectedId) return;
    const result = await applyTemplate(selectedId);
    onToast(`${result.added} shifts added · ${result.skipped} skipped`);
    onClose();
  };

  const handleDelete = async (id: string, name: string) => {
    await deleteTemplate(id);
    onToast(`"${name}" deleted`);
    if (selectedId === id) setSelectedId(templates.find(t => t.id !== id)?.id ?? '');
  };

  const selected = templates.find(t => t.id === selectedId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply Template"
      width="max-w-sm"
      footer={
        <>
          <button onClick={onClose} className="text-[13px] font-medium px-4 py-2 rounded-lg bg-white text-[var(--color-text-2)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] transition-all">
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedId || templates.length === 0}
            className="text-[13px] font-medium px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            Apply to This Week
          </button>
        </>
      }
    >
      {templates.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-[var(--color-muted)] text-[13px]">No templates saved yet.</div>
          <div className="text-[12px] text-[var(--color-muted)] mt-1">Build a week and click &ldquo;Save Template&rdquo; to reuse it.</div>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {templates.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  selectedId === t.id
                    ? 'bg-[var(--color-accent-subtle)] border border-[var(--color-accent)]/30'
                    : 'hover:bg-[var(--color-surface-2)] border border-transparent'
                }`}
              >
                {/* Radio dot */}
                <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-colors ${
                  selectedId === t.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                    : 'border-[var(--color-border-strong)]'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate text-[var(--color-text)]">{t.name}</div>
                  <div className="text-[11px] text-[var(--color-muted)] font-mono">{t.items.length} shift{t.items.length !== 1 ? 's' : ''}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(t.id, t.name); }}
                  className="w-6 h-6 flex items-center justify-center rounded text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-all flex-shrink-0"
                  aria-label="Delete template"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 3h8M5 3V2h2v1M4.5 3v6.5M7.5 3v6.5M3 3l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {selected && (
            <div className="mt-3 p-3 bg-[var(--color-surface-2)] rounded-md text-[12px] text-[var(--color-text-2)] leading-relaxed">
              Adds {selected.items.length} shift{selected.items.length !== 1 ? 's' : ''} to this week. Existing shifts are kept; duplicates are skipped.
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
