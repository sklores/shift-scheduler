'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import Header, { type ViewMode } from './Header';
import Toolbar from './Toolbar';
import ScheduleGrid from './ScheduleGrid';
import MonthView from './MonthView';
import StaffDrawer from './StaffDrawer';
import ShiftModal from './ShiftModal';
import PublishModal from './PublishModal';
import SaveTemplateModal from './SaveTemplateModal';
import ApplyTemplateModal from './ApplyTemplateModal';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';
import CheatSheet from './CheatSheet';
import LaborBreakdownBar from './LaborBreakdownBar';
import MigrationBanner from './MigrationBanner';
import { useAuth } from '@/context/AuthContext';

export interface ToastTipsData {
  total: number;
  byDay: Record<string, number>;
  fetchedAt: string;
}

export default function Scheduler() {
  const { isLoading, clearWeek, currentWeekShifts, deleteShift, copyWeek, pasteWeek, weekStart, jumpToWeek } = useSchedulerContext();
  const { isOwner } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const [isShiftModalOpen, setShiftModalOpen] = useState(false);
  const [editShiftId, setEditShiftId] = useState<string | null>(null);
  const [prefillEmpId, setPrefillEmpId] = useState<string | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const [shiftModalKey, setShiftModalKey] = useState(0);

  const [isPublishOpen, setPublishOpen] = useState(false);
  const [isSaveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [isApplyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [isCheatSheetOpen, setCheatSheetOpen] = useState(false);

  // Toast tips — fetched once here, shared to both grid and breakdown bar
  const [toastTips, setToastTips] = useState<ToastTipsData | null>(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState<string | null>(null);

  const fetchTips = useCallback(async () => {
    if (!weekStart) return;
    setTipsLoading(true);
    setTipsError(null);
    try {
      const res = await fetch(`/api/toast-tips?week=${weekStart}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tips');
      setToastTips(data as ToastTipsData);
    } catch (err) {
      setTipsError((err as Error).message);
    } finally {
      setTipsLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { fetchTips(); }, [fetchTips]);

  // Auto-refresh every 10 min
  useEffect(() => {
    const id = setInterval(fetchTips, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchTips]);

  const handleAddShift = useCallback((empId: string | null = null, date: string | null = null) => {
    setEditShiftId(null);
    setPrefillEmpId(empId);
    setPrefillDate(date);
    setShiftModalKey(k => k + 1);
    setShiftModalOpen(true);
  }, []);

  const handleEditShift = useCallback((shiftId: string) => {
    setEditShiftId(shiftId);
    setPrefillEmpId(null);
    setPrefillDate(null);
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
    if (!currentWeekShifts.length) {
      toast.show('No shifts this week to clear');
      return;
    }
    const ok = await confirm.ask({
      title: 'Clear this week?',
      message: `This will remove all ${currentWeekShifts.length} shifts from the currently displayed week.`,
      confirmLabel: 'Clear Week',
      destructive: true,
    });
    if (!ok) return;
    await clearWeek();
    toast.show('Week cleared');
  }, [currentWeekShifts.length, clearWeek, toast, confirm]);

  const handlePublish = useCallback(() => {
    if (!currentWeekShifts.length) {
      toast.show('No shifts this week to publish');
      return;
    }
    setPublishOpen(true);
  }, [currentWeekShifts.length, toast]);

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

  // App-level keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      if (e.key === '?' && !document.querySelector('[data-overlay]')) {
        e.preventDefault();
        setCheatSheetOpen(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setDrawerOpen(d => !d);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (currentWeekShifts.length) setPublishOpen(true);
        else toast.show('No shifts this week to publish');
        return;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [currentWeekShifts.length, toast]);

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
        viewMode={viewMode}
        onSetViewMode={setViewMode}
      />
      <MigrationBanner />
      {viewMode === 'week' ? (
        <>
          <Toolbar
            onAddShift={() => handleAddShift()}
            onClearWeek={handleClearWeek}
            onSaveTemplate={() => setSaveTemplateOpen(true)}
            onApplyTemplate={() => setApplyTemplateOpen(true)}
            onCopyWeek={handleCopyWeek}
            onPasteWeek={handlePasteWeek}
            onToast={toast.show}
          />
          <div className="flex-1 flex overflow-hidden">
            <ScheduleGrid
              onAddShift={handleAddShift}
              onEditShift={handleEditShift}
              onDeleteShift={handleDeleteShift}
              toastTips={toastTips}
              tipsLoading={tipsLoading}
            />
          </div>
        </>
      ) : (
        <MonthView
          onJumpToWeek={(offset) => { jumpToWeek(offset); setViewMode('week'); }}
        />
      )}
      {isOwner && viewMode === 'week' && (
        <LaborBreakdownBar
          toastTips={toastTips}
          tipsLoading={tipsLoading}
          tipsError={tipsError}
          onRefreshTips={fetchTips}
        />
      )}

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
        prefillDate={prefillDate}
        onToast={toast.show}
        onDelete={handleDeleteShift}
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
