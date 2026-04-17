import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Save, X, ChevronLeft, Edit2, MoreVertical, Copy, CheckSquare, ArrowUp, ArrowDown, HelpCircle, Beaker, Zap, Calculator, Layers, GitBranch, History, ArrowLeftRight } from 'lucide-react';
import { Formula, Material, FragranceOil, RawMaterial, Fragrance } from '../types';
import { useConfirm } from '../hooks/useConfirm';
import TutorialModal from './TutorialModal';

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

interface Props {
  formulas: Formula[];
  setFormulas: React.Dispatch<React.SetStateAction<Formula[]>>;
  rawMaterials: RawMaterial[];
  fragrances: Fragrance[];
}

export default function FormulaList({ formulas, setFormulas, rawMaterials, fragrances }: Props) {
  const [viewState, setViewState] = useState<'list' | 'detail' | 'edit' | 'compare' | 'history'>('list');
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  const tutorialSteps = [
    {
      title: 'Formula Management',
      content: 'Create and manage your perfume formulas and accords. Accords can be reused as ingredients in other formulas.',
      icon: <Beaker size={40} />
    },
    {
      title: 'Hybrid Formulas',
      content: 'Toggle "Hybrid Mode" to combine both fragrance oils and raw materials in a single formula for maximum creativity.',
      icon: <Zap size={40} />
    },
    {
      title: 'Auto-Calculations',
      content: 'The system automatically calculates percentages and total weights as you add ingredients. You can lock specific amounts if needed.',
      icon: <Calculator size={40} />
    },
    {
      title: 'Accord Layering',
      content: 'Import your saved accords into larger formulas. This allows you to build complex scents from simpler building blocks.',
      icon: <Layers size={40} />
    },
    {
      title: 'R&D Versioning',
      content: 'Use "Branch" to create Mods (versions) of a scent. Compare two versions side-by-side to see exactly what changed. Use "Finalize" to strip versioning and keep a mod as your new standalone original.',
      icon: <GitBranch size={40} />
    }
  ];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const addFormula = (type: 'formula' | 'accord' = 'formula') => {
    const newFormula: Formula = {
      id: crypto.randomUUID(),
      name: type === 'accord' ? `New Accord` : `New Formula`,
      type,
      isHybrid: false,
      accordCapacity: type === 'accord' ? 10 : undefined,
      accordCapacityUnit: type === 'accord' ? 'g' : undefined,
      fragranceOils: type === 'accord' ? [] : [{ id: crypto.randomUUID(), fragranceId: '', percentage: 0 }],
      materials: [],
      alcohols: [],
      accords: [],
    };
    setEditingFormula(newFormula);
    setViewState('edit');
  };

  const duplicateFormula = (formula: Formula) => {
    const newFormula: Formula = {
      ...formula,
      id: crypto.randomUUID(),
      name: `${formula.name} (Copy)`,
      fragranceOils: formula.fragranceOils.map(o => ({ ...o, id: crypto.randomUUID() })),
      materials: formula.materials.map(m => ({ ...m, id: crypto.randomUUID() })),
      alcohols: formula.alcohols.map(a => ({ ...a, id: crypto.randomUUID() })),
    };
    setFormulas([...formulas, newFormula]);
  };

  const branchFormula = (formula: Formula) => {
    const nextVersion = (formula.version || 1) + 1;
    const newFormula: Formula = {
      ...formula,
      id: crypto.randomUUID(),
      name: `${formula.name} (Mod ${nextVersion})`,
      version: nextVersion,
      parentFormulaId: formula.id,
      originalFormulaId: formula.originalFormulaId || formula.id,
      versionNote: '',
      fragranceOils: formula.fragranceOils.map(o => ({ ...o, id: crypto.randomUUID() })),
      materials: formula.materials.map(m => ({ ...m, id: crypto.randomUUID() })),
      alcohols: formula.alcohols.map(a => ({ ...a, id: crypto.randomUUID() })),
    };
    
    // Update the original formula if it didn't have version info
    if (!formula.version || !formula.originalFormulaId) {
      setFormulas(formulas.map(f => f.id === formula.id ? {
        ...f,
        version: 1,
        originalFormulaId: f.id
      } : f));
    }

    setEditingFormula(newFormula);
    setViewState('edit');
  };

  const finalizeFormula = (formula: Formula) => {
    confirm('Finalize Formula', 'This will remove all versioning metadata (Mod number, history link) and make this a standalone "Original" formula. Continue?', () => {
      const updatedFormula: Formula = {
        ...formula,
        version: undefined,
        parentFormulaId: undefined,
        originalFormulaId: undefined,
        versionNote: undefined,
        name: formula.name.replace(/\s\(Mod\s\d+\)$/, '')
      };
      setFormulas(formulas.map(f => f.id === formula.id ? updatedFormula : f));
      if (selectedFormula?.id === formula.id) setSelectedFormula(updatedFormula);
      setViewState('detail');
    });
  };

  const deleteFormula = (id: string) => {
    confirm('Delete Formula', 'Are you sure you want to delete this formula?', () => {
      setFormulas(formulas.filter((f) => f.id !== id));
      if (selectedFormula?.id === id) {
        setViewState('list');
        setSelectedFormula(null);
      }
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    });
  };

  const deleteSelectedFormulas = () => {
    confirm('Delete Formulas', `Are you sure you want to delete ${selectedIds.length} selected formulas?`, () => {
      setFormulas(formulas.filter(f => !selectedIds.includes(f.id)));
      setSelectedIds([]);
      setIsSelectionMode(false);
    });
  };

  const toggleSelection = (id: string) => {
    if (isCompareMode) {
      setCompareIds(prev => {
        if (prev.includes(id)) return prev.filter(cid => cid !== id);
        if (prev.length >= 2) return [prev[1], id];
        return [...prev, id];
      });
      return;
    }
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    if (selectedIds.length === formulas.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(formulas.map(f => f.id));
    }
  };

  const handleEditClick = (formula: Formula) => {
    setEditingFormula({ 
      ...formula,
      fragranceOils: formula.fragranceOils?.length ? formula.fragranceOils : [{ id: crypto.randomUUID(), fragranceId: '', percentage: 0 }]
    });
    setViewState('edit');
  };

  const handleSaveAndContinue = () => {
    if (!editingFormula) return;
    
    let finalFormula = { ...editingFormula };
    if (finalFormula.type !== 'accord' && finalFormula.alcohols && finalFormula.alcohols.length > 0) {
      const oilsTotal = (finalFormula.fragranceOils || []).reduce((sum, o) => sum + (Number(o.percentage) || 0), 0);
      const materialsTotal = (finalFormula.materials || []).reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
      const totalActive = oilsTotal + materialsTotal;
      
      const otherAlcoholsTotal = finalFormula.alcohols.slice(0, -1).reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);
      const remaining = Math.max(0, 100 - totalActive - otherAlcoholsTotal);
      
      finalFormula.alcohols[finalFormula.alcohols.length - 1].percentage = Number(remaining.toFixed(2));
    }

    const exists = formulas.some(f => f.id === finalFormula.id);
    if (exists) {
      setFormulas(formulas.map(f => f.id === finalFormula.id ? finalFormula : f));
    } else {
      setFormulas([...formulas, finalFormula]);
    }
    
    setEditingFormula({
      ...finalFormula,
      id: generateId(),
      name: '', // Reset name
    });
  };

  const handleSave = () => {
    if (!editingFormula) return;
    
    // Auto-calculate alcohol percentage for the LAST alcohol entry
    let finalFormula = { ...editingFormula };
    if (finalFormula.type !== 'accord' && finalFormula.alcohols && finalFormula.alcohols.length > 0) {
      const oilsTotal = (finalFormula.fragranceOils || []).reduce((sum, o) => sum + (Number(o.percentage) || 0), 0);
      const materialsTotal = (finalFormula.materials || []).reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
      const totalActive = oilsTotal + materialsTotal;
      
      // Sum all alcohols EXCEPT the last one
      const otherAlcoholsTotal = finalFormula.alcohols.slice(0, -1).reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);
      
      const remaining = Math.max(0, 100 - totalActive - otherAlcoholsTotal);
      
      finalFormula.alcohols[finalFormula.alcohols.length - 1].percentage = Number(remaining.toFixed(2));
    }

    const exists = formulas.some(f => f.id === finalFormula.id);
    if (exists) {
      setFormulas(formulas.map(f => f.id === finalFormula.id ? finalFormula : f));
    } else {
      setFormulas([...formulas, finalFormula]);
    }
    
    setSelectedFormula(finalFormula);
    setViewState('detail');
  };

  const handleCancel = () => {
    setViewState(selectedFormula ? 'detail' : 'list');
    setEditingFormula(null);
  };

  const updateFormulaName = (name: string) => {
    if (editingFormula) {
      setEditingFormula({ ...editingFormula, name });
    }
  };

  const toggleHybrid = (isHybrid: boolean) => {
    if (editingFormula) {
      setEditingFormula({
        ...editingFormula,
        isHybrid,
        fragranceOils: isHybrid 
          ? editingFormula.fragranceOils 
          : [{ id: crypto.randomUUID(), fragranceId: '', percentage: editingFormula.fragranceOils[0]?.percentage || 0 }]
      });
    }
  };

  const addFragranceOil = () => {
    if (editingFormula) {
      setEditingFormula({
        ...editingFormula,
        fragranceOils: [
          ...(editingFormula.fragranceOils || []),
          { id: crypto.randomUUID(), fragranceId: '', percentage: 0 },
        ],
      });
    }
  };

  const updateFragranceOil = (oilId: string, field: keyof FragranceOil, value: string | number) => {
    if (editingFormula) {
      setEditingFormula({
        ...editingFormula,
        fragranceOils: editingFormula.fragranceOils.map((o) =>
          o.id === oilId ? { ...o, [field]: value } : o
        ),
      });
    }
  };

  const deleteFragranceOil = (oilId: string) => {
    if (editingFormula) {
      setEditingFormula({
        ...editingFormula,
        fragranceOils: editingFormula.fragranceOils.filter((o) => o.id !== oilId),
      });
    }
  };

  const addMaterial = () => {
    if (editingFormula) {
      setEditingFormula({
        ...editingFormula,
        materials: [
          ...(editingFormula.materials || []),
          { id: crypto.randomUUID(), rawMaterialId: '', percentage: 0 },
        ],
      });
    }
  };

  const updateMaterial = (materialId: string, field: keyof Material, value: string | number) => {
    if (editingFormula) {
      setEditingFormula({
        ...editingFormula,
        materials: editingFormula.materials.map((m) =>
          m.id === materialId ? { ...m, [field]: value } : m
        ),
      });
    }
  };

  const deleteMaterial = (materialId: string) => {
    if (editingFormula) {
      setEditingFormula({
        ...editingFormula,
        materials: editingFormula.materials.filter((m) => m.id !== materialId),
      });
    }
  };

  const addAlcohol = () => {
    if (editingFormula) {
      setEditingFormula({
        ...editingFormula,
        alcohols: [
          ...(editingFormula.alcohols || []),
          { id: crypto.randomUUID(), rawMaterialId: '', percentage: 0 },
        ],
      });
    }
  };

  const updateAlcohol = (alcoholId: string, field: keyof Material, value: string | number) => {
    if (editingFormula) {
      setEditingFormula({
        ...editingFormula,
        alcohols: editingFormula.alcohols.map((a) =>
          a.id === alcoholId ? { ...a, [field]: value } : a
        ),
      });
    }
  };

  const deleteAlcohol = (alcoholId: string) => {
    if (editingFormula) {
      setEditingFormula({
        ...editingFormula,
        alcohols: editingFormula.alcohols.filter((a) => a.id !== alcoholId),
      });
    }
  };

  const addAccord = () => {
    if (editingFormula) {
      setEditingFormula({
        ...editingFormula,
        accords: [
          ...(editingFormula.accords || []),
          { id: crypto.randomUUID(), accordId: '', amount: 0, unit: 'g' },
        ],
      });
    }
  };

  const updateAccord = (accordRefId: string, field: string, value: string | number) => {
    if (editingFormula) {
      setEditingFormula({
        ...editingFormula,
        accords: (editingFormula.accords || []).map((a) =>
          a.id === accordRefId ? { ...a, [field]: value } : a
        ),
      });
    }
  };

  const deleteAccord = (accordRefId: string) => {
    if (editingFormula) {
      setEditingFormula({
        ...editingFormula,
        accords: (editingFormula.accords || []).filter((a) => a.id !== accordRefId),
      });
    }
  };

  const moveFormula = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formulas.length - 1) return;
    
    const newFormulas = [...formulas];
    const temp = newFormulas[index];
    newFormulas[index] = newFormulas[index + (direction === 'up' ? -1 : 1)];
    newFormulas[index + (direction === 'up' ? -1 : 1)] = temp;
    
    setFormulas(newFormulas);
  };

  const getTypes = (m: RawMaterial) => m.types?.length ? m.types : (m.type ? [m.type] : ['raw_material']);

  const rawMaterialOptions = rawMaterials.filter(m => {
    const types = getTypes(m);
    return types.includes('raw_material') || types.includes('accord_material') || types.includes('solvent');
  });
  const alcoholOptions = rawMaterials.filter(m => getTypes(m).some(t => t === 'alcohol' || t === 'solvent'));

  const getFormulaSummary = (formula: Formula) => {
    const items: string[] = [];
    if (formula.isHybrid) {
      formula.fragranceOils.forEach(o => {
        const f = fragrances.find(fr => fr.id === o.fragranceId);
        if (f) items.push(f.name);
      });
    } else {
      items.push('Fragrance Oil');
    }
    
    formula.materials.forEach(m => {
      const rm = rawMaterials.find(r => r.id === m.rawMaterialId);
      if (rm) items.push(rm.name);
    });
    
    formula.alcohols.forEach(a => {
      const rm = rawMaterials.find(r => r.id === a.rawMaterialId);
      if (rm) items.push(rm.name);
    });

    if (items.length <= 3) return items.join(', ');
    return `${items.slice(0, 3).join(', ')} ...`;
  };

  if (viewState === 'edit' && editingFormula) {
    return (
      <>
        <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={handleCancel}
            className="p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-app-text">
            {formulas.some(f => f.id === editingFormula.id) ? 'Edit Formula' : 'New Formula'}
          </h2>
        </div>

        <div className="bg-app-card rounded-lg shadow border border-app-border p-6">
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1">
                {editingFormula.type === 'accord' ? 'Accord Name' : 'Formula Name'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingFormula.name || ''}
                  onChange={(e) => updateFormulaName(e.target.value)}
                  className="flex-1 px-4 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                />
                {editingFormula.version && (
                  <div className="px-3 py-2 bg-app-accent/10 text-app-accent rounded-md border border-app-accent/20 font-bold flex items-center gap-2">
                    <GitBranch size={16} />
                    Mod {editingFormula.version}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-muted mb-1">Version Note (R&D Notes)</label>
              <textarea
                value={editingFormula.versionNote || ''}
                onChange={(e) => setEditingFormula({ ...editingFormula, versionNote: e.target.value })}
                className="w-full px-4 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent min-h-[80px]"
                placeholder="What did you change in this version? e.g., Increased Bergamot, reduced Vanilla..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-muted mb-1">
                {editingFormula.type === 'accord' ? 'Accord Capacity' : 'Formula Capacity (Optional)'}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={editingFormula.accordCapacity || ''}
                  onChange={(e) => setEditingFormula({ ...editingFormula, accordCapacity: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                  placeholder="e.g., 100"
                />
                <select
                  value={editingFormula.accordCapacityUnit || 'g'}
                  onChange={(e) => setEditingFormula({ ...editingFormula, accordCapacityUnit: e.target.value as any })}
                  className="w-24 px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                >
                  <option value="ml">ml</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="mg">mg</option>
                </select>
              </div>
            </div>

            {editingFormula.type !== 'accord' && (() => {
              const oilsTotal = (editingFormula.fragranceOils || []).reduce((sum, o) => sum + (Number(o.percentage) || 0), 0);
              const materialsTotal = (editingFormula.materials || []).reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
              const alcoholsTotal = (editingFormula.alcohols || []).reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);
              
              const totalActive = oilsTotal + materialsTotal;
              
              // Auto-calculate alcohol for the last one
              let displayAlcoholTotal = alcoholsTotal;
              if (editingFormula.alcohols && editingFormula.alcohols.length > 0) {
                const otherAlcoholsTotal = editingFormula.alcohols.slice(0, -1).reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);
                const lastAlcoholVal = Math.max(0, 100 - totalActive - otherAlcoholsTotal);
                displayAlcoholTotal = otherAlcoholsTotal + lastAlcoholVal;
              }
              
              const totalPercentage = totalActive + displayAlcoholTotal;
              const isTotalValid = Math.abs(totalPercentage - 100) < 0.01;

              return (
                <div className="bg-app-bg p-4 rounded-lg border border-app-border flex justify-between items-center">
                  <div>
                    <div className="text-sm text-app-muted">Total Active (Oils + Materials)</div>
                    <div className="text-xl font-bold text-app-accent">{totalActive.toFixed(2)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-app-muted">Total Formula</div>
                    <div className={`text-xl font-bold ${isTotalValid ? 'text-green-500' : 'text-yellow-500'}`}>
                      {totalPercentage.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Fragrance Oils Section */}
            {editingFormula.type !== 'accord' && (
            <div>
              <div className="flex justify-between items-center mb-4 border-b border-app-border pb-2">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-app-text">Fragrance Oil</h3>
                  <span className="text-sm font-medium text-app-accent bg-app-accent/10 px-2 py-0.5 rounded">
                    Total: {(editingFormula.fragranceOils || []).reduce((sum, o) => sum + (Number(o.percentage) || 0), 0).toFixed(2)}%
                  </span>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-app-text cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editingFormula.isHybrid || false} 
                    onChange={(e) => toggleHybrid(e.target.checked)}
                    className="rounded border-app-border text-app-accent focus:ring-app-accent"
                  />
                  Hybrid (Multiple Oils)
                </label>
              </div>

              <div className="space-y-3">
                {editingFormula.isHybrid ? (
                  <>
                    {(editingFormula.fragranceOils || []).map((oil) => (
                      <div key={oil.id} className="flex items-center gap-3">
                        <select
                          value={oil.fragranceId || ''}
                          onChange={(e) => updateFragranceOil(oil.id, 'fragranceId', e.target.value)}
                          className="flex-1 px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                        >
                          <option value="">Select Fragrance Oil...</option>
                          {fragrances.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                        <div className="relative w-32">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0"
                            value={oil.percentage || ''}
                            onChange={(e) => updateFragranceOil(oil.id, 'percentage', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent pr-8"
                          />
                          <span className="absolute right-3 top-2 text-app-muted">%</span>
                        </div>
                        <button
                          onClick={() => deleteFragranceOil(oil.id)}
                          className="p-2 text-app-muted hover:text-red-500 transition-colors rounded-md hover:bg-red-500/10"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addFragranceOil}
                      className="mt-3 flex items-center gap-2 text-app-accent hover:text-app-accent-hover font-medium transition-colors text-sm"
                    >
                      <Plus size={16} />
                      Add Fragrance Oil
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-muted">
                      Fragrance Oil (Single)
                    </div>
                    <div className="relative w-32">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="0"
                        value={editingFormula.fragranceOils[0]?.percentage || ''}
                        onChange={(e) => updateFragranceOil(editingFormula.fragranceOils[0]?.id || '', 'percentage', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent pr-8"
                      />
                      <span className="absolute right-3 top-2 text-app-muted">%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Accords Section (Hybrid) */}
            {editingFormula.type === 'accord' && (
              <div>
                <div className="flex justify-between items-center mb-4 border-b border-app-border pb-2">
                  <h3 className="text-lg font-semibold text-app-text">Included Accords</h3>
                  <label className="flex items-center gap-2 text-sm font-medium text-app-text cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editingFormula.isHybrid || false} 
                      onChange={(e) => toggleHybrid(e.target.checked)}
                      className="rounded border-app-border text-app-accent focus:ring-app-accent"
                    />
                    Hybrid (Multiple Accords)
                  </label>
                </div>
                {editingFormula.isHybrid && (
                  <div className="space-y-3">
                    {(editingFormula.accords || []).map((accordRef) => (
                      <div key={accordRef.id} className="flex items-center gap-3">
                        <select
                          value={accordRef.accordId || ''}
                          onChange={(e) => updateAccord(accordRef.id, 'accordId', e.target.value)}
                          className="flex-1 px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                        >
                          <option value="">Select Accord...</option>
                          {formulas.filter(f => f.type === 'accord' && f.id !== editingFormula.id).map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                        <div className="w-24">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={accordRef.amount || ''}
                            onChange={(e) => updateAccord(accordRef.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                          />
                        </div>
                        <div className="w-24">
                          <select
                            value={accordRef.unit || 'g'}
                            onChange={(e) => updateAccord(accordRef.id, 'unit', e.target.value)}
                            className="w-full px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                          >
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                            <option value="drops">drops</option>
                            <option value="%">%</option>
                            <option value="mg">mg</option>
                          </select>
                        </div>
                        <button
                          onClick={() => deleteAccord(accordRef.id)}
                          className="p-2 text-app-muted hover:text-red-500 transition-colors rounded-md hover:bg-red-500/10"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addAccord}
                      className="mt-3 flex items-center gap-2 text-app-accent hover:text-app-accent-hover font-medium transition-colors text-sm"
                    >
                      <Plus size={16} />
                      Add Accord
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Materials Section */}
            <div>
              <div className="flex items-center gap-4 mb-4 border-b border-app-border pb-2">
                <h3 className="text-lg font-semibold text-app-text">Raw Materials</h3>
                {editingFormula.type !== 'accord' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-app-accent bg-app-accent/10 px-2 py-0.5 rounded">
                      Total: {(editingFormula.materials || []).reduce((sum, m) => sum + (Number(m.percentage) || 0), 0).toFixed(2)}%
                    </span>
                    {editingFormula.accordCapacity ? (
                      <span className="text-sm font-medium text-app-muted bg-app-bg px-2 py-0.5 rounded border border-app-border">
                        {((editingFormula.materials || []).reduce((sum, m) => sum + (Number(m.percentage) || 0), 0) / 100 * editingFormula.accordCapacity).toFixed(2)} {editingFormula.accordCapacityUnit || 'g'}
                      </span>
                    ) : null}
                  </div>
                )}
                {editingFormula.type === 'accord' && (
                  <span className="text-sm font-medium text-app-accent bg-app-accent/10 px-2 py-0.5 rounded">
                    Total: {(editingFormula.materials || []).reduce((sum, m) => sum + (Number(m.amount) || 0), 0).toFixed(2)} {editingFormula.accordCapacityUnit || 'g'}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {(editingFormula.materials || []).map((material) => (
                  <div key={material.id} className="flex items-center gap-3">
                    <select
                      value={material.rawMaterialId || ''}
                      onChange={(e) => updateMaterial(material.id, 'rawMaterialId', e.target.value)}
                      className="flex-1 px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                    >
                      <option value="">Select Raw Material...</option>
                      {rawMaterialOptions.map(m => (
                        <option key={m.id} value={m.id}>{m.name} {m.isDiluted ? `(${m.dilutionPercentage}%)` : ''}</option>
                      ))}
                    </select>
                    {editingFormula.type === 'accord' ? (
                      <>
                        <div className="w-24">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={material.amount || ''}
                            onChange={(e) => updateMaterial(material.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                          />
                        </div>
                        <div className="w-24">
                          <select
                            value={material.unit || 'g'}
                            onChange={(e) => updateMaterial(material.id, 'unit', e.target.value)}
                            className="w-full px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                          >
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                            <option value="drops">drops</option>
                            <option value="%">%</option>
                            <option value="mg">mg</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="relative w-32">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0"
                            value={material.percentage || ''}
                            onChange={(e) => updateMaterial(material.id, 'percentage', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent pr-8"
                          />
                          <span className="absolute right-3 top-2 text-app-muted">%</span>
                        </div>
                        {editingFormula.accordCapacity ? (
                          <div className="text-sm text-app-muted w-20 text-right">
                            {((material.percentage || 0) / 100 * editingFormula.accordCapacity).toFixed(2)} {editingFormula.accordCapacityUnit || 'g'}
                          </div>
                        ) : null}
                      </div>
                    )}
                    <button
                      onClick={() => deleteMaterial(material.id)}
                      className="p-2 text-app-muted hover:text-red-500 transition-colors rounded-md hover:bg-red-500/10"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addMaterial}
                className="mt-3 flex items-center gap-2 text-app-accent hover:text-app-accent-hover font-medium transition-colors text-sm"
              >
                <Plus size={16} />
                Add Material
              </button>
            </div>

            {/* Alcohols Section */}
            {editingFormula.type !== 'accord' && (
            <div>
              <div className="flex items-center gap-4 mb-2 border-b border-app-border pb-2">
                <h3 className="text-lg font-semibold text-app-text">Alcohol / Solvent</h3>
                <span className="text-sm font-medium text-app-accent bg-app-accent/10 px-2 py-0.5 rounded">
                  Total: {(() => {
                    if (!editingFormula.alcohols || editingFormula.alcohols.length === 0) return '0.00';
                    const oilsTotal = (editingFormula.fragranceOils || []).reduce((sum, o) => sum + (Number(o.percentage) || 0), 0);
                    const materialsTotal = (editingFormula.materials || []).reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
                    const totalActive = oilsTotal + materialsTotal;
                    const otherAlcoholsTotal = editingFormula.alcohols.slice(0, -1).reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);
                    const lastAlcoholVal = Math.max(0, 100 - totalActive - otherAlcoholsTotal);
                    return (otherAlcoholsTotal + lastAlcoholVal).toFixed(2);
                  })()}%
                </span>
              </div>
              <p className="text-xs text-app-muted mb-3">The last alcohol entry will be auto-calculated to reach 100%.</p>
              <div className="space-y-3">
                {(editingFormula.alcohols || []).map((alcohol, index) => {
                  const oilsTotal = (editingFormula.fragranceOils || []).reduce((sum, o) => sum + (Number(o.percentage) || 0), 0);
                  const materialsTotal = (editingFormula.materials || []).reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
                  const totalActive = oilsTotal + materialsTotal;
                  
                  const otherAlcoholsTotal = editingFormula.alcohols.slice(0, -1).reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);
                  const autoCalcValue = Math.max(0, 100 - totalActive - otherAlcoholsTotal).toFixed(2);
                  
                  const isAutoCalc = index === editingFormula.alcohols.length - 1;

                  return (
                    <div key={alcohol.id} className="flex items-center gap-3">
                      <select
                        value={alcohol.rawMaterialId || ''}
                        onChange={(e) => updateAlcohol(alcohol.id, 'rawMaterialId', e.target.value)}
                        className="flex-1 px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                      >
                        <option value="">Select Alcohol/Solvent...</option>
                        {alcoholOptions.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <div className="relative w-32">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                          value={isAutoCalc ? autoCalcValue : (alcohol.percentage || '')}
                          onChange={(e) => {
                            if (!isAutoCalc) {
                              updateAlcohol(alcohol.id, 'percentage', parseFloat(e.target.value) || 0);
                            }
                          }}
                          disabled={isAutoCalc}
                          className={`w-full px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent pr-8 ${isAutoCalc ? 'bg-app-card text-app-muted' : ''}`}
                        />
                        <span className="absolute right-3 top-2 text-app-muted">%</span>
                      </div>
                      <button
                        onClick={() => deleteAlcohol(alcohol.id)}
                        className="p-2 text-app-muted hover:text-red-500 transition-colors rounded-md hover:bg-red-500/10"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={addAlcohol}
                className="mt-3 flex items-center gap-2 text-app-accent hover:text-app-accent-hover font-medium transition-colors text-sm"
              >
                <Plus size={16} />
                Add Alcohol/Solvent
              </button>
            </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 text-app-text bg-app-bg rounded-md hover:bg-app-card transition-colors border border-app-border"
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
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
      {ConfirmModal}
      <TutorialModal 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title="Formula List Guide"
        steps={tutorialSteps}
      />
    </>
  );
}

if (viewState === 'detail' && selectedFormula) {
    const oilsTotal = (selectedFormula.fragranceOils || []).reduce((sum, o) => sum + (Number(o.percentage) || 0), 0);
    const materialsTotal = (selectedFormula.materials || []).reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
    const alcoholsTotal = (selectedFormula.alcohols || []).reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);
    const totalActive = oilsTotal + materialsTotal;
    
    let displayAlcoholTotal = alcoholsTotal;
    if (selectedFormula.alcohols && selectedFormula.alcohols.length > 0) {
      const otherAlcoholsTotal = selectedFormula.alcohols.slice(0, -1).reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);
      const lastAlcoholVal = Math.max(0, 100 - totalActive - otherAlcoholsTotal);
      displayAlcoholTotal = otherAlcoholsTotal + lastAlcoholVal;
    }
    const totalPercentage = totalActive + displayAlcoholTotal;

    return (
      <>
        <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewState('list')}
              className="p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-bold text-app-text">{selectedFormula.name}</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleEditClick(selectedFormula)}
              className="flex items-center gap-2 px-4 py-2 bg-app-card border border-app-border text-app-text rounded-md hover:bg-app-bg transition-colors"
            >
              <Edit2 size={18} />
              Edit
            </button>
            <button
              onClick={() => setViewState('history')}
              className="flex items-center gap-2 bg-app-card border border-app-border text-app-text px-4 py-2 rounded-md hover:bg-app-bg transition-colors"
            >
              <History size={18} />
              Version History
            </button>
            <button
              onClick={() => branchFormula(selectedFormula)}
              className="flex items-center gap-2 bg-app-card border border-app-border text-app-text px-4 py-2 rounded-md hover:bg-app-bg transition-colors"
            >
              <GitBranch size={18} />
              Branch
            </button>
            {selectedFormula.version && (
              <button
                onClick={() => finalizeFormula(selectedFormula)}
                className="flex items-center gap-2 bg-app-card border border-app-border text-app-text px-4 py-2 rounded-md hover:bg-app-bg transition-colors"
                title="Remove versioning and make standalone"
              >
                <CheckSquare size={18} />
                Finalize
              </button>
            )}
            <button
              onClick={() => deleteFormula(selectedFormula.id)}
              className="flex items-center gap-2 px-4 py-2 bg-app-card border border-red-500/20 text-red-600 rounded-md hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>

        <div className="bg-app-card rounded-xl shadow-sm border border-app-border overflow-hidden">
          {selectedFormula.type !== 'accord' ? (
            <div className="p-6 border-b border-app-border bg-app-bg grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-app-muted">Total Active</p>
                <p className="text-xl font-bold text-app-accent">{totalActive.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm text-app-muted">Total Alcohol</p>
                <p className="text-xl font-bold text-app-text">{displayAlcoholTotal.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm text-app-muted">Total Formula</p>
                <p className={`text-xl font-bold ${Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-500' : 'text-yellow-500'}`}>
                  {totalPercentage.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-app-muted">Type</p>
                <p className="text-lg font-medium text-app-text">{selectedFormula.isHybrid ? 'Hybrid' : 'Standard'}</p>
              </div>
            </div>
          ) : (
            <div className="p-6 border-b border-app-border bg-app-bg grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-app-muted">Type</p>
                <p className="text-lg font-medium text-app-text">Accord {selectedFormula.isHybrid ? '(Hybrid)' : ''}</p>
              </div>
              <div>
                <p className="text-sm text-app-muted">Capacity</p>
                <p className="text-lg font-medium text-app-text">{selectedFormula.accordCapacity || 0} {selectedFormula.accordCapacityUnit || 'g'}</p>
              </div>
            </div>
          )}

          <div className="p-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-app-border text-sm text-app-muted">
                  <th className="pb-2 font-medium">Ingredient</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium text-right">{selectedFormula.type === 'accord' ? 'Amount' : 'Percentage'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {selectedFormula.type === 'accord' && selectedFormula.accords?.map((accordRef, idx) => {
                  const f = formulas.find(fr => fr.id === accordRef.accordId);
                  return (
                    <tr key={accordRef.id || idx}>
                      <td className="py-3 font-medium text-app-text">{f?.name || 'Unknown Accord'}</td>
                      <td className="py-3 text-app-muted text-sm">Accord</td>
                      <td className="py-3 text-right font-medium text-app-accent">{accordRef.amount} {accordRef.unit}</td>
                    </tr>
                  );
                })}
                {selectedFormula.fragranceOils?.map((oil, idx) => {
                  const f = fragrances.find(fr => fr.id === oil.fragranceId);
                  return (
                    <tr key={oil.id || idx}>
                      <td className="py-3 font-medium text-app-text">
                        {selectedFormula.isHybrid ? (f?.name || 'Unknown Fragrance') : 'Fragrance Oil'}
                      </td>
                      <td className="py-3 text-app-muted text-sm">Fragrance Oil</td>
                      <td className="py-3 text-right font-medium text-app-accent">{Number(oil.percentage).toFixed(2)}%</td>
                    </tr>
                  );
                })}
                {selectedFormula.materials?.map((mat, idx) => {
                  const rm = rawMaterials.find(r => r.id === mat.rawMaterialId);
                  return (
                    <tr key={mat.id || idx}>
                      <td className="py-3 font-medium text-app-text">{rm?.name || 'Unknown Material'}</td>
                      <td className="py-3 text-app-muted text-sm">Raw Material</td>
                      <td className="py-3 text-right font-medium text-app-accent">
                        {selectedFormula.type === 'accord' ? `${mat.amount || 0} ${mat.unit || 'g'}` : `${Number(mat.percentage).toFixed(2)}%`}
                      </td>
                    </tr>
                  );
                })}
                {selectedFormula.alcohols?.map((alc, idx) => {
                  const rm = rawMaterials.find(r => r.id === alc.rawMaterialId);
                  const isAutoCalc = idx === selectedFormula.alcohols.length - 1;
                  
                  let pct = Number(alc.percentage);
                  if (isAutoCalc) {
                    const otherAlcoholsTotal = selectedFormula.alcohols.slice(0, -1).reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);
                    pct = Math.max(0, 100 - totalActive - otherAlcoholsTotal);
                  }
                  
                  return (
                    <tr key={alc.id || idx}>
                      <td className="py-3 font-medium text-app-text">{rm?.name || 'Unknown Alcohol'}</td>
                      <td className="py-3 text-app-muted text-sm">Alcohol/Solvent</td>
                      <td className="py-3 text-right font-medium text-app-muted">{pct.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {ConfirmModal}
      <TutorialModal 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title="Formula List Guide"
        steps={tutorialSteps}
      />
    </>
  );
}

if (viewState === 'history' && selectedFormula) {
    const originalId = selectedFormula.originalFormulaId || selectedFormula.id;
    const versions = formulas
      .filter(f => f.originalFormulaId === originalId || f.id === originalId)
      .sort((a, b) => (b.version || 1) - (a.version || 1));

    return (
      <>
        <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setViewState('detail')}
            className="p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-app-text">Version History</h2>
            <p className="text-app-muted text-sm">Evolution of {selectedFormula.name}</p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-app-border"></div>
          <div className="space-y-8">
            {versions.map((v, idx) => (
              <div key={v.id} className="relative pl-16">
                <div className={`absolute left-6 top-1 w-4 h-4 rounded-full border-4 border-app-bg z-10 ${v.id === selectedFormula.id ? 'bg-app-accent scale-125' : 'bg-app-border'}`}></div>
                <div className={`bg-app-card rounded-xl shadow-sm border p-6 transition-all hover:shadow-md ${v.id === selectedFormula.id ? 'border-app-accent ring-1 ring-app-accent/20' : 'border-app-border'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-app-text">{v.name}</h3>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-app-accent/10 text-app-accent rounded-full">
                          Mod {v.version || 1}
                        </span>
                        {v.id === selectedFormula.id && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-600 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-app-muted">
                        {v.parentFormulaId ? `Branched from Mod ${versions.find(f => f.id === v.parentFormulaId)?.version || '?'}` : 'Original Version'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedFormula(v);
                          setViewState('detail');
                        }}
                        className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/5 rounded-md transition-colors"
                        title="View Details"
                      >
                        <Beaker size={18} />
                      </button>
                      <button
                        onClick={() => branchFormula(v)}
                        className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/5 rounded-md transition-colors"
                        title="Branch from this version"
                      >
                        <GitBranch size={18} />
                      </button>
                      <button
                        onClick={() => finalizeFormula(v)}
                        className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/5 rounded-md transition-colors"
                        title="Finalize as standalone formula"
                      >
                        <CheckSquare size={18} />
                      </button>
                    </div>
                  </div>
                  
                  {v.versionNote ? (
                    <div className="bg-app-bg/50 rounded-lg p-3 border border-app-border mb-4">
                      <p className="text-sm text-app-text italic">"{v.versionNote}"</p>
                    </div>
                  ) : (
                    <p className="text-sm text-app-muted italic mb-4">No notes for this version.</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {v.fragranceOils.slice(0, 3).map(o => (
                      <span key={o.id} className="text-[10px] bg-app-bg px-2 py-1 rounded border border-app-border text-app-muted">
                        {fragrances.find(fr => fr.id === o.fragranceId)?.name || 'Oil'}: {o.percentage}%
                      </span>
                    ))}
                    {v.fragranceOils.length > 3 && (
                      <span className="text-[10px] text-app-muted flex items-center">+{v.fragranceOils.length - 3} more</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {ConfirmModal}
      <TutorialModal 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title="Formula List Guide"
        steps={tutorialSteps}
      />
    </>
  );
}

if (viewState === 'compare' && compareIds.length === 2) {
    const formulaA = formulas.find(f => f.id === compareIds[0]);
    const formulaB = formulas.find(f => f.id === compareIds[1]);

    if (!formulaA || !formulaB) return null;

    const getAllIngredients = () => {
      const ingredients = new Set<string>();
      [formulaA, formulaB].forEach(f => {
        f.fragranceOils.forEach(o => ingredients.add(`oil_${o.fragranceId}`));
        f.materials.forEach(m => ingredients.add(`mat_${m.rawMaterialId}`));
        f.alcohols.forEach(a => ingredients.add(`alc_${a.rawMaterialId}`));
      });
      return Array.from(ingredients);
    };

    const getIngredientInfo = (id: string) => {
      if (id.startsWith('oil_')) {
        const fid = id.replace('oil_', '');
        const f = fragrances.find(fr => fr.id === fid);
        return { name: f?.name || 'Unknown Oil', type: 'Fragrance Oil' };
      }
      if (id.startsWith('mat_')) {
        const rid = id.replace('mat_', '');
        const rm = rawMaterials.find(r => r.id === rid);
        return { name: rm?.name || 'Unknown Material', type: 'Raw Material' };
      }
      if (id.startsWith('alc_')) {
        const rid = id.replace('alc_', '');
        const rm = rawMaterials.find(r => r.id === rid);
        return { name: rm?.name || 'Unknown Alcohol', type: 'Alcohol/Solvent' };
      }
      return { name: 'Unknown', type: 'Unknown' };
    };

    const getPercentage = (formula: Formula, id: string) => {
      if (id.startsWith('oil_')) {
        const fid = id.replace('oil_', '');
        const oil = formula.fragranceOils.find(o => o.fragranceId === fid);
        return oil ? Number(oil.percentage) : 0;
      }
      if (id.startsWith('mat_')) {
        const rid = id.replace('mat_', '');
        const mat = formula.materials.find(m => m.rawMaterialId === rid);
        return mat ? Number(mat.percentage) : 0;
      }
      if (id.startsWith('alc_')) {
        const rid = id.replace('alc_', '');
        const alc = formula.alcohols.find(a => a.rawMaterialId === rid);
        
        // Handle auto-calc for last alcohol
        const idx = formula.alcohols.findIndex(a => a.rawMaterialId === rid);
        if (idx === formula.alcohols.length - 1) {
          const oilsTotal = formula.fragranceOils.reduce((sum, o) => sum + (Number(o.percentage) || 0), 0);
          const materialsTotal = formula.materials.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
          const otherAlcoholsTotal = formula.alcohols.slice(0, -1).reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);
          return Math.max(0, 100 - oilsTotal - materialsTotal - otherAlcoholsTotal);
        }
        return alc ? Number(alc.percentage) : 0;
      }
      return 0;
    };

    return (
      <>
        <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setViewState('list'); setIsCompareMode(false); setCompareIds([]); }}
              className="p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-bold text-app-text">Formula Comparison</h2>
          </div>
          <div className="flex items-center gap-2 bg-app-card border border-app-border px-4 py-2 rounded-lg text-sm font-medium text-app-muted">
            <ArrowLeftRight size={18} className="text-app-accent" />
            Comparing {formulaA.name} vs {formulaB.name}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-app-card rounded-xl shadow-sm border border-app-border p-6">
            <h3 className="text-lg font-bold text-app-text mb-2">{formulaA.name}</h3>
            {formulaA.versionNote && (
              <p className="text-sm text-app-muted italic mb-4">"{formulaA.versionNote}"</p>
            )}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-app-muted uppercase tracking-wider">
                <span>Ingredient</span>
                <span>Percentage</span>
              </div>
              {getAllIngredients().map(id => {
                const pct = getPercentage(formulaA, id);
                const info = getIngredientInfo(id);
                if (pct === 0) return null;
                return (
                  <div key={id} className="flex justify-between items-center py-2 border-b border-app-border last:border-0">
                    <div>
                      <div className="text-sm font-medium text-app-text">{info.name}</div>
                      <div className="text-[10px] text-app-muted">{info.type}</div>
                    </div>
                    <div className="font-bold text-app-accent">{pct.toFixed(2)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-app-card rounded-xl shadow-sm border border-app-border p-6">
            <h3 className="text-lg font-bold text-app-text mb-2">{formulaB.name}</h3>
            {formulaB.versionNote && (
              <p className="text-sm text-app-muted italic mb-4">"{formulaB.versionNote}"</p>
            )}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-app-muted uppercase tracking-wider">
                <span>Ingredient</span>
                <span>Percentage</span>
              </div>
              {getAllIngredients().map(id => {
                const pctB = getPercentage(formulaB, id);
                const pctA = getPercentage(formulaA, id);
                const info = getIngredientInfo(id);
                if (pctB === 0 && pctA === 0) return null;
                
                const diff = pctB - pctA;

                return (
                  <div key={id} className="flex justify-between items-center py-2 border-b border-app-border last:border-0">
                    <div>
                      <div className="text-sm font-medium text-app-text">{info.name}</div>
                      <div className="text-[10px] text-app-muted">{info.type}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {diff !== 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${diff > 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(2)}%
                        </span>
                      )}
                      <div className="font-bold text-app-accent">{pctB.toFixed(2)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {ConfirmModal}
      <TutorialModal 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title="Formula List Guide"
        steps={tutorialSteps}
      />
    </>
  );
}

// List View
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-app-text">Formula List</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTutorial(true)}
            className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/5 rounded-full transition-colors"
            title="How to use"
          >
            <HelpCircle size={22} />
          </button>
          {isCompareMode ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-app-muted">
                {compareIds.length === 0 ? 'Select 2 formulas to compare' : 
                 compareIds.length === 1 ? 'Select 1 more formula' : '2 formulas selected'}
              </span>
              <button
                onClick={() => {
                  if (compareIds.length === 2) setViewState('compare');
                }}
                disabled={compareIds.length !== 2}
                className="flex items-center gap-2 bg-app-accent text-white px-4 py-2 rounded-md hover:bg-app-accent-hover transition-colors disabled:opacity-50 shadow-sm"
              >
                <ArrowLeftRight size={18} />
                Compare Now
              </button>
              <button
                onClick={() => {
                  setIsCompareMode(false);
                  setCompareIds([]);
                }}
                className="p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCompareMode(true)}
              className="flex items-center gap-2 bg-app-card border border-app-border text-app-text px-4 py-2 rounded-md hover:bg-app-bg transition-colors"
            >
              <ArrowLeftRight size={18} />
              Compare Mods
            </button>
          )}
          {isSelectionMode && selectedIds.length > 0 && (
            <button
              onClick={deleteSelectedFormulas}
              className="flex items-center gap-2 bg-red-500/10 text-red-600 px-4 py-2 rounded-md hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={20} />
              <span className="hidden sm:inline">Delete Selected ({selectedIds.length})</span>
            </button>
          )}
          {isSelectionMode && (
            <button
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedIds([]);
              }}
              className="flex items-center gap-2 bg-app-bg text-app-text px-4 py-2 rounded-md hover:bg-app-card border border-app-border transition-colors"
            >
              Cancel Selection
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => addFormula('formula')}
              className="flex items-center gap-2 bg-app-accent text-white px-4 py-2 rounded-md hover:bg-app-accent-hover transition-colors shadow-sm"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">New Formula</span>
            </button>
            <button
              onClick={() => addFormula('accord')}
              className="flex items-center gap-2 bg-app-card border border-app-accent text-app-accent px-4 py-2 rounded-md hover:bg-app-accent/10 transition-colors shadow-sm"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">New Accord</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-app-card rounded-lg shadow border border-app-border">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-app-bg border-b border-app-border">
              {(isSelectionMode || isCompareMode) && (
                <th className="py-3 px-4 w-12">
                  {!isCompareMode && (
                    <input 
                      type="checkbox" 
                      checked={formulas.length > 0 && selectedIds.length === formulas.length}
                      onChange={toggleAllSelection}
                      className="rounded border-app-border text-app-accent focus:ring-app-accent"
                    />
                  )}
                </th>
              )}
              <th className="py-3 px-4 w-16"></th>
              <th className="py-3 px-4 font-semibold text-app-text">Name</th>
              <th className="py-3 px-4 font-semibold text-app-text hidden sm:table-cell">Total Active</th>
              <th className="py-3 px-4 font-semibold text-app-text hidden md:table-cell">Ingredients</th>
              <th className="py-3 px-4 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {formulas.length === 0 ? (
              <tr>
                <td colSpan={isSelectionMode ? 6 : 5} className="py-8 text-center text-app-muted italic">
                  No formulas yet. Create one to get started.
                </td>
              </tr>
            ) : (
              formulas.map((formula, index) => {
                const oilsTotal = (formula.fragranceOils || []).reduce((sum, o) => sum + (Number(o.percentage) || 0), 0);
                const materialsTotal = (formula.materials || []).reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
                const totalActive = oilsTotal + materialsTotal;

                return (
                  <tr 
                    key={formula.id} 
                    className={`hover:bg-app-bg cursor-pointer transition-colors group relative ${
                      isCompareMode && compareIds.includes(formula.id) ? 'bg-app-accent/5 border-l-4 border-l-app-accent' : ''
                    }`}
                    onClick={() => {
                      if (isSelectionMode || isCompareMode) {
                        toggleSelection(formula.id);
                      } else {
                        setSelectedFormula(formula);
                        setViewState('detail');
                      }
                    }}
                  >
                    {(isSelectionMode || isCompareMode) && (
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={isCompareMode ? compareIds.includes(formula.id) : selectedIds.includes(formula.id)}
                          onChange={() => toggleSelection(formula.id)}
                          className="rounded border-app-border text-app-accent focus:ring-app-accent"
                        />
                      </td>
                    )}
                    <td className="py-4 px-4 w-16" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => moveFormula(e, index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-app-muted hover:text-app-accent disabled:opacity-30 hover:bg-app-accent/10 rounded"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button 
                          onClick={(e) => moveFormula(e, index, 'down')}
                          disabled={index === formulas.length - 1}
                          className="p-1 text-app-muted hover:text-app-accent disabled:opacity-30 hover:bg-app-accent/10 rounded"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-app-text group-hover:text-app-accent transition-colors">{formula.name}</div>
                        {formula.version && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-app-accent/10 text-app-accent rounded-full flex items-center gap-1">
                            <GitBranch size={10} /> Mod {formula.version}
                          </span>
                        )}
                        {formula.type === 'accord' && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-500 rounded-full">
                            Accord
                          </span>
                        )}
                      </div>
                      {formula.type !== 'accord' && (
                        <div className="text-xs text-app-muted sm:hidden mt-1">Active: {totalActive.toFixed(2)}%</div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-app-text hidden sm:table-cell">
                      {formula.type !== 'accord' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-app-accent/10 text-app-accent">
                          {totalActive.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-app-muted text-sm">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-app-muted hidden md:table-cell">
                      {getFormulaSummary(formula)}
                    </td>
                    <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === formula.id ? null : formula.id);
                          }}
                          className="p-1 text-app-muted hover:text-app-text rounded-full hover:bg-app-bg transition-colors"
                        >
                          <MoreVertical size={20} />
                        </button>
                        
                        {openMenuId === formula.id && (
                          <div className={`absolute right-0 w-48 bg-app-card rounded-md shadow-lg border border-app-border z-50 py-1 ${
                            index > formulas.length - 3 && formulas.length > 3 ? 'bottom-full mb-2' : 'mt-2'
                          }`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                branchFormula(formula);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-app-text hover:bg-app-bg flex items-center gap-2"
                            >
                              <GitBranch size={16} /> Branch (New Mod)
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateFormula(formula);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-app-text hover:bg-app-bg flex items-center gap-2"
                            >
                              <Copy size={16} /> Duplicate
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsSelectionMode(true);
                                setSelectedIds([formula.id]);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-app-text hover:bg-app-bg flex items-center gap-2"
                            >
                              <CheckSquare size={16} /> Select
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFormula(formula.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-500/10 flex items-center gap-2"
                            >
                              <Trash2 size={16} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {ConfirmModal}

      <TutorialModal 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title="Formula List Guide"
        steps={tutorialSteps}
      />
    </div>
  );
}
