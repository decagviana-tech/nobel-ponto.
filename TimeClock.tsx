
import React, { useState, useEffect, useMemo } from 'react';
import { DailyRecord, TimeRecordType, Employee } from '../types';
import { getCurrentTime, getTodayString, formatTime, getTargetMinutesForDate } from '../utils';
import { updateRecord, getTodayRecord, getBankBalance, getLocationConfig, getEmployees } from '../services/storageService';
import { generateSpeech, playAudioBuffer } from '../services/geminiService';
import { Utensils, Coffee, LogOut, LogIn, MapPin, Wallet, Loader2, CheckCircle2, ShieldCheck, Zap, Info } from 'lucide-react';

interface Props {
  onUpdate: (record: DailyRecord) => void | Promise<void>;
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
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getCurrentTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const employees = getEmployees();
    setEmployee(employees.find(e => String(e.id) === String(employeeId)) || null);
    setTodayRecord(getTodayRecord(employeeId, getTodayString()));
    setTotalBankBalance(getBankBalance(employeeId));
    refreshLocation();
  }, [employeeId]);

  const targetMinutesToday = useMemo(() => getTargetMinutesForDate(getTodayString(), employee?.shortDayOfWeek ?? 6), [employee]);
  const isShortDay = targetMinutesToday > 0 && targetMinutesToday <= 240;

  const nextRecommendedAction = useMemo(() => {
      if (!todayRecord.entry) return 'entry';
      if (isShortDay) {
          if (!todayRecord.snackStart) return 'snackStart';
          if (!todayRecord.snackEnd) return 'snackEnd';
          if (!todayRecord.exit) return 'exit';
      } else {
          if (!todayRecord.lunchStart) return 'lunchStart';
          if (!todayRecord.lunchEnd) return 'lunchEnd';
          if (!todayRecord.snackStart) return 'snackStart';
          if (!todayRecord.snackEnd) return 'snackEnd';
          if (!todayRecord.exit) return 'exit';
      }
      return null;
  }, [todayRecord, isShortDay]);

  const refreshLocation = () => {
    const locConfig = getLocationConfig();
    setIsLocating(true);
    if (locConfig.useFixed) {
        setLocationName(locConfig.fixedName);
        setIsLocating(false);
    } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            setLocationName(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
            setIsLocating(false);
        }, () => {
            setLocationName('GPS Ativo');
            setIsLocating(false);
        });
    }
  };

  const handlePunch = async (type: TimeRecordType) => {
    setIsPunching(type);
    const now = getCurrentTime();
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newRecord: DailyRecord = { ...todayRecord, [type]: now, location: locationName, employeeId };
    setTodayRecord(newRecord);
    updateRecord(newRecord);
    setTotalBankBalance(getBankBalance(employeeId));
    onUpdate(newRecord);
    
    const label = getLabel(type);
    const msg = `${label} registrado às ${now}`;
    setSuccessMsg(msg);
    setIsPunching(null);
    const audioData = await generateSpeech(msg);
    if (audioData) playAudioBuffer(audioData);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const getLabel = (type: string) => {
    const labels: any = { 
        entry: 'Entrada', 
        lunchStart: 'Almoço (Ida)', 
        lunchEnd: 'Almoço (Volta)', 
        snackStart: 'Lanche (Ida)',
        snackEnd: 'Lanche (Volta)',
        exit: 'Saída' 
    };
    return labels[type] || type;
  };

  const ActionButton = ({ type, label, icon: Icon, colorClass }: any) => {
    const isDone = todayRecord[type as keyof DailyRecord] !== '';
    const isLoading = isPunching === type;
    const isRecommended = nextRecommendedAction === type;

    return (
      <button
        onClick={() => handlePunch(type)}
        disabled={isDone || isPunching !== null}
        className={`relative flex flex-col items-center justify-center p-4 md:p-6 rounded-[2rem] transition-all duration-300 shadow-lg border-2 ${isDone ? 'bg-slate-50 border-slate-100 text-slate-300 scale-95 opacity-80' : isRecommended ? `${colorClass} text-white border-transparent ring-[8px] ring-brand-100/50 shadow-brand-200/50 z-10 font-black` : 'bg-white border-slate-100 text-slate-600 hover:border-brand-200 active:scale-95'}`}
      >
        {isRecommended && !isDone && <div className="absolute -top-3 -right-3 bg-brand-500 text-white p-2 rounded-full shadow-lg animate-bounce border-2 border-white"><Zap size={14} fill="white" /></div>}
        {isLoading ? <Loader2 size={20} className="animate-spin mb-2" /> : <Icon size={20} className="mb-2" />}
        <span className="text-[10px] tracking-tight uppercase font-black">{isDone ? todayRecord[type as keyof DailyRecord] : label}</span>
        {isDone && <span className="mt-1 text-[8px] font-black tracking-widest opacity-60 uppercase">OK</span>}
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 animate-fade-in">
      {successMsg && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 z-[100] animate-in slide-in-from-top-10 duration-300 border border-slate-700"><div className="bg-emerald-500 p-1 rounded-full"><CheckCircle2 size={18} /></div><span className="font-bold text-sm">{successMsg}</span></div>}
      <div className="text-center mb-6 md:mb-8 w-full">
        <div className="flex flex-col items-center gap-2 mb-4">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border shadow-sm text-slate-400 font-black text-[9px] uppercase tracking-widest">{isLocating ? <Loader2 size={12} className="animate-spin text-brand-500" /> : <ShieldCheck size={12} className="text-emerald-500" />}{locationName}</div>
            {isShortDay && <div className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-1.5 rounded-full shadow-md text-[10px] font-black uppercase tracking-widest animate-pulse border-2 border-white"><Info size={12} />Modo Dia Curto (4h)</div>}
        </div>
        <div className="relative inline-block"><h2 className="text-5xl md:text-7xl leading-none font-black text-slate-900 font-mono tracking-tighter transition-all duration-300">{currentTime}</h2><div className="mt-3 h-1 bg-brand-100 rounded-full overflow-hidden w-full"><div className="h-full bg-brand-500 animate-progress w-full"></div></div></div>
        <div className="mt-6"><div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full text-xs font-black border transition-all ${totalBankBalance >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}><Wallet size={16} />SALDO: {formatTime(totalBankBalance)}</div></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-4 w-full">
        <ActionButton type="entry" label="Entrada" icon={LogIn} colorClass="bg-gradient-to-br from-emerald-400 to-emerald-600" />
        <ActionButton type="lunchStart" label="Almoço (Ida)" icon={Utensils} colorClass="bg-gradient-to-br from-amber-400 to-amber-600" />
        <ActionButton type="lunchEnd" label="Almoço (Volta)" icon={Utensils} colorClass="bg-gradient-to-br from-amber-400 to-amber-600" />
        <ActionButton type="snackStart" label="Lanche (Ida)" icon={Coffee} colorClass="bg-gradient-to-br from-blue-400 to-blue-600" />
        <ActionButton type="snackEnd" label="Lanche (Volta)" icon={Coffee} colorClass="bg-gradient-to-br from-blue-400 to-blue-600" />
        <ActionButton type="exit" label="Saída" icon={LogOut} colorClass="bg-gradient-to-br from-rose-400 to-rose-600" />
      </div>
      <div className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100 text-[10px] font-bold text-blue-700 uppercase tracking-widest flex items-center gap-2">
          <Info size={14} /> Os intervalos de almoço e lanche (15 min) são descontados do tempo total.
      </div>
      <style>{`@keyframes progress { from { width: 0%; } to { width: 100%; } } .animate-progress { animation: progress 60s linear infinite; }`}</style>
    </div>
  );
};
