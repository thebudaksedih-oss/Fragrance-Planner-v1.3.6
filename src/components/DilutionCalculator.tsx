import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Plus, Trash2, History, ArrowRight, Beaker, Droplets, Scale, Info, Save, X, Check, Copy, Sparkles, HelpCircle, Lightbulb } from 'lucide-react';
import { RawMaterial } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useConfirm } from '../hooks/useConfirm';
import TutorialModal, { TutorialStep } from './TutorialModal';

const inputStyles = `
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }
`;

interface DilutionRecord {
  id: string;
  date: string;
  materialName: string;
  solventName: string;
  targetPercentage: number;
  targetWeight: number;
  materialWeight: number;
  solventWeight: number;
  unit: 'g' | 'ml';
  notes?: string;
}

interface Props {
  rawMaterials: RawMaterial[];
  history: DilutionRecord[];
  setHistory: (history: DilutionRecord[]) => void;
}

export default function DilutionCalculator({ rawMaterials, history, setHistory }: Props) {
  const { confirm, ConfirmModal } = useConfirm();
  
  // Input States
  const [materialSearch, setMaterialSearch] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [customMaterialName, setCustomMaterialName] = useState('');
  
  const [solventSearch, setSolventSearch] = useState('');
  const [selectedSolventId, setSelectedSolventId] = useState<string | null>(null);
  const [customSolventName, setCustomSolventName] = useState('Ethanol');
  
  const [targetPercentageInput, setTargetPercentageInput] = useState<string>('10');
  const [targetWeightInput, setTargetWeightInput] = useState<string>('10');
  const [calcMode, setCalcMode] = useState<'total' | 'material'>('total'); // 'total' = target total weight, 'material' = target material weight
  const [unit, setUnit] = useState<'g' | 'ml'>('g');
  
  const [notes, setNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const targetPercentage = parseFloat(targetPercentageInput) || 0;
  const targetWeight = parseFloat(targetWeightInput) || 0;

  // Filtered materials for selection
  const filteredMaterials = useMemo(() => {
    if (!materialSearch) return [];
    return rawMaterials.filter(m => 
      m.name.toLowerCase().includes(materialSearch.toLowerCase())
    ).slice(0, 5);
  }, [rawMaterials, materialSearch]);

  const filteredSolvents = useMemo(() => {
    if (!solventSearch) return [];
    const solvents = rawMaterials.filter(m => 
      m.name.toLowerCase().includes(solventSearch.toLowerCase())
    ).slice(0, 5);
    return solvents;
  }, [rawMaterials, solventSearch]);

  // Calculation Logic
  const results = useMemo(() => {
    let matWeight = 0;
    let solWeight = 0;
    let totWeight = 0;

    if (calcMode === 'total') {
      totWeight = targetWeight;
      matWeight = totWeight * (targetPercentage / 100);
      solWeight = totWeight - matWeight;
    } else {
      matWeight = targetWeight; // In this mode, targetWeight input is used as material weight
      totWeight = matWeight / (targetPercentage / 100);
      solWeight = totWeight - matWeight;
    }

    return {
      materialWeight: parseFloat(matWeight.toFixed(3)),
      solventWeight: parseFloat(solWeight.toFixed(3)),
      totalWeight: parseFloat(totWeight.toFixed(3))
    };
  }, [targetPercentage, targetWeight, calcMode]);

  const materialName = useMemo(() => {
    if (selectedMaterialId) {
      return rawMaterials.find(m => m.id === selectedMaterialId)?.name || customMaterialName;
    }
    return customMaterialName || 'Material';
  }, [selectedMaterialId, customMaterialName, rawMaterials]);

  const solventName = useMemo(() => {
    if (selectedSolventId) {
      return rawMaterials.find(m => m.id === selectedSolventId)?.name || customSolventName;
    }
    return customSolventName || 'Solvent';
  }, [selectedSolventId, customSolventName, rawMaterials]);

  const saveToHistory = () => {
    const newRecord: DilutionRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      materialName,
      solventName,
      targetPercentage,
      targetWeight: results.totalWeight,
      materialWeight: results.materialWeight,
      solventWeight: results.solventWeight,
      unit,
      notes
    };
    setHistory([newRecord, ...history]);
    setNotes('');
  };

  const deleteHistoryItem = (id: string) => {
    confirm(
      'Delete Record',
      'Are you sure you want to delete this dilution record?',
      () => setHistory(history.filter(h => h.id !== id))
    );
  };

  const clearHistory = () => {
    confirm(
      'Clear History',
      'Are you sure you want to clear all dilution history? This action cannot be undone.',
      () => setHistory([])
    );
  };

  const tutorialSteps: TutorialStep[] = [
    {
      title: "Material Selection",
      content: "Search for materials from your database or type a custom name. You can also select common solvents like Ethanol or DPG.",
      icon: <Beaker size={40} />
    },
    {
      title: "Calculation Modes",
      content: "Use 'Target Total' to calculate how much material and solvent you need for a specific final amount. Use 'Material I Have' if you have a fixed amount of raw material and need to know how much solvent to add.",
      icon: <Calculator size={40} />
    },
    {
      title: "Units & Precision",
      content: "Toggle between Grams (g) and Milliliters (ml). For professional perfumery, weighing in grams is highly recommended for maximum accuracy.",
      icon: <Scale size={40} />
    },
    {
      title: "History & Notes",
      content: "Save your dilutions to the history log. You can add notes like batch numbers or storage locations for future reference.",
      icon: <History size={40} />
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <style>{inputStyles}</style>
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Side: Inputs */}
        <div className="w-full lg:flex-1 space-y-6">
          <div className="bg-app-card rounded-3xl p-6 md:p-8 border border-app-border shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-app-accent/10 p-3 rounded-2xl">
                  <Calculator className="text-app-accent" size={24} />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight">Dilution Wizard</h2>
                  <p className="text-sm text-app-muted">Calculate precise material dilutions</p>
                </div>
              </div>
              <button 
                onClick={() => setIsTutorialOpen(true)}
                className="p-3 text-app-muted hover:text-app-accent hover:bg-app-accent/10 rounded-2xl transition-all"
                title="How to use"
              >
                <HelpCircle size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Material Selection */}
              <div className="relative">
                <label className="block text-xs font-black uppercase tracking-widest text-app-muted mb-2 ml-1">Material to Dilute</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={selectedMaterialId ? materialName : customMaterialName}
                      onChange={(e) => {
                        if (selectedMaterialId) setSelectedMaterialId(null);
                        setCustomMaterialName(e.target.value);
                        setMaterialSearch(e.target.value);
                      }}
                      placeholder="Search or type material name..."
                      className="w-full bg-app-bg border border-app-border rounded-2xl px-5 py-4 text-app-text focus:ring-2 focus:ring-app-accent focus:border-transparent transition-all outline-none"
                    />
                    {filteredMaterials.length > 0 && !selectedMaterialId && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-app-card border border-app-border rounded-2xl shadow-xl z-[40] overflow-hidden">
                        {filteredMaterials.map(m => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setSelectedMaterialId(m.id);
                              setMaterialSearch('');
                            }}
                            className="w-full text-left px-5 py-3 hover:bg-app-accent/10 transition-colors flex items-center justify-between group"
                          >
                            <span className="font-medium">{m.name}</span>
                            <Plus size={16} className="text-app-muted group-hover:text-app-accent" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Solvent Selection */}
              <div className="relative">
                <label className="block text-xs font-black uppercase tracking-widest text-app-muted mb-2 ml-1">Solvent</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={selectedSolventId ? solventName : customSolventName}
                      onChange={(e) => {
                        if (selectedSolventId) setSelectedSolventId(null);
                        setCustomSolventName(e.target.value);
                        setSolventSearch(e.target.value);
                      }}
                      placeholder="Ethanol, DPG, IPM..."
                      className="w-full bg-app-bg border border-app-border rounded-2xl px-5 py-4 text-app-text focus:ring-2 focus:ring-app-accent focus:border-transparent transition-all outline-none"
                    />
                    {filteredSolvents.length > 0 && !selectedSolventId && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-app-card border border-app-border rounded-2xl shadow-xl z-[40] overflow-hidden">
                        {filteredSolvents.map(m => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setSelectedSolventId(m.id);
                              setSolventSearch('');
                            }}
                            className="w-full text-left px-5 py-3 hover:bg-app-accent/10 transition-colors flex items-center justify-between group"
                          >
                            <span className="font-medium">{m.name}</span>
                            <Plus size={16} className="text-app-muted group-hover:text-app-accent" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-app-muted mb-2 ml-1">Target Concentration (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={targetPercentageInput}
                      onChange={(e) => setTargetPercentageInput(e.target.value)}
                      className="w-full bg-app-bg border border-app-border rounded-2xl px-5 py-4 text-app-text focus:ring-2 focus:ring-app-accent focus:border-transparent transition-all outline-none"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-app-muted font-bold">%</div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-app-muted mb-2 ml-1">
                    {calcMode === 'total' ? `Target Total (${unit})` : `Material I Have (${unit})`}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={targetWeightInput}
                      onChange={(e) => setTargetWeightInput(e.target.value)}
                      className="w-full bg-app-bg border border-app-border rounded-2xl px-5 py-4 text-app-text focus:ring-2 focus:ring-app-accent focus:border-transparent transition-all outline-none"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-app-muted font-bold">{unit}</div>
                  </div>
                </div>
              </div>

              {/* Mode & Unit Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex bg-app-bg p-1 rounded-2xl border border-app-border">
                  <button
                    onClick={() => setCalcMode('total')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${calcMode === 'total' ? 'bg-app-accent text-white shadow-lg' : 'text-app-muted hover:text-app-text'}`}
                  >
                    Target Total
                  </button>
                  <button
                    onClick={() => setCalcMode('material')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${calcMode === 'material' ? 'bg-app-accent text-white shadow-lg' : 'text-app-muted hover:text-app-text'}`}
                  >
                    Material I Have
                  </button>
                </div>
                <div className="flex bg-app-bg p-1 rounded-2xl border border-app-border">
                  <button
                    onClick={() => setUnit('g')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${unit === 'g' ? 'bg-app-accent text-white shadow-lg' : 'text-app-muted hover:text-app-text'}`}
                  >
                    Grams (g)
                  </button>
                  <button
                    onClick={() => setUnit('ml')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${unit === 'ml' ? 'bg-app-accent text-white shadow-lg' : 'text-app-muted hover:text-app-text'}`}
                  >
                    Milliliters (ml)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-app-muted mb-2 ml-1">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Batch number, storage location..."
                  className="w-full bg-app-bg border border-app-border rounded-2xl px-5 py-4 text-app-text focus:ring-2 focus:ring-app-accent focus:border-transparent transition-all outline-none resize-none h-24"
                />
              </div>

              <button
                onClick={saveToHistory}
                className="w-full bg-app-accent text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-app-accent/20 hover:bg-app-accent/90 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <Save size={20} /> Save to History
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Results & History */}
        <div className="w-full lg:w-[400px] space-y-6 lg:sticky lg:top-24">
          {/* Real-time Results Card */}
          <div className="bg-app-accent rounded-3xl p-8 text-white shadow-2xl shadow-app-accent/30 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-70">Dilution Recipe</h3>
                <button 
                  onClick={() => {
                    const text = `Dilution Recipe:\nMaterial: ${materialName} (${results.materialWeight}${unit})\nSolvent: ${solventName} (${results.solventWeight}${unit})\nTotal: ${results.totalWeight}${unit} @ ${targetPercentage}%`;
                    navigator.clipboard.writeText(text);
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                  title="Copy Recipe"
                >
                  <Copy size={16} />
                </button>
              </div>
              
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-70 mb-1">{materialName}</p>
                    <p className="text-4xl font-black tracking-tight">{results.materialWeight}<span className="text-xl ml-1 opacity-60">{unit}</span></p>
                  </div>
                  <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                    <Beaker size={32} />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/20" />
                  <Plus size={16} className="opacity-50" />
                  <div className="h-px flex-1 bg-white/20" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-70 mb-1">{solventName}</p>
                    <p className="text-4xl font-black tracking-tight">{results.solventWeight}<span className="text-xl ml-1 opacity-60">{unit}</span></p>
                  </div>
                  <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                    <Droplets size={32} />
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Total Yield</p>
                    <p className="text-2xl font-bold">{results.totalWeight}{unit} @ {targetPercentage}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Ratio</p>
                    <p className="text-lg font-bold">1 : {((results.totalWeight / results.materialWeight) - 1).toFixed(1)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-app-card rounded-3xl border border-app-border overflow-hidden flex flex-col h-[500px]">
            <div className="p-6 border-b border-app-border flex items-center justify-between bg-app-bg/50">
              <div className="flex items-center gap-2">
                <History size={18} className="text-app-muted" />
                <h3 className="font-bold">Recent Dilutions</h3>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button onClick={clearHistory} className="p-2 text-app-muted hover:text-red-500 transition-colors" title="Purge History">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-app-muted opacity-50">
                  <Scale size={48} className="mb-4" />
                  <p className="text-sm font-medium">No history yet</p>
                </div>
              ) : (
                history.map(item => (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={item.id}
                    className="bg-app-bg rounded-2xl p-5 border border-app-border group relative hover:border-app-accent/30 transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-app-text">{item.materialName}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-app-muted">{new Date(item.date).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => deleteHistoryItem(item.id)}
                        className="p-2 text-app-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-app-card rounded-xl p-3 border border-app-border">
                        <p className="text-[10px] font-black uppercase tracking-widest text-app-muted mb-1">Material</p>
                        <p className="font-bold">{item.materialWeight}{item.unit || 'g'}</p>
                      </div>
                      <div className="bg-app-card rounded-xl p-3 border border-app-border">
                        <p className="text-[10px] font-black uppercase tracking-widest text-app-muted mb-1">Solvent</p>
                        <p className="font-bold">{item.solventWeight}{item.unit || 'g'}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-app-accent/10 text-app-accent text-[10px] font-black rounded-full uppercase">{item.targetPercentage}%</span>
                        <span className="text-[10px] font-bold text-app-muted">in {item.solventName}</span>
                      </div>
                      <p className="text-xs font-bold text-app-text">{item.targetWeight}{item.unit || 'g'} total</p>
                    </div>

                    {item.notes && (
                      <div className="mt-3 pt-3 border-t border-app-border">
                        <p className="text-[10px] italic text-app-muted">{item.notes}</p>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <TutorialModal 
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        title="Dilution Wizard Guide"
        steps={tutorialSteps}
      />
      {ConfirmModal}
    </div>
  );
}
