import React, { useState, useEffect } from 'react';
import { DailyRecord, TimeRecordType } from '../types';
import { getCurrentTime, getTodayString, formatTime } from '../utils';
import { updateRecord, getTodayRecord, getBankBalance } from '../services/storageService';
import { Coffee, Utensils, LogOut, LogIn, MapPin, Wallet, AlertTriangle } from 'lucide-react';

interface Props {
  onUpdate: (record: DailyRecord) => void;
  employeeId: string;
}

export const TimeClock: React.FC<Props> = ({ onUpdate, employeeId }) => {
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [todayRecord, setTodayRecord] = useState<DailyRecord>(getTodayRecord(employeeId, getTodayString()));
  const [locationName, setLocationName] = useState<string>('');
  const [totalBankBalance, setTotalBankBalance] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getCurrentTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const today = getTodayString();
    setTodayRecord(getTodayRecord(employeeId, today));
    setTotalBankBalance(getBankBalance(employeeId));

    // Simple mock geo-location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => setLocationName('Escritório Central (Verificado)'), 
      () => setLocationName('Localização não permitida'));
    }
  }, [employeeId]); // Re-fetch when employee changes

  const handlePunch = (type: TimeRecordType) => {
    const now = getCurrentTime();
    const newRecord = { ...todayRecord, [type]: now, location: locationName, employeeId };
    
    // Optimistic update
    setTodayRecord(newRecord);
    // Persist locally
    updateRecord(newRecord);
    // Update balance immediately
    setTotalBankBalance(getBankBalance(employeeId));
    
    // IMPORTANT: Send the record up to App.tsx so it can be synced to Google Sheets
    onUpdate(newRecord);
  };

  const getButtonStatus = (field: string) => {
    return todayRecord[field as keyof DailyRecord] !== '';
  };

  const ActionButton = ({ 
    type, 
    label, 
    icon: Icon, 
    colorClass 
  }: { 
    type: TimeRecordType, 
    label: string, 
    icon: any, 
    colorClass: string 
  }) => {
    const isDone = getButtonStatus(type);
    return (
      <button
        onClick={() => handlePunch(type)}
        disabled={isDone}
        className={`
          relative flex flex-col items-center justify-center p-6 rounded-2xl shadow-lg transition-all transform hover:scale-105 active:scale-95
          ${isDone ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : colorClass}
        `}
      >
        <Icon size={32} className="mb-2" />
        <span className="font-bold text-lg">{label}</span>
        {isDone && <span className="absolute bottom-2 text-xs font-mono">{todayRecord[type as keyof DailyRecord]}</span>}
      </button>
    );
  };

  // Only show warning if balance is negative AND the user has NOT finished today's shift yet?
  // Actually, showing debt is fine, but we shouldn't count today's "missing hours" as debt yet.
  // The util change handles the calculation. Here we just display.
  // We hide the warning if the debt is small.

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 animate-fade-in">
      {/* Bank Balance Badge */}
      <div className={`mb-2 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm border transition-colors
        ${totalBankBalance >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}
      `}>
        <Wallet size={16} />
        <span>Banco de Horas: {formatTime(totalBankBalance)}</span>
      </div>

      {/* Debt Warning - Only show if negative AND meaningful */}
      {totalBankBalance < -60 && (
        <div className="mb-4 px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-lg flex items-center gap-1 animate-pulse border border-orange-200">
            <AlertTriangle size={12} />
            <span>Atenção: Consulte o Dashboard para ver o plano de recuperação.</span>
        </div>
      )}

      <div className="text-center mb-8">
        <h2 className="text-6xl font-black text-slate-800 tracking-tighter font-mono mb-2">
          {currentTime}
        </h2>
        <p className="text-slate-500 flex items-center justify-center gap-2">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        {locationName && (
          <p className="text-xs text-brand-600 mt-1 flex items-center justify-center gap-1">
            <MapPin size={12} /> {locationName}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
        <ActionButton type="entry" label="Entrada" icon={LogIn} colorClass="bg-emerald-500 hover:bg-emerald-600 text-white" />
        
        <ActionButton type="lunchStart" label="Início Almoço" icon={Utensils} colorClass="bg-amber-500 hover:bg-amber-600 text-white" />
        <ActionButton type="lunchEnd" label="Fim Almoço" icon={Utensils} colorClass="bg-amber-500 hover:bg-amber-600 text-white" />
        
        <ActionButton type="snackStart" label="Início Lanche" icon={Coffee} colorClass="bg-blue-500 hover:bg-blue-600 text-white" />
        <ActionButton type="snackEnd" label="Fim Lanche" icon={Coffee} colorClass="bg-blue-500 hover:bg-blue-600 text-white" />
        
        <ActionButton type="exit" label="Saída" icon={LogOut} colorClass="bg-rose-500 hover:bg-rose-600 text-white" />
      </div>

      <div className="mt-8 p-4 bg-white rounded-xl shadow-sm border border-slate-200 w-full">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Resumo do Dia</h3>
        <div className="flex justify-between items-center">
            <div>
                <p className="text-sm text-slate-400">Status Atual</p>
                <p className="font-medium text-slate-800">
                    {todayRecord.exit ? 'Jornada Encerrada' : 
                     todayRecord.entry ? 'Em Trabalho' : 'Aguardando Entrada'}
                </p>
            </div>
            <div className="text-right">
                <p className="text-sm text-slate-400">Horas Hoje</p>
                <p className="text-xl font-bold text-brand-600">
                    {(todayRecord.totalMinutes / 60).toFixed(1)}h
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};