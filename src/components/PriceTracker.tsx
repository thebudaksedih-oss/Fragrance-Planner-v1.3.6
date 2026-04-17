import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, ChevronLeft, Edit2, Save, X, ArrowUp, ArrowDown, Copy, Search, Scale, Check, MoreHorizontal, Percent, HelpCircle } from 'lucide-react';
import { PriceEntry, RawMaterial, Fragrance, Equipment, AppSettings } from '../types';
import { useConfirm } from '../hooks/useConfirm';
import TutorialModal from './TutorialModal';

interface Props {
  priceEntries: PriceEntry[];
  setPriceEntries: React.Dispatch<React.SetStateAction<PriceEntry[]>>;
  rawMaterials: RawMaterial[];
  equipments: Equipment[];
  fragrances: Fragrance[];
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

const POPULAR_CURRENCIES = ['USD', 'EUR', 'JPY', 'GBP', 'CNY', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'MYR'];

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

export default function PriceTracker({ 
  priceEntries, 
  setPriceEntries, 
  rawMaterials, 
  equipments,
  fragrances, 
  settings,
  setSettings
}: Props) {
  const exchangeRate = settings.currencyMultiplier;
  const baseCurrency = settings.baseCurrency;
  const targetCurrency = settings.targetCurrency;
  const setExchangeRate = (rate: number) => setSettings({ ...settings, currencyMultiplier: rate });
  const setBaseCurrency = (base: string) => setSettings({ ...settings, baseCurrency: base });
  const setTargetCurrency = (target: string) => setSettings({ ...settings, targetCurrency: target });

  const [viewState, setViewState] = useState<'list' | 'detail' | 'edit'>('list');
  const [editingEntry, setEditingEntry] = useState<PriceEntry | null>(null);
  const [isCustomPlatform, setIsCustomPlatform] = useState(false);
  const [customPlatform, setCustomPlatform] = useState('');
  const [isCustomBaseCurrency, setIsCustomBaseCurrency] = useState(false);
  const [customBaseCurrency, setCustomBaseCurrency] = useState('');
  const [isCustomTargetCurrency, setIsCustomTargetCurrency] = useState(false);
  const [customTargetCurrency, setCustomTargetCurrency] = useState('');
  const [displayUnitMultiplier, setDisplayUnitMultiplier] = useState<number>(100);
  const [groupBy, setGroupBy] = useState<'material' | 'platform' | 'supplier'>('material');
  const [searchQuery, setSearchQuery] = useState('');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareView, setShowCompareView] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  const tutorialSteps = [
    {
      title: 'Currency Setup',
      content: 'Set your base and target currencies to track prices in different markets and automatically calculate exchange rates.',
      icon: <RefreshCw size={40} />
    },
    {
      title: 'Item Types',
      content: 'Track prices for raw materials, fragrance oils, and equipment. You can categorize them for better organization.',
      icon: <Search size={40} />
    },
    {
      title: 'Pricing Models',
      content: 'Choose between unit-based (e.g., price per 100ml) or capacity-based (fixed price per item) to match how you buy.',
      icon: <Scale size={40} />
    },
    {
      title: 'Comparison View',
      content: 'Select multiple items and click "Compare" to see a side-by-side breakdown of prices across suppliers.',
      icon: <Check size={40} />
    },
    {
      title: 'Dilution Tracking',
      content: 'For raw materials, track if they are pre-diluted to ensure your cost calculations remain accurate.',
      icon: <Percent size={40} />
    }
  ];

  // Persist custom currency state
  useEffect(() => {
    if (baseCurrency && !POPULAR_CURRENCIES.includes(baseCurrency)) {
      setIsCustomBaseCurrency(true);
      setCustomBaseCurrency(baseCurrency);
    }
    if (targetCurrency && !POPULAR_CURRENCIES.includes(targetCurrency)) {
      setIsCustomTargetCurrency(true);
      setCustomTargetCurrency(targetCurrency);
    }
  }, [baseCurrency, targetCurrency]);

  const getItemName = (entry: PriceEntry) => {
    if (entry.itemType === 'fragrance' && entry.customItemName) {
      return entry.customItemName;
    }
    if (entry.itemType === 'raw_material') {
      return rawMaterials.find(m => m.id === entry.itemId)?.name || 'Unknown Material';
    }
    if (entry.itemType === 'equipment') {
      return equipments.find(e => e.id === entry.itemId)?.name || 'Unknown Equipment';
    }
    return fragrances.find(f => f.id === entry.itemId)?.name || 'Unknown Fragrance';
  };

  const getGroupName = (group: PriceEntry[]) => {
    const entry = group[0];
    if (groupBy === 'material') {
      if (entry.itemType === 'fragrance' && entry.customItemName) {
        return 'Fragrance Oil';
      }
      if (entry.itemType === 'raw_material') {
        return rawMaterials.find(m => m.id === entry.itemId)?.name || 'Unknown Material';
      }
      if (entry.itemType === 'equipment') {
        return equipments.find(e => e.id === entry.itemId)?.name || 'Unknown Equipment';
      }
      return fragrances.find(f => f.id === entry.itemId)?.name || 'Unknown Fragrance';
    } else if (groupBy === 'platform') {
      return entry.platform || 'Unknown Platform';
    } else if (groupBy === 'supplier') {
      return entry.supplierId || 'Unknown Supplier';
    }
    return 'Unknown';
  };

