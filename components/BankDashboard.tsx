
import React, { useEffect, useState, useMemo } from 'react';
import { getRecords, getBankBalance, getEmployees, resetBankBalance, getGoogleConfig } from '../services/storageService';
import { getQuickInsight } from '../services/geminiService';
import { formatTime, calculateDailyStats } from '../utils';
import { Clock, Target, AlertTriangle, CalendarCheck, Settings2, Star, Calendar, Sparkles, TrendingUp, TrendingDown, ChevronRight, ShieldCheck, HeartPulse, RefreshCw, Trash2, Loader2, DatabaseZap, ExternalLink, FileSpreadsheet, History } from 'lucide-react';
import { DailyRecord, Employee } from '../types';
import { BankManagement } from './BankManagement';
import { PinModal } from './PinModal';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  employeeId: string;
}

export const BankDashboard: React.FC<Props> = ({ employeeId }) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [bankBalance, setBankBalance] = useState(0);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [showManagement, setShowManagement] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [tick, setTick] = useState(0);

  const now = new Date();
  const currentMonthPrefix = format(now, 'yyyy-MM');
  const currentMonthLabel = format(now, "MMMM 'de' yyyy", { locale: ptBR });

  useEffect(() => {
      loadData();
      const interval = setInterval(() => setTick(t => t + 1), 60000);
      return () => clearInterval(interval);
  }, [employeeId]);

  const loadData = async () => {
    const allEmps = getEmployees();
    const emp = allEmps.find(e => String(e.id) === String(employeeId)) || null;
    setEmployee(emp);
    
    const recs = getRecords(employeeId);
    const bal = getBankBalance(employeeId);
    setRecords(recs);
    setBankBalance(bal);
    
    const insight = await getQuickInsight(recs, bal);
    setAiInsight(insight);
  };

  const handleResetNuclear = async () => {
      let msg = "⚠️ ATENÇÃO: ZERAR SALDO\n\nIsso definirá o dia de hoje como o novo início do banco de horas para este funcionário. O saldo acumulado anterior será ignorado no Dashboard.";
      if (confirm(msg)) {
          setIsResetting(true);
          await resetBankBalance(employeeId);
          await loadData();
          setIsResetting(false);
          alert("✅ Saldo reiniciado com sucesso!");
      }
  };

  const recordsThisMonth = useMemo(() => records.filter(r => r.date.startsWith(currentMonthPrefix)), [records, currentMonthPrefix]);
  const presenceThisMonth = useMemo(() => recordsThisMonth.filter(r => r.totalMinutes > 0 || r.entry).length, [recordsThisMonth]);
  
  // Cálculo de saldo e total considerando tempo real do tick
  const statsThisMonth = useMemo(() => {
      let total = 0;
      let balance = 0;
      recordsThisMonth.forEach(r => {
          const s = calculateDailyStats(r, employee?.shortDayOfWeek ?? 6, employee?.standardDailyMinutes ?? 480);
          total += s.total;
          balance += s.balance;
      });
      return { total, balance };
  }, [recordsThisMonth, employee, tick]);

  const inconsistentDays = useMemo(() => {
      return recordsThisMonth.filter(r => {
          const hasAny = r.entry || r.lunchStart || r.lunchEnd || r.exit;
          if (!hasAny) return false;
          return !r.entry || !r.exit;
      });
  }, [recordsThisMonth]);

  const startOfSemana = startOfWeek(now, { weekStartsOn: 1 });
  const endOfSemana = endOfWeek(now, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: startOfSemana, end: endOfSemana }).map(d => format(d, 'yyyy-MM-dd'));
  
  const workedThisWeek = useMemo(() => {
    return records
        .filter(r => weekDays.includes(r.date))
        .reduce((acc, curr) => {
            const s = calculateDailyStats(curr, employee?.shortDayOfWeek ?? 6, employee?.standardDailyMinutes ?? 480);
            return acc + s.total;
        }, 0);
  }, [records, weekDays, employee, tick]);
  
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

  const displayBankStartDate = useMemo(() => {
      if (!employee?.bankStartDate) return 'Início do App';
      return new Date(employee.bankStartDate + 'T12:00:00').toLocaleDateString('pt-BR');
  }, [employee]);

  return (
    <div className="w-full space-y-6 animate-fade-in pb-10">
      <PinModal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} onSuccess={() => setShowManagement(true)} correctPin={managerPin} />
      {showManagement && <BankManagement employeeId={employeeId} onUpdate={loadData} onClose={() => setShowManagement(false)} />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-brand-500/10 p-2 rounded-xl text-brand-600">
                <Calendar size={24} />
            </div>
            <div>
                <h3 className="font-bold text-slate-900 text-xl capitalize">{currentMonthLabel}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1 border border-slate-200">
                        <History size={10} /> Vigência: {displayBankStartDate}
                    </span>
                </div>
            </div>
          </div>
          
          <div className="flex gap-2">
              <button 
                onClick={handleResetNuclear} 
                disabled={isResetting}
                className="flex items-center gap-2 bg-rose-600 text-white px-5 py-3 rounded-2xl text-xs font-black hover:bg-rose-700 transition-all disabled:opacity-50 shadow-xl shadow-rose-200 group"
              >
                  {isResetting ? <Loader2 size={16} className="animate-spin" /> : <DatabaseZap size={18} />}
                  {isResetting ? 'ZERANDO...' : 'ZERAR SALDO'}
              </button>
              <button onClick={handleOpenManagement} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-black shadow-xl transition-all active:scale-95 group">
                <Settings2 size={18} className="group-hover:rotate-90 transition-transform" /> 
                Ajustes
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-5 relative overflow-hidden rounded-[2.5rem] p-10 text-white shadow-2xl transition-all duration-700 hover:shadow-brand-200/50 ${bankBalance >= 0 ? 'bg-gradient-to-br from-[#0ea5e9] to-[#2563eb]' : 'bg-gradient-to-br from-rose-600 to-red-800'}`}>
            <div className="absolute -top-10 -right-10 opacity-10"><Clock size={240} /></div>
            
            <div className="relative z-10 flex flex-col h-full">
              <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-80 mb-2">Saldo Consolidado</span>
              <div className="flex items-baseline gap-2 mb-10">
                <span className="text-7xl font-black tracking-tighter drop-shadow-md">
                    {formatTime(bankBalance).split(' ')[0]}<span className="text-4xl opacity-70">{formatTime(bankBalance).split(' ')[1]}</span>
                </span>
              </div>
              
              <div className="mt-auto">
                <div className="p-5 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 flex gap-4 items-center shadow-inner min-h-[80px]">
                    <div className="bg-white/20 p-2 rounded-full shrink-0">
                        <Sparkles size={18} className="text-white" />
                    </div>
                    <p className="text-sm font-black leading-tight text-white uppercase tracking-tight">
                        {aiInsight || "Auditoria técnica ativa."}
                    </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 flex flex-col justify-between hover:border-brand-200 transition-colors">
              <div className="flex justify-between items-start">
                  <div>
                      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Resumo Mensal</h2>
                      <div className="flex items-center gap-4">
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Trabalhado</p>
                            <p className="text-2xl font-black text-slate-800">{formatTime(statsThisMonth.total)}</p>
                        </div>
                        <div className="text-slate-200 text-3xl font-light">|</div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Saldo Líquido</p>
                            <p className={`text-2xl font-black ${statsThisMonth.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatTime(statsThisMonth.balance)}</p>
                        </div>
                      </div>
                  </div>
                  <div className="bg-brand-50 text-brand-600 p-5 rounded-3xl shadow-sm border border-brand-100"><RefreshCw size={28} className="opacity-40" /></div>
              </div>
              
              <div className="mt-8">
                <div className="w-full bg-slate-100 h-8 rounded-full overflow-hidden p-1.5 border border-slate-200 shadow-inner">
                    <div 
                        className={`h-full transition-all duration-1000 rounded-full shadow-lg ${weeklyProgress > 90 ? 'bg-emerald-500' : 'bg-brand-500'}`} 
                        style={{ width: `${weeklyProgress}%` }}
                    ></div>
                </div>
                <div className="flex justify-between mt-4">
                    <span className="text-[12px] font-black text-slate-400 uppercase tracking-tighter">PROGRESSO SEMANAL: {weeklyProgress}%</span>
                    <span className="text-[12px] font-black text-brand-600 uppercase tracking-tighter">META 44H</span>
                </div>
              </div>
              
              <div className="mt-8 flex justify-between items-end border-t border-slate-50 pt-6">
                <div className="flex gap-6">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Presenças</p>
                        <p className="text-3xl font-black text-slate-700 tracking-tight">{presenceThisMonth}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Nobel</p>
                        {inconsistentDays.length > 0 ? (
                            <p className="text-xs font-bold text-amber-600 flex items-center gap-1 uppercase bg-amber-50 px-2 py-1 rounded">
                                <AlertTriangle size={14} /> {inconsistentDays.length} batidas pendentes
                            </p>
                        ) : (
                            <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 uppercase bg-emerald-50 px-2 py-1 rounded">
                                <ShieldCheck size={14} /> Auditoria OK
                            </p>
                        )}
                    </div>
                </div>
              </div>
          </div>
      </div>
      
      {getGoogleConfig().enabled && (
          <div className="bg-slate-900 text-white p-6 rounded-[2rem] flex items-center justify-between gap-4 shadow-2xl">
              <div className="flex items-center gap-4">
                  <div className="bg-brand-500 p-3 rounded-full text-white animate-pulse">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                      <p className="font-bold text-brand-100">Sincronização com Nuvem Ativa</p>
                      <p className="text-xs text-slate-400">Auditoria técnica baseada nos registros oficiais da Planilha Google.</p>
                  </div>
              </div>
              <button 
                onClick={() => {
                    const config = getGoogleConfig();
                    if(config.scriptUrl) window.open(config.scriptUrl.replace('/exec', ''), '_blank');
                }}
                className="bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-700 flex items-center gap-2 transition-all"
              >
                  Ver Planilha <ExternalLink size={16} />
              </button>
          </div>
      )}
    </div>
  );
};
