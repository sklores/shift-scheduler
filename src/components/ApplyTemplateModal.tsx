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
    onToast(`${result.added} shifts added · ${result.skipped} skipped`);
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
          <button onClick={onClose} className="text-[13px] font-medium px-4 py-2 rounded-lg bg-white text-[var(--color-text-2)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] transition-all">
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={templates.length === 0}
            className="text-[13px] font-medium px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            Apply to This Week
          </button>
        </>
      }
    >
      {templates.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-[var(--color-muted)] text-[13px]">
            No templates saved yet.
          </div>
          <div className="text-[12px] text-[var(--color-muted)] mt-1">
            Build a week and click &ldquo;Save Template&rdquo; to reuse it.
          </div>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-mono">Template</label>
            <select
              className="w-full border border-[var(--color-border-strong)] rounded-md px-3 py-2 text-[13px] bg-white text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none transition-colors"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.items.length} shifts)</option>
              ))}
            </select>
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
