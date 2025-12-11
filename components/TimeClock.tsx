
import React, { useState, useEffect } from 'react';
import { DailyRecord, TimeRecordType } from '../types';
import { getCurrentTime, getTodayString, formatTime } from '../utils';
import { updateRecord, getTodayRecord, getBankBalance, getLocationConfig } from '../services/storageService';
import { Coffee, Utensils, LogOut, LogIn, MapPin, Wallet, AlertTriangle, Loader2, CheckCircle2, Building2, RefreshCw, Sparkles, Navigation } from 'lucide-react';

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
  const [isPunching, setIsPunching] = useState<string | null>(null); // Stores the type being punched
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
    // CHECK LOCATION STRATEGY
    const locConfig = getLocationConfig();
    setIsLocating(true);

    if (locConfig.useFixed && locConfig.fixedName) {
        setIsUsingFixedLocation(true);
        setLocationName(locConfig.fixedName);
        setCoords({ lat: 0, lng: 0 }); // Dummy coords for fixed location
        setIsLocating(false);
    } else {
        setIsUsingFixedLocation(false);
        setLocationName('Buscando satélites...');
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              setCoords({ lat, lng });
              setIsLocating(false);
              
              // 1. Define coordenadas como fallback imediato
              const rawCoords = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
              setLocationName(rawCoords);

              // 2. Tenta obter o endereço legível
              try {
                  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
                  const data = await response.json();
                  
                  if (data && data.address) {
                      const road = data.address.road || data.address.pedestrian || '';
                      const number = data.address.house_number || '';
                      const suburb = data.address.suburb || data.address.neighbourhood || '';
                      const city = data.address.city || data.address.town || data.address.municipality || '';
                      
                      let readableAddress = '';
                      
                      if (road) readableAddress += road;
                      if (number) readableAddress += `, ${number}`;
                      if (suburb) readableAddress += ` - ${suburb}`;
                      else if (city) readableAddress += ` - ${city}`;

                      if (readableAddress) {
                          setLocationName(readableAddress);
                      }
                  }
              } catch (error) {
                  // Silently fail to coordinates
              }
            }, 
            (error) => {
              setIsLocating(false);
              let msg = 'Localização indisponível';
              
              if (error.code === 1) msg = 'Permissão de local negada';
              else if (error.code === 2) msg = 'GPS indisponível';
              else if (error.code === 3) msg = 'Sem sinal de GPS';
              
              setLocationName(msg);
              setCoords(null);
            },
            { 
                enableHighAccuracy: true, 
                timeout: 20000, 
                maximumAge: 10000 
            }
          );
        } else {
          setIsLocating(false);
          setLocationName('Geolocalização não suportada');
        }
    }
  };

  const handlePunch = async (type: TimeRecordType) => {
    setIsPunching(type);
    
    // Simulate a small network delay for better UX feel
    await new Promise(resolve => setTimeout(resolve, 800));

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
    setSuccessMsg(`Registro de ${getLabel(type)} realizado com sucesso!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const getButtonStatus = (field: string) => {
    return todayRecord[field as keyof DailyRecord] !== '';
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

  // --- INTELLIGENCE LOGIC ---
  const getNextAction = (): TimeRecordType | null => {
      if (!todayRecord.entry) return 'entry';
      if (!todayRecord.lunchStart) return 'lunchStart';
      if (!todayRecord.lunchEnd) return 'lunchEnd';
      if (!todayRecord.exit) return 'exit';
      return null;
  };

  const nextAction = getNextAction();

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
    const isLoading = isPunching === type;
    const isNext = nextAction === type;
    
    return (
      <button
        onClick={() => handlePunch(type)}
        disabled={isDone || isPunching !== null}
        className={`
          relative flex flex-col items-center justify-center p-6 rounded-2xl shadow-lg transition-all duration-300 transform 
          ${isDone 
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200' 
            : isLoading 
                ? 'bg-slate-50 scale-95 ring-2 ring-brand-500' 
                : isNext
                    ? `${colorClass} scale-[1.02] ring-4 ring-offset-2 ring-brand-100 z-10 hover:scale-105 active:scale-95`
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-200 hover:bg-slate-50 hover:scale-105 active:scale-95'
          }
        `}
      >
        {isLoading ? (
            <Loader2 size={32} className="animate-spin text-brand-600 mb-2" />
        ) : (
            <Icon size={32} className={`mb-2 ${isNext && !isDone ? 'animate-bounce' : ''}`} />
        )}
        
        <span className={`font-bold text-lg ${!isDone && !isNext ? 'text-slate-600' : ''}`}>{isLoading ? 'Registrando...' : label}</span>
        
        {isNext && !isLoading && !isDone && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full shadow-md whitespace-nowrap flex items-center gap-1">
                <Sparkles size={10} className="text-amber-400" />
                Sugerido
            </span>
        )}
        
        {isDone && (
            <span className="absolute bottom-2 text-xs font-mono bg-white/50 px-2 py-0.5 rounded-full text-slate-500 font-bold border border-slate-200">
                {todayRecord[type as keyof DailyRecord]}
            </span>
        )}
      </button>
    );
  };

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Bom dia';
      if (hour < 18) return 'Boa tarde';
      return 'Boa noite';
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 animate-fade-in relative pb-12">
      
      {/* Success Toast */}
      {successMsg && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-bounce bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white/20">
              <div className="bg-white/20 p-1 rounded-full">
                <CheckCircle2 size={24} className="text-white" />
              </div>
              <span className="font-bold text-lg">{successMsg}</span>
          </div>
      )}

      {/* Bank Balance Badge */}
      <div className={`mb-6 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm border transition-colors mt-8
        ${totalBankBalance >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}
      `}>
        <Wallet size={16} />
        <span>Banco de Horas: {formatTime(totalBankBalance)}</span>
      </div>

      <div className="text-center mb-8 w-full max-w-md">
        <h3 className="text-slate-400 font-medium text-lg mb-1">{getGreeting()}!</h3>
        <h2 className="text-7xl font-black text-slate-800 tracking-tighter font-mono mb-4">
          {currentTime}
        </h2>
        
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`p-2 rounded-lg shrink-0 ${isUsingFixedLocation ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {isUsingFixedLocation ? <Building2 size={18} /> : <MapPin size={18} />}
                </div>
                <div className="text-left overflow-hidden">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Localização Atual</p>
                    <p className="text-xs font-medium text-slate-700 truncate w-full" title={locationName}>
                        {locationName}
                    </p>
                </div>
            </div>
            <button 
                onClick={refreshLocation}
                disabled={isLocating}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Atualizar GPS"
            >
                <RefreshCw size={18} className={isLocating ? 'animate-spin text-indigo-600' : ''} />
            </button>
        </div>
      </div>

      {/* INTELLIGENT SUGGESTION BANNER */}
      {nextAction && !isPunching && (
          <div className="mb-6 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-lg flex items-center gap-2 text-indigo-700 text-sm animate-fade-in">
              <Sparkles size={14} className="animate-pulse" />
              <span>Próximo registro sugerido: <strong>{getLabel(nextAction)}</strong></span>
          </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
        <ActionButton type="entry" label="Entrada" icon={LogIn} colorClass="bg-emerald-500 text-white" />
        
        <ActionButton type="lunchStart" label="Início Almoço" icon={Utensils} colorClass="bg-amber-500 text-white" />
        <ActionButton type="lunchEnd" label="Fim Almoço" icon={Utensils} colorClass="bg-amber-500 text-white" />
        
        <ActionButton type="snackStart" label="Início Lanche" icon={Coffee} colorClass="bg-blue-500 text-white" />
        <ActionButton type="snackEnd" label="Fim Lanche" icon={Coffee} colorClass="bg-blue-500 text-white" />
        
        <ActionButton type="exit" label="Saída" icon={LogOut} colorClass="bg-rose-500 text-white" />
      </div>

      <div className="mt-8 p-6 bg-white rounded-2xl shadow-sm border border-slate-200 w-full relative overflow-hidden">
        {todayRecord.entry && !todayRecord.exit && (
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 animate-pulse"></div>
        )}
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Resumo do Dia Atual</h3>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${todayRecord.entry ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <LogIn size={20} />
                </div>
                <div>
                    <p className="text-xs text-slate-500">Primeira Entrada</p>
                    <p className="font-bold text-slate-800 text-lg">{todayRecord.entry || '--:--'}</p>
                </div>
            </div>
            
            <div className="h-px w-full md:w-px md:h-10 bg-slate-200"></div>

            <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <span className={`px-3 py-1 rounded-full text-xs font-bold
                    ${todayRecord.exit ? 'bg-slate-100 text-slate-500' : 
                      todayRecord.entry ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-slate-100 text-slate-400'}
                `}>
                    {todayRecord.exit ? 'ENCERRADO' : todayRecord.entry ? 'TRABALHANDO' : 'AGUARDANDO'}
                </span>
            </div>

            <div className="h-px w-full md:w-px md:h-10 bg-slate-200"></div>

            <div className="flex items-center gap-3 text-right">
                <div>
                    <p className="text-xs text-slate-500">Tempo Total</p>
                    <p className="font-bold text-brand-600 text-lg">
                        {formatTime(todayRecord.totalMinutes)}
                    </p>
                </div>
                <div className={`p-3 rounded-full ${todayRecord.totalMinutes > 0 ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'}`}>
                    <CheckCircle2 size={20} />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
