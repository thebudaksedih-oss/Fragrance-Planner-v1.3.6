import React, { useState } from 'react';
import { Trash2, Plus, Save, X, ChevronLeft, Edit2, ArrowUp, ArrowDown, Copy, CheckSquare, HelpCircle, LayoutList, Sigma, ListChecks, ShoppingBag, Package, ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react';
import { Formula, Fragrance, PlannedBatch, BlendEntry, RawMaterial, InventoryItem, InventoryLog, InventoryContainer, PriceEntry } from '../types';
import { useConfirm } from '../hooks/useConfirm';
import TutorialModal from './TutorialModal';

interface Props {
  formulas: Formula[];
  fragrances: Fragrance[];
  setFragrances?: React.Dispatch<React.SetStateAction<Fragrance[]>>;
  plannedBatches: PlannedBatch[];
  setPlannedBatches: React.Dispatch<React.SetStateAction<PlannedBatch[]>>;
  rawMaterials?: RawMaterial[];
  inventory?: InventoryItem[];
  setInventory?: (inventory: InventoryItem[]) => void;
  priceEntries: PriceEntry[];
}

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

export default function BlendPlanner({ formulas = [], fragrances = [], setFragrances, plannedBatches = [], setPlannedBatches, rawMaterials = [], inventory = [], setInventory, priceEntries }: Props) {
  const [viewState, setViewState] = useState<'list' | 'detail' | 'edit'>('list');
  const [selectedBatch, setSelectedBatch] = useState<PlannedBatch | null>(null);
  const [editingBatch, setEditingBatch] = useState<PlannedBatch | null>(null);
  const [displayMode, setDisplayMode] = useState<'ml' | 'percentage'>('ml');
  
  // New options
  const [decimalPlaces, setDecimalPlaces] = useState<number>(2);
  const [volumeUnit, setVolumeUnit] = useState<'ml' | 'l'>('ml');
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [masterListFilter, setMasterListFilter] = useState<string[]>([]);
  const [detailEntryFilter, setDetailEntryFilter] = useState<string[]>([]);
  const [detailVolumeUnit, setDetailVolumeUnit] = useState<'ml' | 'l'>('ml');
  const [detailDecimals, setDetailDecimals] = useState<number>(2);
  const [listSortBy, setListSortBy] = useState<'manual' | 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'volume-desc' | 'volume-asc'>('manual');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const { confirm, ConfirmModal } = useConfirm();

  const tutorialSteps = [
    {
      title: 'Batch Planning',
      content: 'Organize your production by creating "Blend Batches". Each batch can contain multiple formulas or accords.',
      icon: <LayoutList size={40} />
    },
    {
      title: 'Ingredient Aggregation',
      content: 'The planner automatically sums up all raw materials and fragrance oils across all entries in a batch.',
      icon: <Sigma size={40} />
    },
    {
      title: 'Master List',
      content: 'View the "Master List" to see the total amount of each material needed for the entire production run.',
      icon: <ListChecks size={40} />
    },
    {
      title: 'Quick Import',
      content: 'Use the "Quick Import" feature in the Budget Planner to automatically calculate costs based on your planned batches.',
      icon: <ShoppingBag size={40} />
    }
  ];

  const ModalsAndToasts = (
    <>
      {statusMessage && (
        <div className={`fixed top-4 right-4 z-[110] p-4 rounded-lg shadow-lg border flex items-center justify-between gap-4 max-w-md animate-in fade-in slide-in-from-top-4 ${
          statusMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          statusMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="text-sm whitespace-pre-wrap">{statusMessage.text}</div>
          <button onClick={() => setStatusMessage(null)} className="text-current opacity-50 hover:opacity-100">
            <X size={18} />
          </button>
        </div>
      )}
      {ConfirmModal}
      <TutorialModal 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title="Blend Planner Guide"
        steps={tutorialSteps}
      />
    </>
  );

  const getRawMaterialName = (id: string) => {
    return rawMaterials.find(m => m.id === id)?.name || 'Unknown Material';
  };

  const getFragranceName = (id: string) => {
    return fragrances.find(f => f.id === id)?.name || 'Unknown Fragrance Oil';
  };

  const getPricePerUnit = (itemId: string, itemType: PriceEntry['itemType']) => {
    const entries = priceEntries.filter(p => {
      if (p.itemType !== itemType) return false;
      if (itemType === 'fragrance') {
        return p.itemId === itemId || p.customItemName?.toLowerCase() === itemId.toLowerCase();
      }
      return p.itemId === itemId;
    });

    if (entries.length === 0) return 0;

    // Find lowest price per unit
    const prices = entries.map(e => {
      const qty = (e.unit?.toLowerCase() === 'kg' || e.unit?.toLowerCase() === 'l') ? (e.quantity || 1) * 1000 : (e.unit?.toLowerCase() === 'mg' ? (e.quantity || 1) / 1000 : (e.quantity || 1));
      if (itemType === 'equipment') {
        if (e.pricingType === 'capacity') return e.priceTarget;
        return e.priceTarget / (qty || 1);
      } else {
        return e.priceTarget / (qty || 1);
      }
    });

    return Math.min(...prices);
  };

  const getFormulaCostPerMl = (formulaId: string): number => {
    const formula = formulas.find(f => f.id === formulaId);
    if (!formula) return 0;

    let totalCost = 0;

    // Materials
    formula.materials?.forEach(m => {
      const pricePerMl = getPricePerUnit(m.rawMaterialId, 'raw_material');
      totalCost += (m.percentage / 100) * pricePerMl;
    });

    // Alcohols
    formula.alcohols?.forEach((a, idx) => {
      const isAutoCalc = idx === (formula.alcohols?.length || 0) - 1;
      let pct = Number(a.percentage);
      if (isAutoCalc) {
        const oilsTotal = (formula.fragranceOils || []).reduce((sum, o) => sum + (Number(o.percentage) || 0), 0);
        const materialsTotal = (formula.materials || []).reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
        const otherAlcoholsTotal = (formula.alcohols || []).slice(0, -1).reduce((sum, al) => sum + (Number(al.percentage) || 0), 0);
        pct = Math.max(0, 100 - oilsTotal - materialsTotal - otherAlcoholsTotal);
      }
      const pricePerMl = getPricePerUnit(a.rawMaterialId, 'raw_material');
      totalCost += (pct / 100) * pricePerMl;
    });

    // Fragrance Oils
    formula.fragranceOils?.forEach(o => {
      const pricePerMl = getPricePerUnit(o.fragranceId, 'fragrance');
      totalCost += (o.percentage / 100) * pricePerMl;
    });

    // Accords
    formula.accords?.forEach(a => {
      const accordCost = getFormulaCostPerMl(a.accordId);
      if (a.unit === '%') {
        totalCost += (a.amount / 100) * accordCost;
      } else {
        // This is tricky because accord amount might be in ml but formula is percentage based
        // We assume the formula total is 100 units (ml)
        totalCost += (a.amount / 100) * accordCost;
      }
    });

    return totalCost;
  };

  const handleAddBatch = () => {
    const newBatch: PlannedBatch = {
      id: generateId(),
      name: `New Blend Batch`,
      date: new Date().toISOString().split('T')[0],
      entries: [],
    };
    setEditingBatch(newBatch);
    setViewState('edit');
  };

  const handleSaveAndContinue = () => {
    if (!editingBatch) return;
    
    const exists = plannedBatches.some(b => b.id === editingBatch.id);
    if (exists) {
      setPlannedBatches(plannedBatches.map(b => b.id === editingBatch.id ? editingBatch : b));
    } else {
      setPlannedBatches([...plannedBatches, editingBatch]);
    }
    
    setEditingBatch({
      ...editingBatch,
      id: generateId(),
      name: '', // Reset name
      entries: [], // Reset entries
    });
  };

  const handleSaveBatch = () => {
    if (!editingBatch) return;
    
    const exists = plannedBatches.some(b => b.id === editingBatch.id);
    if (exists) {
      setPlannedBatches(plannedBatches.map(b => b.id === editingBatch.id ? editingBatch : b));
    } else {
      setPlannedBatches([...plannedBatches, editingBatch]);
    }
    setSelectedBatch(editingBatch);
    setViewState('detail');
  };

  const handleCancelEdit = () => {
    setViewState(selectedBatch ? 'detail' : 'list');
    setEditingBatch(null);
  };

  const deleteBatch = (id: string) => {
    confirm('Delete Batch', 'Are you sure you want to delete this batch?', () => {
      setPlannedBatches(plannedBatches.filter(b => b.id !== id));
      setViewState('list');
      setSelectedBatch(null);
    }, 'Delete', 'danger');
  };

  const commitBatchToInventory = (batch: PlannedBatch) => {
    if (!setInventory || !inventory) {
      console.error('Inventory state or setter missing');
      return;
    }
    
    const performCommit = () => {
      confirm('Commit to Inventory', 'This will register the finished blended oils to your inventory. This action marks the production as complete. Continue?', () => {
        let updatedInventory = [...inventory];
        let newFragrances: Fragrance[] = [];

        // Register Blended Oils
        (batch.entries || []).forEach(entry => {
          const fragrance = fragrances.find(f => f.id === entry.fragranceId);
          const formula = formulas.find(f => f.id === entry.formulaId);
          const name = fragrance?.name || entry.customFragranceName || formula?.name || 'Unknown Fragrance';
          let itemId = entry.fragranceId;
          
          const costPerMl = formula ? getFormulaCostPerMl(formula.id) : 0;

          if (!itemId) {
            itemId = `custom_${generateId()}`;
            newFragrances.push({
              id: itemId,
              name: name,
              house: 'Custom Blend',
              originalScent: '',
              description: `Created from formula: ${formula?.name || 'Unknown'}`,
              smellProfile: '',
              topNotes: [],
              heartNotes: [],
              baseNotes: [],
              tags: []
            });
          }
          
          const invItemIndex = updatedInventory.findIndex(i => i.itemId === itemId && i.itemType === 'blended_oil');
          
          const newLog: InventoryLog = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action: 'add',
            amount: entry.capacityMl,
            unit: 'ml',
            note: `Produced in batch: ${batch.name} (Entry: ${formula?.name || 'Unknown'})`,
            referenceId: batch.id
          };

          const newContainer: InventoryContainer = {
            id: `cont_${generateId()}`,
            capacity: entry.capacityMl,
            unit: 'ml',
            currentAmount: entry.capacityMl,
            costPerMl: costPerMl, // Store the calculated cost per ml
            logs: [newLog],
            label: `${name} - ${batch.name}`
          };

          if (invItemIndex > -1) {
            const invItem = { ...updatedInventory[invItemIndex] };
            invItem.containers = [...invItem.containers, newContainer];
            invItem.totalAmount = invItem.containers.reduce((sum, c) => sum + c.currentAmount, 0);
            
            // Calculate weighted average cost
            let totalCost = 0;
            let totalVolume = 0;
            invItem.containers.forEach(c => {
              if (c.costPerMl !== undefined) {
                totalCost += c.costPerMl * c.currentAmount;
                totalVolume += c.currentAmount;
              }
            });
            if (totalVolume > 0) {
              invItem.costPerMl = totalCost / totalVolume;
            }
            if (!invItem.formulaId && formula?.id) {
              invItem.formulaId = formula.id;
            }
            
            updatedInventory[invItemIndex] = invItem;
          } else {
            updatedInventory.push({
              id: `inv_${generateId()}`,
              itemId,
              itemType: 'blended_oil',
              name: `${name} (Blended Oil)`,
              containers: [newContainer],
              totalAmount: entry.capacityMl,
              unit: 'ml',
              costPerMl: costPerMl, // Set initial cost per ml
              formulaId: formula?.id
            });
          }
        });

        setInventory(updatedInventory);
        if (newFragrances.length > 0 && setFragrances) {
          setFragrances(prev => [...prev, ...newFragrances]);
        }
        
        // Mark batch as committed
        const updatedBatch = { ...batch, isCommittedToInventory: true };
        setPlannedBatches(prev => prev.map(b => b.id === batch.id ? updatedBatch : b));
        setSelectedBatch(updatedBatch);
        setStatusMessage({ type: 'success', text: 'Batch successfully registered to inventory as Blended Oils!' });
      }, 'Commit', 'primary');
    };

    performCommit();
  };

  const revertBatchFromInventory = (batch: PlannedBatch) => {
    if (!setInventory || !inventory) return;
    confirm('Revert Commitment', 'This will remove the blended oils from your inventory. Continue?', () => {
      let updatedInventory = inventory.map(item => {
        if (item.itemType !== 'blended_oil') return item;
        const updatedItem = { ...item };
        // Remove containers that were added by this batch
        updatedItem.containers = updatedItem.containers.filter(container => 
          !container.logs.some(log => log.referenceId === batch.id && log.action === 'add')
        );
        updatedItem.totalAmount = updatedItem.containers.reduce((sum, c) => sum + c.currentAmount, 0);
        return updatedItem;
      }).filter(item => item.itemType !== 'blended_oil' || item.containers.length > 0);

      setInventory(updatedInventory);
      
      // Mark batch as not committed
      const updatedBatch = { ...batch, isCommittedToInventory: false };
      setPlannedBatches(prev => prev.map(b => b.id === batch.id ? updatedBatch : b));
      setSelectedBatch(updatedBatch);
      setStatusMessage({ type: 'success', text: 'Batch commitment reverted successfully!' });
    }, 'Revert', 'danger');
  };

  const takeMaterialsFromInventory = (batch: PlannedBatch) => {
    if (!setInventory || !inventory) {
      console.error('Inventory state or setter missing');
      return;
    }
    const masterList = calculateMasterList(batch.entries || []);
    
    // Check sufficiency
    const insufficient: string[] = [];
    masterList.forEach(item => {
      // Sum up all inventory items with matching itemId regardless of type
      // Also match by name for fragrance oils to be safe
      const relevantItems = inventory.filter(i => 
        i.itemId === item.id || 
        (i.itemType === 'fragrance_oil' && i.name === item.name)
      );
      const totalAvailable = relevantItems.reduce((sum, i) => sum + i.totalAmount, 0);
      
      if (totalAvailable < item.amount) {
        insufficient.push(`${item.name} (Need ${item.amount.toFixed(2)}${item.unit}, have ${totalAvailable.toFixed(2) || 0}${item.unit})`);
      }
    });

    if (insufficient.length > 0) {
      setStatusMessage({
        type: 'error',
        text: `Insufficient stock for the following materials:\n\n${insufficient.join('\n')}\n\nPlease stock up before taking materials.`
      });
      return;
    }

    confirm('Take Materials', 'This will deduct all required raw materials from your inventory. This step can be reverted. Continue?', () => {
      let updatedInventory = [...inventory];

      masterList.forEach(item => {
        let remainingToDeduct = item.amount;
        
        // Find all inventory items for this material and deduct until satisfied
        updatedInventory = updatedInventory.map(invItem => {
          const isMatch = invItem.itemId === item.id || (invItem.itemType === 'fragrance_oil' && invItem.name === item.name);
          if (!isMatch || remainingToDeduct <= 0) return invItem;
          
          const updatedInvItem = { ...invItem };
          updatedInvItem.containers = updatedInvItem.containers.map(container => {
            if (remainingToDeduct <= 0) return container;
            const deduct = Math.min(container.currentAmount, remainingToDeduct);
            remainingToDeduct -= deduct;
            
            if (deduct > 0) {
              const log: InventoryLog = {
                id: generateId(),
                timestamp: new Date().toISOString(),
                action: 'remove',
                amount: deduct,
                unit: container.unit,
                note: `Materials taken for batch: ${batch.name}`,
                referenceId: batch.id
              };
              return {
                ...container,
                currentAmount: container.currentAmount - deduct,
                logs: [log, ...container.logs]
              };
            }
            return container;
          });
          
          updatedInvItem.totalAmount = updatedInvItem.containers.reduce((sum, c) => sum + c.currentAmount, 0);
          return updatedInvItem;
        });
      });

      setInventory(updatedInventory);
      
      // Mark materials as taken
      const updatedBatch = { ...batch, isMaterialsTaken: true };
      setPlannedBatches(prev => prev.map(b => b.id === batch.id ? updatedBatch : b));
      setSelectedBatch(updatedBatch);
      
      setStatusMessage({ type: 'success', text: 'Materials successfully deducted from inventory!' });
    }, 'Take Materials', 'primary');
  };

  const revertMaterialsToInventory = (batch: PlannedBatch) => {
    if (!setInventory || !inventory) return;
    confirm('Revert Materials', 'This will add back the deducted materials to your inventory. Continue?', () => {
      const masterList = calculateMasterList(batch.entries || []);
      let updatedInventory = [...inventory];
      masterList.forEach(item => {
        const invItemIndex = updatedInventory.findIndex(i => i.itemId === item.id);
        if (invItemIndex === -1) return;

        const invItem = { ...updatedInventory[invItemIndex] };
        if (invItem.containers.length > 0) {
          const log: InventoryLog = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action: 'add',
            amount: item.amount,
            unit: item.unit,
            note: `Reverted materials from batch: ${batch.name}`,
            referenceId: batch.id
          };
          // Add back to the first container for simplicity
          const updatedContainers = [...invItem.containers];
          updatedContainers[0] = {
            ...updatedContainers[0],
            currentAmount: updatedContainers[0].currentAmount + item.amount,
            logs: [log, ...updatedContainers[0].logs]
          };
          invItem.containers = updatedContainers;
        }
        invItem.totalAmount = invItem.containers.reduce((sum, c) => sum + c.currentAmount, 0);
        updatedInventory[invItemIndex] = invItem;
      });

      setInventory(updatedInventory);
      const updatedBatch = { ...batch, isMaterialsTaken: false };
      setPlannedBatches(prev => prev.map(b => b.id === batch.id ? updatedBatch : b));
      setSelectedBatch(updatedBatch);
      setStatusMessage({ type: 'success', text: 'Materials successfully reverted to inventory!' });
    }, 'Revert', 'primary');
  };

  const addEntryToBatch = () => {
    if (!editingBatch) return;
    setEditingBatch({
      ...editingBatch,
      entries: [
        ...(editingBatch.entries || []),
        { id: generateId(), formulaId: '', fragranceId: '', capacityMl: 0 }
      ]
    });
  };

  const updateEntry = (entryId: string, field: keyof BlendEntry, value: any) => {
    if (!editingBatch) return;
    setEditingBatch({
      ...editingBatch,
      entries: editingBatch.entries.map(e => e.id === entryId ? { ...e, [field]: value } : e)
    });
  };

  const removeEntry = (entryId: string) => {
    if (!editingBatch) return;
    setEditingBatch({
      ...editingBatch,
      entries: editingBatch.entries.filter(e => e.id !== entryId)
    });
    setSelectedEntryIds(prev => prev.filter(id => id !== entryId));
  };

  const duplicateEntry = (entry: BlendEntry) => {
    if (!editingBatch) return;
    const newEntry = { ...entry, id: generateId() };
    const index = editingBatch.entries.findIndex(e => e.id === entry.id);
    const newEntries = [...editingBatch.entries];
    newEntries.splice(index + 1, 0, newEntry);
    setEditingBatch({ ...editingBatch, entries: newEntries });
  };

  const deleteSelectedEntries = () => {
    if (!editingBatch) return;
    setEditingBatch({
      ...editingBatch,
      entries: editingBatch.entries.filter(e => !selectedEntryIds.includes(e.id))
    });
    setSelectedEntryIds([]);
  };

  const duplicateSelectedEntries = () => {
    if (!editingBatch) return;
    const newEntries = [...editingBatch.entries];
    const entriesToDuplicate = editingBatch.entries.filter(e => selectedEntryIds.includes(e.id));
    
    entriesToDuplicate.forEach(entry => {
      newEntries.push({ ...entry, id: generateId() });
    });
    
    setEditingBatch({ ...editingBatch, entries: newEntries });
    setSelectedEntryIds([]);
  };

  const moveEntry = (e: React.MouseEvent, id: string, direction: 'up' | 'down') => {
    e.stopPropagation();
    if (!editingBatch) return;
    const index = editingBatch.entries.findIndex(entry => entry.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === (editingBatch.entries || []).length - 1) return;
    
    const newEntries = [...editingBatch.entries];
    const temp = newEntries[index];
    newEntries[index] = newEntries[index + (direction === 'up' ? -1 : 1)];
    newEntries[index + (direction === 'up' ? -1 : 1)] = temp;
    
    setEditingBatch({ ...editingBatch, entries: newEntries });
  };

  const toggleEntrySelection = (id: string) => {
    setSelectedEntryIds(prev => 
      prev.includes(id) ? prev.filter(entryId => entryId !== id) : [...prev, id]
    );
  };

  const toggleAllEntries = () => {
    if (!editingBatch) return;
    const entries = editingBatch.entries || [];
    if (selectedEntryIds.length === entries.length) {
      setSelectedEntryIds([]);
    } else {
      setSelectedEntryIds(entries.map(e => e.id));
    }
  };

  const getAlcoholPercentage = (formula: Formula, alcohol: any, index: number) => {
    const isAutoCalc = index === (formula.alcohols?.length || 0) - 1;
    let pct = Number(alcohol.percentage);
    if (isAutoCalc) {
      const oilsTotal = (formula.fragranceOils || []).reduce((sum, o) => sum + (Number(o.percentage) || 0), 0);
      const materialsTotal = (formula.materials || []).reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);
      const totalActive = oilsTotal + materialsTotal;
      const otherAlcoholsTotal = (formula.alcohols || []).slice(0, -1).reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);
      pct = Math.max(0, 100 - totalActive - otherAlcoholsTotal);
    }
    return Number(pct.toFixed(2));
  };

  // Calculate master list for a batch
  const calculateMasterList = (entries: BlendEntry[]) => {
    const totals: Record<string, { id: string, name: string, amount: number, unit: string }> = {};
    
    entries.forEach((entry) => {
      const formula = formulas.find((f) => f.id === entry.formulaId);
      if (!formula) return;

      if (formula.type === 'accord') {
        const multiplier = entry.multiplier || 1;
        
        (formula.materials || []).forEach((material) => {
          const amount = (material.amount || 0) * multiplier;
          const name = getRawMaterialName(material.rawMaterialId);
          const id = material.rawMaterialId;
          const unit = material.unit || 'g';
          const key = `${id}_${unit}`;
          if (!totals[key]) totals[key] = { id, name, amount: 0, unit };
          totals[key].amount += amount;
        });

        (formula.accords || []).forEach((accordRef) => {
          const amount = (accordRef.amount || 0) * multiplier;
          const f = formulas.find(fr => fr.id === accordRef.accordId);
          const name = f?.name || 'Unknown Accord';
          const id = accordRef.accordId;
          const unit = accordRef.unit || 'g';
          const key = `${id}_${unit}`;
          if (!totals[key]) totals[key] = { id, name, amount: 0, unit };
          totals[key].amount += amount;
        });
      } else {
        (formula.fragranceOils || []).forEach((oil) => {
          const requiredMl = (Number(oil.percentage) / 100) * entry.capacityMl;
          const name = formula.isHybrid ? getFragranceName(oil.fragranceId) : getFragranceName(entry.fragranceId);
          const id = formula.isHybrid ? oil.fragranceId : entry.fragranceId;
          const key = `${id}_ml`;
          if (!totals[key]) totals[key] = { id, name, amount: 0, unit: 'ml' };
          totals[key].amount += requiredMl;
        });

        (formula.materials || []).forEach((material) => {
          const requiredMl = (Number(material.percentage) / 100) * entry.capacityMl;
          const name = getRawMaterialName(material.rawMaterialId);
          const id = material.rawMaterialId;
          const key = `${id}_ml`;
          if (!totals[key]) totals[key] = { id, name, amount: 0, unit: 'ml' };
          totals[key].amount += requiredMl;
        });

        (formula.alcohols || []).forEach((alcohol, idx) => {
          const pct = getAlcoholPercentage(formula, alcohol, idx);
          const requiredMl = (pct / 100) * entry.capacityMl;
          const name = getRawMaterialName(alcohol.rawMaterialId);
          const id = alcohol.rawMaterialId || 'alcohol';
          const key = `${id}_ml`;
          if (!totals[key]) totals[key] = { id, name, amount: 0, unit: 'ml' };
          totals[key].amount += requiredMl;
        });
      }
    });

    return Object.values(totals).sort((a, b) => b.amount - a.amount);
  };

  const renderEntryDetails = (entry: BlendEntry) => {
    const formula = formulas.find(f => f.id === entry.formulaId);
    if (!formula) return <div className="text-gray-500 italic p-4">Select a formula to see details.</div>;

    let totalPercentage = 0;
    let totalMl = 0;

    return (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="py-2 px-3 font-semibold text-gray-700">Type</th>
              <th className="py-2 px-3 font-semibold text-gray-700">Material</th>
              <th className="py-2 px-3 font-semibold text-gray-700 text-right">
                {formula.type === 'accord' ? 'Amount' : (displayMode === 'percentage' ? '%' : 'mL')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {formula.type === 'accord' && (formula.accords || []).map(accordRef => {
              const multiplier = entry.multiplier || 1;
              const amount = (accordRef.amount || 0) * multiplier;
              const f = formulas.find(fr => fr.id === accordRef.accordId);
              return (
                <tr key={accordRef.id}>
                  <td className="py-2 px-3 text-gray-500">Accord</td>
                  <td className="py-2 px-3 text-gray-800">{f?.name || 'Unknown Accord'}</td>
                  <td className="py-2 px-3 text-indigo-600 text-right font-medium">
                    {amount.toFixed(2)} {accordRef.unit || 'g'}
                  </td>
                </tr>
              );
            })}
            {formula.type !== 'accord' && (formula.fragranceOils || []).map(oil => {
              const ml = (Number(oil.percentage) / 100) * entry.capacityMl;
              totalPercentage += Number(oil.percentage);
              totalMl += ml;
              return (
                <tr key={oil.id}>
                  <td className="py-2 px-3 text-gray-500">Fragrance Oil</td>
                  <td className="py-2 px-3 text-gray-800">{formula.isHybrid ? getFragranceName(oil.fragranceId) : getFragranceName(entry.fragranceId)}</td>
                  <td className="py-2 px-3 text-indigo-600 text-right font-medium">
                    {displayMode === 'percentage' ? `${Number(oil.percentage).toFixed(2)}%` : `${ml.toFixed(2)} mL`}
                  </td>
                </tr>
              );
            })}
            {(formula.materials || []).map(mat => {
              if (formula.type === 'accord') {
                const multiplier = entry.multiplier || 1;
                const amount = (mat.amount || 0) * multiplier;
                return (
                  <tr key={mat.id}>
                    <td className="py-2 px-3 text-gray-500">Raw Material</td>
                    <td className="py-2 px-3 text-gray-800">{getRawMaterialName(mat.rawMaterialId)}</td>
                    <td className="py-2 px-3 text-indigo-600 text-right font-medium">
                      {amount.toFixed(2)} {mat.unit || 'g'}
                    </td>
                  </tr>
                );
              }
              const ml = (Number(mat.percentage) / 100) * entry.capacityMl;
              totalPercentage += Number(mat.percentage);
              totalMl += ml;
              return (
                <tr key={mat.id}>
                  <td className="py-2 px-3 text-gray-500">Raw Material</td>
                  <td className="py-2 px-3 text-gray-800">{getRawMaterialName(mat.rawMaterialId)}</td>
                  <td className="py-2 px-3 text-indigo-600 text-right font-medium">
                    {displayMode === 'percentage' ? `${Number(mat.percentage).toFixed(2)}%` : `${ml.toFixed(2)} mL`}
                  </td>
                </tr>
              );
            })}
            {formula.type !== 'accord' && (formula.alcohols || []).map((alc, idx) => {
              const pct = getAlcoholPercentage(formula, alc, idx);
              const ml = (pct / 100) * entry.capacityMl;
              totalPercentage += pct;
              totalMl += ml;
              return (
                <tr key={alc.id}>
                  <td className="py-2 px-3 text-gray-500">Alcohol/Solvent</td>
                  <td className="py-2 px-3 text-gray-800">{getRawMaterialName(alc.rawMaterialId)}</td>
                  <td className="py-2 px-3 text-indigo-600 text-right font-medium">
                    {displayMode === 'percentage' ? `${pct.toFixed(2)}%` : `${ml.toFixed(2)} mL`}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {formula.type !== 'accord' && (
            <tfoot className="border-t border-gray-200 font-semibold bg-gray-50">
              <tr>
                <td colSpan={2} className="py-2 px-3 text-gray-800">Total</td>
                <td className="py-2 px-3 text-indigo-600 text-right">
                  {displayMode === 'percentage' ? `${totalPercentage.toFixed(2)}%` : `${totalMl.toFixed(2)} mL`}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  if (viewState === 'edit' && editingBatch) {
    const masterList = calculateMasterList(editingBatch.entries || []);
    
    // Calculate totals by unit
    const totalsByUnit: Record<string, number> = {};
    masterList.forEach(item => {
      const isVolume = item.unit === 'ml' || item.unit === 'l';
      const displayUnit = isVolume ? (volumeUnit === 'l' ? 'L' : 'mL') : item.unit;
      const amount = isVolume && volumeUnit === 'l' ? item.amount / 1000 : item.amount;
      totalsByUnit[displayUnit] = (totalsByUnit[displayUnit] || 0) + amount;
    });

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {ModalsAndToasts}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={handleCancelEdit}
            className="p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-app-text">
            {plannedBatches.some(b => b.id === editingBatch.id) ? 'Edit Batch' : 'New Blend Batch'}
          </h2>
        </div>

        <div className="bg-app-card rounded-lg shadow border border-app-border p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1">Blend Name</label>
              <input
                type="text"
                value={editingBatch.name}
                onChange={e => setEditingBatch({ ...editingBatch, name: e.target.value })}
                className="w-full px-3 py-2 bg-app-bg border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1">Date</label>
              <input
                type="date"
                value={editingBatch.date}
                onChange={e => setEditingBatch({ ...editingBatch, date: e.target.value })}
                className="w-full px-3 py-2 bg-app-bg border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
              />
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-app-border pb-2 gap-4">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold text-app-text">Blend Entries</h3>
                {(editingBatch.entries || []).length > 0 && (
                  <button
                    onClick={toggleAllEntries}
                    className="text-sm flex items-center gap-1 text-app-muted hover:text-app-accent transition-colors"
                  >
                    <CheckSquare size={16} className={selectedEntryIds.length === (editingBatch.entries || []).length ? "text-app-accent" : ""} />
                    {selectedEntryIds.length === (editingBatch.entries || []).length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedEntryIds.length > 0 && (
                  <>
                    <button
                      onClick={duplicateSelectedEntries}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition-colors text-sm font-medium"
                    >
                      <Copy size={14} />
                      Duplicate ({selectedEntryIds.length})
                    </button>
                    <button
                      onClick={deleteSelectedEntries}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-600 rounded hover:bg-red-500/20 transition-colors text-sm font-medium"
                    >
                      <Trash2 size={14} />
                      Delete ({selectedEntryIds.length})
                    </button>
                  </>
                )}
                <button
                  onClick={addEntryToBatch}
                  className="flex items-center gap-2 text-app-accent hover:text-app-accent-hover font-medium transition-colors text-sm px-3 py-1.5 bg-app-accent/10 rounded hover:bg-app-accent/20"
                >
                  <Plus size={16} />
                  Add Entry
                </button>
              </div>
            </div>

            {(!editingBatch.entries || editingBatch.entries.length === 0) ? (
              <div className="bg-app-bg rounded-lg border border-app-border p-8 text-center text-app-muted italic">
                No entries added to this batch yet.
              </div>
            ) : (
              <div className="space-y-4">
                {editingBatch.entries.map((entry, index) => {
                  const isSelected = selectedEntryIds.includes(entry.id);
                  return (
                  <div key={entry.id} className={`bg-app-bg rounded-lg border ${isSelected ? 'border-app-accent bg-app-accent/5' : 'border-app-border'} p-4 relative group transition-colors`}>
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                      <button 
                        onClick={(e) => moveEntry(e, entry.id, 'up')}
                        disabled={index === 0}
                        className="p-1 text-app-muted hover:text-app-accent disabled:opacity-30 hover:bg-app-accent/10 rounded"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button 
                        onClick={(e) => moveEntry(e, entry.id, 'down')}
                        disabled={index === (editingBatch.entries || []).length - 1}
                        className="p-1 text-app-muted hover:text-app-accent disabled:opacity-30 hover:bg-app-accent/10 rounded"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-start mb-4 pl-8">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleEntrySelection(entry.id)}
                          className="w-4 h-4 text-app-accent rounded border-app-border focus:ring-app-accent"
                        />
                        <h4 className="font-bold text-app-text">Entry #{index + 1}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => duplicateEntry(entry)}
                          className="text-app-muted hover:text-blue-500 transition-colors p-1"
                          title="Duplicate Entry"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="text-app-muted hover:text-red-500 transition-colors p-1"
                          title="Delete Entry"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-8">
                      <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">Fragrance</label>
                        {(() => {
                          const selectedFormula = formulas.find(f => f.id === entry.formulaId);
                          if (selectedFormula?.type === 'accord') {
                            return (
                              <input
                                type="text"
                                value={entry.customFragranceName || ''}
                                onChange={(e) => updateEntry(entry.id, 'customFragranceName', e.target.value)}
                                placeholder="~"
                                className="w-full px-3 py-2 bg-app-card border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent text-sm"
                              />
                            );
                          }
                          return (
                            <select
                              value={entry.fragranceId}
                              onChange={(e) => updateEntry(entry.id, 'fragranceId', e.target.value)}
                              className="w-full px-3 py-2 bg-app-card border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent text-sm"
                            >
                              <option value="">Select Fragrance...</option>
                              {fragrances.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                          );
                        })()}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-app-muted mb-1">Formula / Accord</label>
                        <select
                          value={entry.formulaId}
                          onChange={(e) => updateEntry(entry.id, 'formulaId', e.target.value)}
                          className="w-full px-3 py-2 bg-app-card border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent text-sm"
                        >
                          <option value="">Select Formula/Accord...</option>
                          {formulas.map(f => <option key={f.id} value={f.id}>{f.name} {f.version ? `(Mod ${f.version})` : ''}</option>)}
                        </select>
                      </div>
                      <div>
                        {(() => {
                          const selectedFormula = formulas.find(f => f.id === entry.formulaId);
                          if (selectedFormula?.type === 'accord') {
                            return (
                              <>
                                <label className="block text-xs font-medium text-app-muted mb-1">Multiplier</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={entry.multiplier || ''}
                                  onChange={(e) => updateEntry(entry.id, 'multiplier', Number(e.target.value))}
                                  className="w-full px-3 py-2 bg-app-card border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent text-sm"
                                  placeholder="e.g., 1"
                                />
                              </>
                            );
                          }
                          return (
                            <>
                              <label className="block text-xs font-medium text-app-muted mb-1">Capacity</label>
                              <div className="flex">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={entry.capacityMl || ''}
                                  onChange={(e) => updateEntry(entry.id, 'capacityMl', Number(e.target.value))}
                                  className="w-full px-3 py-2 bg-app-card border border-app-border text-app-text rounded-l-md focus:ring-app-accent focus:border-app-accent text-sm"
                                  placeholder="e.g., 50"
                                />
                                <select
                                  value={volumeUnit}
                                  onChange={(e) => setVolumeUnit(e.target.value as 'ml' | 'l')}
                                  className="px-2 py-2 border border-l-0 border-app-border rounded-r-md bg-app-bg text-app-text text-sm focus:ring-app-accent focus:border-app-accent"
                                >
                                  <option value="ml">mL</option>
                                  <option value="l">L</option>
                                </select>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 border-b border-app-border pb-2 gap-4">
              <h4 className="text-lg font-semibold text-app-text">Master Contents Preview</h4>
              <div className="flex items-center gap-3 bg-app-bg px-3 py-1.5 rounded-md border border-app-border">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-app-muted">Decimals:</label>
                  <select
                    value={decimalPlaces}
                    onChange={(e) => setDecimalPlaces(Number(e.target.value))}
                    className="text-xs bg-app-card border-app-border text-app-text rounded py-1 pl-2 pr-6 focus:ring-app-accent focus:border-app-accent"
                  >
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
                <div className="w-px h-4 bg-app-border"></div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-app-muted">Unit:</label>
                  <select
                    value={volumeUnit}
                    onChange={(e) => setVolumeUnit(e.target.value as 'ml' | 'l')}
                    className="text-xs bg-app-card border-app-border text-app-text rounded py-1 pl-2 pr-6 focus:ring-app-accent focus:border-app-accent"
                  >
                    <option value="ml">mL</option>
                    <option value="l">L</option>
                  </select>
                </div>
              </div>
            </div>
            {masterList.length === 0 ? (
              <p className="text-app-muted italic text-sm">No materials required yet.</p>
            ) : (
              <div className="bg-app-accent/5 rounded-lg p-4 border border-app-accent/10">
                <table className="w-full text-sm">
                  <tbody>
                    {masterList.map((item, idx) => {
                      const isVolume = item.unit === 'ml' || item.unit === 'l';
                      const amount = isVolume && volumeUnit === 'l' ? item.amount / 1000 : item.amount;
                      const displayUnit = isVolume ? (volumeUnit === 'l' ? 'L' : 'mL') : item.unit;
                      return (
                      <tr key={idx} className="border-b border-app-accent/10 last:border-0">
                        <td className="py-2 text-app-text">{item.name}</td>
                        <td className="py-2 text-right font-medium text-app-accent">{amount.toFixed(decimalPlaces)} {displayUnit}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-app-accent/20 font-bold">
                    {Object.entries(totalsByUnit).map(([unit, total]) => (
                      <tr key={unit}>
                        <td className="py-2 text-app-text">Total ({unit})</td>
                        <td className="py-2 text-right text-app-accent">
                          {total.toFixed(decimalPlaces)} {unit}
                        </td>
                      </tr>
                    ))}
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
            <button
              onClick={handleCancelEdit}
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
              onClick={handleSaveBatch}
              className="flex items-center gap-2 px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover transition-colors shadow-sm"
            >
              <Save size={18} />
              Save Batch
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (viewState === 'detail' && selectedBatch) {
    const filteredEntries = (selectedBatch.entries || []).filter(e => {
      if (detailEntryFilter.length === 0) return true;
      const formula = formulas.find(f => f.id === e.formulaId);
      const idToMatch = formula?.type === 'accord' ? `custom_${e.customFragranceName || '~'}` : e.fragranceId;
      return detailEntryFilter.includes(idToMatch);
    });
    const masterList = calculateMasterList(filteredEntries);
    
    // Calculate totals by unit
    const totalsByUnit: Record<string, number> = {};
    masterList.forEach(item => {
      const isVolume = item.unit === 'ml' || item.unit === 'l';
      const displayUnit = isVolume ? (detailVolumeUnit === 'l' ? 'L' : 'mL') : item.unit;
      const amount = isVolume && detailVolumeUnit === 'l' ? item.amount / 1000 : item.amount;
      totalsByUnit[displayUnit] = (totalsByUnit[displayUnit] || 0) + amount;
    });

    // Get unique materials across all entries for dynamic columns
    const uniqueMaterials = Array.from(new Set(
      filteredEntries.flatMap(entry => {
        const formula = formulas.find(f => f.id === entry.formulaId);
        if (!formula) return [];
        if (formula.type === 'accord') {
          const mats = (formula.materials || []).map(m => getRawMaterialName(m.rawMaterialId));
          const accs = (formula.accords || []).map(a => {
            const f = formulas.find(fr => fr.id === a.accordId);
            return f?.name || 'Unknown Accord';
          });
          return [...mats, ...accs];
        }
        const mats = (formula.materials || []).map(m => getRawMaterialName(m.rawMaterialId));
        const alcs = (formula.alcohols || []).map(a => getRawMaterialName(a.rawMaterialId));
        return [...mats, ...alcs];
      })
    ));

    // Get unique fragrances in this batch for the filter dropdown
    const uniqueFragrancesInBatch = Array.from(new Set<string>(selectedBatch.entries.map(e => {
      const formula = formulas.find(f => f.id === e.formulaId);
      if (formula?.type === 'accord') {
        return `custom_${e.customFragranceName || '~'}`;
      }
      return e.fragranceId;
    }))).map(id => {
      if (id.startsWith('custom_')) {
        return { id, name: id.replace('custom_', '') };
      }
      const f = fragrances.find(x => x.id === id);
      return { id, name: f?.name || 'Unknown' };
    });

    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        {ModalsAndToasts}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewState('list')}
              className="p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-app-text">{selectedBatch.name}</h2>
              <p className="text-app-muted text-sm">{selectedBatch.date}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!selectedBatch.isCommittedToInventory ? (
              <>
                {!selectedBatch.isMaterialsTaken ? (
                  <button
                    onClick={() => takeMaterialsFromInventory(selectedBatch)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <ArrowDownLeft size={18} />
                    Take Materials
                  </button>
                ) : (
                  <button
                    onClick={() => revertMaterialsToInventory(selectedBatch)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-600 border border-orange-500/20 rounded-md hover:bg-orange-500/20 transition-colors"
                  >
                    <ArrowUpRight size={18} />
                    Revert Materials
                  </button>
                )}
                <button
                  onClick={() => commitBatchToInventory(selectedBatch)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors shadow-sm ${
                    selectedBatch.isMaterialsTaken 
                      ? 'bg-app-accent text-white hover:bg-app-accent-hover' 
                      : 'bg-app-accent/50 text-white hover:bg-app-accent-hover'
                  }`}
                >
                  <Package size={18} />
                  Commit to Inventory
                </button>
              </>
            ) : (
              <button
                onClick={() => revertBatchFromInventory(selectedBatch)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-colors"
              >
                <RefreshCw size={18} />
                Revert Commit
              </button>
            )}
            {selectedBatch.isCommittedToInventory && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 rounded-md border border-green-500/20 text-sm font-bold">
                <CheckSquare size={18} />
                Committed
              </div>
            )}
            <button
              onClick={() => {
                setEditingBatch(selectedBatch);
                setViewState('edit');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-app-card border border-app-border text-app-text rounded-md hover:bg-app-bg transition-colors"
            >
              <Edit2 size={18} />
              Edit
            </button>
            <button
              onClick={() => deleteBatch(selectedBatch.id)}
              className="flex items-center gap-2 px-4 py-2 bg-app-card border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            <div className="bg-app-card rounded-xl shadow-sm border border-app-border overflow-hidden">
              <div className="p-4 border-b border-app-border bg-app-bg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-app-text">Blend Entries</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-app-muted">Filter:</label>
                    <div className="relative group">
                      <button className="text-sm border border-app-border bg-app-card px-3 py-1.5 rounded-md text-app-text flex items-center gap-2">
                        {detailEntryFilter.length === 0 ? 'All Fragrances' : `${detailEntryFilter.length} Selected`}
                      </button>
                      <div className="absolute top-full left-0 mt-1 w-48 bg-app-card border border-app-border rounded-md shadow-lg z-10 hidden group-hover:block">
                        <div className="p-2 max-h-48 overflow-y-auto flex flex-col gap-1">
                          <label className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-app-bg rounded">
                            <input 
                              type="checkbox" 
                              checked={detailEntryFilter.length === 0}
                              onChange={() => setDetailEntryFilter([])}
                              className="rounded border-app-border text-app-accent focus:ring-app-accent"
                            />
                            <span className="text-app-text">All Fragrances</span>
                          </label>
                          <div className="h-px bg-app-border my-1"></div>
                          {uniqueFragrancesInBatch.map(f => (
                            <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-app-bg rounded">
                              <input 
                                type="checkbox" 
                                checked={detailEntryFilter.includes(f.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setDetailEntryFilter([...detailEntryFilter, f.id]);
                                  } else {
                                    setDetailEntryFilter(detailEntryFilter.filter(id => id !== f.id));
                                  }
                                }}
                                className="rounded border-app-border text-app-accent focus:ring-app-accent"
                              />
                              <span className="truncate text-app-text">{f.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-app-muted">Decimals:</label>
                    <select
                      value={detailDecimals}
                      onChange={(e) => setDetailDecimals(Number(e.target.value))}
                      className="text-sm bg-app-card border border-app-border text-app-text rounded-md px-2 py-1 focus:ring-app-accent focus:border-app-accent"
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </div>
                  <div className="flex items-center bg-app-card rounded-md border border-app-border p-1">
                    <button
                      onClick={() => setDetailVolumeUnit('ml')}
                      className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors ${detailVolumeUnit === 'ml' ? 'bg-app-accent/10 text-app-accent' : 'text-app-muted hover:text-app-text'}`}
                    >
                      mL
                    </button>
                    <button
                      onClick={() => setDetailVolumeUnit('l')}
                      className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors ${detailVolumeUnit === 'l' ? 'bg-app-accent/10 text-app-accent' : 'text-app-muted hover:text-app-text'}`}
                    >
                      L
                    </button>
                  </div>
                  <div className="flex items-center bg-app-card rounded-md border border-app-border p-1">
                    <button
                      onClick={() => setDisplayMode('ml')}
                      className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors ${displayMode === 'ml' ? 'bg-app-accent/10 text-app-accent' : 'text-app-muted hover:text-app-text'}`}
                    >
                      Vol
                    </button>
                    <button
                      onClick={() => setDisplayMode('percentage')}
                      className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors ${displayMode === 'percentage' ? 'bg-app-accent/10 text-app-accent' : 'text-app-muted hover:text-app-text'}`}
                    >
                      %
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-app-bg border-b border-app-border">
                      <th className="py-3 px-4 font-semibold text-app-text">Fragrance</th>
                      <th className="py-3 px-4 font-semibold text-app-text">Formula</th>
                      <th className="py-3 px-4 font-semibold text-app-text text-right">Capacity</th>
                      <th className="py-3 px-4 font-semibold text-app-text text-right">Fragrance Oil</th>
                      <th className="py-3 px-4 font-semibold text-app-text">Original Scent</th>
                      {uniqueMaterials.map(mat => (
                        <th key={mat} className="py-3 px-4 font-semibold text-app-text text-right">{mat}</th>
                      ))}
                      <th className="py-3 px-4 font-semibold text-app-text text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6 + uniqueMaterials.length} className="py-8 text-center text-app-muted italic">
                          No entries match the filter.
                        </td>
                      </tr>
                    ) : (
                      filteredEntries.map((entry) => {
                        const formula = formulas.find(f => f.id === entry.formulaId);
                        const fragrance = fragrances.find(f => f.id === entry.fragranceId);
                        
                        let oilPct = 0;
                        if (formula && formula.type !== 'accord') {
                          oilPct = (formula.fragranceOils || []).reduce((sum, o) => sum + Number(o.percentage), 0);
                        }
                        
                        const ogName = fragrance?.originalScent || '-';
                        const oilMl = (oilPct / 100) * (entry.capacityMl || 0);
                        const oilDisplay = formula?.type === 'accord' ? '-' : (displayMode === 'percentage' 
                          ? `${oilPct.toFixed(detailDecimals)}%`
                          : (detailVolumeUnit === 'l' ? `${(oilMl / 1000).toFixed(detailDecimals)} L` : `${oilMl.toFixed(detailDecimals)} mL`));

                        let totalPct = oilPct;
                        let totalAmount = 0;

                        return (
                          <tr key={entry.id} className="hover:bg-app-bg transition-colors">
                            <td className="py-3 px-4 font-medium text-app-text">
                              {formula?.type === 'accord' ? (entry.customFragranceName || '~') : (fragrance?.name || 'Unknown')}
                            </td>
                            <td className="py-3 px-4 text-app-muted">{formula?.name || 'Unknown'}</td>
                            <td className="py-3 px-4 text-right text-app-muted">
                              {formula?.type === 'accord' 
                                ? `${entry.multiplier || 1}x` 
                                : (detailVolumeUnit === 'l' ? `${((entry.capacityMl || 0) / 1000).toFixed(detailDecimals)} L` : `${(entry.capacityMl || 0).toFixed(detailDecimals)} mL`)}
                            </td>
                            <td className="py-3 px-4 text-right text-app-accent font-medium">{oilDisplay}</td>
                            <td className="py-3 px-4 text-app-muted italic">{ogName}</td>
                            
                            {uniqueMaterials.map(matName => {
                              let matPct = 0;
                              let matAmount = 0;
                              let matUnit = 'g';
                              
                              if (formula) {
                                if (formula.type === 'accord') {
                                  const m = formula.materials?.find(x => getRawMaterialName(x.rawMaterialId) === matName);
                                  const a = formula.accords?.find(x => {
                                    const f = formulas.find(fr => fr.id === x.accordId);
                                    return f?.name === matName;
                                  });
                                  if (m) {
                                    matAmount += Number(m.amount || 0);
                                    matUnit = m.unit || 'g';
                                  }
                                  if (a) {
                                    matAmount += Number(a.amount || 0);
                                    matUnit = a.unit || 'g';
                                  }
                                } else {
                                  const mList = formula.materials?.filter(x => getRawMaterialName(x.rawMaterialId) === matName) || [];
                                  const aList = formula.alcohols?.filter(x => getRawMaterialName(x.rawMaterialId) === matName) || [];
                                  mList.forEach(m => matPct += Number(m.percentage));
                                  aList.forEach(a => {
                                    const idx = formula.alcohols?.indexOf(a) ?? -1;
                                    matPct += getAlcoholPercentage(formula, a, idx);
                                  });
                                }
                              }
                              totalPct += matPct;
                              
                              let valDisplay = '-';
                              if (formula?.type === 'accord') {
                                if (matAmount > 0) {
                                  const finalAmount = matAmount * (entry.multiplier || 1);
                                  valDisplay = `${finalAmount.toFixed(detailDecimals)} ${matUnit}`;
                                  totalAmount += finalAmount;
                                }
                              } else {
                                const matMl = (matPct / 100) * (entry.capacityMl || 0);
                                valDisplay = displayMode === 'percentage'
                                  ? `${matPct.toFixed(detailDecimals)}%`
                                  : (detailVolumeUnit === 'l' ? `${(matMl / 1000).toFixed(detailDecimals)} L` : `${matMl.toFixed(detailDecimals)} mL`);
                              }
                                
                              return (
                                <td key={matName} className="py-3 px-4 text-right text-app-muted">
                                  {(matPct > 0 || matAmount > 0) ? valDisplay : '-'}
                                </td>
                              );
                            })}
                            
                            <td className="py-3 px-4 text-right font-medium text-app-text">
                              {formula?.type === 'accord'
                                ? `${totalAmount.toFixed(detailDecimals)} (mixed)`
                                : (displayMode === 'percentage' 
                                  ? `${totalPct.toFixed(detailDecimals)}%`
                                  : (detailVolumeUnit === 'l' ? `${((totalPct / 100) * (entry.capacityMl || 0) / 1000).toFixed(detailDecimals)} L` : `${((totalPct / 100) * (entry.capacityMl || 0)).toFixed(detailDecimals)} mL`))}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredEntries.length > 0 && (
                    <tfoot className="bg-app-bg border-t-2 border-app-border font-bold">
                      <tr>
                        <td colSpan={2} className="py-3 px-4 text-app-text text-right">Total:</td>
                        <td className="py-3 px-4 text-right text-app-text">
                          {detailVolumeUnit === 'l' 
                            ? `${(filteredEntries.reduce((sum, e) => sum + (formulas.find(f => f.id === e.formulaId)?.type !== 'accord' ? (e.capacityMl || 0) : 0), 0) / 1000).toFixed(detailDecimals)} L`
                            : `${filteredEntries.reduce((sum, e) => sum + (formulas.find(f => f.id === e.formulaId)?.type !== 'accord' ? (e.capacityMl || 0) : 0), 0).toFixed(detailDecimals)} mL`}
                        </td>
                        <td className="py-3 px-4 text-right text-app-accent">
                          {(() => {
                            const totalOilMl = filteredEntries.reduce((sum, e) => {
                              const f = formulas.find(x => x.id === e.formulaId);
                              if (f?.type === 'accord') return sum;
                              const pct = f ? (f.fragranceOils || []).reduce((s, o) => s + Number(o.percentage), 0) : 0;
                              return sum + (pct / 100) * (e.capacityMl || 0);
                            }, 0);
                            return detailVolumeUnit === 'l' ? `${(totalOilMl / 1000).toFixed(detailDecimals)} L` : `${totalOilMl.toFixed(detailDecimals)} mL`;
                          })()}
                        </td>
                        <td></td>
                        {uniqueMaterials.map(matName => {
                          const totalMatMl = filteredEntries.reduce((sum, e) => {
                            const f = formulas.find(x => x.id === e.formulaId);
                            if (f?.type === 'accord') return sum;
                            let pct = 0;
                            if (f) {
                              const mList = f.materials?.filter(x => getRawMaterialName(x.rawMaterialId) === matName) || [];
                              const aList = f.alcohols?.filter(x => getRawMaterialName(x.rawMaterialId) === matName) || [];
                              mList.forEach(m => pct += Number(m.percentage));
                              aList.forEach(a => {
                                const idx = f.alcohols?.indexOf(a) ?? -1;
                                pct += getAlcoholPercentage(f, a, idx);
                              });
                            }
                            return sum + (pct / 100) * (e.capacityMl || 0);
                          }, 0);
                          return (
                            <td key={matName} className="py-3 px-4 text-right text-app-text">
                              {totalMatMl > 0 ? (detailVolumeUnit === 'l' ? `${(totalMatMl / 1000).toFixed(detailDecimals)} L` : `${totalMatMl.toFixed(detailDecimals)} mL`) : '-'}
                            </td>
                          );
                        })}
                        <td className="py-3 px-4 text-right text-app-text">
                          {(() => {
                            const totalMl = filteredEntries.reduce((sum, e) => {
                              const f = formulas.find(x => x.id === e.formulaId);
                              if (f?.type === 'accord') return sum;
                              let pct = 0;
                              if (f) {
                                pct += (f.fragranceOils || []).reduce((s, o) => s + Number(o.percentage), 0);
                                (f.materials || []).forEach(m => pct += Number(m.percentage));
                                (f.alcohols || []).forEach((a, idx) => pct += getAlcoholPercentage(f, a, idx));
                              }
                              return sum + (pct / 100) * (e.capacityMl || 0);
                            }, 0);
                            return detailVolumeUnit === 'l' ? `${(totalMl / 1000).toFixed(detailDecimals)} L` : `${totalMl.toFixed(detailDecimals)} mL`;
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          <div className="xl:col-span-1 space-y-6">
            <div className="bg-app-card rounded-xl shadow-sm border border-app-border p-5">
              <h3 className="text-lg font-bold text-app-text mb-4">Master Contents</h3>
              {masterList.length === 0 ? (
                <p className="text-app-muted italic text-sm">No materials required.</p>
              ) : (
                <div className="space-y-3">
                  {masterList.map((item, idx) => {
                    const isVolume = item.unit === 'ml' || item.unit === 'l';
                    const displayUnit = isVolume ? (detailVolumeUnit === 'l' ? 'L' : 'mL') : item.unit;
                    const amount = isVolume && detailVolumeUnit === 'l' ? item.amount / 1000 : item.amount;
                    return (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-app-border last:border-0">
                        <span className="text-app-text text-sm">{item.name}</span>
                        <span className="font-bold text-app-accent">
                          {amount.toFixed(detailDecimals)} {displayUnit}
                        </span>
                      </div>
                    );
                  })}
                  <div className="pt-3 mt-2 border-t-2 border-app-border flex flex-col gap-2">
                    {Object.entries(totalsByUnit).map(([unit, total]) => (
                      <div key={unit} className="flex justify-between items-center">
                        <span className="font-bold text-app-text">Total ({unit})</span>
                        <span className="font-bold text-app-accent text-lg">
                          {total.toFixed(detailDecimals)} {unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getSortedBatches = () => {
    let sorted = [...plannedBatches];
    
    if (listSortBy === 'date-desc') {
      sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (listSortBy === 'date-asc') {
      sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (listSortBy === 'name-asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (listSortBy === 'name-desc') {
      sorted.sort((a, b) => b.name.localeCompare(a.name));
    } else if (listSortBy === 'volume-desc') {
      sorted.sort((a, b) => {
        const volA = (a.entries || []).reduce((sum, e) => sum + (e.capacityMl || 0), 0);
        const volB = (b.entries || []).reduce((sum, e) => sum + (e.capacityMl || 0), 0);
        return volB - volA;
      });
    } else if (listSortBy === 'volume-asc') {
      sorted.sort((a, b) => {
        const volA = (a.entries || []).reduce((sum, e) => sum + (e.capacityMl || 0), 0);
        const volB = (b.entries || []).reduce((sum, e) => sum + (e.capacityMl || 0), 0);
        return volA - volB;
      });
    }
    
    return sorted;
  };

  const moveBatch = (e: React.MouseEvent, id: string, direction: 'up' | 'down') => {
    e.stopPropagation();
    const index = plannedBatches.findIndex(b => b.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === plannedBatches.length - 1) return;
    
    const newBatches = [...plannedBatches];
    const temp = newBatches[index];
    newBatches[index] = newBatches[index + (direction === 'up' ? -1 : 1)];
    newBatches[index + (direction === 'up' ? -1 : 1)] = temp;
    
    setPlannedBatches(newBatches);
  };

  const toggleBatchSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedBatchIds(prev => 
      prev.includes(id) ? prev.filter(batchId => batchId !== id) : [...prev, id]
    );
  };

  const toggleAllBatches = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedBatchIds(plannedBatches.map(b => b.id));
    } else {
      setSelectedBatchIds([]);
    }
  };

  const deleteSelectedBatches = () => {
    setPlannedBatches(plannedBatches.filter(b => !selectedBatchIds.includes(b.id)));
    setSelectedBatchIds([]);
  };

  const duplicateSelectedBatches = () => {
    const newBatches = [...plannedBatches];
    const batchesToDuplicate = plannedBatches.filter(b => selectedBatchIds.includes(b.id));
    
    batchesToDuplicate.forEach(batch => {
      newBatches.push({ 
        ...batch, 
        id: generateId(),
        name: `${batch.name} (Copy)`,
        entries: (batch.entries || []).map(e => ({ ...e, id: generateId() }))
      });
    });
    
    setPlannedBatches(newBatches);
    setSelectedBatchIds([]);
  };

  const duplicateBatch = (e: React.MouseEvent, batch: PlannedBatch) => {
    e.stopPropagation();
    const newBatch = { 
      ...batch, 
      id: generateId(),
      name: `${batch.name} (Copy)`,
      entries: (batch.entries || []).map(e => ({ ...e, id: generateId() }))
    };
    const index = plannedBatches.findIndex(b => b.id === batch.id);
    const newBatches = [...plannedBatches];
    newBatches.splice(index + 1, 0, newBatch);
    setPlannedBatches(newBatches);
  };

  // List View
  return (
    <div className="space-y-6">
      {ModalsAndToasts}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-app-text">Blend Planner</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowTutorial(true)}
            className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/5 rounded-full transition-colors"
            title="How to use"
          >
            <HelpCircle size={22} />
          </button>
          <select
            value={listSortBy}
            onChange={(e) => setListSortBy(e.target.value as any)}
            className="px-3 py-2 bg-app-card border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent text-sm flex-1 sm:flex-none"
          >
            <option value="manual">Manual Order</option>
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="volume-desc">Highest Volume</option>
            <option value="volume-asc">Lowest Volume</option>
          </select>
          <button
            onClick={handleAddBatch}
            className="flex items-center gap-2 bg-app-accent text-white px-4 py-2 rounded-md hover:bg-app-accent-hover transition-colors whitespace-nowrap shadow-sm"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">New Blend Batch</span>
          </button>
        </div>
      </div>

      {selectedBatchIds.length > 0 && (
        <div className="bg-app-accent/10 border border-app-accent/20 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-app-accent">
            {selectedBatchIds.length} batch{selectedBatchIds.length > 1 ? 'es' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={duplicateSelectedBatches}
              className="flex items-center gap-1 px-3 py-1.5 bg-app-card border border-app-accent/20 text-app-accent rounded text-sm hover:bg-app-bg transition-colors"
            >
              <Copy size={16} />
              Duplicate
            </button>
            <button
              onClick={deleteSelectedBatches}
              className="flex items-center gap-1 px-3 py-1.5 bg-app-card border border-red-200 text-red-600 rounded text-sm hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="bg-app-card rounded-lg shadow border border-app-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-app-bg border-b border-app-border">
                <th className="py-3 px-4 w-12">
                  <input 
                    type="checkbox" 
                    checked={plannedBatches.length > 0 && selectedBatchIds.length === plannedBatches.length}
                    onChange={toggleAllBatches}
                    className="rounded border-app-border text-app-accent focus:ring-app-accent"
                  />
                </th>
                {listSortBy === 'manual' && <th className="py-3 px-2 w-16"></th>}
                <th className="py-3 px-4 font-semibold text-app-text">Batch Name</th>
                <th className="py-3 px-4 font-semibold text-app-text hidden sm:table-cell">Date</th>
                <th className="py-3 px-4 font-semibold text-app-text hidden md:table-cell">Entries</th>
                <th className="py-3 px-4 font-semibold text-app-text text-right">Total Volume</th>
                <th className="py-3 px-4 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {plannedBatches.length === 0 ? (
                <tr>
                  <td colSpan={listSortBy === 'manual' ? 7 : 6} className="py-8 text-center text-app-muted italic">
                    No planned batches yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                getSortedBatches().map((batch) => {
                  const totalVolume = (batch.entries || []).reduce((sum, e) => sum + (e.capacityMl || 0), 0);
                  const originalIndex = plannedBatches.findIndex(b => b.id === batch.id);
                  
                  return (
                    <tr 
                      key={batch.id} 
                      onClick={() => {
                        setSelectedBatch(batch);
                        setViewState('detail');
                      }}
                      className={`hover:bg-app-bg cursor-pointer transition-colors group ${selectedBatchIds.includes(batch.id) ? 'bg-app-accent/5' : ''}`}
                    >
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedBatchIds.includes(batch.id)}
                          onChange={(e) => toggleBatchSelection(e as any, batch.id)}
                          className="rounded border-app-border text-app-accent focus:ring-app-accent"
                        />
                      </td>
                      {listSortBy === 'manual' && (
                        <td className="py-4 px-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => moveBatch(e, batch.id, 'up')}
                              disabled={originalIndex <= 0}
                              className="p-0.5 text-app-muted hover:text-app-accent disabled:opacity-30"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button 
                              onClick={(e) => moveBatch(e, batch.id, 'down')}
                              disabled={originalIndex === -1 || originalIndex >= plannedBatches.length - 1}
                              className="p-0.5 text-app-muted hover:text-app-accent disabled:opacity-30"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                      <td className="py-4 px-4">
                        <div className="font-medium text-app-text group-hover:text-app-accent">{batch.name}</div>
                        <div className="text-xs text-app-muted sm:hidden mt-1">{batch.date}</div>
                      </td>
                      <td className="py-4 px-4 text-app-muted hidden sm:table-cell">
                        {batch.date}
                      </td>
                      <td className="py-4 px-4 text-app-muted hidden md:table-cell">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-app-bg text-app-text border border-app-border">
                          {batch.entries.length} entries
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-app-accent">
                        {totalVolume.toFixed(2)} mL
                      </td>
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => duplicateBatch(e, batch)}
                          className="p-1.5 text-app-muted hover:text-app-accent transition-colors rounded hover:bg-app-bg opacity-0 group-hover:opacity-100"
                          title="Duplicate Batch"
                        >
                          <Copy size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
