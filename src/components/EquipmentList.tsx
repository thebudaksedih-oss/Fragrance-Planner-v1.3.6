import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Save, X, ChevronLeft, MoreVertical, Copy, CheckSquare, ArrowUp, ArrowDown, HelpCircle, Package, Settings, List, MousePointer2 } from 'lucide-react';
import { Equipment } from '../types';
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
  equipments: Equipment[];
  setEquipments: React.Dispatch<React.SetStateAction<Equipment[]>>;
}

export default function EquipmentList({ equipments, setEquipments }: Props) {
  const [viewState, setViewState] = useState<'list' | 'edit'>('list');
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'type'>('name');
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  const tutorialSteps = [
    {
      title: 'Equipment Inventory',
      content: 'Track all your perfume-making tools, bottles, and application equipment in one place.',
      icon: <Package size={40} />
    },
    {
      title: 'Size & Type',
      content: 'Categorize items by type (e.g., Bottle, Pipette, Scale) and specify their capacity or size for better tracking.',
      icon: <Settings size={40} />
    },
    {
      title: 'Organization',
      content: 'Use the search bar to quickly find specific tools. Reorder items using the arrows to keep your most-used gear at the top.',
      icon: <List size={40} />
    },
    {
      title: 'Quick Actions',
      content: 'Duplicate equipment entries for similar items (like different bottle sizes) or use selection mode for bulk deletions.',
      icon: <MousePointer2 size={40} />
    }
  ];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.equipment-menu-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const addEquipment = () => {
    const newEquipment: Equipment = {
      id: generateId(),
      name: `New Equipment`,
      type: 'Equipment',
      size: '',
      description: '',
    };
    setEditingEquipment(newEquipment);
    setViewState('edit');
  };

  const deleteEquipment = (id: string) => {
    confirm('Delete Equipment', 'Are you sure you want to delete this equipment?', () => {
      setEquipments(equipments.filter((m) => m.id !== id));
    });
  };

  const duplicateEquipment = (equipment: Equipment) => {
    const newEquipment: Equipment = {
      ...equipment,
      id: generateId(),
      name: `${equipment.name} (Copy)`,
    };
    setEquipments([...equipments, newEquipment]);
  };

  const deleteSelectedEquipments = () => {
    confirm('Delete Equipments', `Are you sure you want to delete ${selectedIds.length} selected equipments?`, () => {
      setEquipments(equipments.filter(m => !selectedIds.includes(m.id)));
      setSelectedIds([]);
      setIsSelectionMode(false);
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const moveEquipment = (e: React.MouseEvent, id: string, direction: 'up' | 'down') => {
    e.stopPropagation();
    const index = equipments.findIndex(m => m.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === equipments.length - 1) return;
    
    const newEquipments = [...equipments];
    const temp = newEquipments[index];
    newEquipments[index] = newEquipments[index + (direction === 'up' ? -1 : 1)];
    newEquipments[index + (direction === 'up' ? -1 : 1)] = temp;
    
    setEquipments(newEquipments);
  };

  const handleEditClick = (equipment: Equipment) => {
    if (isSelectionMode) {
      toggleSelection(equipment.id);
      return;
    }
    setEditingEquipment({ ...equipment });
    setViewState('edit');
  };

  const saveEquipment = () => {
    if (editingEquipment) {
      const isExisting = equipments.some((m) => m.id === editingEquipment.id);
      if (isExisting) {
        setEquipments(equipments.map((m) => (m.id === editingEquipment.id ? editingEquipment : m)));
      } else {
        setEquipments([...equipments, editingEquipment]);
      }
      setViewState('list');
      setEditingEquipment(null);
    }
  };

  const filteredEquipments = equipments.filter((equipment) => {
    const query = searchQuery.toLowerCase();
    if (searchType === 'name') {
      return equipment.name.toLowerCase().includes(query);
    } else {
      return equipment.type.toLowerCase().includes(query);
    }
  });

  if (viewState === 'edit' && editingEquipment) {
    return (
      <div className="max-w-3xl mx-auto bg-app-card rounded-xl shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-bg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setViewState('list')}
              className="p-2 text-app-muted hover:text-app-text hover:bg-app-card rounded-full transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-app-text">
              {equipments.some(m => m.id === editingEquipment.id) ? 'Edit Equipment' : 'New Equipment'}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewState('list')}
              className="px-4 py-2 text-app-text bg-app-bg border border-app-border rounded-md hover:bg-app-card font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveEquipment}
              className="flex items-center gap-2 px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover font-medium transition-colors shadow-sm"
            >
              <Save size={18} />
              Save
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-app-muted mb-1">Name</label>
            <input
              type="text"
              value={editingEquipment.name || ''}
              onChange={(e) => setEditingEquipment({ ...editingEquipment, name: e.target.value })}
              className="w-full px-4 py-2 bg-app-bg border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
              placeholder="e.g., Beaker 100ml"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1">Type</label>
              <select
                value={editingEquipment.type || 'Equipment'}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, type: e.target.value as 'Equipment' | 'Application' })}
                className="w-full px-4 py-2 bg-app-bg border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
              >
                <option value="Equipment">Equipment</option>
                <option value="Application">Application</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1">Size / Capacity</label>
              <input
                type="text"
                value={editingEquipment.size || ''}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, size: e.target.value })}
                className="w-full px-4 py-2 bg-app-bg border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                placeholder="e.g., 100 ML, 5 CM, 1 L"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-app-muted mb-1">Description</label>
            <textarea
              value={editingEquipment.description || ''}
              onChange={(e) => setEditingEquipment({ ...editingEquipment, description: e.target.value })}
              className="w-full px-4 py-2 bg-app-bg border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
              placeholder="Brief description..."
              rows={3}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-app-text">Equipment & Application</h2>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowTutorial(true)}
            className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/5 rounded-full transition-colors"
            title="How to use"
          >
            <HelpCircle size={22} />
          </button>
          {isSelectionMode ? (
            <>
              <span className="text-sm font-medium text-app-muted">
                {selectedIds.length} selected
              </span>
              <button
                onClick={() => {
                  if (selectedIds.length === equipments.length) {
                    setSelectedIds([]);
                  } else {
                    setSelectedIds(equipments.map(m => m.id));
                  }
                }}
                className="px-3 py-2 text-sm font-medium text-app-accent bg-app-accent/10 rounded-md hover:bg-app-accent/20 transition-colors"
              >
                {selectedIds.length === equipments.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={deleteSelectedEquipments}
                disabled={selectedIds.length === 0}
                className="px-3 py-2 text-sm font-medium text-red-600 bg-red-500/10 rounded-md hover:bg-red-500/20 disabled:opacity-50 transition-colors"
              >
                Delete Selected
              </button>
              <button
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedIds([]);
                }}
                className="px-3 py-2 text-sm font-medium text-app-text bg-app-bg border border-app-border rounded-md hover:bg-app-card transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsSelectionMode(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-app-text bg-app-bg border border-app-border rounded-md hover:bg-app-card transition-colors"
              >
                <CheckSquare size={16} />
                Select
              </button>
              <button
                onClick={addEquipment}
                className="flex items-center gap-2 px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover font-medium transition-colors shadow-sm"
              >
                <Plus size={18} />
                Add Equipment
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-app-card p-4 rounded-xl shadow-sm border border-app-border flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" size={20} />
          <input
            type="text"
            placeholder={`Search by ${searchType}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-app-bg border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
          />
        </div>
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value as 'name' | 'type')}
          className="px-4 py-2 bg-app-bg border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
        >
          <option value="name">Name</option>
          <option value="type">Type</option>
        </select>
      </div>

      <div className="bg-app-card rounded-xl shadow-sm border border-app-border">
        {filteredEquipments.length === 0 ? (
          <div className="p-8 text-center text-app-muted italic">
            No equipment found. Add your first equipment to get started!
          </div>
        ) : (
          <ul className="divide-y divide-app-border">
            {filteredEquipments.map((equipment, index) => (
              <li 
                key={equipment.id} 
                className={`group flex items-center justify-between p-4 hover:bg-app-bg transition-colors cursor-pointer ${
                  selectedIds.includes(equipment.id) ? 'bg-app-accent/5' : ''
                } ${index === 0 ? 'rounded-t-xl' : ''} ${index === filteredEquipments.length - 1 ? 'rounded-b-xl' : ''}`}
                onClick={() => handleEditClick(equipment)}
              >
                <div className="flex items-center gap-4 flex-1">
                  {isSelectionMode && (
                    <div className="flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(equipment.id)}
                        onChange={() => {}} // Handled by parent onClick
                        className="w-5 h-5 text-app-accent border-app-border rounded focus:ring-app-accent pointer-events-none"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-app-text">{equipment.name}</h3>
                      <span className="px-2 py-0.5 text-xs font-medium bg-app-bg text-app-muted rounded-full border border-app-border">
                        {equipment.type}
                      </span>
                    </div>
                    <div className="text-sm text-app-muted mt-1 flex gap-4">
                      {equipment.size && <span>Size: {equipment.size}</span>}
                      {equipment.description && <span className="truncate max-w-xs">{equipment.description}</span>}
                    </div>
                  </div>
                </div>

                {!isSelectionMode && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col mr-2">
                      <button
                        onClick={(e) => moveEquipment(e, equipment.id, 'up')}
                        disabled={index === 0}
                        className="p-1 text-app-muted hover:text-app-accent disabled:opacity-30"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={(e) => moveEquipment(e, equipment.id, 'down')}
                        disabled={index === equipments.length - 1}
                        className="p-1 text-app-muted hover:text-app-accent disabled:opacity-30"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    
                    <div className="relative equipment-menu-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === equipment.id ? null : equipment.id);
                        }}
                        className="p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-full transition-colors"
                      >
                        <MoreVertical size={20} />
                      </button>
                      
                      {openMenuId === equipment.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-app-card rounded-md shadow-lg border border-app-border z-[100] py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateEquipment(equipment);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-app-text hover:bg-app-bg flex items-center gap-2"
                          >
                            <Copy size={16} />
                            Duplicate
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteEquipment(equipment.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-500/10 flex items-center gap-2"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {ConfirmModal}

      <TutorialModal 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title="Equipment Guide"
        steps={tutorialSteps}
      />
    </div>
  );
}
