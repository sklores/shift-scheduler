'use client';

import { useState, useEffect } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import Modal from './Modal';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export default function SaveTemplateModal({ isOpen, onClose, onToast }: SaveTemplateModalProps) {
  const { shifts, saveTemplate } = useSchedulerContext();
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) setName('');
  }, [isOpen]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (shifts.length === 0) {
      onToast('No shifts to save as template');
      return;
    }
    await saveTemplate(trimmed);
    onToast('Template saved');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save Template"
      width="max-w-sm"
      footer={
        <>
          <button onClick={onClose} className="text-[13px] font-medium px-4 py-2 rounded-lg bg-white text-[var(--color-text-2)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg)] transition-all">
            Cancel
          </button>
          <button onClick={handleSave} className="text-[13px] font-medium px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-all shadow-sm">
            Save Template
          </button>
        </>
      }
    >
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-mono">Template Name</label>
        <input
          type="text"
          className="w-full border border-[var(--color-border-strong)] rounded-md px-3 py-2 text-[13px] bg-white text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none transition-colors"
          placeholder="e.g. Standard Week, Holiday Schedule"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          autoFocus
        />
        <div className="mt-2.5 text-[12px] text-[var(--color-muted)]">
          Saves the current week&apos;s {shifts.length} shift{shifts.length !== 1 ? 's' : ''} as a reusable template.
        </div>
      </div>
    </Modal>
  );
}
