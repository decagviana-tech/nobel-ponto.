
import React, { useState, useEffect } from 'react';
import { DailyRecord, Employee } from './types.ts';
import { getRecords, updateRecord, getEmployees } from './storageService.ts';
import { formatTime, normalizeDate, getDaysInMonth, getTargetMinutesForDate, calculateDailyStats } from './utils.ts';
import { Save, Filter, Unlock, KeyRound, Edit, X } from 'lucide-react';
import { isBefore, startOfDay, parseISO } from 'date-fns';
import { PinModal } from './PinModal.tsx';

interface Props {
  onUpdate: (record: DailyRecord) => void | Promise<void>;
  employeeId: string;
}

export const SpreadsheetView: React.FC<Props> = ({ onUpdate, employeeId }) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DailyRecord | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    setRecords(getRecords(employeeId));
    setEmployee(getEmployees().find(e => String(e.id) === String(employeeId)) || null);
  }, [employeeId]);

  const handleEditClick = (record: DailyRecord) => {
    if (!isUnlocked) { setIsPinModalOpen(true); return; }
    setEditingId(record.date);
    setEditForm({ ...record });
  };

  const handleSave = () => {
    if (editForm) {
      setRecords(updateRecord(editForm));
      setEditingId(null);
      onUpdate(editForm);
      setEditForm(null);
    }
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const fullMonthRecords = daysInMonth.map(dateStr => {
      const existing = records.find(r => normalizeDate(r.date) === dateStr);
      if (existing) return existing;
      const target = getTargetMinutesForDate(dateStr, employee?.shortDayOfWeek ?? 6, employee?.standardDailyMinutes ?? 480);
      const isPast = isBefore(parseISO(dateStr), startOfDay(new Date()));
      return { 
          date: dateStr, 
          employeeId, 
          entry: '', 
          lunchStart: '', 
          lunchEnd: '', 
          snackStart: '', 
          snackEnd: '', 
          exit: '', 
          totalMinutes: 0, 
          balanceMinutes: isPast ? -target : 0 
      };
  });

  return (
    <div className="w-full overflow-hidden bg-white rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col h-full">
      <PinModal 
        isOpen={isPinModalOpen} 
        onClose={() => setIsPinModalOpen(false)} 
        onSuccess={() => { setIsUnlocked(true); setIsPinModalOpen(false); }} 
        correctPin="9999" 
        targetName="Acesso Gerente" 
        isAdminOnly={true} 
      />
      
      <div className="p-6 border-b bg-slate-50 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-2 bg-white border rounded-2xl p-2 shadow-sm">
            <Filter size={16} className="text-slate-400 ml-2" />
            <select className="bg-transparent text-xs font-black p-1 outline-none uppercase" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                ))}
            </select>
        </div>
        <button onClick={() => isUnlocked ? setIsUnlocked(false) : setIsPinModalOpen(true)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase border shadow-lg ${isUnlocked ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
            {isUnlocked ? <Unlock size={14} /> : <KeyRound size={14} />} 
            {isUnlocked ? 'EDIÇÃO LIBERADA' : 'MODO GERENTE'}
        </button>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left">
          <thead className="text-[9px] text-slate-400 uppercase font-black bg-slate-50 sticky top-0 z-20">
              <tr>
                <th className="px-6 py-5">Data</th>
                <th className="px-1 py-5 text-center">Ent</th>
                <th className="px-1 py-5 text-center">Alm</th>
                <th className="px-1 py-5 text-center">Lan</th>
                <th className="px-1 py-5 text-center">Sai</th>
                <th className="px-4 py-5 text-right">Trab</th>
                <th className="px-4 py-5 text-right">Saldo</th>
                <th className={`px-6 py-5 text-center ${!isUnlocked ? 'opacity-0' : ''}`}>Ação</th>
              </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
              {fullMonthRecords.map((record) => {
                const isEditing = editingId === record.date;
                const stats = calculateDailyStats(record as any, employee?.shortDayOfWeek ?? 6, employee?.standardDailyMinutes ?? 480);
                return (
                    <tr key={record.date} className={`hover:bg-slate-50/50 ${isEditing ? 'bg-brand-50/50' : ''}`}>
                      <td className="px-6 py-4 font-medium">
                        <div className="flex flex-col">
                          <span className="text-slate-900 font-black">{new Date(record.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                          <span className="text-[9px] uppercase font-black opacity-40">{new Date(record.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                        </div>
                      </td>
                      <td className="px-1 py-4 text-center">{isEditing ? <input type="time" value={String((editForm as any)?.entry || '')} onChange={(e) => setEditForm({ ...editForm!, entry: e.target.value })} className="bg-white border rounded p-1 w-16 text-[10px]" /> : <span className="font-mono text-[10px] font-bold text-slate-600">{record.entry || '--:--'}</span>}</td>
                      <td className="px-1 py-4 text-center"><span className="font-mono text-[10px] font-bold text-slate-400">{record.lunchStart || '--'} a {record.lunchEnd || '--'}</span></td>
                      <td className="px-1 py-4 text-center"><span className="font-mono text-[10px] font-bold text-slate-400">{record.snackStart || '--'} a {record.snackEnd || '--'}</span></td>
                      <td className="px-1 py-4 text-center">{isEditing ? <input type="time" value={String((editForm as any)?.exit || '')} onChange={(e) => setEditForm({ ...editForm!, exit: e.target.value })} className="bg-white border rounded p-1 w-16 text-[10px]" /> : <span className="font-mono text-[10px] font-bold text-slate-600">{record.exit || '--:--'}</span>}</td>
                      <td className="px-4 py-4 text-right font-mono font-black text-xs">{formatTime(stats.total)}</td>
                      <td className={`px-4 py-4 text-right font-mono font-black text-xs ${stats.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatTime(stats.balance)}</td>
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                            <button onClick={handleSave} className="text-emerald-600"><Save size={16} /></button>
                        ) : (
                            <button onClick={() => handleEditClick(record as any)} className={`${isUnlocked ? 'text-brand-600' : 'opacity-0'}`}><Edit size={14} /></button>
                        )}
                      </td>
                    </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
