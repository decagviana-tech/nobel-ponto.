
import React, { useState, useEffect, useMemo } from 'react';
import { DailyRecord, TimeRecordType } from '../types';
import { getCurrentTime, getTodayString, formatTime } from '../utils';
import { updateRecord, getTodayRecord, getBankBalance, getLocationConfig } from '../services/storageService';
import { Coffee, Utensils, LogOut, LogIn, MapPin, Wallet, Loader2, CheckCircle2, Building2, RefreshCw } from 'lucide-react';

interface Props {
  onUpdate: (record: DailyRecord) => void;
  employeeId: string;
}

interface Coords {
  lat: number;
  lng: number;
}

export const TimeClock: React.FC<Props> = ({ onUpdate, employeeId }) => {
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [todayRecord, setTodayRecord] = useState<DailyRecord>(getTodayRecord(employeeId, getTodayString()));
  const [locationName, setLocationName] = useState<string>('Obtendo localização...');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [totalBankBalance, setTotalBankBalance] = useState<number>(0);
  const [isPunching, setIsPunching] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isUsingFixedLocation, setIsUsingFixedLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getCurrentTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const today = getTodayString();
    setTodayRecord(getTodayRecord(employeeId, today));
    setTotalBankBalance(getBankBalance(employeeId));
    refreshLocation();
  }, [employeeId]);

  const refreshLocation = () => {
    const locConfig = getLocationConfig();
    setIsLocating(true);

    if (locConfig.useFixed && locConfig.fixedName) {
        setIsUsingFixedLocation(true);
        setLocationName(locConfig.fixedName);
        setCoords({ lat: 0, lng: 0 });
        setIsLocating(false);
    } else {
        setIsUsingFixedLocation(false);
        setLocationName('Buscando sinal...');
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              setCoords({ lat, lng });
              setIsLocating(false);
              const rawCoords = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
              setLocationName(rawCoords);

              try {
                  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
                  const data = await response.json();
                  if (data && data.address) {
                      const road = data.address.road || data.address.pedestrian || '';
                      const number = data.address.house_number || '';
                      const city = data.address.city || data.address.town || '';
                      let readableAddress = [road, number, city].filter(Boolean).join(', ');
                      if (readableAddress) setLocationName(readableAddress);
                  }
              } catch (e) {}
            }, 
            () => {
              setIsLocating(false);
              setLocationName('GPS indisponível');
              setCoords(null);
            },
            { enableHighAccuracy: true, timeout: 15000 }
          );
        } else {
          setIsLocating(false);
          setLocationName('Sem suporte a GPS');
        }
    }
  };

  const handlePunch = async (type: TimeRecordType) => {
    setIsPunching(type);
    await new Promise(resolve => setTimeout(resolve, 600));
    const now = getCurrentTime();
    
    const newRecord: DailyRecord = { 
      ...todayRecord, 
      [type]: now, 
      location: locationName, 
      employeeId,
      latitude: coords?.lat,
      longitude: coords?.lng
    };
    
    setTodayRecord(newRecord);
    updateRecord(newRecord);
    setTotalBankBalance(getBankBalance(employeeId));
    onUpdate(newRecord);
    
    setIsPunching(null);
    setSuccessMsg(`${getLabel(type)} registrado às ${now}!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const getLabel = (type: string) => {
    switch(type) {
        case 'entry': return 'Entrada';
        case 'lunchStart': return 'Início Almoço';
        case 'lunchEnd': return 'Fim Almoço';
        case 'snackStart': return 'Início Lanche';
        case 'snackEnd': return 'Fim Lanche';
        case 'exit': return 'Saída';
        default: return type;
    }
  };

  const nextAction = useMemo(() => {
      if (!todayRecord.entry) return 'entry';
      if (!todayRecord.lunchStart) return 'lunchStart';
      if (!todayRecord.lunchEnd) return 'lunchEnd';
      if (!todayRecord.exit) return 'exit';
      return null;
  }, [todayRecord]);

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
    const isDone = todayRecord[type as keyof DailyRecord] !== '';
    const isLoading = isPunching === type;
    const isNext = nextAction === type;
    
    return (
      <button
        onClick={() => handlePunch(type)}
        disabled={isDone || isPunching !== null}
        className={`
          relative flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-300 transform shadow-md
          ${isDone 
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
            : isNext
                ? `${colorClass} scale-105 ring-4 ring-offset-2 ring-brand-100 z-10 shadow-xl hover:scale-110 active:scale-95 animate-pulse`
                : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300 hover:scale-105 active:scale-95'
          }
        `}
      >
        {isLoading ? (
            <Loader2 size={32} className="animate-spin text-brand-600 mb-2" />
        ) : (
            <Icon size={32} className={`mb-2 ${isNext && !isDone ? 'animate-bounce' : ''}`} />
        )}
        <span className="font-bold text-lg leading-tight">{isLoading ? 'Gravando...' : label}</span>
        {isDone && (
            <span className="mt-2 text-xs font-mono bg-white/60 px-2 py-0.5 rounded-full text-slate-600 font-bold border border-slate-200">
                {todayRecord[type as keyof DailyRecord]}
            </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 animate-fade-in relative pb-12">
      {successMsg && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-bounce bg-emerald-600 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white/20">
              <CheckCircle2 size={28} />
              <span className="font-bold text-xl">{successMsg}</span>
          </div>
      )}

      <div className={`mb-8 px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm border transition-all mt-4
        ${totalBankBalance >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}
      `}>
        <Wallet size={18} />
        <span>Saldo Banco de Horas: {formatTime(totalBankBalance)}</span>
      </div>

      <div className="text-center mb-12 w-full max-w-md">
        <h2 className="text-8xl font-black text-slate-800 tracking-tighter font-mono mb-4 drop-shadow-sm">
          {currentTime}
        </h2>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3 overflow-hidden text-left">
                <div className={`p-2.5 rounded-xl shrink-0 ${isUsingFixedLocation ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-700'}`}>
                    {isUsingFixedLocation ? <Building2 size={20} /> : <MapPin size={20} />}
                </div>
                <div className="overflow-hidden">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ponto Geográfico</p>
                    <p className="text-xs font-semibold text-slate-700 truncate w-full">{locationName}</p>
                </div>
            </div>
            <button onClick={refreshLocation} disabled={isLocating} className="p-2.5 text-slate-400 hover:text-brand-600 rounded-xl">
                <RefreshCw size={20} className={isLocating ? 'animate-spin' : ''} />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full px-2">
        <ActionButton type="entry" label="Entrada" icon={LogIn} colorClass="bg-emerald-500 text-white" />
        <ActionButton type="lunchStart" label="Almoço (Ida)" icon={Utensils} colorClass="bg-amber-500 text-white" />
        <ActionButton type="lunchEnd" label="Almoço (Volta)" icon={Utensils} colorClass="bg-amber-500 text-white" />
        <ActionButton type="snackStart" label="Lanche (Ida)" icon={Coffee} colorClass="bg-indigo-500 text-white" />
        <ActionButton type="snackEnd" label="Lanche (Volta)" icon={Coffee} colorClass="bg-indigo-500 text-white" />
        <ActionButton type="exit" label="Saída" icon={LogOut} colorClass="bg-rose-500 text-white" />
      </div>
    </div>
  );
};
