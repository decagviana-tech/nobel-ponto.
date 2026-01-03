
import React, { useState, useEffect, useMemo } from 'react';
import { DailyRecord, TimeRecordType } from '../types';
import { getCurrentTime, getTodayString, formatTime } from '../utils';
import { updateRecord, getTodayRecord, getBankBalance, getLocationConfig } from '../services/storageService';
import { generateSpeech, playAudioBuffer } from '../services/geminiService';
import { Coffee, Utensils, LogOut, LogIn, MapPin, Wallet, Loader2, CheckCircle2, Building2, RefreshCw, Zap, ShieldCheck } from 'lucide-react';

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
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setLocationName(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
                setIsLocating(false);
            }, () => {
                setLocationName('GPS Ativo');
                setIsLocating(false);
            });
        }
    }
  };

  const nextRecommendedAction = useMemo(() => {
      if (!todayRecord.entry) return 'entry';
      if (!todayRecord.lunchStart) return 'lunchStart';
      if (!todayRecord.lunchEnd) return 'lunchEnd';
      if (!todayRecord.exit) return 'exit';
      return null;
  }, [todayRecord]);

  const handlePunch = async (type: TimeRecordType) => {
    setIsPunching(type);
    const now = getCurrentTime();
    
    // Aesthetic processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newRecord: DailyRecord = { ...todayRecord, [type]: now, location: locationName, employeeId };
    setTodayRecord(newRecord);
    updateRecord(newRecord);
    setTotalBankBalance(getBankBalance(employeeId));
    onUpdate(newRecord);
    
    const label = getLabel(type);
    const msg = `${label} registrado com sucesso às ${now}`;
    setSuccessMsg(msg);
    setIsPunching(null);

    // AI Voice feedback
    const audioData = await generateSpeech(msg);
    if (audioData) playAudioBuffer(audioData);

    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const getLabel = (type: string) => {
    const labels: any = { entry: 'Entrada', lunchStart: 'Almoço (Ida)', lunchEnd: 'Almoço (Volta)', snackStart: 'Lanche (Ida)', snackEnd: 'Lanche (Volta)', exit: 'Saída' };
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
        className={`
          relative flex flex-col items-center justify-center p-10 rounded-[2.5rem] transition-all duration-500 shadow-xl border-2
          ${isDone 
            ? 'bg-slate-50 border-slate-100 text-slate-300 scale-95 opacity-80' 
            : isRecommended
              ? `${colorClass} text-white border-transparent scale-105 ring-[12px] ring-brand-100/50 shadow-brand-200/50 z-10 font-black shadow-2xl`
              : 'bg-white border-slate-100 text-slate-600 hover:border-brand-200 hover:shadow-2xl hover:bg-slate-50 active:scale-95'
          }
        `}
      >
        {isRecommended && !isDone && (
            <div className="absolute -top-4 -right-4 bg-brand-500 text-white p-2.5 rounded-full shadow-lg animate-bounce border-4 border-white">
                <Zap size={20} fill="white" />
            </div>
        )}
        {isLoading ? <Loader2 size={48} className="animate-spin mb-4" /> : <Icon size={48} className="mb-4" />}
        <span className="text-xl tracking-tight uppercase font-black">{isDone ? todayRecord[type as keyof DailyRecord] : label}</span>
        {isDone && <span className="mt-2 text-[10px] font-black tracking-widest opacity-60 uppercase">Registrado</span>}
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto p-6 animate-fade-in">
      {successMsg && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-5 z-[100] animate-in slide-in-from-top-10 fade-in duration-500 border border-slate-700 backdrop-blur-md">
              <div className="bg-emerald-500 p-2 rounded-full"><CheckCircle2 size={24} /></div>
              <span className="font-bold text-xl">{successMsg}</span>
          </div>
      )}

      <div className="text-center mb-16 w-full">
        <div className="mb-6 inline-flex items-center gap-3 bg-white px-5 py-2.5 rounded-full border shadow-sm text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] transition-all">
            {isLocating ? <RefreshCw size={14} className="animate-spin text-brand-500" /> : <ShieldCheck size={14} className="text-emerald-500" />}
            {locationName}
        </div>
        
        <div className="relative inline-block">
            <h2 className="text-[12rem] leading-none font-black text-slate-900 font-mono tracking-tighter drop-shadow-2xl select-none transition-all duration-300">
                {currentTime}
            </h2>
            <div className="absolute -bottom-4 left-0 right-0 h-1.5 bg-brand-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 animate-progress w-full"></div>
            </div>
        </div>
        
        <div className={`mt-10 inline-flex items-center gap-3 px-8 py-3 rounded-[2rem] text-sm font-black border-2 transition-all shadow-sm
            ${totalBankBalance >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}
        `}>
            <Wallet size={20} />
            BANCO DE HORAS: {formatTime(totalBankBalance)}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-8 w-full">
        <ActionButton type="entry" label="Entrada" icon={LogIn} colorClass="bg-gradient-to-br from-emerald-400 to-emerald-600" />
        <ActionButton type="lunchStart" label="Almoço (Ida)" icon={Utensils} colorClass="bg-gradient-to-br from-amber-400 to-amber-600" />
        <ActionButton type="lunchEnd" label="Almoço (Volta)" icon={Utensils} colorClass="bg-gradient-to-br from-amber-400 to-amber-600" />
        <ActionButton type="snackStart" label="Lanche (Ida)" icon={Coffee} colorClass="bg-gradient-to-br from-indigo-400 to-indigo-600" />
        <ActionButton type="snackEnd" label="Lanche (Volta)" icon={Coffee} colorClass="bg-gradient-to-br from-indigo-400 to-indigo-600" />
        <ActionButton type="exit" label="Saída" icon={LogOut} colorClass="bg-gradient-to-br from-rose-400 to-rose-600" />
      </div>

      <div className="mt-20 text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
          <Building2 size={16} /> Nobel Petrópolis • Sistema Inteligente de Ponto
      </div>
      
      <style>{`
        @keyframes progress {
            from { width: 0%; }
            to { width: 100%; }
        }
        .animate-progress {
            animation: progress 60s linear infinite;
        }
      `}</style>
    </div>
  );
};
