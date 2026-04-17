import React, { useState } from 'react';
import { Formula, Fragrance, RawMaterial, CalculatorHistoryEntry } from '../types';
import { Save, Trash2, CheckSquare, HelpCircle, Zap, Calculator, History, Beaker } from 'lucide-react';
import { useConfirm } from '../hooks/useConfirm';
import TutorialModal from './TutorialModal';

interface Props {
  formulas: Formula[];
  fragrances: Fragrance[];
  rawMaterials?: RawMaterial[];
  history: CalculatorHistoryEntry[];
  setHistory: React.Dispatch<React.SetStateAction<CalculatorHistoryEntry[]>>;
}

export default function BlendCalculator({ formulas, fragrances, rawMaterials = [], history, setHistory }: Props) {
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>('');
  const [selectedFragranceId, setSelectedFragranceId] = useState<string>('');
  const [capacityMl, setCapacityMl] = useState<number | ''>('');
  
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [isHistorySelectionMode, setIsHistorySelectionMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  const tutorialSteps = [
    {
      title: 'Quick Scaling',
      content: 'Use this tool to quickly calculate the exact weights needed for a specific batch size (ml).',
      icon: <Calculator size={40} />
    },
    {
      title: 'Formula Selection',
      content: 'Choose one of your saved formulas. If it\'s a standard formula, you\'ll also need to pick a fragrance oil.',
      icon: <Beaker size={40} />
    },
    {
      title: 'Hybrid Support',
      content: 'Hybrid formulas automatically include their raw materials, so you only need to specify the target volume.',
      icon: <Zap size={40} />
    },
    {
      title: 'History Tracking',
      content: 'Save your calculations to the history list on the right to keep track of your blending sessions.',
      icon: <History size={40} />
    }
  ];

  const selectedFormula = formulas.find((f) => f.id === selectedFormulaId);
  const selectedFragrance = fragrances.find((f) => f.id === selectedFragranceId);

  const getRawMaterialName = (id: string) => {
    return rawMaterials.find(m => m.id === id)?.name || 'Unknown Material';
  };

  const getFragranceName = (id: string) => {
    return fragrances.find(f => f.id === id)?.name || 'Unknown Fragrance Oil';
  };

  const handleSaveToHistory = () => {
    if (!selectedFormula || !capacityMl || (!selectedFormula.isHybrid && !selectedFragranceId)) return;

    const newEntry: CalculatorHistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      formulaId: selectedFormula.id,
      formulaName: selectedFormula.name,
      fragranceId: selectedFormula.isHybrid ? undefined : selectedFragranceId,
      fragranceName: selectedFormula.isHybrid ? undefined : selectedFragrance?.name,
      capacityMl: Number(capacityMl),
      results: []
    };

    (selectedFormula.fragranceOils || []).forEach(oil => {
      newEntry.results.push({
        type: 'fragrance_oil',
        name: selectedFormula.isHybrid ? getFragranceName(oil.fragranceId) : (selectedFragrance?.name || 'Unknown'),
        percentage: oil.percentage,
        requiredMl: (Number(oil.percentage) / 100) * Number(capacityMl)
      });
    });

    (selectedFormula.materials || []).forEach(material => {
      newEntry.results.push({
        type: 'raw_material',
        name: getRawMaterialName(material.rawMaterialId),
        percentage: material.percentage,
        requiredMl: (Number(material.percentage) / 100) * Number(capacityMl)
      });
    });

    (selectedFormula.alcohols || []).forEach(alcohol => {
      newEntry.results.push({
        type: 'alcohol',
        name: getRawMaterialName(alcohol.rawMaterialId),
        percentage: alcohol.percentage,
        requiredMl: (Number(alcohol.percentage) / 100) * Number(capacityMl)
      });
    });

    setHistory([newEntry, ...history]);
  };

  const toggleHistorySelection = (id: string) => {
    setSelectedHistoryIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const selectAllHistory = () => {
    if (selectedHistoryIds.length === history.length) {
      setSelectedHistoryIds([]);
    } else {
      setSelectedHistoryIds(history.map(h => h.id));
    }
  };

  const deleteSelectedHistory = () => {
    confirm('Delete History', `Are you sure you want to delete ${selectedHistoryIds.length} selected history entries?`, () => {
      setHistory(history.filter(h => !selectedHistoryIds.includes(h.id)));
      setSelectedHistoryIds([]);
      setIsHistorySelectionMode(false);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-app-text">Blend Calculator</h2>
        <button
          onClick={() => setShowTutorial(true)}
          className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/5 rounded-full transition-colors"
          title="How to use"
        >
          <HelpCircle size={22} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-1 bg-app-card rounded-lg shadow border border-app-border p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-app-muted mb-1">Select Formula</label>
            <select
              value={selectedFormulaId}
              onChange={(e) => {
                setSelectedFormulaId(e.target.value);
                // Reset fragrance if switching to a hybrid formula
                const formula = formulas.find(f => f.id === e.target.value);
                if (formula?.isHybrid) {
                  setSelectedFragranceId('');
                }
              }}
              className="w-full px-3 py-2 bg-app-bg border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
            >
              <option value="">-- Choose a Formula --</option>
              {formulas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.version ? `(Mod ${f.version})` : ''} {f.isHybrid ? '(Hybrid)' : ''}
                </option>
              ))}
            </select>
          </div>

          {!selectedFormula?.isHybrid && (
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1">Select Fragrance</label>
              <select
                value={selectedFragranceId}
                onChange={(e) => setSelectedFragranceId(e.target.value)}
                className="w-full px-3 py-2 bg-app-bg border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
              >
                <option value="">-- Choose a Fragrance --</option>
                {fragrances.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1">Capacity (mL)</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.1"
                value={capacityMl}
                onChange={(e) => setCapacityMl(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 bg-app-bg border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent pr-10"
                placeholder="e.g., 50"
              />
              <span className="absolute right-3 top-2 text-app-muted">mL</span>
            </div>
          </div>
        </div>

        {/* Results Display */}
        <div className="lg:col-span-2 bg-app-card rounded-lg shadow border border-app-border p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-app-text">Required Materials</h3>
            {selectedFormula && capacityMl && (selectedFormula.isHybrid || selectedFragranceId) && (
              <button
                onClick={handleSaveToHistory}
                className="flex items-center gap-2 bg-app-accent/10 text-app-accent px-3 py-1.5 rounded-md hover:bg-app-accent/20 transition-colors text-sm font-medium"
              >
                <Save size={16} />
                Save to History
              </button>
            )}
          </div>
          
          {!selectedFormula || !capacityMl || (!selectedFormula.isHybrid && !selectedFragranceId) ? (
            <div className="flex-1 flex items-center justify-center text-center py-12 text-app-muted italic">
              Select a formula, {selectedFormula && !selectedFormula.isHybrid ? 'fragrance, ' : ''}and enter capacity to see the required materials.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-app-border">
                    <th className="py-3 px-4 font-semibold text-app-text">Type</th>
                    <th className="py-3 px-4 font-semibold text-app-text">Material</th>
                    <th className="py-3 px-4 font-semibold text-app-text text-right">Percentage</th>
                    <th className="py-3 px-4 font-semibold text-app-text text-right">Required (mL)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {(selectedFormula.fragranceOils || []).map((oil) => {
                    const requiredMl = (Number(oil.percentage) / 100) * Number(capacityMl);
                    return (
                      <tr key={oil.id} className="hover:bg-app-bg transition-colors">
                        <td className="py-3 px-4 text-app-muted text-sm">Fragrance Oil</td>
                        <td className="py-3 px-4 text-app-text">
                          {selectedFormula.isHybrid ? getFragranceName(oil.fragranceId) : selectedFragrance?.name}
                        </td>
                        <td className="py-3 px-4 text-app-muted text-right">{oil.percentage}%</td>
                        <td className="py-3 px-4 font-medium text-app-accent text-right">
                          {requiredMl.toFixed(2)} mL
                        </td>
                      </tr>
                    );
                  })}
                  {(selectedFormula.materials || []).map((material) => {
                    const requiredMl = (Number(material.percentage) / 100) * Number(capacityMl);
                    return (
                      <tr key={material.id} className="hover:bg-app-bg transition-colors">
                        <td className="py-3 px-4 text-app-muted text-sm">Raw Material</td>
                        <td className="py-3 px-4 text-app-text">{getRawMaterialName(material.rawMaterialId)}</td>
                        <td className="py-3 px-4 text-app-muted text-right">{material.percentage}%</td>
                        <td className="py-3 px-4 font-medium text-app-accent text-right">
                          {requiredMl.toFixed(2)} mL
                        </td>
                      </tr>
                    );
                  })}
                  {(selectedFormula.alcohols || []).map((alcohol) => {
                    const requiredMl = (Number(alcohol.percentage) / 100) * Number(capacityMl);
                    return (
                      <tr key={alcohol.id} className="hover:bg-app-bg transition-colors">
                        <td className="py-3 px-4 text-app-muted text-sm">Alcohol</td>
                        <td className="py-3 px-4 text-app-text">{getRawMaterialName(alcohol.rawMaterialId)}</td>
                        <td className="py-3 px-4 text-app-muted text-right">{alcohol.percentage}%</td>
                        <td className="py-3 px-4 font-medium text-app-accent text-right">
                          {requiredMl.toFixed(2)} mL
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-app-border font-semibold">
                  <tr>
                    <td className="py-3 px-4 text-app-text" colSpan={2}>Total</td>
                    <td className="py-3 px-4 text-app-muted text-right">
                      {(
                        (selectedFormula.fragranceOils || []).reduce((sum, o) => sum + Number(o.percentage), 0) +
                        (selectedFormula.materials || []).reduce((sum, m) => sum + Number(m.percentage), 0) +
                        (selectedFormula.alcohols || []).reduce((sum, a) => sum + Number(a.percentage), 0)
                      ).toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-app-accent text-right">
                      {Number(capacityMl).toFixed(2)} mL
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* History Section */}
      <div className="bg-app-card rounded-lg shadow border border-app-border overflow-hidden">
        <div className="p-4 bg-app-bg border-b border-app-border flex justify-between items-center">
          <h3 className="font-semibold text-app-text">Calculation History</h3>
          <div className="flex gap-2">
            {isHistorySelectionMode ? (
              <>
                <button
                  onClick={selectAllHistory}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-app-bg border border-app-border text-app-text rounded-md hover:bg-app-card transition-colors"
                >
                  <CheckSquare size={16} />
                  {selectedHistoryIds.length === history.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={deleteSelectedHistory}
                  disabled={selectedHistoryIds.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500/10 border border-red-500/20 text-red-600 rounded-md hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  Delete ({selectedHistoryIds.length})
                </button>
                <button
                  onClick={() => {
                    setIsHistorySelectionMode(false);
                    setSelectedHistoryIds([]);
                  }}
                  className="px-3 py-1.5 text-sm text-app-muted hover:text-app-text transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsHistorySelectionMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-app-bg border border-app-border text-app-text rounded-md hover:bg-app-card transition-colors"
              >
                <CheckSquare size={16} />
                Select
              </button>
            )}
          </div>
        </div>
        
        {history.length === 0 ? (
          <div className="p-8 text-center text-app-muted italic">
            No calculation history yet. Save a calculation to see it here.
          </div>
        ) : (
          <div className="divide-y divide-app-border max-h-[600px] overflow-y-auto">
            {history.map(entry => (
              <div key={entry.id} className="p-4 hover:bg-app-bg transition-colors flex gap-4">
                {isHistorySelectionMode && (
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={selectedHistoryIds.includes(entry.id)}
                      onChange={() => toggleHistorySelection(entry.id)}
                      className="rounded border-app-border text-app-accent focus:ring-app-accent w-5 h-5"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-app-text">
                        {entry.formulaName} {entry.fragranceName ? `- ${entry.fragranceName}` : ''}
                      </h4>
                      <p className="text-sm text-app-muted">
                        {new Date(entry.timestamp).toLocaleString()} • {entry.capacityMl} mL Total
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                    {entry.results.map((result, idx) => (
                      <div key={idx} className="bg-app-bg border border-app-border rounded p-2 text-sm">
                        <div className="flex justify-between text-app-muted mb-1">
                          <span className="truncate pr-2" title={result.name}>{result.name}</span>
                          <span>{result.percentage}%</span>
                        </div>
                        <div className="font-medium text-app-accent text-right">
                          {result.requiredMl.toFixed(2)} mL
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {ConfirmModal}

      <TutorialModal 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title="Blend Calculator Guide"
        steps={tutorialSteps}
      />
    </div>
  );
}
