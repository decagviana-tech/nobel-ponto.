
import React, { useState, useEffect } from 'react';
import { DailyRecord, Employee } from '../types';
import { getRecords, updateRecord, getEmployees } from '../services/storageService';
import { formatTime, normalizeDate, getDaysInMonth, getTargetMinutesForDate, calculateDailyStats } from '../utils';
import { Save, AlertCircle, Calculator, Printer, Filter, AlertTriangle, CalendarDays } from 'lucide-react';

interface Props {
  onUpdate: (record?: DailyRecord) => void;
  employeeId: string;
}

export const SpreadsheetView: React.FC<Props> = ({ onUpdate, employeeId }) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DailyRecord | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    setRecords(getRecords(employeeId));
    const allEmployees = getEmployees();
    setEmployee(allEmployees.find(e => e.id === employeeId) || null);
  }, [employeeId]);

  const handleEditClick = (record: DailyRecord) => {
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
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  
  const fullMonthRecords = daysInMonth.map(dateStr => {
      const existing = records.find(r => normalizeDate(r.date) === dateStr);
      if (existing) return existing;
      
      const virtualRecord: DailyRecord = {
          date: dateStr,
          employeeId,
          entry: '', lunchStart: '', lunchEnd: '', snackStart: '', snackEnd: '', exit: '',
          totalMinutes: 0,
          balanceMinutes: -getTargetMinutesForDate(dateStr, shortDay)
      };
      return virtualRecord;
  });

  const totalWorkedAll = fullMonthRecords.reduce((acc, r) => acc + (r.totalMinutes || 0), 0);
  const totalBalanceAll = fullMonthRecords.reduce((acc, r) => acc + (r.balanceMinutes || 0), 0);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  const isEntryIncomplete = (r: DailyRecord) => {
      const hasAny = r.entry || r.lunchStart || r.lunchEnd || r.snackStart || r.snackEnd || r.exit;
      if (!hasAny) return false;
      if (r.entry && !r.exit) return true;
      if (r.lunchStart && !r.lunchEnd) return true;
      return false;
  };

  const getWeekDayName = (dayValue: number) => {
      const names = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      return names[dayValue];
  };

  return (
    <div className="w-full overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full print:shadow-none print:border-none print:h-auto print:overflow-visible print:block">
      
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <Filter size={16} className="text-slate-400 ml-2" />
                <select className="bg-transparent text-sm font-medium text-slate-700 p-1 outline-none" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select className="bg-transparent text-sm font-medium text-slate-700 p-1 outline-none border-l border-slate-100 pl-2" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
             </div>
             <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full flex items-center gap-2 border border-indigo-100">
                <CalendarDays size={14} />
                <span>Dia Curto (4h): {getWeekDayName(shortDay)}</span>
             </div>
        </div>

        <div className="flex items-center gap-3">
            <button type="button" onClick={handlePrint} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors">
                <Printer size={16} /> Imprimir Relatório
            </button>
        </div>
      </div>

      <div id="printable-content" className="flex flex-col h-full">
        <div className="hidden print:block p-6 border-b border-slate-200 mb-4">
            <h1 className="text-2xl font-bold text-slate-800">Relatório de Ponto - Nobel Petrópolis</h1>
            <p className="text-slate-600">Funcionário: <span className="font-bold">{employee?.name || employeeId}</span> | Competência: <span className="font-bold uppercase">{months[selectedMonth]} / {selectedYear}</span></p>
            <p className="text-xs text-slate-400 mt-1 uppercase">Regime: Semana Inglesa | Dia de 4h: {getWeekDayName(shortDay)}</p>
        </div>
        
        <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left text-slate-600 print:text-[10px]">
            <thead className="text-[10px] text-slate-700 uppercase bg-slate-100 sticky top-0 shadow-sm z-10 print:static">
                <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-2 py-3 text-center">Entrada</th>
                <th className="px-2 py-3 text-center">Alm. Ini</th>
                <th className="px-2 py-3 text-center">Alm. Fim</th>
                <th className="px-2 py-3 text-center">Lan. Ini</th>
                <th className="px-2 py-3 text-center">Lan. Fim</th>
                <th className="px-2 py-3 text-center">Saída</th>
                <th className="px-4 py-3 text-right">Trabalhado</th>
                <th className="px-4 py-3 text-right">Saldo</th>
                <th className="px-4 py-3 text-center print:hidden">Ação</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {fullMonthRecords.map((record) => {
                const isEditing = editingId === record.date;
                const isIncomplete = isEntryIncomplete(record);
                const target = getTargetMinutesForDate(record.date, shortDay);
                const isAbsence = target > 0 && record.totalMinutes === 0;
                const isWeekend = target === 0;
                const isShortDay = target === 240;

                return (
                    <tr key={record.date} className={`
                        hover:bg-slate-50 transition-colors 
                        ${isEditing ? 'bg-blue-50' : ''} 
                        ${isIncomplete ? 'bg-amber-50/50' : ''}
                        ${isAbsence ? 'bg-rose-50/30' : ''}
                        ${isWeekend ? 'bg-slate-50/50 text-slate-400' : ''}
                        ${isShortDay ? 'border-l-4 border-indigo-400' : ''}
                    `}>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                        <div className="flex flex-col">
                            <span className="text-slate-800 font-bold">{new Date(record.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                            <span className={`text-[10px] uppercase font-bold ${isShortDay ? 'text-indigo-600' : 'opacity-60'}`}>
                                {new Date(record.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                                {isShortDay && ' (4h)'}
                            </span>
                        </div>
                    </td>
                    
                    {['entry', 'lunchStart', 'lunchEnd', 'snackStart', 'snackEnd', 'exit'].map(f => (
                        <td key={f} className="px-1 py-2 text-center">
                        {isEditing ? (
                            <input type="time" value={String(editForm?.[f as keyof DailyRecord] || '')} onChange={(e) => handleInputChange(e, f as keyof DailyRecord)} className="bg-white border border-slate-300 text-[10px] rounded p-1 w-16 text-center" />
                        ) : (
                            <span className={`block font-mono ${!record[f as keyof DailyRecord] ? 'text-slate-200' : 'text-slate-700'}`}>
                                {record[f as keyof DailyRecord] || '--:--'}
                            </span>
                        )}
                        </td>
                    ))}

                    <td className="px-4 py-3 text-right font-mono font-medium">
                        {formatTime(record.totalMinutes)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${record.balanceMinutes >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatTime(record.balanceMinutes)}
                        {isIncomplete && <AlertTriangle size={12} className="inline ml-1 text-amber-500" title="Batida Incompleta" />}
                    </td>
                    
                    <td className="px-4 py-3 text-center print:hidden">
                        {isEditing ? (
                        <button onClick={handleSave} className="text-white bg-blue-600 hover:bg-blue-700 rounded p-1.5 shadow-sm"><Save size={14} /></button>
                        ) : (
                        <button onClick={() => handleEditClick(record)} className="text-slate-400 hover:text-blue-600 p-1 transition-colors"><div className="text-[10px] font-bold border rounded px-1.5 py-0.5">Edit</div></button>
                        )}
                    </td>
                    </tr>
                );
                })}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-200 sticky bottom-0 z-10 print:static">
                <tr>
                    <td className="px-4 py-4 font-black text-slate-700 uppercase text-xs" colSpan={7}>Totais do Mês</td>
                    <td className="px-4 py-4 text-right font-black font-mono text-slate-800 text-sm">{formatTime(totalWorkedAll)}</td>
                    <td className={`px-4 py-4 text-right font-black font-mono text-sm ${totalBalanceAll >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatTime(totalBalanceAll)}</td>
                    <td className="print:hidden"></td>
                </tr>
            </tfoot>
            </table>
        </div>
      </div>
    </div>
  );
};
