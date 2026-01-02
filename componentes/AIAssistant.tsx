
import React, { useState } from 'react';
import { Bot, Send, Sparkles, Loader2, Volume2 } from 'lucide-react';
import { analyzeTimesheet, generateSpeech, playAudioBuffer } from '../servicos/geminiService';
import { getRecords, getBankBalance } from '../servicos/storageService';

interface Props { employeeId: string; }

export const AIAssistant: React.FC<Props> = ({ employeeId }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const result = await analyzeTimesheet(getRecords(employeeId), getBankBalance(employeeId), query);
    setResponse(result);
    setLoading(false);
  };

  const handleListen = async () => {
    if (!response || isSpeaking) return;
    setIsSpeaking(true);
    const audioData = await generateSpeech(response);
    if (audioData) await playAudioBuffer(audioData);
    setIsSpeaking(false);
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4">
      <div className="text-center mb-8">
        <Bot size={48} className="mx-auto text-indigo-600 mb-2" />
        <h2 className="text-2xl font-bold text-slate-800">Nobel Auditor IA</h2>
        <p className="text-slate-500">Dúvidas sobre seu banco de horas?</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-6 flex-1 flex flex-col min-h-[400px]">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400">
               <Loader2 className="animate-spin mb-2" />
               <span>Analisando...</span>
             </div>
          ) : response && (
             <div className="bg-indigo-50 p-4 rounded-xl relative border border-indigo-100 animate-fade-in">
               <button 
                 onClick={handleListen} 
                 className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm hover:bg-indigo-100 transition-colors"
               >
                 <Volume2 size={16} className={isSpeaking ? 'animate-pulse text-indigo-600' : 'text-slate-400'} />
               </button>
               <p className="text-slate-700 leading-relaxed pr-8">{response}</p>
             </div>
          )}
        </div>
        <div className="flex gap-2">
          <input 
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            placeholder="Como está meu saldo?" 
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          />
          <button onClick={handleAsk} disabled={loading || !query.trim()} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
