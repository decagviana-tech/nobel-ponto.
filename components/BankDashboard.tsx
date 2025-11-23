import React, { useEffect, useState } from 'react';
import { getRecords, getBankBalance } from '../services/storageService';
import { formatTime } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Clock, Target, AlertTriangle, Timer, CalendarCheck } from 'lucide-react';
import { DailyRecord } from '../types';

interface Props {
  employeeId: string;
}

export const BankDashboard: React.FC<Props> = ({ employeeId }) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [bankBalance, setBankBalance] = useState(0);

  useEffect(() => {
      setRecords(getRecords(employeeId));
      setBankBalance(getBankBalance(employeeId));
  }, [employeeId]);
  
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
              {bankBalance >= 0 ? 'Crédito (A Mais)' : 'Débito (A Menos)'}
            </span>
          </div>
          <p className="mt-4 text-sm opacity-80 max-w-xs">
             {bankBalance >= 0 
               ? 'Você tem horas positivas acumuladas. Parabéns pelo empenho!' 
               : 'Você está com horas negativas. Veja abaixo o plano de recuperação sugerido.'}
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
        <h3 className="font-bold text-slate-700 mb-6">Evolução do Saldo (Últimos 7 dias)</h3>
        <div className="h-64 w-full">
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
        </div>
      </div>
    </div>
  );
};