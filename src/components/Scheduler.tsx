'use client';

import { useState, useCallback } from 'react';
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

export default function Scheduler() {
  const { isLoading, clearWeek, shifts, deleteShift } = useSchedulerContext();
  const toast = useToast();
  const confirm = useConfirm();

  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const [isShiftModalOpen, setShiftModalOpen] = useState(false);
  const [editShiftId, setEditShiftId] = useState<string | null>(null);
  const [prefillEmpId, setPrefillEmpId] = useState<string | null>(null);
  const [prefillDay, setPrefillDay] = useState<number | null>(null);

  const [isPublishOpen, setPublishOpen] = useState(false);
  const [isSaveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [isApplyTemplateOpen, setApplyTemplateOpen] = useState(false);

  const handleAddShift = useCallback((empId: string | null = null, day: number | null = null) => {
    setEditShiftId(null);
    setPrefillEmpId(empId);
    setPrefillDay(day);
    setShiftModalOpen(true);
  }, []);

  const handleEditShift = useCallback((shiftId: string) => {
    setEditShiftId(shiftId);
    setPrefillEmpId(null);
    setPrefillDay(null);
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
      <Toast message={toast.message} />
    </>
  );
}
