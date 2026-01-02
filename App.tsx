
import React, { useState, useEffect, useCallback } from 'react';
import { ViewMode, Employee, DailyRecord } from './types';
import { TimeClock } from './components/TimeClock';
import { SpreadsheetView } from './components/SpreadsheetView';
import { BankDashboard } from './components/BankDashboard';
import { AIAssistant } from './components/AIAssistant';
import { EmployeeManager } from './components/EmployeeManager';
import { Settings } from './components/Settings';
import { getEmployees, getGoogleConfig, mergeExternalRecords, mergeExternalEmployees, getBankBalance } from './services/storageService';
import { syncRowToSheet, readSheetData, readEmployeesFromSheet, syncEmployeeToSheet } from './services/googleSheetsService';
import { Clock, FileSpreadsheet, LayoutDashboard, Bot, Menu, X, Users, ChevronDown, Settings as SettingsIcon, RefreshCw, Cloud, Building2 } from 'lucide-react';
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

  const refreshData = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    const loadedEmployees = getEmployees();
    setEmployees(loadedEmployees);
  }, []);

  const performSync = useCallback(async (silent: boolean = false) => {
      const config = getGoogleConfig();
      if (!config.enabled || !config.scriptUrl) return;
      if (!silent) setIsSyncing(true);
      
      try {
          const [sheetEmployees, sheetData] = await Promise.all([
              readEmployeesFromSheet(config.scriptUrl),
              readSheetData(config.scriptUrl)
          ]);
          
          if (sheetEmployees) mergeExternalEmployees(sheetEmployees);
          if (sheetData) mergeExternalRecords(sheetData);
          
          setLastSyncTime(new Date());
          refreshData();
      } catch (e) {
          console.error("Erro na sincronização:", e);
      } finally {
          if (!silent) setIsSyncing(false);
      }
  }, [refreshData]);

  useEffect(() => {
    const loaded = getEmployees();
    setEmployees(loaded);
    if (loaded.length > 0 && !currentEmployeeId) {
      setCurrentEmployeeId(loaded[0].id);
    }

    // Inicial e Polling (Anti-divergência)
    performSync(true);
    const interval = setInterval(() => performSync(true), 30000);
    
    // Sincroniza sempre que voltar para a aba
    const handleFocus = () => performSync(true);
    window.addEventListener('focus', handleFocus);

    return () => {
        clearInterval(interval);
        window.removeEventListener('focus', handleFocus);
    };
  }, [performSync, currentEmployeeId]);

  const handleRecordUpdate = async (record: DailyRecord) => {
      refreshData(); 
      const config = getGoogleConfig();
      if (config.enabled && config.scriptUrl) {
           try {
               setIsSyncing(true);
               const emp = employees.find(e => e.id === record.employeeId);
               const balance = getBankBalance(record.employeeId);
               await syncRowToSheet(config.scriptUrl, record, emp?.name || 'Desconhecido', balance);
               setLastSyncTime(new Date());
           } finally {
               setIsSyncing(false);
           }
      }
  };

  const currentEmployee = employees.find(e => e.id === currentEmployeeId) || employees[0];

  const handleNavClick = (mode: ViewMode) => {
    setIsMobileMenuOpen(false);
    const restricted = [ViewMode.SHEET, ViewMode.EMPLOYEES, ViewMode.SETTINGS];
    if (restricted.includes(mode)) {
        const pinStr = String(currentEmployee?.pin || '');
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row print:bg-white">
      <PinModal 
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => { setIsPinModalOpen(false); if(pendingView) setCurrentView(pendingView); }}
        correctPin={String(currentEmployee?.pin || '')}
      />

      <div className="md:hidden bg-white p-3 border-b flex justify-between items-center sticky top-0 z-40 shadow-sm print:hidden">
        <div className="flex items-center gap-2 font-bold text-brand-600">
          <Building2 size={18} />
          <span>Nobel Petrópolis</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600"><Menu size={24} /></button>
      </div>

      <div className={`fixed inset-0 z-30 bg-white md:relative md:flex flex-col w-full md:w-64 border-r p-4 h-screen transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} print:hidden`}>
        <div className="hidden md:flex items-center gap-3 px-4 mb-8">
          <div className="bg-brand-600 p-2 rounded-lg"><Building2 className="text-white" size={24} /></div>
          <h1 className="font-bold text-slate-900 text-lg leading-tight">Nobel Ponto</h1>
        </div>

        <div className="mb-6 px-2 relative">
          <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="w-full rounded-xl p-3 flex items-center justify-between border bg-slate-100 hover:bg-slate-200">
            <div className="flex items-center gap-2 overflow-hidden text-left">
               <div className="w-8 h-8 bg-brand-200 rounded-full flex items-center justify-center text-brand-700 font-bold uppercase">{currentEmployee?.name?.charAt(0)}</div>
               <div className="truncate"><p className="text-sm font-bold truncate">{currentEmployee?.name}</p><p className="text-[10px] text-slate-500 uppercase">{currentEmployee?.role}</p></div>
            </div>
            <ChevronDown size={16} className={`transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {isUserMenuOpen && (
            <div className="absolute left-2 right-2 top-full mt-2 bg-white rounded-xl shadow-xl border z-50 p-2 max-h-60 overflow-auto">
               {employees.map(emp => (
                 <button key={emp.id} onClick={() => { setCurrentEmployeeId(emp.id); setIsUserMenuOpen(false); setCurrentView(ViewMode.CLOCK); refreshData(); }} className={`w-full text-left p-2 rounded-lg text-sm mb-1 ${currentEmployeeId === emp.id ? 'bg-brand-50 text-brand-700 font-bold' : 'hover:bg-slate-50'}`}>{emp.name}</button>
               ))}
            </div>
          )}
        </div>

        <nav className="space-y-1 flex-1">
          <button onClick={() => handleNavClick(ViewMode.CLOCK)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left ${currentView === ViewMode.CLOCK ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}><Clock size={20} /> Registrar Ponto</button>
          <button onClick={() => handleNavClick(ViewMode.DASHBOARD)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left ${currentView === ViewMode.DASHBOARD ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => handleNavClick(ViewMode.SHEET)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left ${currentView === ViewMode.SHEET ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}><FileSpreadsheet size={20} /> Planilha</button>
          <button onClick={() => handleNavClick(ViewMode.AI_ASSISTANT)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left ${currentView === ViewMode.AI_ASSISTANT ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}><Bot size={20} /> Consultor IA</button>
          <div className="pt-4 mt-4 border-t">
            <button onClick={() => handleNavClick(ViewMode.EMPLOYEES)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left ${currentView === ViewMode.EMPLOYEES ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}><Users size={20} /> Funcionários</button>
            <button onClick={() => handleNavClick(ViewMode.SETTINGS)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left ${currentView === ViewMode.SETTINGS ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}><SettingsIcon size={20} /> Configurações</button>
          </div>
        </nav>

        {lastSyncTime && (
            <div className="mt-auto pt-4 border-t px-2">
                <div className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg text-[10px] font-bold ${isSyncing ? 'bg-slate-100' : 'bg-indigo-50 text-indigo-700'}`}>
                    {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <Cloud size={14} />}
                    {isSyncing ? 'SINCRONIZANDO...' : 'SINCRONIZADO'}
                </div>
                <p className="text-[9px] text-center text-slate-400 mt-1">Última atualização: {lastSyncTime.toLocaleTimeString()}</p>
            </div>
        )}
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-60px)] md:h-screen print:h-auto">
        <div className="max-w-5xl mx-auto">
          {currentView === ViewMode.CLOCK && <TimeClock key={refreshKey} onUpdate={handleRecordUpdate} employeeId={currentEmployeeId} />}
          {currentView === ViewMode.DASHBOARD && <BankDashboard key={refreshKey} employeeId={currentEmployeeId} />}
          {currentView === ViewMode.SHEET && <SpreadsheetView key={refreshKey} onUpdate={handleRecordUpdate} employeeId={currentEmployeeId} />}
          {currentView === ViewMode.AI_ASSISTANT && <AIAssistant employeeId={currentEmployeeId} />}
          {currentView === ViewMode.EMPLOYEES && <EmployeeManager key={refreshKey} onUpdate={async () => performSync()} currentEmployeeId={currentEmployeeId} onSelectEmployee={setCurrentEmployeeId} />}
          {currentView === ViewMode.SETTINGS && <Settings onConfigSaved={refreshData} />}
        </div>
      </main>
    </div>
  );
};

export default App;
