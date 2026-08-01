import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Sparkles, Check, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';
import { BANK_CATEGORIES, CATEGORY_COLORS } from '../../utils/uiUtils';
import { MerchantRule, CategoryRule, Transaction } from '../../types/analytics';

interface UnmappedGroup {
  merchantName: string;
  transactions: Transaction[];
  hasMerchantRule: boolean;
  hasCategoryRule: boolean;
}

export default function RulesResolutionPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [merchantRules, setMerchantRules] = useState<MerchantRule[]>([]);
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'no-merchant' | 'no-category'>('all');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Form states for rule creation
  const [normPattern, setNormPattern] = useState('');
  const [normName, setNormName] = useState('');
  const [catPattern, setCatPattern] = useState('');
  const [catCategory, setCatCategory] = useState(BANK_CATEGORIES[0] || 'Salary');

  const navigate = useNavigate();
  const { accentColor, accentColors } = useTheme();
  const color = accentColors[accentColor as keyof typeof accentColors]?.default || '#6366f1';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txsRes, merchRes, catRes] = await Promise.all([
        supabase.from('transactions').select('*'),
        supabase.from('merchant_rules').select('*'),
        supabase.from('category_rules').select('*')
      ]);

      if (txsRes.data) setTransactions(txsRes.data);
      if (merchRes.data) setMerchantRules(merchRes.data);
      if (catRes.data) setCategoryRules(catRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group unmapped transactions
  const unmappedGroups = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    // Group all transactions by their current merchant field
    transactions.forEach(tx => {
      const m = tx.merchant || 'Unknown';
      if (!groups[m]) {
        groups[m] = [];
      }
      groups[m].push(tx);
    });

    const list: UnmappedGroup[] = [];

    Object.entries(groups).forEach(([merchantName, txList]) => {
      // Check if it matches any merchant normalization rule
      const hasM = merchantRules.some(r => {
        try {
          return new RegExp(r.pattern, 'i').test(merchantName) || txList.some(tx => new RegExp(r.pattern, 'i').test(tx.description));
        } catch (e) {
          return false;
        }
      });

      // Check if it matches any category rule (and category is not 'Other')
      const hasC = categoryRules.some(r => {
        try {
          return new RegExp(r.pattern, 'i').test(merchantName);
        } catch (e) {
          return false;
        }
      });

      const isOtherCategory = txList.every(tx => tx.category === 'Other' || !tx.category);

      // It is unmapped if it lacks a merchant normalization rule OR lacks a category rule
      if (!hasM || !hasC || isOtherCategory) {
        list.push({
          merchantName,
          transactions: txList,
          hasMerchantRule: hasM,
          hasCategoryRule: hasC && !isOtherCategory
        });
      }
    });

    // Sort by transaction count descending
    return list.sort((a, b) => b.transactions.length - a.transactions.length);
  }, [transactions, merchantRules, categoryRules]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return unmappedGroups.filter(g => {
      const matchesSearch = g.merchantName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        g.transactions.some(tx => tx.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'no-merchant') return !g.hasMerchantRule;
      if (filterType === 'no-category') return !g.hasCategoryRule;
      return true;
    });
  }, [unmappedGroups, searchQuery, filterType]);

  // Total unmapped transactions
  const totalUnmappedTransactions = useMemo(() => {
    return unmappedGroups.reduce((acc, g) => acc + g.transactions.length, 0);
  }, [unmappedGroups]);

  // Handle expanding a group to show form
  const handleToggleExpand = (groupName: string) => {
    if (expandedGroup === groupName) {
      setExpandedGroup(null);
    } else {
      setExpandedGroup(groupName);
      // Initialize inputs for rules
      setNormPattern(groupName);
      setNormName(groupName);
      setCatPattern(groupName);
    }
  };

  // Submit Normalization Rule
  const handleCreateNormalizationRule = async (e: React.FormEvent, rawName: string) => {
    e.preventDefault();
    if (!normPattern || !normName) return;

    setActionLoading(`norm-${rawName}`);
    try {
      const newRule = {
        pattern: normPattern.trim(),
        normalized_merchant: normName.trim()
      };

      // Check if pattern already exists in rules to avoid duplicates
      const existingRule = merchantRules.find(r => r.pattern.toLowerCase().trim() === newRule.pattern.toLowerCase().trim());

      let createdRule, error;
      if (existingRule) {
        const res = await supabase
          .from('merchant_rules')
          .update({ normalized_merchant: newRule.normalized_merchant })
          .eq('id', existingRule.id)
          .select()
          .single();
        createdRule = res.data;
        error = res.error;
      } else {
        const res = await supabase
          .from('merchant_rules')
          .insert(newRule)
          .select()
          .single();
        createdRule = res.data;
        error = res.error;
      }

      if (error) throw error;

      // 2. Perform local update scan on all matching transactions
      const matchedTxs = transactions.filter(tx => {
        try {
          return new RegExp(normPattern.trim(), 'i').test(tx.description) || new RegExp(normPattern.trim(), 'i').test(tx.merchant || '');
        } catch {
          return false;
        }
      });

      if (matchedTxs.length > 0) {
        // Bulk update transaction merchant names in Supabase
        await Promise.all(matchedTxs.map(tx => 
          supabase
            .from('transactions')
            .update({ merchant: normName.trim() })
            .eq('id', tx.id)
        ));

        // Re-categorize updated transactions locally if they match any category rules
        const updatedTxs = transactions.map(tx => {
          if (matchedTxs.some(m => m.id === tx.id)) {
            let matchedCat = tx.category;
            // Scan category rules for the new merchant name
            for (const catRule of categoryRules) {
              try {
                if (new RegExp(catRule.pattern, 'i').test(normName.trim())) {
                  matchedCat = catRule.category;
                  break;
                }
              } catch {}
            }
            return { ...tx, merchant: normName.trim(), category: matchedCat };
          }
          return tx;
        });

        // Also update matching transactions database category field if category rule matches
        const catMatchedRule = categoryRules.find(r => {
          try {
            return new RegExp(r.pattern, 'i').test(normName.trim());
          } catch {
            return false;
          }
        });

        if (catMatchedRule) {
          await Promise.all(matchedTxs.map(tx => 
            supabase
              .from('transactions')
              .update({ category: catMatchedRule.category })
              .eq('id', tx.id)
          ));
        }

        setTransactions(updatedTxs);
      }

      // Update local state, removing any previous rule with the same pattern to prevent duplicates
      setMerchantRules(prev => {
        const filtered = prev.filter(r => r.pattern.toLowerCase().trim() !== newRule.pattern.toLowerCase().trim());
        return [...filtered, createdRule];
      });

      setSuccessMsg(`Successfully created/updated normalization rule. Normalized ${matchedTxs.length} transactions.`);
      setExpandedGroup(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error creating rule');
    } finally {
      setActionLoading(null);
    }
  };

  // Submit Categorization Rule
  const handleCreateCategoryRule = async (e: React.FormEvent, rawName: string) => {
    e.preventDefault();
    if (!catPattern || !catCategory) return;

    setActionLoading(`cat-${rawName}`);
    try {
      const newRule = {
        pattern: catPattern.trim(),
        category: catCategory
      };

      // Check if pattern already exists in rules to avoid duplicates
      const existingRule = categoryRules.find(r => r.pattern.toLowerCase().trim() === newRule.pattern.toLowerCase().trim());

      let createdRule, error;
      if (existingRule) {
        const res = await supabase
          .from('category_rules')
          .update({ category: newRule.category })
          .eq('id', existingRule.id)
          .select()
          .single();
        createdRule = res.data;
        error = res.error;
      } else {
        const res = await supabase
          .from('category_rules')
          .insert(newRule)
          .select()
          .single();
        createdRule = res.data;
        error = res.error;
      }

      if (error) throw error;

      // 2. Scan and update database transactions
      const matchedTxs = transactions.filter(tx => {
        try {
          return new RegExp(catPattern.trim(), 'i').test(tx.merchant || '') || new RegExp(catPattern.trim(), 'i').test(tx.description);
        } catch {
          return false;
        }
      });

      if (matchedTxs.length > 0) {
        await Promise.all(matchedTxs.map(tx => 
          supabase
            .from('transactions')
            .update({ category: catCategory })
            .eq('id', tx.id)
        ));

        // Update local state
        const updatedTxs = transactions.map(tx => {
          if (matchedTxs.some(m => m.id === tx.id)) {
            return { ...tx, category: catCategory };
          }
          return tx;
        });
        setTransactions(updatedTxs);
      }

      // Update local state, removing any previous rule with the same pattern to prevent duplicates
      setCategoryRules(prev => {
        const filtered = prev.filter(r => r.pattern.toLowerCase().trim() !== newRule.pattern.toLowerCase().trim());
        return [...filtered, createdRule];
      });

      setSuccessMsg(`Successfully categorized ${matchedTxs.length} transactions as ${catCategory}.`);
      setExpandedGroup(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error creating rule');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Back Header */}
      <button 
        onClick={() => navigate('/bank')} 
        className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary dark:text-white">Unmapped Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">Resolve imported transactions that are missing rules or category mapping.</p>
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-body border border-subtle rounded-xl text-sm font-semibold hover:bg-body/80 active:scale-95 transition-transform disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-700 dark:text-green-400 animate-in fade-in zoom-in-95">
          <CheckCircle2 size={20} className="shrink-0" />
          <span className="font-medium text-sm">{successMsg}</span>
        </div>
      )}

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass p-5 rounded-3xl border border-subtle">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Unmapped Transactions</p>
          <p className="text-2xl font-black text-primary dark:text-white">{loading ? '...' : totalUnmappedTransactions}</p>
        </div>
        <div className="glass p-5 rounded-3xl border border-subtle">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Distinct Merchants</p>
          <p className="text-2xl font-black text-primary dark:text-white">{loading ? '...' : unmappedGroups.length}</p>
        </div>
        <div className="glass p-5 rounded-3xl border border-subtle">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Highest Frequency</p>
          <p className="text-2xl font-black text-rose-500 truncate">
            {loading ? '...' : (unmappedGroups[0] ? `${unmappedGroups[0].merchantName} (${unmappedGroups[0].transactions.length})` : 'None')}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search pending merchants..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-body border border-subtle rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': color } as React.CSSProperties}
          />
        </div>
        
        {/* Filter segment tabs */}
        <div className="flex bg-body border border-subtle rounded-xl p-1 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterType === 'all' ? 'bg-white dark:bg-white/10 shadow-sm text-primary dark:text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            All ({unmappedGroups.length})
          </button>
          <button
            onClick={() => setFilterType('no-merchant')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterType === 'no-merchant' ? 'bg-white dark:bg-white/10 shadow-sm text-primary dark:text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Unnormalized ({unmappedGroups.filter(g => !g.hasMerchantRule).length})
          </button>
          <button
            onClick={() => setFilterType('no-category')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterType === 'no-category' ? 'bg-white dark:bg-white/10 shadow-sm text-primary dark:text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Uncategorized ({unmappedGroups.filter(g => !g.hasCategoryRule).length})
          </button>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="text-center py-20 text-gray-500 font-semibold glass rounded-3xl border border-subtle">
          Scanning transactions for unmapped items...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-20 text-gray-500 font-semibold glass rounded-3xl border border-subtle">
          {searchQuery ? 'No matching unmapped merchants found.' : 'Awesome! All statement transactions are mapped properly.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(group => {
            const isExpanded = expandedGroup === group.merchantName;
            
            return (
              <div key={group.merchantName} className="glass rounded-3xl border border-subtle overflow-hidden transition-all duration-300">
                
                {/* Header Summary Row */}
                <div 
                  onClick={() => handleToggleExpand(group.merchantName)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-body/40 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-bold text-primary dark:text-white truncate">{group.merchantName}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary dark:bg-white/10 dark:text-white">
                        {group.transactions.length} {group.transactions.length === 1 ? 'txn' : 'txns'}
                      </span>
                      
                      {/* Mapping Status Badges */}
                      <div className="flex items-center gap-1.5">
                        {!group.hasMerchantRule && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            No Normalization Rule
                          </span>
                        )}
                        {!group.hasCategoryRule && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                            Uncategorized
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 mt-1 truncate">
                      Last narration: <span className="font-mono text-gray-500 dark:text-gray-300">{group.transactions[0]?.description}</span>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-400">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Expanded Details and Resolution Forms */}
                {isExpanded && (
                  <div className="border-t border-subtle bg-body/20 p-6 space-y-6">
                    
                    {/* Raw transaction log list */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recent Transaction Log</p>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-2">
                        {group.transactions.slice(0, 5).map((tx, idx) => (
                          <div key={tx.id || idx} className="flex justify-between items-center text-xs bg-body/50 border border-subtle px-3 py-2 rounded-xl">
                            <span className="font-mono text-gray-600 dark:text-gray-400">{tx.transaction_date}</span>
                            <span className="font-mono text-primary dark:text-white flex-1 mx-4 truncate text-left">{tx.description}</span>
                            <span className={`font-bold ${tx.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {tx.amount < 0 ? '-' : '+'}₹{Math.abs(tx.amount)}
                            </span>
                          </div>
                        ))}
                        {group.transactions.length > 5 && (
                          <p className="text-[10px] text-gray-400 text-center pt-1">+ {group.transactions.length - 5} more transactions</p>
                        )}
                      </div>
                    </div>

                    {/* Action forms grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      
                      {/* Form 1: Normalization Rule Creator */}
                      <div className="bg-body/40 border border-subtle rounded-2xl p-5 space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-primary dark:text-white flex items-center gap-2">
                            <Sparkles size={16} className="text-amber-500" /> Create Normalization Rule
                          </h4>
                          <p className="text-[11px] text-gray-400 mt-0.5">Map matching raw statements to a cleaner merchant name.</p>
                        </div>

                        <form onSubmit={(e) => handleCreateNormalizationRule(e, group.merchantName)} className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Regex Pattern</label>
                            <input
                              type="text"
                              value={normPattern}
                              onChange={e => setNormPattern(e.target.value)}
                              placeholder="e.g. Swiggy"
                              className="w-full bg-body border border-subtle rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2"
                              style={{ '--tw-ring-color': color } as React.CSSProperties}
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Normalized Merchant Name</label>
                            <input
                              type="text"
                              value={normName}
                              onChange={e => setNormName(e.target.value)}
                              placeholder="e.g. Swiggy"
                              className="w-full bg-body border border-subtle rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2"
                              style={{ '--tw-ring-color': color } as React.CSSProperties}
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={actionLoading !== null}
                            className="w-full py-2 bg-primary text-white rounded-xl text-xs font-semibold shadow active:scale-95 transition-transform disabled:opacity-50"
                            style={{ backgroundColor: color }}
                          >
                            {actionLoading === `norm-${group.merchantName}` ? 'Creating Rule...' : 'Save Normalization Rule'}
                          </button>
                        </form>
                      </div>

                      {/* Form 2: Category Rule Creator */}
                      <div className="bg-body/40 border border-subtle rounded-2xl p-5 space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-primary dark:text-white flex items-center gap-2">
                            <Plus size={16} className="text-green-500" /> Create Categorization Rule
                          </h4>
                          <p className="text-[11px] text-gray-400 mt-0.5">Assign a category to this clean merchant name pattern.</p>
                        </div>

                        <form onSubmit={(e) => handleCreateCategoryRule(e, group.merchantName)} className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Merchant Pattern</label>
                            <input
                              type="text"
                              value={catPattern}
                              onChange={e => setCatPattern(e.target.value)}
                              placeholder="e.g. Swiggy"
                              className="w-full bg-body border border-subtle rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2"
                              style={{ '--tw-ring-color': color } as React.CSSProperties}
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select Category</label>
                            <select
                              value={catCategory}
                              onChange={e => setCatCategory(e.target.value)}
                              className="w-full bg-body border border-subtle rounded-xl px-3 py-2 text-xs text-primary dark:text-white focus:outline-none focus:ring-2"
                              style={{ '--tw-ring-color': color } as React.CSSProperties}
                            >
                              {BANK_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            disabled={actionLoading !== null}
                            className="w-full py-2 bg-primary text-white rounded-xl text-xs font-semibold shadow active:scale-95 transition-transform disabled:opacity-50"
                            style={{ backgroundColor: color }}
                          >
                            {actionLoading === `cat-${group.merchantName}` ? 'Categorizing...' : 'Save Categorization Rule'}
                          </button>
                        </form>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
