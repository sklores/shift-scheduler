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
  const { templates, applyTemplate } = useSchedulerContext();
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (isOpen && templates.length > 0) {
      setSelectedId(templates[0].id);
    }
  }, [isOpen, templates]);

  const handleApply = async () => {
    if (!selectedId) return;
    const result = await applyTemplate(selectedId);
    onToast(`Applied: ${result.added} shifts added, ${result.skipped} skipped`);
    onClose();
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
          <button onClick={onClose} className="text-[13px] font-medium px-3.5 py-[7px] rounded-md bg-transparent text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-all">
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={templates.length === 0}
            className="text-[13px] font-medium px-3.5 py-[7px] rounded-md bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[#b03f25] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </>
      }
    >
      {templates.length === 0 ? (
        <div className="text-[var(--color-muted)] text-xs font-mono text-center py-4">
          No templates saved yet. Save a template first.
        </div>
      ) : (
        <>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1 font-mono">Template</label>
            <select
              className="w-full border border-[var(--color-border)] rounded px-2.5 py-[7px] text-[13px] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.items.length} shifts)</option>
              ))}
            </select>
          </div>
          {selected && (
            <div className="mt-2.5 text-xs text-[var(--color-muted)]">
              This will add {selected.items.length} shift{selected.items.length !== 1 ? 's' : ''} to the current week. Existing shifts won&apos;t be removed. Duplicates will be skipped.
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
