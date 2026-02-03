
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Loader2, Volume2, Key, MessageCircle, ArrowRight } from 'lucide-react';
import { analyzeTimesheet, generateSpeech, playAudioBuffer } from './geminiService.ts';
import { getRecords, getBankBalance } from './storageService.ts';

interface Props { employeeId: string; }

export const AIAssistant: React.FC<Props> = ({ employeeId }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorType, setErrorType] = useState<'NONE' | 'AUTH' | 'QUOTA'>('NONE');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [response, loading]);

  const handleAsk = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setErrorType('NONE');
    setResponse(null);
    const result = await analyzeTimesheet(getRecords(employeeId), getBankBalance(employeeId), query);
    if (result === "ERRO_CHAVE_AUSENTE") setErrorType('AUTH');
    else setResponse(result);
    setLoading(false);
    setQuery('');
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4 animate-fade-in">
      <div className="text-center mb-6">
        <div className="bg-brand-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg"><Bot size={28} className="text-white" /></div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Auditor Nobel IA</h2>
      </div>
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-6 flex-1 flex flex-col min-h-[500px] relative">
        <div className="flex-1 overflow-y-auto mb-6 space-y-4">
          {errorType === 'AUTH' ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <Key size={32} className="text-amber-500 mb-4" />
              <h4 className="font-black text-slate-800 uppercase">IA Desconectada</h4>
              <p className="text-xs text-slate-400 mt-2">Ative sua chave de API nas configurações.</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4"><Loader2 className="animate-spin text-brand-500" size={40} /></div>
          ) : response ? (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0"><Bot size={20} /></div>
              <div className="bg-slate-50 p-6 rounded-3xl rounded-tl-none border flex-1 relative">
                 <button onClick={async () => { setIsSpeaking(true); const audio = await generateSpeech(response); if (audio) await playAudioBuffer(audio); setIsSpeaking(false); }} className={`absolute -top-3 -right-3 p-3 rounded-full shadow-xl ${isSpeaking ? 'bg-brand-600 text-white animate-pulse' : 'bg-white text-brand-600'}`}><Volume2 size={18} /></button>
                 <p className="text-slate-700 font-semibold text-sm">{response}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-6 opacity-40"><MessageCircle size={64} strokeWidth={1} /></div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="relative">
          <input className="w-full bg-slate-50 border rounded-3xl px-6 py-5 focus:bg-white outline-none font-bold text-sm" value={query} onChange={e => setQuery(e.target.value)} placeholder="Pergunte sobre seu saldo..." onKeyDown={e => e.key === 'Enter' && handleAsk()} />
          <button onClick={handleAsk} disabled={loading || !query.trim()} className="absolute right-3 top-3 bottom-3 bg-brand-600 text-white w-12 rounded-2xl flex items-center justify-center"><Send size={20} /></button>
        </div>
      </div>
    </div>
  );
};