  const getGroupSubtext = (group: PriceEntry[]) => {
    const entry = group[0];
    if (groupBy === 'material') {
      return entry.itemType.replace('_', ' ');
    } else if (groupBy === 'platform') {
      return `${group.length} items`;
    } else if (groupBy === 'supplier') {
      return `${group.length} items`;
    }
    return '';
  };

  // Group entries based on groupBy state
  const groupedEntries = useMemo(() => {
    let filtered = priceEntries;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = priceEntries.filter(e => 
        getItemName(e).toLowerCase().includes(query) || 
        (e.supplierId || '').toLowerCase().includes(query) ||
        (e.platform || '').toLowerCase().includes(query) ||
        (e.location || '').toLowerCase().includes(query)
      );
    }

    const groups: Record<string, PriceEntry[]> = {};
    filtered.forEach(entry => {
      let key = '';
      if (groupBy === 'material') {
        if (entry.itemType === 'fragrance' && entry.customItemName) {
          key = 'fragrance_custom';
        } else {
          key = `${entry.itemType}_${entry.itemId}`;
        }
      } else if (groupBy === 'platform') {
        key = entry.platform || 'Unknown Platform';
      } else if (groupBy === 'supplier') {
        key = entry.supplierId || 'Unknown Supplier';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return Object.values(groups);
  }, [priceEntries, groupBy, searchQuery, rawMaterials, fragrances]);

  const moveGroup = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === groupedEntries.length - 1) return;
    
    const newGroups = [...groupedEntries];
    const temp = newGroups[index];
    newGroups[index] = newGroups[index + (direction === 'up' ? -1 : 1)];
    newGroups[index + (direction === 'up' ? -1 : 1)] = temp;
    
    setPriceEntries(newGroups.flat());
  };

  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const selectedGroup = selectedGroupKey ? groupedEntries.find(g => {
    if (groupBy === 'material') return `${g[0].itemType}_${g[0].itemId}` === selectedGroupKey;
    if (groupBy === 'platform') return (g[0].platform || 'Unknown Platform') === selectedGroupKey;
    if (groupBy === 'supplier') return (g[0].supplierId || 'Unknown Supplier') === selectedGroupKey;
    return false;
  }) : null;

  // If selectedGroup becomes empty because all items were deleted, go back to list
  useEffect(() => {
    if (viewState === 'detail' && selectedGroupKey && !selectedGroup) {
      setViewState('list');
      setSelectedGroupKey(null);
    }
  }, [selectedGroup, selectedGroupKey, viewState]);

  const addEntry = () => {
    const newEntry: PriceEntry = {
      id: generateId(),
      supplierId: '',
      itemId: '',
      itemType: 'raw_material',
      priceBase: 0,
      priceTarget: 0,
      quantity: 0,
      unit: 'ml',
      pricingType: 'unit',
    };
    setEditingEntry(newEntry);
    setViewState('edit');
  };

  const deleteEntry = (id: string) => {
    confirm('Delete Price Entry', 'Are you sure you want to delete this price entry?', () => {
      setPriceEntries(priceEntries.filter((e) => e.id !== id));
      setViewState('list');
      setSelectedGroupKey(null);
    });
  };

  const duplicateEntry = (e: React.MouseEvent, entry: PriceEntry) => {
    e.stopPropagation();
    const newEntry = {
      ...entry,
      id: generateId(),
    };
    setPriceEntries([...priceEntries, newEntry]);
  };

