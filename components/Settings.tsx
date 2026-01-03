
import React, { useState, useEffect } from 'react';
import { getGoogleConfig, saveGoogleConfig, getLocationConfig, saveLocationConfig, LocationConfig, getAllRecords, getEmployees, getBankBalance } from '../services/storageService';
import { readSheetData, readEmployeesFromSheet, syncRowToSheet } from '../services/googleSheetsService';
import { mergeExternalRecords, mergeExternalEmployees } from '../services/storageService';
import { GoogleConfig } from '../types';
import { Save, Database, CheckCircle, Link, Trash2, HelpCircle, Activity, Lock, MapPin, Building2, DownloadCloud, UploadCloud, Code, Copy, X, AlertTriangle, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { ImportModal } from './ImportModal';

const CURRENT_SCRIPT_VERSION = '2.5';

const APPS_SCRIPT_CODE = `/* ... código do script omitido para brevidade ... */`;

interface Props {
  onConfigSaved: () => void;
}

export const Settings: React.FC<Props> = ({ onConfigSaved }) => {
  const [config, setConfig] = useState<GoogleConfig>({ scriptUrl: '', enabled: false });
  const [locConfig, setLocConfig] = useState<LocationConfig>({ useFixed: false, fixedName: '' });
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [isTesting, setIsTesting] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [showScriptCode, setShowScriptCode] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    setConfig(getGoogleConfig());
    setLocConfig(getLocationConfig());
  }, []);

  const handleSave = () => {
    const cleanUrl = config.scriptUrl.trim();
    if (config.scriptUrl && !cleanUrl.includes('script.google.com')) {
        alert('A URL parece inválida.');
        return;
    }
    saveLocationConfig(locConfig);
    const newConfig = { scriptUrl: cleanUrl, enabled: !!cleanUrl };
    saveGoogleConfig(newConfig);
    setConfig(newConfig);
    setStatus('saved');
    onConfigSaved();
    setTimeout(() => setStatus('idle'), 2000);
  };

  const handleTestConnection = async () => {
    if (!config.scriptUrl) return;
    setIsTesting(true);
    try {
        const response = await fetch(`${config.scriptUrl}?action=test`);
        const data = await response.json();
        if (data.status === 'success') {
            alert('✅ Conexão Ativa!');
        }
    } catch (error) {
        alert('❌ Falha na Conexão.');
    } finally { setIsTesting(false); }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-10">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-8">
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-brand-500/10 p-3 rounded-2xl text-brand-600"><Database size={24} /></div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Conexão com Nuvem</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Sincronização Nobel</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">URL do Web App Google</label>
                    <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-xs text-slate-900 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all shadow-inner" 
                        value={config.scriptUrl} 
                        onChange={e => setConfig({...config, scriptUrl: e.target.value})} 
                        placeholder="https://script.google.com/macros/s/..." 
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleTestConnection} disabled={isTesting} className="bg-white text-slate-700 py-3 rounded-2xl font-bold text-sm border-2 border-slate-100 hover:border-brand-200 transition-all flex items-center justify-center gap-2 shadow-sm">
                        {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <Link size={16} />} Testar
                    </button>
                    <button onClick={handleSave} className="bg-slate-900 text-white py-3 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl">
                        {status === 'saved' ? 'Salvo!' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
