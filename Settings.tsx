
import { useState, useEffect } from 'react';
import { getGoogleConfig, saveGoogleConfig, getLocationConfig, saveLocationConfig } from '../services/storageService';
import { GoogleConfig, LocationConfig } from '../types';
import { Save, Database, Link, RefreshCw, Info, Table as TableIcon } from 'lucide-react';

export const Settings = ({ onConfigSaved }: any) => {
  const [config, setConfig] = useState<GoogleConfig>({ scriptUrl: '', enabled: false });
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    setConfig(getGoogleConfig());
  }, []);

  const handleSave = () => {
    saveGoogleConfig(config);
    setStatus('saved');
    onConfigSaved();
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20 space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border">
        <div className="flex items-center gap-3 mb-8">
            <div className="bg-brand-500/10 p-3 rounded-2xl text-brand-600"><Database size={24} /></div>
            <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Conexão Google Sheets</h2></div>
        </div>
        <div className="space-y-6">
            <input type="text" className="w-full bg-slate-50 border rounded-2xl p-4 font-mono text-xs text-slate-900 focus:bg-white outline-none" value={config.scriptUrl} onChange={e => setConfig({...config, scriptUrl: e.target.value})} placeholder="https://script.google.com/macros/s/..." />
            <button onClick={handleSave} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl">{status === 'saved' ? 'Configuração Salva!' : 'Salvar Alterações'}</button>
        </div>
      </div>
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border">
        <h3 className="text-sm font-black text-slate-800 uppercase mb-6 flex items-center gap-2"><TableIcon size={18} className="text-emerald-500" /> Estrutura da Planilha (A-F)</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">Andrea, sua planilha deve seguir este modelo básico para funcionar bem:</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {['ID', 'Nome', 'Cargo', 'PIN', 'Active', 'Vigência'].map((item, idx) => (
                <div key={idx} className="border p-3 rounded-2xl text-center bg-white shadow-sm">
                    <p className="text-[9px] font-black text-slate-300 uppercase mb-1">Col {String.fromCharCode(65+idx)}</p>
                    <p className="text-[10px] font-black truncate">{item}</p>
                </div>
            ))}
        </div>
        <div className="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3"><Info size={16} className="text-emerald-600 shrink-0 mt-0.5" /><div className="text-[11px] text-emerald-900 leading-relaxed font-medium"><p className="font-bold">Correção de Vigência:</p><p>O campo Vigência (Data de Início) agora é salvo no seu navegador primeiro. Isso evita que ele "pule" de volta quando a internet oscila.</p></div></div>
      </div>
    </div>
  );
};
