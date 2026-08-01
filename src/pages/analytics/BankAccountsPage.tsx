import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Account, MerchantRule, CategoryRule } from '../../types/analytics';
import { Landmark, Plus, Trash2, ArrowRight, Sliders, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { BANK_CATEGORIES } from '../../utils/uiUtils';

export default function BankAccountsPage() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'rules'>('accounts');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [statementPassword, setStatementPassword] = useState('');

  // Rules states
  const [merchantRules, setMerchantRules] = useState<MerchantRule[]>([]);
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [newMerchPattern, setNewMerchPattern] = useState('');
  const [newMerchNormalized, setNewMerchNormalized] = useState('');
  const [newCatPattern, setNewCatPattern] = useState('');
  const [newCatCategory, setNewCatCategory] = useState(BANK_CATEGORIES[0] || 'Salary');

  const navigate = useNavigate();
  const { accentColor, accentColors } = useTheme();
  const color = accentColors[accentColor as keyof typeof accentColors]?.default || '#6366f1';

  useEffect(() => {
    fetchAccounts();
    fetchRules();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('accounts').select('*');
    if (!error && data) {
      setAccounts(data);
    }
    setLoading(false);
  };

  const fetchRules = async () => {
    const [{ data: merch }, { data: cat }] = await Promise.all([
      supabase.from('merchant_rules').select('*'),
      supabase.from('category_rules').select('*')
    ]);
    if (merch) setMerchantRules(merch);
    if (cat) setCategoryRules(cat);
  };

  const addAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountName) return;

    const newAccount = {
      firebase_uid: 'placeholder_uid',
      bank_name: bankName,
      account_name: accountName
    };

    const { data, error } = await supabase.from('accounts').insert(newAccount).select().single();
    if (!error && data) {
      setAccounts([...accounts, data]);
      
      if (statementPassword) {
        localStorage.setItem(`bank_account_password_${data.id}`, statementPassword);
      }

      setBankName('');
      setAccountName('');
      setStatementPassword('');
    }
  };

  const deleteAccount = async (id: string) => {
    await supabase.from('accounts').delete().eq('id', id);
    setAccounts(accounts.filter(a => a.id !== id));
    localStorage.removeItem(`bank_account_password_${id}`);
  };

  // Rules functions
  const addMerchantRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMerchPattern || !newMerchNormalized) return;

    const newRule = {
      pattern: newMerchPattern.trim(),
      normalized_merchant: newMerchNormalized.trim()
    };

    const { data, error } = await supabase.from('merchant_rules').insert(newRule).select().single();
    if (!error && data) {
      setMerchantRules([...merchantRules, data]);

      // Update existing transactions in database that match this new pattern
      try {
        const { data: txs } = await supabase.from('transactions').select('*');
        if (txs) {
          const matchedTxs = txs.filter(tx => {
            try {
              return new RegExp(newRule.pattern, 'i').test(tx.description) || new RegExp(newRule.pattern, 'i').test(tx.merchant || '');
            } catch {
              return false;
            }
          });

          if (matchedTxs.length > 0) {
            // Update merchant field
            await Promise.all(matchedTxs.map(tx => 
              supabase
                .from('transactions')
                .update({ merchant: newRule.normalized_merchant })
                .eq('id', tx.id)
            ));

            // Also check if any category rules match the new normalized merchant name
            const matchedCatRule = categoryRules.find(r => {
              try {
                return new RegExp(r.pattern, 'i').test(newRule.normalized_merchant);
              } catch {
                return false;
              }
            });

            if (matchedCatRule) {
              await Promise.all(matchedTxs.map(tx => 
                supabase
                  .from('transactions')
                  .update({ category: matchedCatRule.category })
                  .eq('id', tx.id)
              ));
            }
          }
        }
      } catch (updateErr) {
        console.error('Failed to update transactions for new merchant rule:', updateErr);
      }

      setNewMerchPattern('');
      setNewMerchNormalized('');
    } else if (error) {
      alert(error.message);
    }
  };

  const deleteMerchantRule = async (id: string) => {
    const { error } = await supabase.from('merchant_rules').delete().eq('id', id);
    if (!error) {
      setMerchantRules(merchantRules.filter(r => r.id !== id));
    }
  };

  const addCategoryRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatPattern || !newCatCategory) return;

    const newRule = {
      pattern: newCatPattern.trim(),
      category: newCatCategory
    };

    const { data, error } = await supabase.from('category_rules').insert(newRule).select().single();
    if (!error && data) {
      setCategoryRules([...categoryRules, data]);

      // Update existing transactions in database that match this category pattern
      try {
        const { data: txs } = await supabase.from('transactions').select('*');
        if (txs) {
          const matchedTxs = txs.filter(tx => {
            try {
              return new RegExp(newRule.pattern, 'i').test(tx.merchant || '') || new RegExp(newRule.pattern, 'i').test(tx.description);
            } catch {
              return false;
            }
          });

          if (matchedTxs.length > 0) {
            await Promise.all(matchedTxs.map(tx => 
              supabase
                .from('transactions')
                .update({ category: newRule.category })
                .eq('id', tx.id)
            ));
          }
        }
      } catch (updateErr) {
        console.error('Failed to update transactions for new category rule:', updateErr);
      }

      setNewCatPattern('');
    } else if (error) {
      alert(error.message);
    }
  };

  const deleteCategoryRule = async (id: string) => {
    const { error } = await supabase.from('category_rules').delete().eq('id', id);
    if (!error) {
      setCategoryRules(categoryRules.filter(r => r.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary dark:text-white">Bank Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Configure accounts and rules for statement processing.</p>
        </div>
        <button 
          onClick={() => navigate('/bank/import')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold transition-transform active:scale-95 shadow-md animate-in fade-in"
          style={{ backgroundColor: color }}
        >
          Import Statement <ArrowRight size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-subtle mb-6">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-4 px-6 font-bold text-sm tracking-wide transition-all border-b-2 ${
            activeTab === 'accounts'
              ? 'text-primary dark:text-white'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
          style={activeTab === 'accounts' ? { borderColor: color, color } : {}}
        >
          Bank Accounts
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-4 px-6 font-bold text-sm tracking-wide transition-all border-b-2 ${
            activeTab === 'rules'
              ? 'text-primary dark:text-white'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
          style={activeTab === 'rules' ? { borderColor: color, color } : {}}
        >
          Normalization & Categorization Rules
        </button>
      </div>

      {activeTab === 'accounts' ? (
        <>
          {/* Add Account Form */}
          <div className="glass p-6 rounded-3xl border border-subtle">
            <h2 className="text-lg font-bold mb-4">Add New Account</h2>
            <form onSubmit={addAccount} className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Bank Name (e.g. HDFC, ICICI)"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                className="flex-1 bg-body border border-subtle rounded-xl px-4 py-3 focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': color } as React.CSSProperties}
              />
              <input
                type="text"
                placeholder="Account Name (e.g. Salary, Savings)"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                className="flex-1 bg-body border border-subtle rounded-xl px-4 py-3 focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': color } as React.CSSProperties}
              />
              <input
                type="password"
                placeholder="Statement Password (Optional)"
                value={statementPassword}
                onChange={e => setStatementPassword(e.target.value)}
                className="flex-1 bg-body border border-subtle rounded-xl px-4 py-3 focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': color } as React.CSSProperties}
                title="Saved locally on your device for decrypting statements"
              />
              <button 
                type="submit"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-transform active:scale-95 shadow-md"
                style={{ backgroundColor: color }}
              >
                <Plus size={20} /> Add
              </button>
            </form>
          </div>

          {/* Accounts List */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full text-center py-10 text-gray-500">Loading accounts...</div>
            ) : accounts.length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-500 glass rounded-3xl border border-subtle">
                No bank accounts added yet.
              </div>
            ) : (
              accounts.map(acc => (
                <div key={acc.id} className="glass p-6 rounded-3xl border border-subtle relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }} />
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Landmark size={16} />
                        <span className="text-sm font-semibold">{acc.bank_name}</span>
                      </div>
                      <h3 className="text-xl font-bold text-primary dark:text-white">{acc.account_name}</h3>
                    </div>
                    <button 
                      onClick={() => deleteAccount(acc.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* Rules Tab Layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Merchant Normalization */}
          <div className="glass p-6 rounded-3xl border border-subtle space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary dark:text-white flex items-center gap-2">
                <Sliders size={20} style={{ color }} /> Merchant Normalization
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Define regex patterns to clean statement descriptions into standard merchant names.
              </p>
            </div>
            
            <form onSubmit={addMerchantRule} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Regex pattern (e.g. Zomato)"
                  value={newMerchPattern}
                  onChange={e => setNewMerchPattern(e.target.value)}
                  className="bg-body border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': color } as React.CSSProperties}
                />
                <input
                  type="text"
                  placeholder="Clean merchant name (e.g. Zomato)"
                  value={newMerchNormalized}
                  onChange={e => setNewMerchNormalized(e.target.value)}
                  className="bg-body border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': color } as React.CSSProperties}
                />
              </div>
              <button 
                type="submit" 
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold shadow-md active:scale-95 transition-transform text-sm"
                style={{ backgroundColor: color }}
              >
                <Plus size={18} /> Add Normalization Rule
              </button>
            </form>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {merchantRules.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No normalization rules added yet.</p>
              ) : (
                merchantRules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between p-3.5 bg-body/50 border border-subtle rounded-xl text-sm group">
                    <div>
                      <span className="font-mono text-xs text-gray-400">Pattern: "/{rule.pattern}/i"</span>
                      <div className="font-bold text-primary dark:text-white mt-1">➔ {rule.normalized_merchant}</div>
                    </div>
                    <button 
                      onClick={() => deleteMerchantRule(rule.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1.5"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Categorization Rules */}
          <div className="glass p-6 rounded-3xl border border-subtle space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary dark:text-white flex items-center gap-2">
                <Settings size={20} style={{ color }} /> Categorization Rules
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Map normalized merchant names to standard system categories.
              </p>
            </div>
            
            <form onSubmit={addCategoryRule} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Merchant pattern (e.g. Swiggy)"
                  value={newCatPattern}
                  onChange={e => setNewCatPattern(e.target.value)}
                  className="bg-body border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': color } as React.CSSProperties}
                />
                <select
                  value={newCatCategory}
                  onChange={e => setNewCatCategory(e.target.value)}
                  className="bg-body border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 text-primary dark:text-white"
                  style={{ '--tw-ring-color': color } as React.CSSProperties}
                >
                  {BANK_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  <option value="Other">Other</option>
                </select>
              </div>
              <button 
                type="submit" 
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold shadow-md active:scale-95 transition-transform text-sm"
                style={{ backgroundColor: color }}
              >
                <Plus size={18} /> Add Categorization Rule
              </button>
            </form>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {categoryRules.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No categorization rules added yet.</p>
              ) : (
                categoryRules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between p-3.5 bg-body/50 border border-subtle rounded-xl text-sm group">
                    <div>
                      <span className="font-mono text-xs text-gray-400">Pattern: "/{rule.pattern}/i"</span>
                      <div className="font-bold text-primary dark:text-white mt-1">➔ {rule.category}</div>
                    </div>
                    <button 
                      onClick={() => deleteCategoryRule(rule.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1.5"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
