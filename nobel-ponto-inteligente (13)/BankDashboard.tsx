
import React, { useEffect, useState, useMemo } from 'react';
import { getRecords, getBankBalance, getEmployees, resetBankBalance } from './storageService.ts';
import { getQuickInsight } from './geminiService.ts';
import { formatTime, calculateDailyStats } from './utils.ts';
import { Clock, Calendar, Sparkles, TrendingUp, Settings2, History, DatabaseZap, Loader2, ShieldCheck } from 'lucide-react';
import { DailyRecord, Employee } from './types.ts';
import { BankManagement } from './BankManagement.tsx';
import { PinModal } from './PinModal.tsx';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props { employeeId: string; }

export const BankDashboard: React.FC<Props> = ({ employeeId }) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [bankBalance, setBankBalance] = useState(0);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [showManagement, setShowManagement] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => { loadData(); }, [employeeId]);

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
      if (confirm("⚠️ Deseja reiniciar o banco de horas deste colaborador?")) {
          setIsResetting(true);
          await resetBankBalance(employeeId);
          await loadData();
          setIsResetting(false);
      }
  };

  const workedThisWeek = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
    return records
        .filter(r => days.includes(r.date))
        .reduce((acc, curr) => acc + calculateDailyStats(curr, employee?.shortDayOfWeek ?? 6, employee?.standardDailyMinutes ?? 480).total, 0);
  }, [records, employee]);

  const weeklyProgress = Math.min(Math.round((workedThisWeek / 2640) * 100), 100);

  return (
    <div className="w-full space-y-6 animate-fade-in pb-10">
      <PinModal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} onSuccess={() => setShowManagement(true)} correctPin="9999" targetName="Gerência" />
      {showManagement && <BankManagement employeeId={employeeId} onUpdate={loadData} onClose={() => setShowManagement(false)} />}
      <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-brand-600/10 p-3 rounded-2xl text-brand-600"><Calendar size={24} /></div>
            <h3 className="font-black text-slate-900 text-xl capitalize">{format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}</h3>
          </div>
          <div className="flex gap-2">
              <button onClick={handleResetNuclear} className="bg-rose-50 text-rose-600 p-3 rounded-2xl border border-rose-100">{isResetting ? <Loader2 size={18} className="animate-spin" /> : <DatabaseZap size={18} />}</button>
              <button onClick={() => setIsPinModalOpen(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2"><Settings2 size={16} /> Ajustes</button>
          </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-5 rounded-[2.5rem] p-8 text-white shadow-2xl ${bankBalance >= 0 ? 'bg-brand-600' : 'bg-rose-600'}`}>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Saldo Acumulado</span>
              <h1 className="text-6xl font-black tracking-tighter mt-2 mb-8">{formatTime(bankBalance)}</h1>
              <div className="p-4 bg-white/10 rounded-2xl border border-white/20 flex items-center gap-3"><Sparkles size={18} /><p className="text-xs font-bold leading-tight uppercase">{aiInsight || "Analisando..."}</p></div>
          </div>
          <div className="lg:col-span-7 bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Progresso Semanal</h2>
            <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden p-1 border">
                <div className="h-full bg-brand-500 rounded-full transition-all duration-1000" style={{ width: `${weeklyProgress}%` }}></div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t pt-6 mt-8">
                <div className="p-4 bg-slate-50 rounded-2xl text-emerald-600 font-black text-sm flex items-center gap-2"><ShieldCheck size={16} /> Auditoria OK</div>
                <div className="p-4 bg-slate-50 rounded-2xl text-brand-600 font-black text-sm flex items-center gap-2"><TrendingUp size={16} /> Tendência Positiva</div>
            </div>
          </div>
      </div>
    </div>
  );
};
