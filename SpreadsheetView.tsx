
import React, { useState, useEffect } from 'react';
import { DailyRecord, Employee } from '../types';
import { getRecords, updateRecord, getEmployees } from '../services/storageService';
import { formatTime, normalizeDate, getDaysInMonth, getTargetMinutesForDate, calculateDailyStats } from '../utils';
import { Save, Printer, Filter, CalendarDays, Zap, Unlock, KeyRound } from 'lucide-react';
import { isToday, isBefore, startOfDay, parseISO } from 'date-fns';
import { PinModal } from './PinModal';

interface Props {
  // Fix: Modified return type and made parameter required to match handleRecordUpdate in App.tsx
  onUpdate: (record: DailyRecord) => void | Promise<void>;
  employeeId: string;
}

// Fix: Added React.FC typing to resolve "key does not exist on type Props" (Error in App.tsx line 311)
export const SpreadsheetView: React.FC<Props> = ({ onUpdate, employeeId }) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DailyRecord | null>(null);
  const [tick, setTick] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    setRecords(getRecords(employeeId));
    setEmployee(getEmployees().find(e => e.id === employeeId) || null);
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
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
      return { date: dateStr, employeeId, entry: '', lunchStart: '', lunchEnd: '', exit: '', totalMinutes: 0, balanceMinutes: isPast ? -target : 0 };
  });

  return (
    <div className="w-full overflow-hidden bg-white rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col h-full print:shadow-none">
      <PinModal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} onSuccess={() => { setIsUnlocked(true); setIsPinModalOpen(false); }} correctPin="9999" targetName="Acesso Gerente" isAdminOnly={true} />
      <div className="p-6 border-b bg-slate-50 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white border rounded-2xl p-2 shadow-sm">
                <Filter size={16} className="text-slate-400 ml-2" />
                <select className="bg-transparent text-xs font-black p-1 outline-none uppercase" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                    {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
             </div>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => isUnlocked ? setIsUnlocked(false) : setIsPinModalOpen(true)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all border shadow-lg ${isUnlocked ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
                {isUnlocked ? <Unlock size={14} /> : <KeyRound size={14} />} {isUnlocked ? 'EDIÇÃO LIBERADA' : 'MODO GERENTE'}
            </button>
            <button onClick={() => window.print()} className="bg-white text-slate-700 border px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-sm">Imprimir</button>
        </div>
      </div>
      <div id="printable-content" className="overflow-x-auto">
        <table className="w-full text-sm text-left print:text-[10px]">
        <thead className="text-[10px] text-slate-400 uppercase font-black bg-slate-50 sticky top-0">
            <tr>
            <th className="px-8 py-5">Data</th>
            <th className="px-2 py-5 text-center">Entrada</th>
            <th className="px-2 py-5 text-center">Alm. Ini</th>
            <th className="px-2 py-5 text-center">Alm. Fim</th>
            <th className="px-2 py-5 text-center">Saída</th>
            <th className="px-6 py-5 text-right">Trabalhado</th>
            <th className="px-6 py-5 text-right">Saldo</th>
            <th className={`px-8 py-5 text-center print:hidden ${!isUnlocked ? 'opacity-0' : ''}`}>Ação</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
            {fullMonthRecords.map((record) => {
            const isEditing = editingId === record.date;
            const isDayToday = isToday(parseISO(record.date));
            const stats = calculateDailyStats(record as any, employee?.shortDayOfWeek ?? 6, employee?.standardDailyMinutes ?? 480);
            return (
                <tr key={record.date + tick} className={`hover:bg-slate-50 ${isEditing ? 'bg-brand-50/50' : ''}`}>
                <td className="px-8 py-4 font-medium"><div className="flex flex-col"><span className="text-slate-900 font-black">{new Date(record.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span><span className="text-[9px] uppercase font-black opacity-40">{new Date(record.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}</span></div></td>
                {['entry', 'lunchStart', 'lunchEnd', 'exit'].map(f => (
                    <td key={f} className="px-1 py-4 text-center">
                    {isEditing ? <input type="time" value={String((editForm as any)?.[f] || '')} onChange={(e) => setEditForm({ ...editForm!, [f]: e.target.value })} className="bg-white border-2 border-brand-200 text-[11px] font-black rounded-lg p-1.5 w-20 text-center" /> : <span className={`block font-mono text-[11px] font-bold ${!(record as any)[f] ? 'text-slate-200' : 'text-slate-600'}`}>{(record as any)[f] || '--:--'}</span>}
                    </td>
                ))}
                <td className="px-6 py-4 text-right font-mono font-black text-sm">{formatTime(stats.total)}</td>
                <td className={`px-6 py-4 text-right font-mono font-black text-sm ${stats.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatTime(stats.balance)}</td>
                <td className="px-8 py-4 text-center print:hidden">{isEditing ? <button onClick={handleSave} className="text-white bg-emerald-600 rounded-xl p-2.5 shadow-lg"><Save size={16} /></button> : <button onClick={() => handleEditClick(record as any)} className={`p-2 transition-all ${isUnlocked ? 'text-brand-600 scale-110' : 'opacity-0 pointer-events-none'}`}><Edit size={16} /></button>}</td>
                </tr>
            );
            })}
        </tbody>
        </table>
      </div>
    </div>
  );
};
const Edit = ({ size, className }: any) => (<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>);
