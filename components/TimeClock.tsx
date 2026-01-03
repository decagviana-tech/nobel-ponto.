
import React, { useState, useEffect, useMemo } from 'react';
import { DailyRecord, TimeRecordType } from '../types';
import { getCurrentTime, getTodayString, formatTime } from '../utils';
import { updateRecord, getTodayRecord, getBankBalance, getLocationConfig } from '../services/storageService';
import { generateSpeech, playAudioBuffer } from '../services/geminiService';
import { Coffee, Utensils, LogOut, LogIn, MapPin, Wallet, Loader2, CheckCircle2, Building2, RefreshCw, Zap } from 'lucide-react';

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
                setLocationName('GPS Indisponível');
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
    
    // Simulação de processamento inteligente
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

    // Feedback por Voz Inteligente
    const audioData = await generateSpeech(msg);
    if (audioData) playAudioBuffer(audioData);

    setTimeout(() => setSuccessMsg(null), 4000);
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
          relative flex flex-col items-center justify-center p-8 rounded-3xl transition-all duration-300 shadow-lg border-2
          ${isDone 
            ? 'bg-slate-50 border-slate-100 text-slate-300 scale-95' 
            : isRecommended
              ? `${colorClass} text-white border-transparent scale-105 ring-8 ring-brand-100 shadow-brand-200 z-10 font-bold`
              : 'bg-white border-slate-100 text-slate-600 hover:border-brand-300 hover:bg-slate-50'
          }
        `}
      >
        {isRecommended && !isDone && (
            <div className="absolute -top-3 -right-3 bg-brand-500 text-white p-2 rounded-full shadow-lg animate-bounce">
                <Zap size={16} fill="white" />
            </div>
        )}
        {isLoading ? <Loader2 size={40} className="animate-spin mb-3" /> : <Icon size={40} className="mb-3" />}
        <span className="text-lg tracking-tight uppercase font-black">{isDone ? todayRecord[type as keyof DailyRecord] : label}</span>
        {isDone && <span className="mt-2 text-[10px] font-bold opacity-50">REGISTRADO</span>}
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto p-4 animate-fade-in relative">
      {successMsg && (
          <div className="fixed top-24 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50 animate-in fade-in slide-in-from-top-4">
              <div className="bg-emerald-500 p-1 rounded-full"><CheckCircle2 size={24} /></div>
              <span className="font-bold text-lg">{successMsg}</span>
          </div>
      )}

      <div className="text-center mb-12 w-full">
        <div className="mb-4 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border shadow-sm text-slate-400 font-bold text-xs uppercase tracking-widest">
            <RefreshCw size={14} className={isLocating ? 'animate-spin' : ''} />
            {locationName}
        </div>
        <h2 className="text-[10rem] leading-none font-black text-slate-900 font-mono tracking-tighter drop-shadow-2xl select-none">
          {currentTime}
        </h2>
        
        <div className={`mt-6 inline-flex items-center gap-2 px-6 py-2 rounded-full text-sm font-black border-2 transition-all
            ${totalBankBalance >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}
        `}>
            <Wallet size={18} />
            SALDO ATUAL: {formatTime(totalBankBalance)}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full">
        <ActionButton type="entry" label="Entrada" icon={LogIn} colorClass="bg-emerald-500" />
        <ActionButton type="lunchStart" label="Almoço (Ida)" icon={Utensils} colorClass="bg-amber-500" />
        <ActionButton type="lunchEnd" label="Almoço (Volta)" icon={Utensils} colorClass="bg-amber-500" />
        <ActionButton type="snackStart" label="Lanche (Ida)" icon={Coffee} colorClass="bg-indigo-500" />
        <ActionButton type="snackEnd" label="Lanche (Volta)" icon={Coffee} colorClass="bg-indigo-500" />
        <ActionButton type="exit" label="Saída" icon={LogOut} colorClass="bg-rose-500" />
      </div>

      <div className="mt-12 text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Building2 size={14} /> Nobel Petrópolis • Sistema Inteligente de Ponto
      </div>
    </div>
  );
};
