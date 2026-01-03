
import React, { useEffect, useState, useMemo } from 'react';
import { getRecords, getBankBalance, getEmployees } from '../services/storageService';
import { getQuickInsight } from '../services/geminiService';
import { formatTime } from '../utils';
import { Clock, Target, AlertTriangle, CalendarCheck, Settings2, Star, Info, Calendar, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { DailyRecord } from '../types';
import { BankManagement } from './BankManagement';
import { PinModal } from './PinModal';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  employeeId: string;
}

export const BankDashboard: React.FC<Props> = ({ employeeId }) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [bankBalance, setBankBalance] = useState(0);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [showManagement, setShowManagement] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [managerPin, setManagerPin] = useState('');

  const now = new Date();
  const currentMonthPrefix = format(now, 'yyyy-MM');
  const currentMonthLabel = format(now, "MMMM 'de' yyyy", { locale: ptBR });

  useEffect(() => {
      loadData();
  }, [employeeId]);

  const loadData = async () => {
    const recs = getRecords(employeeId);
    const bal = getBankBalance(employeeId);
    setRecords(recs);
    setBankBalance(bal);
    
    // IA Insight em background
    const insight = await getQuickInsight(recs, bal);
    setAiInsight(insight);
  };

  const recordsThisMonth = useMemo(() => records.filter(r => r.date.startsWith(currentMonthPrefix)), [records, currentMonthPrefix]);
  const presenceThisMonth = useMemo(() => recordsThisMonth.filter(r => r.totalMinutes > 0).length, [recordsThisMonth]);
  const balanceThisMonth = useMemo(() => recordsThisMonth.reduce((acc, r) => acc + (r.balanceMinutes || 0), 0), [recordsThisMonth]);

  const startOfSemana = startOfWeek(now, { weekStartsOn: 1 });
  const endOfSemana = endOfWeek(now, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: startOfSemana, end: endOfSemana }).map(d => format(d, 'yyyy-MM-dd'));
  
  const workedThisWeek = useMemo(() => {
    return records
        .filter(r => weekDays.includes(r.date))
        .reduce((acc, curr) => acc + curr.totalMinutes, 0);
  }, [records, weekDays]);
  
  const weeklyGoal = 2640; // 44h
  const weeklyProgress = Math.min(Math.round((workedThisWeek / weeklyGoal) * 100), 100);

  const handleOpenManagement = () => {
      const allEmployees = getEmployees();
      const managerAuth = allEmployees.find(e => (e.role.toLowerCase().includes('gerente') || e.role.toLowerCase().includes('admin')) && e.pin);
      if (managerAuth) { 
          setManagerPin(managerAuth.pin); 
          setIsPinModalOpen(true); 
      } else { 
          setShowManagement(true); 
      }
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-10">
      <PinModal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} onSuccess={() => setShowManagement(true)} correctPin={managerPin} />
      {showManagement && <BankManagement employeeId={employeeId} onUpdate={loadData} onClose={() => setShowManagement(false)} />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-brand-100 p-2 rounded-lg text-brand-600">
                <Calendar size={20} />
            </div>
            <div>
                <h3 className="font-bold text-slate-800 text-lg">{currentMonthLabel}</h3>
                <p className="text-xs text-slate-400 font-medium">Análise de Performance Nobel</p>
            </div>
          </div>
          <button onClick={handleOpenManagement} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-black shadow-lg transition-all active:scale-95">
            <Settings2 size={16} /> Lançamentos e Ajustes
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card Principal de Saldo */}
          <div className={`relative overflow-hidden rounded-[2rem] p-8 text-white shadow-2xl transition-all duration-500 ${bankBalance >= 0 ? 'bg-gradient-to-br from-brand-600 to-indigo-700' : 'bg-gradient-to-br from-rose-600 to-red-800'}`}>
            <div className="absolute -top-10 -right-10 opacity-10"><Clock size={200} /></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">Saldo Consolidado</span>
                {bankBalance >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black tracking-tighter">{formatTime(bankBalance)}</span>
              </div>
              
              {aiInsight ? (
                  <div className="mt-8 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex gap-3 items-start animate-fade-in">
                      <Sparkles size={18} className="shrink-0 mt-0.5" />
                      <p className="text-xs font-medium leading-relaxed italic">{aiInsight}</p>
                  </div>
              ) : (
                  <div className="mt-8 h-[60px] animate-pulse bg-white/5 rounded-2xl"></div>
              )}
            </div>
          </div>

          {/* Progresso Semanal */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-6">
                  <div>
                      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Meta Semanal (44h)</h2>
                      <p className="text-4xl font-black text-slate-800">{formatTime(workedThisWeek)}</p>
                  </div>
                  <div className="bg-brand-50 text-brand-600 p-4 rounded-2xl"><Star size={24} fill="currentColor" className="opacity-20" /></div>
              </div>
              
              <div className="space-y-4">
                <div className="w-full bg-slate-50 h-6 rounded-full overflow-hidden p-1.5 border border-slate-100">
                    <div 
                        className={`h-full transition-all duration-1000 rounded-full shadow-sm ${weeklyProgress > 90 ? 'bg-emerald-500' : 'bg-brand-500'}`} 
                        style={{ width: `${weeklyProgress}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase px-1">
                    <span>{weeklyProgress}% da Jornada Concluída</span>
                    <span className="text-brand-600">Faltam {formatTime(Math.max(0, weeklyGoal - workedThisWeek))}</span>
                </div>
              </div>
              
              <div className="mt-10 grid grid-cols-2 gap-8 border-t border-slate-50 pt-6">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Resultado no Mês</p>
                    <p className={`text-2xl font-black ${balanceThisMonth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatTime(balanceThisMonth)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total de Presenças</p>
                    <p className="text-2xl font-black text-slate-700">
                        {presenceThisMonth} <span className="text-xs text-slate-300">Dias</span>
                    </p>
                </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><Target size={24} /></div>
                <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">Média/Dia</span>
            </div>
            <p className="text-3xl font-black text-slate-800">{formatTime(workedThisWeek / 5)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
                <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">Pendências</span>
            </div>
            <p className="text-3xl font-black text-slate-800">{recordsThisMonth.filter(r => r.entry && !r.exit).length} <span className="text-xs text-slate-300">batidas</span></p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform"><CalendarCheck size={24} /></div>
                <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">Aproveitamento</span>
            </div>
            <p className="text-3xl font-black text-slate-800">{Math.round((presenceThisMonth / now.getDate()) * 100)}%</p>
        </div>
      </div>
    </div>
  );
};
