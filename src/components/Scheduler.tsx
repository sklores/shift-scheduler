'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import Header from './Header';
import Toolbar from './Toolbar';
import ScheduleGrid from './ScheduleGrid';
import StaffDrawer from './StaffDrawer';
import ShiftModal from './ShiftModal';
import PublishModal from './PublishModal';
import SaveTemplateModal from './SaveTemplateModal';
import ApplyTemplateModal from './ApplyTemplateModal';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';
import CheatSheet from './CheatSheet';

export default function Scheduler() {
  const { isLoading, clearWeek, shifts, deleteShift, copyWeek, pasteWeek } = useSchedulerContext();
  const toast = useToast();
  const confirm = useConfirm();

  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const [isShiftModalOpen, setShiftModalOpen] = useState(false);
  const [editShiftId, setEditShiftId] = useState<string | null>(null);
  const [prefillEmpId, setPrefillEmpId] = useState<string | null>(null);
  const [prefillDay, setPrefillDay] = useState<number | null>(null);
  // Bump this every time we open the shift modal so React remounts it with
  // fresh lazy-init state — prevents state-reset timing bugs when user hits
  // Enter rapidly after opening.
  const [shiftModalKey, setShiftModalKey] = useState(0);

  const [isPublishOpen, setPublishOpen] = useState(false);
  const [isSaveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [isApplyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [isCheatSheetOpen, setCheatSheetOpen] = useState(false);

  const handleAddShift = useCallback((empId: string | null = null, day: number | null = null) => {
    setEditShiftId(null);
    setPrefillEmpId(empId);
    setPrefillDay(day);
    setShiftModalKey(k => k + 1);
    setShiftModalOpen(true);
  }, []);

  const handleEditShift = useCallback((shiftId: string) => {
    setEditShiftId(shiftId);
    setPrefillEmpId(null);
    setPrefillDay(null);
    setShiftModalKey(k => k + 1);
    setShiftModalOpen(true);
  }, []);

  const handleDeleteShift = useCallback(async (shiftId: string) => {
    const ok = await confirm.ask({
      title: 'Delete this shift?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await deleteShift(shiftId);
    toast.show('Shift deleted');
  }, [deleteShift, toast, confirm]);

  const handleClearWeek = useCallback(async () => {
    if (!shifts.length) {
      toast.show('No shifts to clear');
      return;
    }
    const ok = await confirm.ask({
      title: 'Clear all shifts?',
      message: `This will remove all ${shifts.length} shifts from this week. You'll need to rebuild the schedule.`,
      confirmLabel: 'Clear Week',
      destructive: true,
    });
    if (!ok) return;
    await clearWeek();
    toast.show('Week cleared');
  }, [shifts.length, clearWeek, toast, confirm]);

  const handlePublish = useCallback(() => {
    if (!shifts.length) {
      toast.show('No shifts scheduled yet');
      return;
    }
    setPublishOpen(true);
  }, [shifts.length, toast]);

  const handleCopyWeek = useCallback(() => {
    const r = copyWeek();
    if (r.copied === 0) {
      toast.show('Nothing to copy');
    } else {
      toast.show(`Copied ${r.copied} shift${r.copied !== 1 ? 's' : ''}`);
    }
  }, [copyWeek, toast]);

  const handlePasteWeek = useCallback(async () => {
    const r = await pasteWeek();
    if (r.added === 0 && r.skipped === 0) {
      toast.show('Nothing to paste');
    } else if (r.added === 0) {
      toast.show(`All ${r.skipped} shift${r.skipped !== 1 ? 's' : ''} already exist`);
    } else {
      const parts = [`${r.added} added`];
      if (r.skipped > 0) parts.push(`${r.skipped} skipped`);
      toast.show(`Pasted · ${parts.join(' · ')}`);
    }
  }, [pasteWeek, toast]);

  // App-level keyboard shortcuts (cheat sheet, drawer, publish)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      // Cheat sheet: ? key (Shift+/ on most layouts)
      if (e.key === '?' && !document.querySelector('[data-overlay]')) {
        e.preventDefault();
        setCheatSheetOpen(true);
        return;
      }
      // Cmd/Ctrl + Shift + S → Staff drawer
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setDrawerOpen(d => !d);
        return;
      }
      // Cmd/Ctrl + Shift + P → Publish
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (shifts.length) setPublishOpen(true);
        else toast.show('No shifts scheduled yet');
        return;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shifts.length, toast]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="font-mono text-sm text-[var(--color-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Header
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenPublish={handlePublish}
      />
      <Toolbar
        onAddShift={() => handleAddShift()}
        onClearWeek={handleClearWeek}
        onSaveTemplate={() => setSaveTemplateOpen(true)}
        onApplyTemplate={() => setApplyTemplateOpen(true)}
        onCopyWeek={handleCopyWeek}
        onPasteWeek={handlePasteWeek}
      />
      <div className="flex-1 flex overflow-hidden">
        <ScheduleGrid
          onAddShift={handleAddShift}
          onEditShift={handleEditShift}
          onDeleteShift={handleDeleteShift}
        />
      </div>

      <StaffDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        onToast={toast.show}
        onConfirm={confirm.ask}
      />
      <ShiftModal
        key={shiftModalKey}
        isOpen={isShiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        editShiftId={editShiftId}
        prefillEmpId={prefillEmpId}
        prefillDay={prefillDay}
        onToast={toast.show}
      />
      <PublishModal
        isOpen={isPublishOpen}
        onClose={() => setPublishOpen(false)}
        onToast={toast.show}
      />
      <SaveTemplateModal
        isOpen={isSaveTemplateOpen}
        onClose={() => setSaveTemplateOpen(false)}
        onToast={toast.show}
      />
      <ApplyTemplateModal
        isOpen={isApplyTemplateOpen}
        onClose={() => setApplyTemplateOpen(false)}
        onToast={toast.show}
      />

      <ConfirmDialog
        isOpen={confirm.isOpen}
        options={confirm.options}
        onConfirm={confirm.handleConfirm}
        onCancel={confirm.handleCancel}
      />
      <CheatSheet isOpen={isCheatSheetOpen} onClose={() => setCheatSheetOpen(false)} />
      <Toast message={toast.message} />
    </>
  );
}
