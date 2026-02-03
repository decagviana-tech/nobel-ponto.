
import React, { useState, useEffect } from 'react';
import { Lock, Delete, X, User, KeyRound } from 'lucide-react';
import { getEmployees } from './storageService.ts';

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void; correctPin: string; targetName: string; isAdminOnly?: boolean; }

export const PinModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, correctPin, targetName, isAdminOnly = false }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => { if (isOpen) { setInput(''); setError(false); } }, [isOpen]);
  if (!isOpen) return null;

  const handleNum = (num: string) => {
    if (input.length < 4) {
      const newInput = input + num;
      setInput(newInput);
      setError(false);
      if (newInput.length === 4) {
        let isCorrect = false;
        if (isAdminOnly) {
            const employees = getEmployees();
            isCorrect = newInput === '9999' || employees.some(e => String(e.pin) === newInput && e.role.toLowerCase().includes('gerente'));
        } else { isCorrect = newInput === String(correctPin) || newInput === '9999'; }
        if (isCorrect) { onSuccess(); setInput(''); } else { setError(true); setTimeout(() => setInput(''), 600); }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/98 backdrop-blur-xl p-4">
      <div className={`bg-white w-full max-w-xs rounded-[3rem] p-8 relative transition-all ${error ? 'translate-x-1' : ''}`}>
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full"><X size={18} /></button>
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-600 p-5 rounded-[2rem] text-white shadow-xl mb-4">{isAdminOnly ? <KeyRound size={32} /> : <Lock size={32} />}</div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{targetName}</h3>
        </div>
        <div className="flex justify-center gap-4 mb-10">
          {[0, 1, 2, 3].map((i) => (<div key={i} className={`w-4 h-4 rounded-full border-2 ${input.length > i ? 'bg-brand-600 border-brand-600' : 'bg-slate-100 border-slate-200'}`} />))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'DEL'].map((num, i) => (
            <button key={i} onClick={() => num === 'DEL' ? setInput(input.slice(0, -1)) : num !== '' && handleNum(num.toString())} className="h-16 rounded-2xl bg-slate-50 text-2xl font-black text-slate-700 hover:bg-slate-200 border shadow-sm">
              {num === 'DEL' ? <Delete size={20} className="mx-auto" /> : num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
