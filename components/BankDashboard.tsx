
import React, { useEffect, useState } from 'react';
import { getRecords, getBankBalance, getTransactions, getEmployees } from '../services/storageService';
import { formatTime } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Clock, Target, AlertTriangle, Timer, CalendarCheck, Settings2, Lock, Loader2 } from 'lucide-react';
import { DailyRecord } from '../types';
import { BankManagement } from './BankManagement';
import { PinModal } from './PinModal';

interface Props {
  employeeId: string;
}

export const BankDashboard: React.FC<Props> = ({ employeeId }) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [bankBalance, setBankBalance] = useState(0);
  const [showManagement, setShowManagement] = useState(false);
  
  // Security State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  
  // Chart render state
  const [isChartReady, setIsChartReady] = useState(false);

  // New Stats for breakdown
  const [manualAdjustmentTotal, setManualAdjustmentTotal] = useState(0);

  const loadData = () => {
    setRecords(getRecords(employeeId));
    setBankBalance(getBankBalance(employeeId));
    
    // Calculate manual total separately for display
    const trans = getTransactions(employeeId);
    const manualTotal = trans.reduce((acc, curr) => acc + curr.amountMinutes, 0);
    setManualAdjustmentTotal(manualTotal);
  };

  useEffect(() => {
      loadData();
      // Delay chart rendering slightly to ensure container layout is computed
      const timer = setTimeout(() => setIsChartReady(true), 100);
      return () => clearTimeout(timer);
  }, [employeeId]);

  const handleOpenManagement = () => {
      const allEmployees = getEmployees();
      const currentEmp = allEmployees.find(e => e.id === employeeId);
      
      // 1. Verifica se o usuário atual é Gerente
      const isManager = currentEmp && (
          currentEmp.role.toLowerCase().includes('gerente') || 
          currentEmp.role.toLowerCase().includes('admin') ||
          currentEmp.role.toLowerCase().includes('diretor')
      );

      if (isManager) {
          setShowManagement(true);
          return;
      }

      // 2. Se não for, busca o PIN de um Gerente cadastrado para pedir autorização
      const managerAuth = allEmployees.find(e => 
          (e.role.toLowerCase().includes('gerente') || e.role.toLowerCase().includes('admin')) && 
          e.pin && e.pin.length === 4
      );
      
      if (managerAuth) {
          setManagerPin(managerAuth.pin);
          setIsPinModalOpen(true);
      } else {
          // Fallback se não houver gerente configurado com PIN
          if (currentEmp?.id === '1') {
             // Funcionário padrão (setup inicial) tem acesso
             setShowManagement(true);
          } else {
             alert("Acesso Restrito: Apenas Gerentes podem realizar ajustes.\n\nNenhum gerente com PIN configurado foi encontrado para autorizar esta ação.");
          }
      }
  };

  const handlePinSuccess = () => {
      setIsPinModalOpen(false);
      setShowManagement(true);
  };
  
  // Calculate stats
  const totalWorkedMinutes = records.reduce((acc, curr) => acc + curr.totalMinutes, 0);
  const daysWorked = records.filter(r => r.totalMinutes > 0).length;
  const expectedMinutes = daysWorked * 480; // 8 hours per day worked
  const averageDaily = daysWorked > 0 ? totalWorkedMinutes / daysWorked : 0;

  // Prepare chart data (last 7 entries)
  const chartData = records.slice(0, 7).reverse().map(r => ({
    date: new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    balance: r.balanceMinutes,
    worked: r.totalMinutes / 60 // hours
  }));

  // Recovery Plan Calculations
  const minutesOwed = bankBalance < 0 ? Math.abs(bankBalance) : 0;
  const daysToRecover1h = Math.ceil(minutesOwed / 60);
  const daysToRecover30m = Math.ceil(minutesOwed / 30);

  return (
    <div className="w-full space-y-6 animate-fade-in pb-8">
      
      <PinModal 
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={handlePinSuccess}
        correctPin={managerPin}
      />

      {showManagement && (
          <BankManagement 
            employeeId={employeeId} 
            onUpdate={loadData}
            onClose={() => setShowManagement(false)}
          />
      )}

      {/* Header with Management Button */}
      <div className="flex justify-end">
          <button 
            onClick={handleOpenManagement}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors shadow-lg group"
          >
            <div className="bg-slate-700 p-1 rounded group-hover:bg-slate-600 transition-colors">
                <Lock size={14} className="text-slate-200" />
            </div>
            <span className="flex items-center gap-2">
                <Settings2 size={16} />
                Lançamentos e Ajustes
            </span>
          </button>
      </div>

      {/* Big Bank Balance Card */}
      <div className={`relative overflow-hidden rounded-2xl p-8 text-white shadow-xl ${bankBalance >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-700' : 'bg-gradient-to-br from-rose-500 to-red-700'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <Clock size={120} />
        </div>
        <div className="relative z-10">
          <h2 className="text-lg font-medium opacity-90 mb-1">Banco de Horas Total</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black tracking-tighter">
              {formatTime(bankBalance)}
            </span>
            <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded">
              {bankBalance >= 0 ? 'Crédito' : 'Débito'}
            </span>
          </div>
          
          {manualAdjustmentTotal !== 0 && (
             <p className="mt-2 text-xs bg-black/20 inline-block px-2 py-1 rounded">
                Inclui {formatTime(manualAdjustmentTotal)} de ajustes manuais
             </p>
          )}

          <p className="mt-4 text-sm opacity-80 max-w-xs">
             {bankBalance >= 0 
               ? 'Saldo positivo. Clique em "Lançamentos" para registrar pagamentos de horas extras.' 
               : 'Saldo negativo. Verifique se há atestados pendentes para lançar.'}
          </p>
        </div>
      </div>

      {/* RECOVERY PLAN SECTION (Only if negative) */}
      {minutesOwed > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 animate-fade-in">
            <h3 className="flex items-center gap-2 text-lg font-bold text-orange-800 mb-4">
                <AlertTriangle className="text-orange-600" />
                Plano de Recuperação de Horas
            </h3>
            <p className="text-sm text-orange-700 mb-4">
                Para regularizar seu banco de horas, o sistema sugere as seguintes opções de compensação:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="bg-orange-100 p-3 rounded-full text-orange-600">
                        <Timer size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">Opção Rápida</p>
                        <p className="text-sm text-slate-500">Trabalhar +1 hora por dia</p>
                        <p className="text-xl font-black text-slate-800 mt-1">
                            {daysToRecover1h} dias
                        </p>
                        <p className="text-xs text-slate-400">necessários para zerar</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="bg-orange-100 p-3 rounded-full text-orange-600">
                        <CalendarCheck size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">Opção Leve</p>
                        <p className="text-sm text-slate-500">Trabalhar +30 min por dia</p>
                        <p className="text-xl font-black text-slate-800 mt-1">
                            {daysToRecover30m} dias
                        </p>
                        <p className="text-xs text-slate-400">necessários para zerar</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Target size={20} /></div>
                <span className="text-sm text-slate-500 font-medium">Horas Esperadas (8h/dia)</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{(expectedMinutes/60).toFixed(1)}h</p>
            <p className="text-xs text-slate-400">Baseado em {daysWorked} dias trabalhados</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><TrendingDown size={20} /></div>
                <span className="text-sm text-slate-500 font-medium">Horas Trabalhadas</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{(totalWorkedMinutes/60).toFixed(1)}h</p>
             <p className="text-xs text-slate-400">Total acumulado no período</p>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><TrendingUp size={20} /></div>
                <span className="text-sm text-slate-500 font-medium">Média Diária Real</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{formatTime(averageDaily)}</p>
            <p className="text-xs text-slate-400">Meta: 8h 00m</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-700 mb-6">Evolução Diária (Automática)</h3>
        {/* Explicit container with size to prevent Recharts calculation errors */}
        <div className="h-[300px] w-full relative">
          {isChartReady ? (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                    formatter={(value: number) => [`${value} min`, 'Saldo Diário']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Bar dataKey="balance" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.balance >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                </Bar>
                </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="animate-spin" size={24} />
                <span className="text-sm">Carregando gráfico...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
