
import React, { useState, useEffect } from 'react';
import { DailyRecord, Employee } from '../types';
import { getRecords, updateRecord, getEmployees } from '../services/storageService';
import { formatTime, normalizeDate, getDaysInMonth, getTargetMinutesForDate, calculateDailyStats } from '../utils';
import { Save, AlertCircle, Calculator, Printer, Filter, AlertTriangle, CalendarDays, Zap, Lock, Unlock, ShieldCheck, KeyRound } from 'lucide-react';
import { isToday, isBefore, startOfDay, parseISO } from 'date-fns';
import { PinModal } from './PinModal';

interface Props {
  onUpdate: (record?: DailyRecord) => void;
  employeeId: string;
}

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
    const allEmployees = getEmployees();
    setEmployee(allEmployees.find(e => e.id === employeeId) || null);
    
    // Atualiza a cada minuto para mostrar o tempo trabalhado correndo
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [employeeId]);

  const handleEditClick = (record: DailyRecord) => {
    if (!isUnlocked) {
        setIsPinModalOpen(true);
        return;
    }
    setEditingId(record.date);
    setEditForm({ ...record });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof DailyRecord) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: e.target.value });
  };

  const handleSave = () => {
    if (editForm) {
      const updatedList = updateRecord(editForm);
      setRecords(updatedList);
      setEditingId(null);
      onUpdate(editForm);
      setEditForm(null);
    }
  };

  const handlePrint = () => {
      setTimeout(() => window.print(), 100);
  };

  const shortDay = employee?.shortDayOfWeek ?? 6;
  const standardMinutes = employee?.standardDailyMinutes ?? 480;
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  
  const fullMonthRecords = daysInMonth.map(dateStr => {
      const existing = records.find(r => normalizeDate(r.date) === dateStr);
      if (existing) return existing;
      
      const target = getTargetMinutesForDate(dateStr, shortDay, standardMinutes);
      const isPast = isBefore(parseISO(dateStr), startOfDay(new Date()));
      
      const virtualRecord: DailyRecord = {
          date: dateStr,
          employeeId,
          entry: '', lunchStart: '', lunchEnd: '', snackStart: '', snackEnd: '', exit: '',
          totalMinutes: 0,
          balanceMinutes: isPast ? -target : 0
      };
      return virtualRecord;
  });

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  const getWeekDayName = (dayValue: number) => {
      const names = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      return names[dayValue];
  };

  return (
    <div className="w-full overflow-hidden bg-white rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col h-full print:shadow-none print:border-none print:h-auto print:overflow-visible print:block">
      
      <PinModal 
        isOpen={isPinModalOpen} 
        onClose={() => setIsPinModalOpen(false)} 
        onSuccess={() => { setIsUnlocked(true); setIsPinModalOpen(false); }} 
        correctPin="9999" 
        targetName="Acesso Gerente"
        isAdminOnly={true}
      />

      <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
                <Filter size={16} className="text-slate-400 ml-2" />
                <select className="bg-transparent text-xs font-black text-slate-700 p-1 outline-none uppercase tracking-tighter" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select className="bg-transparent text-xs font-black text-slate-700 p-1 outline-none border-l border-slate-100 pl-2 uppercase tracking-tighter" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
             </div>
             <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full flex items-center gap-2 border border-indigo-100 uppercase tracking-widest">
                <CalendarDays size={14} />
                <span>Dia Curto: {getWeekDayName(shortDay)}</span>
             </div>
        </div>

        <div className="flex items-center gap-3">
            <button 
                onClick={() => isUnlocked ? setIsUnlocked(false) : setIsPinModalOpen(true)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-lg active:scale-95
                    ${isUnlocked 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-slate-900 text-white border-slate-900 hover:bg-black'}
                `}
            >
                {isUnlocked ? <Unlock size={14} /> : <KeyRound size={14} />}
                {isUnlocked ? 'EDIÇÃO LIBERADA' : 'MODO GERENTE'}
            </button>
            
            <button type="button" onClick={handlePrint} className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm">
                <Printer size={16} /> Imprimir
            </button>
        </div>
      </div>

      <div id="printable-content" className="flex flex-col h-full bg-white">
        <div className="hidden print:block p-10 border-b-4 border-slate-900 mb-8">
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Relatório de Ponto - Nobel Petrópolis</h1>
            <div className="mt-4 flex gap-8">
                <p className="text-slate-600 text-sm uppercase font-bold tracking-widest">Funcionário: <span className="text-slate-900">{employee?.name || employeeId}</span></p>
                <p className="text-slate-600 text-sm uppercase font-bold tracking-widest">Competência: <span className="text-slate-900">{months[selectedMonth]} / {selectedYear}</span></p>
            </div>
        </div>
        
        <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left text-slate-600 print:text-[10px]">
            <thead className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] bg-slate-50 sticky top-0 shadow-sm z-10 print:static">
                <tr>
                <th className="px-8 py-5">Data</th>
                <th className="px-2 py-5 text-center">Entrada</th>
                <th className="px-2 py-5 text-center">Alm. Ini</th>
                <th className="px-2 py-5 text-center">Alm. Fim</th>
                <th className="px-2 py-5 text-center">Lan. Ini</th>
                <th className="px-2 py-5 text-center">Lan. Fim</th>
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
                const stats = calculateDailyStats(record, shortDay, standardMinutes);
                
                const isWorkingNow = isDayToday && record.entry && !record.exit;
                const isWeekend = getTargetMinutesForDate(record.date, shortDay, standardMinutes) === 0;
                
                // Saldo e Total calculados em tempo real na planilha também
                const displayBalance = stats.balance;
                const displayTotal = stats.total;

                return (
                    <tr key={record.date + tick} className={`
                        hover:bg-slate-50 transition-colors 
                        ${isEditing ? 'bg-brand-50/50' : ''} 
                        ${isWorkingNow ? 'bg-brand-50/20' : ''}
                        ${isWeekend ? 'bg-slate-50/30 text-slate-300' : ''}
                    `}>
                    <td className="px-8 py-4 font-medium whitespace-nowrap">
                        <div className="flex flex-col">
                            <span className="text-slate-900 font-black">{new Date(record.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                            <span className={`text-[9px] uppercase font-black tracking-widest opacity-40`}>
                                {new Date(record.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                                {isWorkingNow && <Zap size={10} className="inline ml-1 text-brand-500 animate-pulse" />}
                            </span>
                        </div>
                    </td>
                    
                    {['entry', 'lunchStart', 'lunchEnd', 'snackStart', 'snackEnd', 'exit'].map(f => (
                        <td key={f} className="px-1 py-4 text-center">
                        {isEditing ? (
                            <input type="time" value={String(editForm?.[f as keyof DailyRecord] || '')} onChange={(e) => handleInputChange(e, f as keyof DailyRecord)} className="bg-white border-2 border-brand-200 text-[11px] font-black rounded-lg p-1.5 w-20 text-center outline-none focus:ring-4 focus:ring-brand-500/10 shadow-sm" />
                        ) : (
                            <span className={`block font-mono text-[11px] font-bold ${!record[f as keyof DailyRecord] ? 'text-slate-200' : 'text-slate-600'}`}>
                                {record[f as keyof DailyRecord] || '--:--'}
                            </span>
                        )}
                        </td>
                    ))}

                    <td className={`px-6 py-4 text-right font-mono font-black text-sm ${isWorkingNow ? 'text-brand-600 animate-pulse' : 'text-slate-800'}`}>
                        {formatTime(displayTotal)}
                    </td>
                    <td className={`px-6 py-4 text-right font-mono font-black text-sm ${displayBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatTime(displayBalance)}
                    </td>
                    
                    <td className="px-8 py-4 text-center print:hidden">
                        {isEditing ? (
                        <button onClick={handleSave} className="text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl p-2.5 shadow-lg active:scale-90 transition-all"><Save size={16} /></button>
                        ) : (
                        <button 
                            onClick={() => handleEditClick(record)} 
                            className={`p-2 transition-all ${isUnlocked ? 'text-brand-600 scale-110' : 'opacity-0 pointer-events-none'}`}
                            title="Editar este registro"
                        >
                            <Edit size={16} />
                        </button>
                        )}
                    </td>
                    </tr>
                );
                })}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

const Edit = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121(0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
);
