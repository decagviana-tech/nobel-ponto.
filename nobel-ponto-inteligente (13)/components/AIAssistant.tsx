
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, Loader2, Volume2, Key, ShieldAlert, MessageCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { analyzeTimesheet, generateSpeech, playAudioBuffer } from '../services/geminiService';
import { getRecords, getBankBalance } from '../services/storageService';

interface Props { employeeId: string; }

export const AIAssistant: React.FC<Props> = ({ employeeId }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorType, setErrorType] = useState<'NONE' | 'AUTH' | 'QUOTA' | 'GENERIC'>('NONE');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [response, loading]);

  const handleAsk = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setErrorType('NONE');
    setResponse(null);

    const result = await analyzeTimesheet(getRecords(employeeId), getBankBalance(employeeId), query);

    if (result === "ERRO_CHAVE_AUSENTE") setErrorType('AUTH');
    else if (result === "ERRO_LIMITE_ATINGIDO") setErrorType('QUOTA');
    else setResponse(result);
    
    setLoading(false);
    setQuery('');
  };

  const handleActivateKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio?.openSelectKey) {
      await aiStudio.openSelectKey();
      window.location.reload();
    } else {
      alert("Ative a chave de API no painel do editor.");
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4 animate-fade-in">
      <div className="text-center mb-6">
        <div className="bg-brand-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-brand-100">
            <Bot size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Auditor Nobel IA</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Inteligência de RH Petrópolis</p>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-6 flex-1 flex flex-col min-h-[500px] relative overflow-hidden">
        <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-2">
          {errorType === 'AUTH' ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95">
              <Key size={32} className="text-amber-500 mb-4" />
              <h4 className="font-black text-slate-800 uppercase text-lg">IA Desconectada</h4>
              <button onClick={handleActivateKey} className="mt-6 w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all">
                Conectar Agora <ArrowRight size={16} className="inline ml-2" />
              </button>
            </div>
          ) : errorType === 'QUOTA' ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <RefreshCw size={32} className="text-brand-500 mb-4 animate-spin-slow" />
              <h4 className="font-black text-slate-800 uppercase">Limite Atingido</h4>
              <p className="text-xs text-slate-500 mt-2">Aguarde alguns minutos ou use uma chave de API paga.</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
              <Loader2 className="animate-spin text-brand-500" size={40} />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analisando registros...</p>
            </div>
          ) : response ? (
            <div className="animate-in slide-in-from-bottom-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0"><Bot size={20} /></div>
                <div className="bg-slate-50 p-6 rounded-3xl rounded-tl-none border border-slate-100 flex-1 relative">
                   <button onClick={async () => {
                     setIsSpeaking(true);
                     const audio = await generateSpeech(response);
                     if (audio) await playAudioBuffer(audio);
                     setIsSpeaking(false);
                   }} className={`absolute -top-3 -right-3 p-3 rounded-full shadow-xl ${isSpeaking ? 'bg-brand-600 text-white animate-pulse' : 'bg-white text-brand-600'}`}>
                     <Volume2 size={18} />
                   </button>
                   <p className="text-slate-700 leading-relaxed font-semibold text-sm">{response}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-6 opacity-40">
                <MessageCircle size={64} strokeWidth={1} />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Pronto para Auditoria</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="relative">
          <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-5 focus:bg-white focus:border-brand-500 outline-none font-bold text-sm" 
            value={query} onChange={e => setQuery(e.target.value)} 
            placeholder="Ex: Qual meu saldo atual?" onKeyDown={e => e.key === 'Enter' && handleAsk()}
            disabled={loading || errorType === 'AUTH'} />
          <button onClick={handleAsk} disabled={loading || !query.trim()} className="absolute right-3 top-3 bottom-3 bg-brand-600 text-white w-12 rounded-2xl flex items-center justify-center active:scale-90 transition-all">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
