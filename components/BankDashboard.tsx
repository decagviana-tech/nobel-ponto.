
import React, { useEffect, useState } from 'react';
import { getRecords, getBankBalance, getTransactions, getEmployees } from '../services/storageService';
import { formatTime, getTodayString, getTargetMinutesForDate } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Clock, Target, AlertTriangle, Timer, CalendarCheck, Settings2, Lock, Loader2, Info, Star } from 'lucide-react';
import { DailyRecord } from '../types';
import { BankManagement } from './BankManagement';
import { PinModal } from './PinModal';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';

interface Props {
  employeeId: string;
}

export const BankDashboard: React.FC<Props> = ({ employeeId }) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [bankBalance, setBankBalance] = useState(0);
  const [showManagement, setShowManagement] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
      loadData();
      const timer = setTimeout(() => setIsChartReady(true), 100);
      return () => clearTimeout(timer);
  }, [employeeId]);

  const loadData = () => {
    setRecords(getRecords(employeeId));
    setBankBalance(getBankBalance(employeeId));
  };

  // CÁLCULO DA SEMANA ATUAL (44h)
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 }); // Começa na segunda
  const end = endOfWeek(now, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
  
  const workedThisWeek = records
    .filter(r => weekDays.includes(r.date))
    .reduce((acc, curr) => acc + curr.totalMinutes, 0);
  
  const weeklyGoal = 2640; // 44h * 60min
  const weeklyProgress = Math.min(Math.round((workedThisWeek / weeklyGoal) * 100), 100);

  const handleOpenManagement = () => {
      const allEmployees = getEmployees();
      const currentEmp = allEmployees.find(e => e.id === employeeId);
      const isManager = currentEmp && (currentEmp.role.toLowerCase().includes('gerente') || currentEmp.role.toLowerCase().includes('admin'));
      if (isManager) { setShowManagement(true); return; }
      const managerAuth = allEmployees.find(e => (e.role.toLowerCase().includes('gerente') || e.role.toLowerCase().includes('admin')) && e.pin && e.pin.length === 4);
      if (managerAuth) { setManagerPin(managerAuth.pin); setIsPinModalOpen(true); } else { setShowManagement(true); }
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-8">
      <PinModal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} onSuccess={() => setShowManagement(true)} correctPin={managerPin} />
      {showManagement && <BankManagement employeeId={employeeId} onUpdate={loadData} onClose={() => setShowManagement(false)} />}

      <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-400 text-sm uppercase tracking-widest">Resumo de Performance</h3>
          <button onClick={handleOpenManagement} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-900 shadow-lg"><Settings2 size={16} /> Lançamentos</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Banco de Horas Total */}
          <div className={`relative overflow-hidden rounded-2xl p-8 text-white shadow-xl ${bankBalance >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-700' : 'bg-gradient-to-br from-rose-500 to-red-700'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-20"><Clock size={100} /></div>
            <div className="relative z-10">
              <h2 className="text-sm font-bold opacity-80 mb-1 uppercase">Saldo Geral Acumulado</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black tracking-tighter">{formatTime(bankBalance)}</span>
                <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded uppercase tracking-widest">{bankBalance >= 0 ? 'Crédito' : 'Débito'}</span>
              </div>
              <p className="mt-4 text-xs opacity-70">Este saldo inclui todos os dias do mês (considerando faltas como débito) e ajustes manuais.</p>
            </div>
          </div>

          {/* Card Meta Semanal (44h) */}
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Meta Semanal (44h)</h2>
                        <p className="text-3xl font-black text-slate-800">{formatTime(workedThisWeek)} / 44h</p>
                    </div>
                    <div className="bg-indigo-100 text-indigo-600 p-3 rounded-full"><Star size={24} /></div>
                </div>
                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden mb-2">
                    <div className={`h-full transition-all duration-1000 ${weeklyProgress > 90 ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${weeklyProgress}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>Início da Semana</span>
                    <span>{weeklyProgress}% Concluído</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4 italic">Faltam <b>{formatTime(Math.max(0, weeklyGoal - workedThisWeek))}</b> para bater as 44h desta semana.</p>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Target size={20} /></div>
                <span className="text-xs text-slate-500 font-bold uppercase">Média Diária</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{formatTime(workedThisWeek / (weekDays.filter(d => new Date(d).getDay() !== 0).length || 1))}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle size={20} /></div>
                <span className="text-xs text-slate-500 font-bold uppercase">Alertas de Ponto</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{records.filter(r => r.entry && !r.exit).length} <span className="text-xs font-normal text-slate-400">Incompletos</span></p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CalendarCheck size={20} /></div>
                <span className="text-xs text-slate-500 font-bold uppercase">Presença no Mês</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{records.filter(r => r.totalMinutes > 0).length} <span className="text-xs font-normal text-slate-400">Dias</span></p>
        </div>
      </div>
    </div>
  );
};
