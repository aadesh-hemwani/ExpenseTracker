import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Account } from '../../types/analytics';
import { StatementImportService } from '../../services/analytics/StatementImportService';
import { UploadCloud, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export default function StatementImportPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const DEFAULT_MAPPING = {
    date: 'Date',
    description: 'Description',
    amount: '',
    debit: 'Withdrawal Amt.',
    credit: 'Deposit Amt.',
    balance: 'Closing Balance',
    dateFormat: 'DD/MM/YYYY'
  };

  const [mapping, setMapping] = useState(DEFAULT_MAPPING);

  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [resultMsg, setResultMsg] = useState('');
  
  const navigate = useNavigate();
  const { accentColor, accentColors } = useTheme();
  const color = accentColors[accentColor as keyof typeof accentColors]?.default || '#6366f1';

  useEffect(() => {
    supabase.from('accounts').select('*').then(({ data }) => {
      if (data) {
        setAccounts(data);
        if (data.length > 0) setSelectedAccountId(data[0].id);
      }
    });
  }, []);

  // Load saved mapping when account changes
  useEffect(() => {
    if (!selectedAccountId) return;
    
    const savedMapping = localStorage.getItem(`bank_account_mapping_${selectedAccountId}`);
    if (savedMapping) {
      try {
        setMapping(JSON.parse(savedMapping));
      } catch (e) {
        setMapping(DEFAULT_MAPPING);
      }
    } else {
      setMapping(DEFAULT_MAPPING);
    }
  }, [selectedAccountId]);

  const handleImport = async () => {
    if (!file || !selectedAccountId) return;
    setStatus('processing');
    
    // Save mapping for future use
    localStorage.setItem(`bank_account_mapping_${selectedAccountId}`, JSON.stringify(mapping));
    
    // Retrieve locally saved password if it exists
    const password = localStorage.getItem(`bank_account_password_${selectedAccountId}`) || undefined;
    
    try {
      const res = await StatementImportService.processStatement(file, selectedAccountId, mapping, file.name, password);
      setStatus('success');
      setResultMsg(`Successfully imported ${res.insertedCount} transactions. Skipped ${res.duplicateCount} duplicates. Detected ${res.transferCount} transfers.`);
    } catch (err: any) {
      setStatus('error');
      setResultMsg(err.message || 'An unknown error occurred during import.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => navigate('/bank')} className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <h1 className="text-3xl font-black tracking-tight text-primary dark:text-white">Import Statement</h1>
      
      <div className="glass p-8 rounded-3xl border border-subtle space-y-8">
        
        {/* Step 1: Account Selection */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">1. Select Account</label>
          <select 
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            className="w-full bg-body border border-subtle rounded-xl px-4 py-3 focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': color } as React.CSSProperties}
          >
            <option value="" disabled>Select an account...</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} - {a.account_name}</option>)}
          </select>
        </div>

        {/* Step 2: File Upload */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">2. Upload Excel File</label>
          <div className="border-2 border-dashed border-subtle rounded-3xl p-10 flex flex-col items-center justify-center bg-body/50 text-center relative hover:bg-body transition-colors">
            <input 
              type="file" 
              accept=".xls,.xlsx" 
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud size={48} className="text-gray-400 mb-4" />
            <p className="text-lg font-semibold text-primary dark:text-white">
              {file ? file.name : "Drag and drop your statement here"}
            </p>
            <p className="text-sm text-gray-500 mt-1">Supports .xls and .xlsx up to 10MB</p>
          </div>
        </div>

        {/* Step 3: Column Mapping */}
        <div className="space-y-4">
          <label className="text-sm font-bold text-gray-500 uppercase tracking-wider block">3. Column Mapping & Format</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <input type="text" placeholder="Date Column" value={mapping.date} onChange={e => setMapping({...mapping, date: e.target.value})} className="bg-body border border-subtle rounded-xl px-4 py-2" />
             <input type="text" placeholder="Description Column" value={mapping.description} onChange={e => setMapping({...mapping, description: e.target.value})} className="bg-body border border-subtle rounded-xl px-4 py-2" />
             <input type="text" placeholder="Debit Column (if separate)" value={mapping.debit} onChange={e => setMapping({...mapping, debit: e.target.value})} className="bg-body border border-subtle rounded-xl px-4 py-2" />
             <input type="text" placeholder="Credit Column (if separate)" value={mapping.credit} onChange={e => setMapping({...mapping, credit: e.target.value})} className="bg-body border border-subtle rounded-xl px-4 py-2" />
             <input type="text" placeholder="Amount Column (if single)" value={mapping.amount} onChange={e => setMapping({...mapping, amount: e.target.value})} className="bg-body border border-subtle rounded-xl px-4 py-2" />
             <input type="text" placeholder="Balance Column" value={mapping.balance} onChange={e => setMapping({...mapping, balance: e.target.value})} className="bg-body border border-subtle rounded-xl px-4 py-2" />
          </div>
          
          <div className="flex flex-col gap-2 max-w-md pt-2">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Statement Date Format</label>
             <select 
               value={mapping.dateFormat || 'DD/MM/YYYY'}
               onChange={e => setMapping({...mapping, dateFormat: e.target.value})}
               className="bg-body border border-subtle rounded-xl px-4 py-3 text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-opacity-50"
               style={{ '--tw-ring-color': color } as React.CSSProperties}
             >
               <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. India, UK, Europe)</option>
               <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. USA)</option>
               <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
               <option value="Auto-detect">Auto-detect (Scan columns)</option>
             </select>
          </div>
        </div>

        <button 
          onClick={handleImport}
          disabled={!file || !selectedAccountId || status === 'processing'}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-white font-bold transition-transform active:scale-95 shadow-md disabled:opacity-50 disabled:active:scale-100"
          style={{ backgroundColor: color }}
        >
          {status === 'processing' ? 'Processing in Browser...' : 'Import & Analyze'}
        </button>

        {status === 'success' && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-700 dark:text-green-400">
            <CheckCircle size={24} />
            <span className="font-medium">{resultMsg}</span>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-700 dark:text-red-400">
            <AlertCircle size={24} className="shrink-0 mt-0.5" />
            <span className="font-medium">{resultMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
