
import React, { useState, useEffect, useMemo } from 'react';
import { DailyRecord, TimeRecordType } from '../types';
import { getCurrentTime, getTodayString, formatTime } from '../utils';
import { updateRecord, getTodayRecord, getBankBalance, getLocationConfig } from '../servicos/storageService';
import { Coffee, Utensils, LogOut, LogIn, MapPin, Wallet, Loader2, CheckCircle2, Building2, RefreshCw } from 'lucide-react';

interface Props {
  onUpdate: (record: DailyRecord) => void;
  employeeId: string;
}

export const TimeClock: React.FC<Props> = ({ onUpdate, employeeId }) => {
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [todayRecord, setTodayRecord] = useState<DailyRecord>(getTodayRecord(employeeId, getTodayString()));
  const [locationName, setLocationName] = useState<string>('Obtendo localização...');
  const [totalBankBalance, setTotalBankBalance] = useState<number>(0);
  const [isPunching, setIsPunching] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getCurrentTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setTodayRecord(getTodayRecord(employeeId, getTodayString()));
    setTotalBankBalance(getBankBalance(employeeId));
    refreshLocation();
  }, [employeeId]);

  const refreshLocation = () => {
    const locConfig = getLocationConfig();
    setIsLocating(true);
    if (locConfig.useFixed) {
        setLocationName(locConfig.fixedName);
        setIsLocating(false);
    } else {
        setLocationName('GPS Ativo');
        setIsLocating(false);
    }
  };

  const handlePunch = async (type: TimeRecordType) => {
    setIsPunching(type);
    await new Promise(resolve => setTimeout(resolve, 800));
    const now = getCurrentTime();
    
    const newRecord: DailyRecord = { ...todayRecord, [type]: now, location: locationName, employeeId };
    setTodayRecord(newRecord);
    updateRecord(newRecord);
    setTotalBankBalance(getBankBalance(employeeId));
    onUpdate(newRecord);
    
    setIsPunching(null);
    setSuccessMsg(`Ponto de ${type} batido: ${now}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const ActionButton = ({ type, label, icon: Icon, colorClass }: any) => {
    const isDone = todayRecord[type as keyof DailyRecord] !== '';
    const isLoading = isPunching === type;
    return (
      <button
        onClick={() => handlePunch(type as TimeRecordType)}
        disabled={isDone || isPunching !== null}
        className={`flex flex-col items-center justify-center p-6 rounded-2xl transition-all shadow-md ${isDone ? 'bg-slate-100 text-slate-400' : `${colorClass} text-white hover:scale-105 active:scale-95`}`}
      >
        {isLoading ? <Loader2 size={32} className="animate-spin mb-2" /> : <Icon size={32} className="mb-2" />}
        <span className="font-bold">{isDone ? todayRecord[type as keyof DailyRecord] : label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 animate-fade-in">
      {successMsg && (
          <div className="fixed top-20 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-bounce z-50">
              <CheckCircle2 size={20} /> {successMsg}
          </div>
      )}

      <div className="text-center mb-8">
        <h2 className="text-7xl font-black text-slate-800 font-mono mb-2">{currentTime}</h2>
        <div className="flex items-center gap-2 justify-center text-slate-500 bg-white px-4 py-2 rounded-full border shadow-sm">
            <MapPin size={16} className="text-brand-500" />
            <span className="text-xs font-bold uppercase">{locationName}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
        <ActionButton type="entry" label="Entrada" icon={LogIn} colorClass="bg-emerald-500" />
        <ActionButton type="lunchStart" label="Almoço (Ida)" icon={Utensils} colorClass="bg-amber-500" />
        <ActionButton type="lunchEnd" label="Almoço (Volta)" icon={Utensils} colorClass="bg-amber-500" />
        <ActionButton type="snackStart" label="Lanche (Ida)" icon={Coffee} colorClass="bg-indigo-500" />
        <ActionButton type="snackEnd" label="Lanche (Volta)" icon={Coffee} colorClass="bg-indigo-500" />
        <ActionButton type="exit" label="Saída" icon={LogOut} colorClass="bg-rose-500" />
      </div>
    </div>
  );
};
