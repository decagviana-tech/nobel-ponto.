
import React, { useState } from 'react';
import { Bot, Send, Sparkles, Loader2, Volume2, Key, AlertCircle, Settings } from 'lucide-react';
import { analyzeTimesheet, generateSpeech, playAudioBuffer } from '../services/geminiService';
import { getRecords, getBankBalance } from '../services/storageService';

interface Props { employeeId: string; }

export const AIAssistant: React.FC<Props> = ({ employeeId }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setNeedsKey(false);
    
    const result = await analyzeTimesheet(getRecords(employeeId), getBankBalance(employeeId), query);
    
    if (result === "CHAVE_REQUERIDA") {
        setNeedsKey(true);
        setResponse(null);
    } else {
        setResponse(result);
    }
    setLoading(false);
  };

  const handleActivateKey = async () => {
      if ((window as any).aistudio?.openSelectKey) {
          await (window as any).aistudio.openSelectKey();
          handleAsk(); 
      }
  };

  const handleListen = async () => {
    if (!response || isSpeaking) return;
    setIsSpeaking(true);
    const audioData = await generateSpeech(response);
    if (audioData) await playAudioBuffer(audioData);
    setIsSpeaking(false);
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4 animate-fade-in">
      <div className="text-center mb-8">
        <div className="bg-brand-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-200">
            <Bot size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Nobel Auditor IA</h2>
        <p className="text-sm text-slate-400 font-medium">Análise inteligente do seu banco de horas</p>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 flex-1 flex flex-col min-h-[450px]">
        <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-2 custom-scrollbar">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
               <div className="relative">
                   <Loader2 className="animate-spin text-brand-500" size={48} />
                   <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-300" size={20} />
               </div>
               <span className="font-bold uppercase text-[10px] tracking-widest">Consultando Auditor Nobel...</span>
             </div>
          ) : needsKey ? (
            <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl text-center space-y-4 animate-in zoom-in-95 duration-300">
                <div className="bg-rose-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-rose-600">
                    <Key size={24} />
                </div>
                <div>
                    <h4 className="font-bold text-rose-900">IA Não Ativada</h4>
                    <p className="text-xs text-rose-700 mt-1">Para usar o auditor, você precisa ativar sua chave de faturamento Google.</p>
                </div>
                <button 
                    onClick={handleActivateKey}
                    className="w-full bg-rose-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
                >
                    <Settings size={16} /> Ativar Inteligência Nobel
                </button>
            </div>
          ) : response ? (
             <div className="bg-slate-50 p-6 rounded-[2rem] relative border border-slate-100 animate-in slide-in-from-bottom-4 duration-500">
               <button 
                 onClick={handleListen} 
                 title="Ouvir Resposta"
                 className={`absolute top-4 right-4 p-3 rounded-full shadow-sm transition-all ${isSpeaking ? 'bg-brand-600 text-white' : 'bg-white text-slate-400 hover:text-brand-600'}`}
               >
                 <Volume2 size={18} className={isSpeaking ? 'animate-pulse' : ''} />
               </button>
               <p className="text-slate-700 leading-relaxed pr-10 font-medium">{response}</p>
             </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2 opacity-60">
                <Sparkles size={40} />
                <p className="text-xs font-bold uppercase tracking-widest">Aguardando sua pergunta...</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-auto">
          <input 
            className="flex-1 bg-white border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400 shadow-inner" 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            placeholder="Ex: Como está meu saldo hoje?" 
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          />
          <button 
            onClick={handleAsk} 
            disabled={loading || !query.trim()} 
            className="bg-brand-600 text-white p-5 rounded-2xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 disabled:opacity-30 disabled:shadow-none active:scale-95"
          >
            <Send size={24} />
          </button>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};
