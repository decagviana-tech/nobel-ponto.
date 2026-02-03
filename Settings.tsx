
import { useState, useEffect } from 'react';
import { getGoogleConfig, saveGoogleConfig } from './storageService.ts';
import { GoogleConfig } from './types.ts';
import { Database, Trash2, ShieldAlert } from 'lucide-react';

export const Settings = ({ onConfigSaved }: any) => {
  const [config, setConfig] = useState<GoogleConfig>({ scriptUrl: '', enabled: false });
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => { setConfig(getGoogleConfig()); }, []);

  const handleSave = () => {
    saveGoogleConfig(config);
    setStatus('saved');
    onConfigSaved();
    setTimeout(() => setStatus('idle'), 2000);
  };

  const handleClearLocalCache = () => {
      if (confirm("Deseja apagar a memória local do App?")) { localStorage.clear(); window.location.reload(); }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20 space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border">
        <div className="flex items-center gap-3 mb-8"><Database size={24} className="text-brand-600" /><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Conexão Google</h2></div>
        <input type="text" className="w-full bg-slate-50 border rounded-2xl p-4 font-mono text-xs mb-4" value={config.scriptUrl} onChange={e => setConfig({...config, scriptUrl: e.target.value})} placeholder="URL do Google Script" />
        <button onClick={handleSave} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold">{status === 'saved' ? 'Salvo!' : 'Salvar Alterações'}</button>
      </div>
      <div className="bg-rose-50 p-8 rounded-[2.5rem] shadow-xl border border-rose-100 flex justify-between items-center">
        <div><h3 className="font-black uppercase text-rose-700">Limpeza de Dados</h3><p className="text-xs text-rose-600">Apaga o cache local do celular.</p></div>
        <button onClick={handleClearLocalCache} className="bg-rose-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase shadow-lg"><Trash2 size={18} /></button>
      </div>
    </div>
  );
};
