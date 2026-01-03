
import React, { useState } from 'react';
import { Bot, Send, Sparkles, Loader2, Volume2, Key, AlertCircle, Settings, Wallet } from 'lucide-react';
import { analyzeTimesheet, generateSpeech, playAudioBuffer } from '../services/geminiService';
import { getRecords, getBankBalance } from '../services/storageService';

interface Props { employeeId: string; }

export const AIAssistant: React.FC<Props> = ({ employeeId }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorState, setErrorState] = useState<'NONE' | 'KEY_REQUIRED' | 'QUOTA_EXHAUSTED'>('NONE');

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setErrorState('NONE');
    
    const result = await analyzeTimesheet(getRecords(employeeId), getBankBalance(employeeId), query);
    
    if (result === "CHAVE_REQUERIDA") {
        setErrorState('KEY_REQUIRED');
        setResponse(null);
    } else if (result === "QUOTA_EXHAUSTED") {
        setErrorState('QUOTA_EXHAUSTED');
        setResponse(null);
    } else {
        setResponse(result);
    }
    setLoading(false);
  };

  const handleActivateKey = async () => {
      if ((window as any).aistudio?.openSelectKey) {
          await (window as any).aistudio.openSelectKey();
          handleAsk(); // Tenta novamente após a seleção
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
      <div className="text-center mb-6">
        <div className="bg-brand-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Bot size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Nobel Auditor IA</h2>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Inteligência de RH Nobel</p>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 flex-1 flex flex-col min-h-[400px]">
        <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-1">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
               <Loader2 className="animate-spin text-brand-500" size={40} />
               <span className="font-bold uppercase text-[9px] tracking-widest">Consultando Auditor...</span>
             </div>
          ) : errorState !== 'NONE' ? (
            <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl text-center space-y-4 animate-in zoom-in-95">
                <div className="bg-rose-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-rose-600">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <h4 className="font-bold text-rose-900">
                        {errorState === 'QUOTA_EXHAUSTED' ? 'Limite de Cota Atingido' : 'IA Não Ativada'}
                    </h4>
                    <p className="text-xs text-rose-700 mt-2 leading-relaxed">
                        {errorState === 'QUOTA_EXHAUSTED' 
                           ? 'A cota gratuita do servidor acabou para este período. Para continuar usando agora sem limites, você pode ativar sua própria chave de API.' 
                           : 'Para usar o auditor, você precisa ativar uma chave de API Google.'}
                    </p>
                    <a 
                      href="https://ai.google.dev/gemini-api/docs/billing" 
                      target="_blank" 
                      className="text-[10px] text-rose-500 font-bold underline mt-2 inline-block hover:text-rose-700"
                    >
                      Sobre faturamento e limites do Gemini
                    </a>
                </div>
                <button 
                    onClick={handleActivateKey}
                    className="w-full bg-rose-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                    <Settings size={16} /> Ativar Chave Pessoal Nobel
                </button>
            </div>
          ) : response ? (
             <div className="bg-slate-50 p-5 rounded-[1.5rem] relative border border-slate-100 animate-in slide-in-from-bottom-2">
               <button 
                 onClick={handleListen} 
                 className={`absolute top-3 right-3 p-2 rounded-full transition-all ${isSpeaking ? 'bg-brand-600 text-white' : 'bg-white text-slate-300 hover:text-brand-600'}`}
               >
                 <Volume2 size={16} className={isSpeaking ? 'animate-pulse' : ''} />
               </button>
               <p className="text-slate-700 leading-relaxed pr-8 font-medium text-sm">{response}</p>
             </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-200 gap-2 opacity-50">
                <Sparkles size={32} />
                <p className="text-[9px] font-black uppercase tracking-[0.2em]">Aguardando sua dúvida...</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input 
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 shadow-inner text-sm" 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            placeholder="Ex: Como está meu saldo?" 
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          />
          <button 
            onClick={handleAsk} 
            disabled={loading || !query.trim()} 
            className="bg-brand-600 text-white p-3.5 rounded-xl hover:bg-brand-700 transition-all shadow-md disabled:opacity-30 active:scale-95"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
