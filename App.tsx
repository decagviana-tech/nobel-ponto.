
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ViewMode, Employee, DailyRecord } from './types';
import { TimeClock } from './components/TimeClock';
import { SpreadsheetView } from './components/SpreadsheetView';
import { BankDashboard } from './components/BankDashboard';
import { AIAssistant } from './components/AIAssistant';
import { EmployeeManager } from './components/EmployeeManager';
import { Settings } from './components/Settings';
import { 
  getEmployees, 
  getGoogleConfig, 
  saveGoogleConfig, 
  mergeExternalRecords, 
  mergeExternalEmployees, 
  mergeExternalTransactions, 
  getBankBalance 
} from './services/storageService';
import { 
  syncRowToSheet, 
  readSheetData, 
  readEmployeesFromSheet, 
  readTransactionsFromSheet 
} from './services/googleSheetsService';
import { 
  Clock, 
  FileSpreadsheet, 
  LayoutDashboard, 
  Bot, 
  Menu, 
  ChevronDown, 
  Settings as SettingsIcon, 
  RefreshCw, 
  Building2, 
  Users, 
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { PinModal } from './components/PinModal';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.CLOCK);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingView, setPendingView] = useState<ViewMode | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const refreshData = useCallback(() => {
    const loadedEmployees = getEmployees();
    setEmployees(loadedEmployees);
    setRefreshKey(prev => prev + 1);
  }, []);

  const performSync = useCallback(async (silent: boolean = false, force: boolean = false) => {
    const config = getGoogleConfig();
    if (!config.enabled || !config.scriptUrl) return;
    if (!silent) setIsSyncing(true);
    
    try {
      // Busca tudo da planilha de uma vez
      const [sheetEmployees, sheetData, sheetTransactions] = await Promise.all([
        readEmployeesFromSheet(config.scriptUrl),
        readSheetData(config.scriptUrl),
        readTransactionsFromSheet(config.scriptUrl)
      ]);
      
      if (sheetEmployees) mergeExternalEmployees(sheetEmployees, force);
      if (sheetData) mergeExternalRecords(sheetData);
      if (sheetTransactions) mergeExternalTransactions(sheetTransactions);
      
      setLastSyncTime(new Date());
      refreshData();
      
      if (force && !silent) {
        alert("✅ Sincronização Completa! A base de dados local foi unificada com a Planilha.");
      }
    } catch (e) {
      console.error("Erro na sincronização:", e);
      if (!silent) alert("Erro ao sincronizar com a planilha. Verifique a URL nas configurações.");
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [refreshData]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const setupUrl = urlParams.get('setup');
        if (setupUrl) {
          const decodedUrl = decodeURIComponent(setupUrl);
          if (decodedUrl.includes('script.google.com')) {
            saveGoogleConfig({ scriptUrl: decodedUrl, enabled: true });
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }

        const loaded = getEmployees();
        setEmployees(loaded);
        if (loaded && loaded.length > 0) {
          setCurrentEmployeeId(loaded[0].id);
        }
        
        // Sincroniza logo ao abrir
        await performSync(true);
      } catch (err) {
        console.error("Erro na inicialização:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
    
    const interval = setInterval(() => performSync(true), 60000);
    const handleFocus = () => performSync(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [performSync]);

  const handleRecordUpdate = async (record: DailyRecord) => {
    refreshData(); 
    const config = getGoogleConfig();
    if (config.enabled && config.scriptUrl) {
      try {
        setIsSyncing(true);
        const emp = employees.find(e => String(e.id) === String(record.employeeId));
        const balance = getBankBalance(record.employeeId);
        await syncRowToSheet(config.scriptUrl, record, emp?.name || 'Desconhecido', balance);
        setLastSyncTime(new Date());
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const currentEmployee = useMemo(() => {
    if (!employees || employees.length === 0) return null;
    return employees.find(e => String(e.id) === String(currentEmployeeId)) || employees[0];
  }, [employees, currentEmployeeId]);

  const handleNavClick = (mode: ViewMode) => {
    setIsMobileMenuOpen(false);
    const restricted = [ViewMode.SHEET, ViewMode.EMPLOYEES, ViewMode.SETTINGS];
    if (restricted.includes(mode) && currentEmployee) {
      const pinStr = String(currentEmployee.pin || '');
      if (pinStr.length > 0 && pinStr !== '0000') {
        setPendingView(mode);
        setIsPinModalOpen(true);
      } else {
        setCurrentView(mode);
      }
    } else {
      setCurrentView(mode);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <Loader2 size={48} className="animate-spin text-brand-500 mb-4" />
        <h1 className="text-xl font-black uppercase tracking-tighter">Nobel Ponto Inteligente</h1>
        <p className="text-slate-400 text-[10px] mt-2 uppercase tracking-[0.3em] animate-pulse">Unificando Dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row print:bg-white">
      <PinModal 
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => { setIsPinModalOpen(false); if(pendingView) setCurrentView(pendingView); }}
        correctPin={currentEmployee ? String(currentEmployee.pin || '') : ''}
      />

      <div className="md:hidden bg-white p-3 border-b flex justify-between items-center sticky top-0 z-40 shadow-sm print:hidden">
        <div className="flex items-center gap-2 font-bold text-brand-600">
          <Building2 size={18} />
          <span className="tracking-tighter uppercase font-black text-sm">Nobel Petrópolis</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => performSync(false, true)} 
            className={`p-2 rounded-lg transition-all ${isSyncing ? 'text-brand-500 bg-brand-50' : 'text-slate-400'}`}
            title="Sincronização Forçada"
          >
            <ShieldAlert size={20} className={isSyncing ? 'animate-pulse' : ''} />
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600"><Menu size={24} /></button>
        </div>
      </div>

      <div className={`fixed inset-0 z-30 bg-white md:relative md:flex flex-col w-full md:w-64 border-r p-4 h-screen transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} print:hidden`}>
        <div className="hidden md:flex items-center gap-3 px-4 mb-8">
          <div className="bg-brand-600 p-2 rounded-lg"><Building2 className="text-white" size={24} /></div>
          <h1 className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tighter">Nobel Ponto</h1>
        </div>

        <div className="mb-6 px-2 relative">
          <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="w-full rounded-xl p-3 flex items-center justify-between border bg-slate-100 hover:bg-slate-200 transition-colors">
            <div className="flex items-center gap-2 overflow-hidden text-left">
              <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold uppercase shrink-0">
                {currentEmployee?.name?.charAt(0) || '?'}
              </div>
              <div className="truncate">
                <p className="text-sm font-black truncate text-slate-900 leading-none mb-1">{currentEmployee?.name || 'Selecione'}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{currentEmployee?.role || 'Aguardando'}</p>
              </div>
            </div>
            <ChevronDown size={16} className={`transition-transform shrink-0 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {isUserMenuOpen && (
            <div className="absolute left-2 right-2 top-full mt-2 bg-white rounded-xl shadow-2xl border z-50 p-2 max-h-60 overflow-auto animate-in fade-in zoom-in-95">
              {employees.map(emp => (
                <button key={emp.id} onClick={() => { setCurrentEmployeeId(emp.id); setIsUserMenuOpen(false); setCurrentView(ViewMode.CLOCK); refreshData(); }} className={`w-full text-left p-3 rounded-lg text-xs mb-1 transition-all ${currentEmployeeId === emp.id ? 'bg-brand-50 text-brand-700 font-black' : 'hover:bg-slate-50 text-slate-600 font-bold'}`}>{emp.name}</button>
              ))}
            </div>
          )}
        </div>

        <nav className="space-y-1 flex-1">
          <button onClick={() => handleNavClick(ViewMode.CLOCK)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.CLOCK ? 'bg-brand-600 text-white font-black shadow-lg shadow-brand-100' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><Clock size={20} /> Registrar Ponto</button>
          <button onClick={() => handleNavClick(ViewMode.DASHBOARD)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.DASHBOARD ? 'bg-brand-600 text-white font-black shadow-lg shadow-brand-100' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => handleNavClick(ViewMode.SHEET)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.SHEET ? 'bg-brand-600 text-white font-black shadow-lg shadow-brand-100' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><FileSpreadsheet size={20} /> Planilha</button>
          <button onClick={() => handleNavClick(ViewMode.AI_ASSISTANT)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.AI_ASSISTANT ? 'bg-brand-600 text-white font-black shadow-lg shadow-brand-100' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><Bot size={20} /> Consultor IA</button>
          
          <div className="pt-4 mt-4 border-t border-slate-100">
            <button onClick={() => handleNavClick(ViewMode.EMPLOYEES)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.EMPLOYEES ? 'bg-brand-600 text-white font-black shadow-lg shadow-brand-100' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><Users size={20} /> Funcionários</button>
            <button onClick={() => handleNavClick(ViewMode.SETTINGS)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.SETTINGS ? 'bg-brand-600 text-white font-black shadow-lg shadow-brand-100' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><SettingsIcon size={20} /> Configurações</button>
          </div>
        </nav>

        {lastSyncTime && (
          <div className="mt-auto pt-4 border-t border-slate-100 px-2 space-y-2">
            <button 
              onClick={() => performSync(false, true)} 
              disabled={isSyncing}
              className={`w-full flex items-center justify-center gap-2 p-3 rounded-2xl text-[10px] font-black tracking-tighter uppercase transition-all duration-300 hover:scale-[1.02] active:scale-95 ${isSyncing ? 'bg-slate-100 text-slate-400' : 'bg-brand-600 text-white shadow-xl shadow-brand-100'}`}
              title="Sincronização profunda: Unifica funcionários e registros com a nuvem"
            >
              <ShieldAlert size={14} className={isSyncing ? 'animate-pulse' : ''} />
              {isSyncing ? 'UNIFICANDO...' : 'UNIFICAR COM NUVEM'}
            </button>
            <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">Último Check: {lastSyncTime.toLocaleTimeString()}</p>
          </div>
        )}
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-60px)] md:h-screen print:h-auto">
        <div className="max-w-5xl mx-auto">
          {currentView === ViewMode.CLOCK && currentEmployeeId && <TimeClock key={`${refreshKey}-${currentEmployeeId}`} onUpdate={handleRecordUpdate} employeeId={currentEmployeeId} />}
          {currentView === ViewMode.DASHBOARD && currentEmployeeId && <BankDashboard key={`${refreshKey}-${currentEmployeeId}`} employeeId={currentEmployeeId} />}
          {currentView === ViewMode.SHEET && currentEmployeeId && <SpreadsheetView key={`${refreshKey}-${currentEmployeeId}`} onUpdate={handleRecordUpdate} employeeId={currentEmployeeId} />}
          {currentView === ViewMode.AI_ASSISTANT && currentEmployeeId && <AIAssistant employeeId={currentEmployeeId} />}
          {currentView === ViewMode.EMPLOYEES && <EmployeeManager key={refreshKey} onUpdate={async () => performSync(false, true)} currentEmployeeId={currentEmployeeId} onSelectEmployee={setCurrentEmployeeId} />}
          {currentView === ViewMode.SETTINGS && <Settings onConfigSaved={refreshData} />}
        </div>
      </main>
    </div>
  );
};

export default App;
