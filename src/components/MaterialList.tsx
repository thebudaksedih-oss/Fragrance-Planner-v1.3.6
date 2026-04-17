import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Search, Save, X, ChevronLeft, MoreVertical, Copy, CheckSquare, ArrowUp, ArrowDown, HelpCircle, FlaskConical, Filter, MousePointer2 } from 'lucide-react';
import { RawMaterial } from '../types';
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
  rawMaterials: RawMaterial[];
  setRawMaterials: React.Dispatch<React.SetStateAction<RawMaterial[]>>;
}

export default function MaterialList({ rawMaterials, setRawMaterials }: Props) {
  const [viewState, setViewState] = useState<'list' | 'edit'>('list');
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'type'>('name');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  const tutorialSteps = [
    {
      title: 'Material Management',
      content: 'This list contains all your perfume ingredients. You can add raw materials, solvents, and accord materials here.',
      icon: <FlaskConical size={40} />
    },
    {
      title: 'Search & Filter',
      content: 'Use the search bar to find materials by name or type. You can also filter by categories like "Alcohol" or "Solvent" using the quick tags.',
      icon: <Filter size={40} />
    },
    {
      title: 'Quick Actions',
      content: 'Click the 3-dot menu on any item to duplicate, select, or delete it. You can also use the arrows to reorder your list.',
      icon: <MousePointer2 size={40} />
    },
    {
      title: 'Dilution Tracking',
      content: 'When adding a material, you can specify if it is pre-diluted. This helps the Budget Planner calculate exact costs for your formulas.',
      icon: <Plus size={40} />
    }
  ];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.material-menu-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const addMaterial = () => {
    const newMaterial: RawMaterial = {
      id: crypto.randomUUID(),
      name: `New Material`,
      type: 'raw_material',
      isDiluted: false,
    };
    setEditingMaterial(newMaterial);
    setViewState('edit');
  };

  const deleteMaterial = (id: string) => {
    confirm('Delete Material', 'Are you sure you want to delete this material?', () => {
      setRawMaterials(rawMaterials.filter((m) => m.id !== id));
    });
  };

  const duplicateMaterial = (material: RawMaterial) => {
    const newMaterial: RawMaterial = {
      ...material,
      id: crypto.randomUUID(),
      name: `${material.name} (Copy)`,
    };
    setRawMaterials([...rawMaterials, newMaterial]);
  };

  const deleteSelectedMaterials = () => {
    confirm('Delete Materials', `Are you sure you want to delete ${selectedIds.length} selected materials?`, () => {
      setRawMaterials(rawMaterials.filter(m => !selectedIds.includes(m.id)));
      setSelectedIds([]);
      setIsSelectionMode(false);
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const moveMaterial = (e: React.MouseEvent, id: string, direction: 'up' | 'down') => {
    e.stopPropagation();
    const index = rawMaterials.findIndex(m => m.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === rawMaterials.length - 1) return;
    
    const newMaterials = [...rawMaterials];
    const temp = newMaterials[index];
    newMaterials[index] = newMaterials[index + (direction === 'up' ? -1 : 1)];
    newMaterials[index + (direction === 'up' ? -1 : 1)] = temp;
    
    setRawMaterials(newMaterials);
  };

  const handleEditClick = (material: RawMaterial) => {
    if (isSelectionMode) {
      toggleSelection(material.id);
      return;
    }
    setEditingMaterial({ ...material });
    setViewState('edit');
  };

  const handleSaveAndContinue = () => {
    if (!editingMaterial) return;
    
    const exists = rawMaterials.some(m => m.id === editingMaterial.id);
    if (exists) {
      setRawMaterials(rawMaterials.map(m => m.id === editingMaterial.id ? editingMaterial : m));
    } else {
      setRawMaterials([...rawMaterials, editingMaterial]);
    }
    
    setEditingMaterial({
      ...editingMaterial,
      id: generateId(),
      name: '', // Reset name for the new entry
    });
  };

  const handleSave = () => {
    if (!editingMaterial) return;
    
    const exists = rawMaterials.some(m => m.id === editingMaterial.id);
    if (exists) {
      setRawMaterials(rawMaterials.map(m => m.id === editingMaterial.id ? editingMaterial : m));
    } else {
      setRawMaterials([...rawMaterials, editingMaterial]);
    }
    
    setEditingMaterial(null);
    setViewState('list');
  };

  const handleCancel = () => {
    setEditingMaterial(null);
    setViewState('list');
  };

  const updateEditingMaterial = (field: keyof RawMaterial, value: any) => {
    if (editingMaterial) {
      setEditingMaterial({ ...editingMaterial, [field]: value });
    }
  };

  const getTypes = (m: RawMaterial) => m.types?.length ? m.types : (m.type ? [m.type] : ['raw_material']);

  const filteredMaterials = useMemo(() => {
    let result = rawMaterials;
    if (selectedCategory !== 'all') {
      result = result.filter(m => getTypes(m).includes(selectedCategory));
    }
    if (!searchQuery) return result;
    const query = searchQuery.toLowerCase();
    return result.filter(m => {
      if (searchType === 'name') return m.name.toLowerCase().includes(query);
      if (searchType === 'type') return getTypes(m).some(t => t.toLowerCase().includes(query));
      return true;
    });
  }, [rawMaterials, searchQuery, searchType, selectedCategory]);

  const solvents = useMemo(() => {
    return rawMaterials.filter(m => getTypes(m).some(t => t === 'solvent' || t === 'alcohol'));
  }, [rawMaterials]);

  // Get unique types for the dropdown
  const availableTypes = useMemo(() => {
    const defaultTypes = ['raw_material', 'alcohol', 'solvent', 'accord_material'];
    const existingTypes = rawMaterials.flatMap(m => getTypes(m));
    return Array.from(new Set([...defaultTypes, ...existingTypes]));
  }, [rawMaterials]);

  if (viewState === 'edit' && editingMaterial) {
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
            {rawMaterials.some(m => m.id === editingMaterial.id) ? 'Edit Material' : 'New Material'}
          </h2>
        </div>

        <div className="bg-app-card rounded-lg shadow border border-app-border p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1">
                Material Name
              </label>
              <input
                type="text"
                value={editingMaterial.name || ''}
                onChange={(e) => updateEditingMaterial('name', e.target.value)}
                className="w-full px-4 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-muted mb-1">
                Description
              </label>
              <textarea
                value={editingMaterial.description || ''}
                onChange={(e) => updateEditingMaterial('description', e.target.value)}
                rows={3}
                placeholder="Add notes about this material..."
                className="w-full px-4 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-app-muted mb-1">
                  Primary Type
                </label>
                <select
                  value={getTypes(editingMaterial)[0] || ''}
                  onChange={(e) => {
                    const newTypes = [...getTypes(editingMaterial)];
                    newTypes[0] = e.target.value;
                    updateEditingMaterial('types', newTypes);
                    updateEditingMaterial('type', e.target.value); // For backward compatibility
                  }}
                  className="w-full px-4 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                >
                  {availableTypes.map(type => (
                    <option key={type} value={type}>{type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-app-muted mb-1">
                  Secondary Type (Optional)
                </label>
                <select
                  value={getTypes(editingMaterial)[1] || ''}
                  onChange={(e) => {
                    const newTypes = [...getTypes(editingMaterial)];
                    if (e.target.value) {
                      newTypes[1] = e.target.value;
                    } else {
                      newTypes.splice(1, 1);
                    }
                    updateEditingMaterial('types', newTypes);
                  }}
                  className="w-full px-4 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                >
                  <option value="">-- None --</option>
                  {availableTypes.map(type => (
                    <option key={type} value={type}>{type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-app-muted mb-1">
                  Character
                </label>
                <select
                  value={editingMaterial.character || ''}
                  onChange={(e) => updateEditingMaterial('character', e.target.value)}
                  className="w-full px-4 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                >
                  <option value="">-- None --</option>
                  <option value="Top Note">Top Note</option>
                  <option value="Heart Note">Heart Note</option>
                  <option value="Base Note">Base Note</option>
                </select>
              </div>
            </div>

            {(getTypes(editingMaterial).includes('raw_material') || getTypes(editingMaterial).includes('accord_material')) && (
              <div className="space-y-4 p-4 bg-app-bg rounded-lg border border-app-border">
                <label className="flex items-center gap-2 text-sm font-medium text-app-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingMaterial.isDiluted}
                    onChange={(e) => updateEditingMaterial('isDiluted', e.target.checked)}
                    className="rounded border-app-border text-app-accent focus:ring-app-accent"
                  />
                  Is Diluted?
                </label>

                {editingMaterial.isDiluted && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs text-app-muted mb-1">Dilution Percentage</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editingMaterial.dilutionPercentage || ''}
                          onChange={(e) => updateEditingMaterial('dilutionPercentage', parseFloat(e.target.value) || 0)}
                          placeholder="e.g., 10"
                          className="w-full px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                        />
                        <span className="text-sm text-app-muted">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-app-muted mb-1">Solvent</label>
                      <select
                        value={editingMaterial.solventId || ''}
                        onChange={(e) => updateEditingMaterial('solventId', e.target.value)}
                        className="w-full px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                      >
                        <option value="">-- Select Solvent --</option>
                        {solvents.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-app-text">Material List</h2>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowTutorial(true)}
            className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/5 rounded-full transition-colors"
            title="How to use"
          >
            <HelpCircle size={22} />
          </button>
          {isSelectionMode && selectedIds.length > 0 && (
            <button
              onClick={deleteSelectedMaterials}
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
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" size={18} />
            <input
              type="text"
              placeholder={`Search by ${searchType}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
            />
          </div>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as any)}
            className="px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
          >
            <option value="name">Name</option>
            <option value="type">Type</option>
          </select>
          <button
            onClick={addMaterial}
            className="flex items-center gap-2 bg-app-accent text-white px-4 py-2 rounded-md hover:bg-app-accent-hover transition-colors whitespace-nowrap shadow-sm"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">New Material</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-app-accent text-white'
              : 'bg-app-bg text-app-muted hover:text-app-text border border-app-border'
          }`}
        >
          All
        </button>
        {availableTypes.map(type => (
          <button
            key={type}
            onClick={() => setSelectedCategory(type)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === type
                ? 'bg-app-accent text-white'
                : 'bg-app-bg text-app-muted hover:text-app-text border border-app-border'
            }`}
          >
            {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="bg-app-card rounded-lg shadow border border-app-border">
        <div className="grid grid-cols-12 gap-4 p-4 bg-app-bg border-b border-app-border font-semibold text-app-text">
          <div className="col-span-1"></div>
          <div className="col-span-1"></div>
          <div className="col-span-3">Name</div>
          <div className="col-span-4">Types</div>
          <div className="col-span-2">Dilution</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        <ul className="divide-y divide-app-border max-h-[600px] overflow-y-auto">
          {filteredMaterials.length === 0 ? (
            <li className="p-8 text-app-muted text-center italic">No materials found.</li>
          ) : (
            filteredMaterials.map((material, index) => {
              const originalIndex = rawMaterials.findIndex(m => m.id === material.id);
              return (
              <li
                key={material.id}
                className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-app-bg transition-colors cursor-pointer group ${
                  index === 0 ? 'rounded-t-lg' : ''
                } ${index === filteredMaterials.length - 1 ? 'rounded-b-lg' : ''}`}
                onClick={() => handleEditClick(material)}
              >
                <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                  {isSelectionMode && (
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(material.id)}
                      onChange={() => toggleSelection(material.id)}
                      className="rounded border-app-border text-app-accent focus:ring-app-accent w-5 h-5"
                    />
                  )}
                </div>
                <div className="col-span-1 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={(e) => moveMaterial(e, material.id, 'up')}
                    disabled={originalIndex <= 0}
                    className="p-1 text-app-muted hover:text-app-accent disabled:opacity-30 hover:bg-app-accent/10 rounded"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button 
                    onClick={(e) => moveMaterial(e, material.id, 'down')}
                    disabled={originalIndex === -1 || originalIndex >= rawMaterials.length - 1}
                    className="p-1 text-app-muted hover:text-app-accent disabled:opacity-30 hover:bg-app-accent/10 rounded"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
                <div className="col-span-3 font-medium text-app-text">
                  <div>{material.name}</div>
                  {material.character && (
                    <div className="text-xs text-app-muted mt-0.5">{material.character}</div>
                  )}
                </div>
                <div className="col-span-4 flex flex-wrap gap-1">
                  {getTypes(material).map(t => (
                    <span key={t} className="text-xs px-2 py-1 bg-app-bg text-app-muted rounded-md capitalize border border-app-border">
                      {t.replace('_', ' ')}
                    </span>
                  ))}
                </div>
                <div className="col-span-2 text-sm text-app-muted">
                  {material.isDiluted ? `${material.dilutionPercentage}%` : '—'}
                </div>
                <div className="col-span-1 flex justify-end relative material-menu-container" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === material.id ? null : material.id);
                    }}
                    className="p-1.5 text-app-muted hover:text-app-text hover:bg-app-bg rounded-full transition-colors"
                  >
                    <MoreVertical size={20} />
                  </button>
                  
                  {openMenuId === material.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-app-card rounded-md shadow-lg border border-app-border z-[100] py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateMaterial(material);
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
                          setSelectedIds([material.id]);
                          setOpenMenuId(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-app-text hover:bg-app-bg flex items-center gap-2"
                      >
                        <CheckSquare size={16} /> Select
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMaterial(material.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-500/10 flex items-center gap-2"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
              );
            })
          )}
        </ul>
      </div>
      {ConfirmModal}
      
      <TutorialModal 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title="Material List Guide"
        steps={tutorialSteps}
      />
    </div>
  );
}
