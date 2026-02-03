
import React, { useState, useEffect } from 'react';
import { DailyRecord, TimeRecordType, Employee } from './types.ts';
import { getCurrentTime, getTodayString, formatTime } from './utils.ts';
import { updateRecord, getTodayRecord, getBankBalance, getEmployees } from './storageService.ts';
import { generateSpeech, playAudioBuffer } from './geminiService.ts';
import { Utensils, Coffee, LogOut, LogIn, MapPin, Wallet, Loader2, CheckCircle2 } from 'lucide-react';

interface Props {
  onUpdate: (record: DailyRecord) => void | Promise<void>;
  employeeId: string;
}

export const TimeClock: React.FC<Props> = ({ onUpdate, employeeId }) => {
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [todayRecord, setTodayRecord] = useState<DailyRecord>(getTodayRecord(employeeId, getTodayString()));
  const [locationName, setLocationName] = useState<string>('Localizando...');
  const [totalBankBalance, setTotalBankBalance] = useState<number>(0);
  const [isPunching, setIsPunching] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getCurrentTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const employees = getEmployees();
    const emp = employees.find(e => String(e.id) === String(employeeId)) || null;
    setEmployee(emp);
    setTodayRecord(getTodayRecord(employeeId, getTodayString()));
    setTotalBankBalance(getBankBalance(employeeId));
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => setLocationName(`${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`),
            () => setLocationName('GPS Ativo')
        );
    }
  }, [employeeId]);

  const handlePunch = async (type: TimeRecordType) => {
    setIsPunching(type);
    const now = getCurrentTime();
    await new Promise(r => setTimeout(r, 600));
    
    const newRecord: DailyRecord = { ...todayRecord, [type]: now, location: locationName, employeeId };
    updateRecord(newRecord);
    setTodayRecord(newRecord);
    setTotalBankBalance(getBankBalance(employeeId));
    onUpdate(newRecord);
    
    const msg = `${type === 'entry' ? 'Entrada' : 'Registro'} ok às ${now}`;
    setSuccessMsg(msg);
    setIsPunching(null);
    
    const audio = await generateSpeech(`Olá ${employee?.name || ''}, ${msg}.`);
    if (audio) playAudioBuffer(audio);
    
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const ActionButton = ({ type, label, icon: Icon, colorClass }: any) => {
    const isDone = todayRecord[type as keyof DailyRecord] !== '';
    const isLoading = isPunching === type;
    
    return (
      <button
        onClick={() => handlePunch(type)}
        disabled={isDone || isPunching !== null}
        className={`relative flex flex-col items-center justify-center p-6 rounded-[2.5rem] transition-all duration-300 shadow-xl border-2 ${
            isDone 
            ? 'bg-slate-50 border-slate-100 text-slate-300' 
            : `bg-white border-slate-50 text-slate-600 hover:border-brand-200 active:scale-95`
        }`}
      >
        {isLoading ? <Loader2 size={24} className="animate-spin mb-2 text-brand-500" /> : <Icon size={24} className={`mb-2 ${!isDone ? colorClass : ''}`} />}
        <span className="text-[10px] font-black uppercase tracking-widest">{isDone ? todayRecord[type as keyof DailyRecord] : label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto py-8 animate-fade-in">
      {successMsg && (
        <div className="fixed top-10 bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl z-50 flex items-center gap-3 border border-slate-700">
            <CheckCircle2 size={20} className="text-emerald-500" />
            <span className="font-black text-xs uppercase tracking-widest">{successMsg}</span>
        </div>
      )}

      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border shadow-sm text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">
            <MapPin size={12} className="text-brand-500" /> {locationName}
        </div>
        <h1 className="text-7xl md:text-8xl font-black text-slate-900 font-mono tracking-tighter mb-4">{currentTime}</h1>
        <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black border uppercase tracking-widest ${totalBankBalance >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
            <Wallet size={14} /> Saldo: {formatTime(totalBankBalance)}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
        <ActionButton type="entry" label="Entrada" icon={LogIn} colorClass="text-emerald-500" />
        <ActionButton type="lunchStart" label="Almoço" icon={Utensils} colorClass="text-amber-500" />
        <ActionButton type="lunchEnd" label="Retorno" icon={Utensils} colorClass="text-amber-500" />
        <ActionButton type="snackStart" label="Lanche" icon={Coffee} colorClass="text-blue-500" />
        <ActionButton type="snackEnd" label="Retorno" icon={Coffee} colorClass="text-blue-500" />
        <ActionButton type="exit" label="Saída" icon={LogOut} colorClass="text-rose-500" />
      </div>
    </div>
  );
};
