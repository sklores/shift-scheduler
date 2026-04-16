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
      alert('No shifts to save as template.');
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
          <button onClick={onClose} className="text-[13px] font-medium px-3.5 py-[7px] rounded-md bg-transparent text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-all">
            Cancel
          </button>
          <button onClick={handleSave} className="text-[13px] font-medium px-3.5 py-[7px] rounded-md bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[#b03f25] transition-all">
            Save Template
          </button>
        </>
      }
    >
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1 font-mono">Template Name</label>
        <input
          type="text"
          className="w-full border border-[var(--color-border)] rounded px-2.5 py-[7px] text-[13px] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
          placeholder="Standard Week"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          autoFocus
        />
      </div>
    </Modal>
  );
}
