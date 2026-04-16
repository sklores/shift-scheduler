'use client';

import { useState, useCallback } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { useToast } from '@/lib/hooks/useToast';
import Header from './Header';
import Toolbar from './Toolbar';
import ScheduleGrid from './ScheduleGrid';
import StaffDrawer from './StaffDrawer';
import ShiftModal from './ShiftModal';
import PublishModal from './PublishModal';
import SaveTemplateModal from './SaveTemplateModal';
import ApplyTemplateModal from './ApplyTemplateModal';
import Toast from './Toast';

export default function Scheduler() {
  const { isLoading, clearWeek, shifts, deleteShift } = useSchedulerContext();
  const toast = useToast();

  // Drawer
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  // Shift modal
  const [isShiftModalOpen, setShiftModalOpen] = useState(false);
  const [editShiftId, setEditShiftId] = useState<string | null>(null);
  const [prefillEmpId, setPrefillEmpId] = useState<string | null>(null);
  const [prefillDay, setPrefillDay] = useState<number | null>(null);

  // Other modals
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
    await deleteShift(shiftId);
    toast.show('Shift deleted');
  }, [deleteShift, toast]);

  const handleClearWeek = useCallback(async () => {
    if (!shifts.length || !confirm('Clear all shifts for this week?')) return;
    await clearWeek();
    toast.show('Week cleared');
  }, [shifts.length, clearWeek, toast]);

  const handlePublish = useCallback(() => {
    if (!shifts.length) {
      alert('No shifts scheduled yet.');
      return;
    }
    setPublishOpen(true);
  }, [shifts.length]);

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

      <Toast message={toast.message} />
    </>
  );
}