  const toggleCompare = (id: string) => {
    setCompareIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSaveAndContinue = () => {
    if (!editingEntry) return;
    
    const exists = priceEntries.some(e => e.id === editingEntry.id);
    if (exists) {
      setPriceEntries(priceEntries.map(e => e.id === editingEntry.id ? editingEntry : e));
    } else {
      setPriceEntries([...priceEntries, editingEntry]);
    }
    
    setEditingEntry({
      ...editingEntry,
      id: generateId(),
    });
  };

  const handleSave = () => {
    if (!editingEntry) return;
    
    const exists = priceEntries.some(e => e.id === editingEntry.id);
    if (exists) {
      setPriceEntries(priceEntries.map(e => e.id === editingEntry.id ? editingEntry : e));
    } else {
      setPriceEntries([...priceEntries, editingEntry]);
    }
    
    if (groupBy === 'material') {
      setSelectedGroupKey(`${editingEntry.itemType}_${editingEntry.itemId}`);
    } else if (groupBy === 'platform') {
      setSelectedGroupKey(editingEntry.platform || 'Unknown Platform');
    } else if (groupBy === 'supplier') {
      setSelectedGroupKey(editingEntry.supplierId || 'Unknown Supplier');
    }
    setViewState('detail');
  };

  const handleCancel = () => {
    setViewState(selectedGroupKey ? 'detail' : 'list');
    setEditingEntry(null);
  };

  const updateEditingEntry = (field: keyof PriceEntry, value: any) => {
    if (!editingEntry) return;
    
    const updated = { ...editingEntry, [field]: value };
    
    // Auto-convert currency
    if (field === 'priceBase') {
      updated.priceTarget = Number((value * exchangeRate).toFixed(2));
    } else if (field === 'priceTarget') {
      updated.priceBase = Number((value / exchangeRate).toFixed(2));
    }
    
    if (field === 'itemType') {
      updated.itemId = ''; // Reset item ID when type changes
      updated.customItemName = '';
    }
    
    setEditingEntry(updated);
  };

  const handleExchangeRateChange = (newRate: number) => {
    setExchangeRate(newRate);
    
    const updatedEntries = priceEntries.map(entry => ({
      ...entry,
      priceTarget: Number((entry.priceBase * newRate).toFixed(2))
    }));
    setPriceEntries(updatedEntries);

    if (editingEntry) {
      setEditingEntry({
        ...editingEntry,
        priceTarget: Number((editingEntry.priceBase * newRate).toFixed(2))
      });
    }
  };

  if (viewState === 'edit' && editingEntry) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={handleCancel}
            className="p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-app-text">
            {priceEntries.some(e => e.id === editingEntry.id) ? 'Edit Price Entry' : 'New Price Entry'}
          </h2>
        </div>

        <div className="bg-app-card rounded-lg shadow border border-app-border p-6">
          <div className="space-y-6">
            <div className="bg-app-accent/10 p-4 rounded-lg border border-app-accent/20 mb-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw size={18} className="text-app-accent" />
                <span className="font-medium text-app-text">Currency & Exchange Rate</span>
              </div>
              
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-app-muted mb-1">Base Currency</label>
                  {!isCustomBaseCurrency ? (
                    <select
                      value={baseCurrency}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomBaseCurrency(true);
                          setBaseCurrency('');
                        } else {
                          setBaseCurrency(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-1.5 bg-app-bg border border-app-border rounded-md text-sm text-app-text focus:ring-app-accent focus:border-app-accent"
                    >
                      {POPULAR_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="custom">Custom...</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customBaseCurrency}
                        onChange={(e) => {
                          setCustomBaseCurrency(e.target.value.toUpperCase());
                          setBaseCurrency(e.target.value.toUpperCase());
                        }}
                        placeholder="e.g. INR"
                        className="w-full px-3 py-1.5 bg-app-bg border border-app-border rounded-md text-sm text-app-text focus:ring-app-accent focus:border-app-accent uppercase"
                        maxLength={5}
                      />
                      <button
                        onClick={() => {
                          setIsCustomBaseCurrency(false);
                          setCustomBaseCurrency('');
                          setBaseCurrency('USD');
                        }}
                        className="px-2 py-1.5 text-app-muted hover:text-app-text bg-app-bg border border-app-border rounded-md"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Target Currency</label>
                  {!isCustomTargetCurrency ? (
                    <select
                      value={targetCurrency}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomTargetCurrency(true);
                          setTargetCurrency('');
                        } else {
                          setTargetCurrency(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-1.5 bg-app-bg border border-app-border rounded-md text-sm text-app-text focus:ring-app-accent focus:border-app-accent"
                    >
                      {POPULAR_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="custom">Custom...</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customTargetCurrency}
                        onChange={(e) => {
                          setCustomTargetCurrency(e.target.value.toUpperCase());
                          setTargetCurrency(e.target.value.toUpperCase());
                        }}
                        placeholder="e.g. IDR"
                        className="w-full px-3 py-1.5 bg-app-bg border border-app-border rounded-md text-sm text-app-text focus:ring-app-accent focus:border-app-accent uppercase"
                        maxLength={5}
                      />
                      <button
                        onClick={() => {
                          setIsCustomTargetCurrency(false);
                          setCustomTargetCurrency('');
                          setTargetCurrency('MYR');
                        }}
                        className="px-2 py-1.5 text-app-muted hover:text-app-text bg-app-bg border border-app-border rounded-md"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Rate (1 {baseCurrency || 'Base'} = ? {targetCurrency || 'Target'})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => handleExchangeRateChange(Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-app-bg border border-app-border rounded-md text-sm text-app-text focus:ring-app-accent focus:border-app-accent"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text mb-1">
                Supplier Name
              </label>
              <input
                type="text"
                value={editingEntry.supplierId}
                onChange={(e) => updateEditingEntry('supplierId', e.target.value)}
                placeholder="e.g., Perfumer's Apprentice"
                className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">
                  Item Type
                </label>
                <select
                  value={editingEntry.itemType}
                  onChange={(e) => {
                    setEditingEntry({
                      ...editingEntry,
                      itemType: e.target.value as 'raw_material' | 'fragrance' | 'equipment',
                      itemId: '',
                      customItemName: '',
                      isDiluted: false,
                      dilutionPercentage: 100
                    });
                  }}
                  className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                >
                  <option value="raw_material">Raw Material</option>
                  <option value="fragrance">Fragrance Oil</option>
                  <option value="equipment">Equipment & Application</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">
                  {editingEntry.itemType === 'fragrance' ? 'Fragrance Oil Name' : editingEntry.itemType === 'equipment' ? 'Equipment Name' : 'Item'}
                </label>
                {editingEntry.itemType === 'fragrance' ? (
                  <input
                    type="text"
                    value={editingEntry.customItemName || ''}
                    onChange={(e) => updateEditingEntry('customItemName', e.target.value)}
                    placeholder="Enter fragrance oil name..."
                    className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                  />
                ) : editingEntry.itemType === 'equipment' ? (
                  <select
                    value={editingEntry.itemId || ''}
                    onChange={(e) => updateEditingEntry('itemId', e.target.value)}
                    className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                  >
                    <option value="">Select Equipment...</option>
                    {equipments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                ) : (
                  <select
                    value={editingEntry.itemId || ''}
                    onChange={(e) => updateEditingEntry('itemId', e.target.value)}
                    className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                  >
                    <option value="">Select Material...</option>
                    {rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                )}
              </div>
            </div>

            {editingEntry.itemType === 'raw_material' && (
              <div className="bg-app-accent/5 p-4 rounded-lg border border-app-border space-y-4">
                <div className="flex items-center gap-2">
                  <Percent size={18} className="text-app-accent" />
                  <span className="font-medium text-app-text">Dilution Details</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={editingEntry.isDiluted || false}
                        onChange={(e) => updateEditingEntry('isDiluted', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-app-bg peer-focus:outline-none rounded-full peer border border-app-border peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-app-accent"></div>
                      <span className="ml-3 text-sm font-medium text-app-text">Is this item diluted?</span>
                    </label>
                  </div>
                  {editingEntry.isDiluted && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={editingEntry.dilutionPercentage || ''}
                        onChange={(e) => updateEditingEntry('dilutionPercentage', parseFloat(e.target.value) || 0)}
                        className="w-24 px-3 py-1.5 bg-app-bg border border-app-border rounded-md text-sm text-app-text focus:ring-app-accent focus:border-app-accent"
                        placeholder="10"
                      />
                      <span className="text-sm text-app-muted">% Dilution</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">
                  Pricing Model
                </label>
                <div className="flex gap-2 p-1 bg-app-bg rounded-lg border border-app-border">
                  <button
                    onClick={() => updateEditingEntry('pricingType', 'unit')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                      editingEntry.pricingType !== 'capacity' 
                        ? 'bg-app-card text-app-accent shadow-sm' 
                        : 'text-app-muted hover:text-app-text'
                    }`}
                  >
                    Unit-based (e.g. {settings.currencySymbol}/100ml)
                  </button>
                  <button
                    onClick={() => updateEditingEntry('pricingType', 'capacity')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                      editingEntry.pricingType === 'capacity' 
                        ? 'bg-app-card text-app-accent shadow-sm' 
                        : 'text-app-muted hover:text-app-text'
                    }`}
                  >
                    Capacity-based (Price per Item)
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">
                  {editingEntry.pricingType === 'capacity' ? 'Item Capacity' : 'Quantity'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingEntry.quantity || ''}
                    onChange={(e) => updateEditingEntry('quantity', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-4 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                  />
                  <select
                    value={editingEntry.unit || 'ml'}
                    onChange={(e) => updateEditingEntry('unit', e.target.value)}
                    className="w-24 px-2 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                  >
                    <option value="ml">ml</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="l">L</option>
                    <option value="oz">oz</option>
                    <option value="unit">unit</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">
                  Price ({baseCurrency || 'Base'})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-app-muted">{baseCurrency || 'Base'}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingEntry.priceBase || ''}
                    onChange={(e) => updateEditingEntry('priceBase', parseFloat(e.target.value) || 0)}
                    className="w-full pl-14 pr-4 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">
                  Price ({targetCurrency || 'Target'})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-app-muted">{targetCurrency || 'Target'}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingEntry.priceTarget || ''}
                    onChange={(e) => updateEditingEntry('priceTarget', parseFloat(e.target.value) || 0)}
                    className="w-full pl-14 pr-4 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editingEntry.location || ''}
                  onChange={(e) => updateEditingEntry('location', e.target.value)}
                  placeholder="e.g., China, Local"
                  className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">
                  Platform
                </label>
                {!isCustomPlatform ? (
                  <div className="flex gap-2">
                    <select
                      value={editingEntry.platform || ''}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomPlatform(true);
                          updateEditingEntry('platform', '');
                        } else {
                          updateEditingEntry('platform', e.target.value);
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    >
                      <option value="">Select Platform...</option>
                      <option value="Shopee">Shopee</option>
                      <option value="Tiktok">Tiktok</option>
                      <option value="Alibaba">Alibaba</option>
                      <option value="Facebook">Facebook</option>
                      <option value="custom">Custom...</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customPlatform || ''}
                      onChange={(e) => {
                        setCustomPlatform(e.target.value);
                        updateEditingEntry('platform', e.target.value);
                      }}
                      placeholder="Enter custom platform..."
                      className="flex-1 px-4 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    />
                    <button
                      onClick={() => {
                        setIsCustomPlatform(false);
                        setCustomPlatform('');
                        updateEditingEntry('platform', '');
                      }}
                      className="px-3 py-2 text-app-muted border border-app-border rounded-md hover:bg-app-bg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text mb-1">
                Notes / Comments
              </label>
              <textarea
                value={editingEntry.notes || ''}
                onChange={(e) => updateEditingEntry('notes', e.target.value)}
                placeholder="Add details to differentiate this entry (e.g., 'Premium quality', 'Bulk discount')..."
                className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent h-24 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-app-border">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 text-app-text bg-app-bg border border-app-border rounded-md hover:bg-app-card transition-colors"
              >
                <X size={18} />
                Cancel
              </button>
              <button
                onClick={handleSaveAndContinue}
                className="flex items-center gap-2 px-4 py-2 bg-app-accent/10 text-app-accent rounded-md hover:bg-app-accent/20 transition-colors"
              >
                <Save size={18} />
                Save & Continue
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover transition-colors shadow-sm"
              >
                <Save size={18} />
                Save Entry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewState === 'detail' && selectedGroup) {
    const baseItem = selectedGroup[0];
    const groupName = getGroupName(selectedGroup);
    const groupSubtext = getGroupSubtext(selectedGroup);

    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setViewState('list'); setSelectedGroupKey(null); }}
              className="p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-app-text">{groupName}</h2>
              <p className="text-app-muted text-sm capitalize">{groupSubtext}</p>
            </div>
          </div>
          <button
            onClick={() => {
              const newVariation: PriceEntry = {
                id: generateId(),
                supplierId: groupBy === 'supplier' ? baseItem.supplierId : '',
                itemId: groupBy === 'material' ? baseItem.itemId : '',
                itemType: groupBy === 'material' ? baseItem.itemType : 'raw_material',
                priceBase: 0,
                priceTarget: 0,
                quantity: 0,
                unit: 'ml',
                location: baseItem.location || '',
                platform: groupBy === 'platform' ? baseItem.platform : '',
              };
              setEditingEntry(newVariation);
              setViewState('edit');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover transition-colors shadow-sm"
          >
            <Plus size={18} />
            New Entry
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedGroup.map(entry => {
            const isCapacity = entry.pricingType === 'capacity';
            const pricePerUnitBase = isCapacity ? (entry.priceBase || 0) : (entry.quantity > 0 ? (entry.priceBase || 0) / entry.quantity : 0);
            const pricePerUnitTarget = isCapacity ? (entry.priceTarget || 0) : (entry.quantity > 0 ? (entry.priceTarget || 0) / entry.quantity : 0);
            
            let qtyInGrams = entry.quantity;
            if (entry.unit === 'kg' || entry.unit === 'l') qtyInGrams = entry.quantity * 1000;
            if (entry.unit === 'oz') qtyInGrams = entry.quantity * 28.3495;
            const pricePer100g = qtyInGrams > 0 ? ((entry.priceTarget || 0) / qtyInGrams) * 100 : 0;

            let cardTitle = '';
            if (groupBy === 'material') {
              if (entry.itemType === 'fragrance' && entry.customItemName) {
                cardTitle = entry.customItemName;
              } else {
                cardTitle = entry.supplierId || 'Unknown Supplier';
              }
            } else {
              cardTitle = getItemName(entry);
            }

            return (
              <div key={entry.id} className="bg-app-card rounded-xl shadow-sm border border-app-border overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-4 border-b border-app-border bg-app-bg/50 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-app-text flex items-center gap-2">
                      {cardTitle}
                      {entry.pricingType === 'capacity' && (
                        <span className="text-[10px] bg-app-accent/10 text-app-accent px-1.5 py-0.5 rounded border border-app-accent/20 font-bold uppercase tracking-wider">Fixed</span>
                      )}
                    </h3>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {entry.platform && <span className="text-xs px-2 py-0.5 bg-app-accent/5 text-app-accent rounded border border-app-accent/10">{entry.platform}</span>}
                      {entry.location && <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-600 rounded border border-green-500/20">{entry.location}</span>}
                      {entry.isDiluted && <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded border border-blue-500/20">{entry.dilutionPercentage}% Diluted</span>}
                      {cardTitle !== entry.supplierId && entry.supplierId && <span className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-600 rounded border border-purple-500/20">{entry.supplierId}</span>}
                    </div>
                  </div>
                  {entry.notes && (
                    <div className="mt-3 p-2 bg-app-accent/5 rounded-md border border-app-accent/10 text-[11px] text-app-muted italic">
                      {entry.notes}
                    </div>
                  )}
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => duplicateEntry(e, entry)} 
                      className="p-1.5 text-app-muted hover:text-green-600 rounded hover:bg-green-500/10 transition-colors"
                      title="Duplicate"
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      onClick={() => toggleCompare(entry.id)} 
                      className={`p-1.5 rounded transition-colors ${compareIds.includes(entry.id) ? 'bg-app-accent/20 text-app-accent' : 'text-app-muted hover:text-app-accent hover:bg-app-accent/10'}`}
                      title="Add to Compare"
                    >
                      {compareIds.includes(entry.id) ? <Check size={16} /> : <Scale size={16} />}
                    </button>
                    <button onClick={() => { setEditingEntry(entry); setViewState('edit'); }} className="p-1.5 text-app-muted hover:text-app-accent rounded hover:bg-app-accent/10 transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => deleteEntry(entry.id)} className="p-1.5 text-app-muted hover:text-red-600 rounded hover:bg-red-500/10 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="p-4 flex-1 space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-app-muted mb-1">Quantity</p>
                      <p className="font-medium text-app-text text-lg">{entry.quantity} {entry.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-app-muted mb-1">Total Price</p>
                      <p className="font-bold text-app-accent text-lg">{targetCurrency} {(entry.priceTarget || 0).toFixed(2)}</p>
                      <p className="text-xs text-app-muted">{baseCurrency} {(entry.priceBase || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-app-border">
                    {isCapacity ? (
                      <div className="bg-app-accent/5 p-2 rounded border border-app-accent/10 text-center">
                        <p className="text-[10px] text-app-accent font-medium uppercase tracking-wider mb-0.5">Fixed Price Model</p>
                        <p className="text-xs text-app-text font-semibold">Covers {entry.quantity}{entry.unit} per unit</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-app-muted">Cost per {entry.unit}</span>
                          <span className="font-medium text-app-text">{targetCurrency} {pricePerUnitTarget.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-app-muted">Cost per 100{entry.unit === 'ml' || entry.unit === 'l' ? 'ml' : 'g'}</span>
                          <span className="font-medium text-app-accent">{targetCurrency} {pricePer100g.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (showCompareView) {
    const compareEntries = priceEntries.filter(e => compareIds.includes(e.id));
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-app-card rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-app-border">
          <div className="p-6 border-b border-app-border flex justify-between items-center bg-app-accent text-white">
            <div className="flex items-center gap-3">
              <Scale size={24} />
              <h2 className="text-xl font-bold">Price Comparison</h2>
            </div>
            <button 
              onClick={() => setShowCompareView(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-6 bg-app-bg">
            <div className="grid grid-cols-[200px_repeat(auto-fill,minmax(250px,1fr))] gap-4 min-w-[800px]">
              {/* Labels Column */}
              <div className="space-y-4 pt-16">
                <div className="h-20 flex items-center font-semibold text-app-muted border-b border-app-border">Item Name</div>
                <div className="h-12 flex items-center font-semibold text-app-muted border-b border-app-border">Supplier</div>
                <div className="h-12 flex items-center font-semibold text-app-muted border-b border-app-border">Platform</div>
                <div className="h-12 flex items-center font-semibold text-app-muted border-b border-app-border">Quantity</div>
                <div className="h-12 flex items-center font-semibold text-app-muted border-b border-app-border">Total Price</div>
                <div className="h-12 flex items-center font-semibold text-app-muted border-b border-app-border">Price per Gram/ml</div>
                <div className="h-12 flex items-center font-semibold text-app-muted border-b border-app-border">Location</div>
              </div>

              {/* Data Columns */}
              {compareEntries.map(entry => {
                const isCapacity = entry.pricingType === 'capacity';
                let qtyInGrams = entry.quantity;
                if (entry.unit === 'kg' || entry.unit === 'l') qtyInGrams = entry.quantity * 1000;
                if (entry.unit === 'oz') qtyInGrams = entry.quantity * 28.3495;
                const pricePerG = qtyInGrams > 0 ? (entry.priceTarget || 0) / qtyInGrams : 0;

                return (
                  <div key={entry.id} className="space-y-4 text-center bg-app-card rounded-xl border border-app-border p-2">
                    <div className="h-16 flex flex-col items-center justify-center p-2">
                      <button 
                        onClick={() => toggleCompare(entry.id)}
                        className="text-xs text-red-500 hover:underline mb-1"
                      >
                        Remove
                      </button>
                      <div className="w-full h-1 bg-app-accent/10 rounded-full"></div>
                    </div>
                    <div className="h-20 flex items-center justify-center font-bold text-app-text border-b border-app-border px-2 leading-tight">
                      {getItemName(entry)}
                    </div>
                    <div className="h-12 flex items-center justify-center text-app-text border-b border-app-border">
                      {entry.supplierId || '-'}
                    </div>
                    <div className="h-12 flex items-center justify-center border-b border-app-border">
                      <span className="px-2 py-0.5 bg-app-accent/10 text-app-accent rounded text-xs border border-app-accent/20">
                        {entry.platform || '-'}
                      </span>
                    </div>
                    <div className="h-12 flex items-center justify-center text-app-text border-b border-app-border font-medium">
                      {entry.quantity} {entry.unit} {isCapacity && <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1 rounded ml-1">Fixed</span>}
                    </div>
                    <div className="h-12 flex items-center justify-center border-b border-app-border">
                      <span className="font-bold text-app-text">{targetCurrency} {(entry.priceTarget || 0).toFixed(2)}</span>
                    </div>
                    <div className="h-12 flex items-center justify-center border-b border-app-border">
                      <span className="font-bold text-app-accent">
                        {isCapacity ? (
                          <span className="text-amber-500 italic text-xs">Fixed Price Model</span>
                        ) : (
                          `${targetCurrency} ${pricePerG.toFixed(4)}`
                        )}
                      </span>
                    </div>
                    <div className="h-12 flex items-center justify-center text-app-muted border-b border-app-border">
                      {entry.location || '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="p-6 border-t border-app-border bg-app-card flex justify-between items-center">
            <p className="text-sm text-app-muted">
              Comparing {compareEntries.length} items. Prices are shown in {targetCurrency}.
            </p>
            <button 
              onClick={() => { setCompareIds([]); setShowCompareView(false); }}
              className="text-red-500 font-medium hover:text-red-600 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-app-text">Price Tracker</h2>
        
        <div className="flex items-center gap-4 flex-wrap w-full sm:w-auto">
          <button 
            onClick={() => setShowTutorial(true)}
            className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/5 rounded-full transition-colors"
            title="How to use"
          >
            <HelpCircle size={22} />
          </button>
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" size={18} />
            <input
              type="text"
              placeholder="Search materials, suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent w-full sm:w-64"
            />
          </div>

          <div className="flex bg-app-bg p-1 rounded-lg border border-app-border">
            <button
              onClick={() => setGroupBy('material')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${groupBy === 'material' ? 'bg-app-card text-app-accent shadow-sm' : 'text-app-muted hover:text-app-text'}`}
            >
              Materials
            </button>
            <button
              onClick={() => setGroupBy('platform')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${groupBy === 'platform' ? 'bg-app-card text-app-accent shadow-sm' : 'text-app-muted hover:text-app-text'}`}
            >
              Platforms
            </button>
            <button
              onClick={() => setGroupBy('supplier')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${groupBy === 'supplier' ? 'bg-app-card text-app-accent shadow-sm' : 'text-app-muted hover:text-app-text'}`}
            >
              Suppliers
            </button>
          </div>

          {compareIds.length > 0 && (
            <button
              onClick={() => setShowCompareView(true)}
              className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-md hover:bg-amber-600 transition-colors shadow-sm"
            >
              <Scale size={18} />
              Compare ({compareIds.length})
            </button>
          )}

          <div className="flex items-center gap-2 bg-app-card px-3 py-2 rounded-md shadow-sm border border-app-border">
            <label className="text-sm font-medium text-app-muted">Price per:</label>
            <select
              value={displayUnitMultiplier}
              onChange={(e) => setDisplayUnitMultiplier(Number(e.target.value))}
              className="text-sm border-none focus:ring-0 text-app-text font-medium cursor-pointer bg-transparent"
            >
              <option value={1}>1g / 1ml</option>
              <option value={10}>10g / 10ml</option>
              <option value={100}>100g / 100ml</option>
              <option value={1000}>1kg / 1L</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-app-card px-3 py-2 rounded-md shadow-sm border border-app-border">
            <RefreshCw size={16} className="text-app-muted" />
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-app-muted uppercase tracking-wider">Rate ({baseCurrency} to {targetCurrency})</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={exchangeRate}
                  onChange={(e) => handleExchangeRateChange(Number(e.target.value) || 0)}
                  className="w-20 px-2 py-1 bg-app-bg border border-app-border rounded text-sm font-bold text-app-accent focus:ring-app-accent focus:border-app-accent"
                />
                <button 
                  onClick={() => setShowCurrencyModal(true)}
                  className="p-1 text-app-muted hover:text-app-accent hover:bg-app-bg rounded transition-colors"
                  title="Change Currencies"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>
          </div>
          
          <button
            onClick={addEntry}
            className="flex items-center gap-2 bg-app-accent text-white px-4 py-2 rounded-md hover:bg-app-accent-hover transition-colors shadow-sm"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">New Price Entry</span>
          </button>
        </div>
      </div>

      <div className="bg-app-card rounded-lg shadow border border-app-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-app-bg border-b border-app-border">
              <th className="py-3 px-4 font-semibold text-app-muted w-16"></th>
              <th className="py-3 px-4 font-semibold text-app-muted">{groupBy.charAt(0).toUpperCase() + groupBy.slice(1)} Name</th>
              <th className="py-3 px-4 font-semibold text-app-muted hidden md:table-cell">Items</th>
              <th className="py-3 px-4 font-semibold text-app-muted text-right">Lowest Price / {displayUnitMultiplier >= 1000 ? '1kg' : displayUnitMultiplier + 'g'}</th>
              <th className="py-3 px-4 font-semibold text-app-muted text-right">Highest Price / {displayUnitMultiplier >= 1000 ? '1kg' : displayUnitMultiplier + 'g'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {groupedEntries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-app-muted italic">
                  No price entries yet. Create one to get started.
                </td>
              </tr>
            ) : (
              groupedEntries.map((group, index) => {
                const baseItem = group[0];
                const groupName = getGroupName(group);
                const groupSubtext = getGroupSubtext(group);
                const groupKey = groupBy === 'material' 
                  ? `${baseItem.itemType}_${baseItem.itemId}`
                  : (groupBy === 'platform' ? (baseItem.platform || 'Unknown Platform') : (baseItem.supplierId || 'Unknown Supplier'));
                
                // Calculate price per unit for each variation
                const pricesPerUnit = group.map(v => {
                  let qtyInGrams = v.quantity;
                  if (v.unit === 'kg' || v.unit === 'l') qtyInGrams = v.quantity * 1000;
                  if (v.unit === 'oz') qtyInGrams = v.quantity * 28.3495;
                  
                  if (qtyInGrams === 0) return 0;
                  return ((v.priceTarget || 0) / qtyInGrams) * displayUnitMultiplier;
                }).filter(p => p > 0);

                const minPrice = pricesPerUnit.length > 0 ? Math.min(...pricesPerUnit) : 0;
                const maxPrice = pricesPerUnit.length > 0 ? Math.max(...pricesPerUnit) : 0;

                return (
                  <tr 
                    key={groupKey}
                    onClick={() => {
                      setSelectedGroupKey(groupKey);
                      setViewState('detail');
                    }}
                    className="hover:bg-app-bg cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-4 w-16">
                      <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => moveGroup(e, index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-app-muted hover:text-app-accent disabled:opacity-30 hover:bg-app-card rounded"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button 
                          onClick={(e) => moveGroup(e, index, 'down')}
                          disabled={index === groupedEntries.length - 1}
                          className="p-1 text-app-muted hover:text-app-accent disabled:opacity-30 hover:bg-app-card rounded"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-app-text group-hover:text-app-accent">{groupName}</div>
                      <div className="text-xs text-app-muted capitalize">{groupSubtext}</div>
                    </td>
                    <td className="py-4 px-4 text-app-text hidden md:table-cell">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-app-bg text-app-text border border-app-border">
                        {group.length} {group.length === 1 ? 'entry' : 'entries'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-green-500">
                      {pricesPerUnit.length > 0 ? `${targetCurrency} ${minPrice.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-red-500">
                      {pricesPerUnit.length > 0 ? `${targetCurrency} ${maxPrice.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {showCurrencyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-card rounded-xl shadow-xl max-w-md w-full p-6 border border-app-border">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <RefreshCw size={20} className="text-app-accent" />
                <h2 className="text-xl font-bold text-app-text">Currency Settings</h2>
              </div>
              <button onClick={() => setShowCurrencyModal(false)} className="text-app-muted hover:text-app-text">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Base Currency</label>
                  {!isCustomBaseCurrency ? (
                    <select
                      value={baseCurrency}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomBaseCurrency(true);
                          setBaseCurrency('');
                        } else {
                          setBaseCurrency(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    >
                      {POPULAR_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="custom">Custom...</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customBaseCurrency}
                        onChange={(e) => {
                          setCustomBaseCurrency(e.target.value.toUpperCase());
                          setBaseCurrency(e.target.value.toUpperCase());
                        }}
                        placeholder="e.g. INR"
                        className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent uppercase"
                        maxLength={5}
                      />
                      <button
                        onClick={() => {
                          setIsCustomBaseCurrency(false);
                          setCustomBaseCurrency('');
                          setBaseCurrency('USD');
                        }}
                        className="px-2 py-2 text-app-muted hover:text-app-text bg-app-bg border border-app-border rounded-md"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Target Currency</label>
                  {!isCustomTargetCurrency ? (
                    <select
                      value={targetCurrency}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomTargetCurrency(true);
                          setTargetCurrency('');
                        } else {
                          setTargetCurrency(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    >
                      {POPULAR_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="custom">Custom...</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customTargetCurrency}
                        onChange={(e) => {
                          setCustomTargetCurrency(e.target.value.toUpperCase());
                          setTargetCurrency(e.target.value.toUpperCase());
                        }}
                        placeholder="e.g. IDR"
                        className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent uppercase"
                        maxLength={5}
                      />
                      <button
                        onClick={() => {
                          setIsCustomTargetCurrency(false);
                          setCustomTargetCurrency('');
                          setTargetCurrency('MYR');
                        }}
                        className="px-2 py-2 text-app-muted hover:text-app-text bg-app-bg border border-app-border rounded-md"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Exchange Rate (1 {baseCurrency} = ? {targetCurrency})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => handleExchangeRateChange(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-accent font-bold focus:ring-app-accent focus:border-app-accent"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={() => setShowCurrencyModal(false)}
                className="w-full px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover transition-colors font-medium shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {ConfirmModal}

      <TutorialModal 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title="Price Tracker Guide"
        steps={tutorialSteps}
      />
    </div>
  );
}
