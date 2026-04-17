import React, { useState, useMemo } from 'react';
import { Plus, Trash2, FlaskConical, Package, Calculator, AlertTriangle, CheckCircle2, Save, ChevronLeft, Calendar, HelpCircle, Info, ArrowRight, Beaker, Receipt, RefreshCw } from 'lucide-react';
import { PlannedBatch, BottlingPlan, BottleConfig, Fragrance, Formula, PriceEntry, RawMaterial, Equipment, InventoryItem, InventoryLog, AppSettings } from '../types';
import { useConfirm } from '../hooks/useConfirm';
import TutorialModal from './TutorialModal';

interface BottlingPlannerProps {
  bottlingPlans: BottlingPlan[];
  setBottlingPlans: (plans: BottlingPlan[]) => void;
  plannedBatches: PlannedBatch[];
  fragrances: Fragrance[];
  formulas: Formula[];
  priceEntries: PriceEntry[];
  rawMaterials: RawMaterial[];
  equipments: Equipment[];
  settings: AppSettings;
  inventory?: InventoryItem[];
  setInventory?: (inventory: InventoryItem[]) => void;
}

interface BottleCostAnalysis {
  formulaCostPerMl: number;
  bottleCost: number;
  totalCostPerBottle: number;
  revenue: number;
  profit: number;
  roi: number;
}

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

export default function BottlingPlanner({
  bottlingPlans,
  setBottlingPlans,
  plannedBatches,
  fragrances,
  formulas,
  priceEntries,
  rawMaterials,
  equipments,
  settings,
  inventory = [],
  setInventory
}: BottlingPlannerProps) {
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState<string[]>([]);
  const { confirm, ConfirmModal } = useConfirm();

  const tutorialSteps = [
    {
      title: 'Select Source',
      content: 'Choose whole batches or expand them to select individual fragrances. The total volume updates in real-time.',
      icon: <FlaskConical size={40} />
    },
    {
      title: 'Configure Bottles',
      content: 'Add different bottle sizes and quantities. You can specify labels for each type (e.g., "Sample", "Retail").',
      icon: <Package size={40} />
    },
    {
      title: 'Loss Factor',
      content: 'Account for transfer losses (spillage, residue in beakers) by setting a loss percentage.',
      icon: <Calculator size={40} />
    },
    {
      title: 'Volume Check',
      content: 'The system will warn you if your selected batches don\'t have enough volume to fill all requested bottles.',
      icon: <AlertTriangle size={40} />
    }
  ];

  const activePlan = useMemo(() => bottlingPlans.find(p => p.id === activePlanId), [bottlingPlans, activePlanId]);

  const availableFragrances = useMemo(() => {
    if (!activePlan || !activePlan.selectedEntries) return [];
    const names = new Set<string>();
    activePlan.selectedEntries.forEach(selection => {
      const item = inventory.find(i => i.id === selection.entryId && i.itemType === 'blended_oil');
      if (item) {
        names.add(item.name);
      }
    });
    return Array.from(names).sort();
  }, [activePlan, inventory]);

  const availableVolumeByFragrance = useMemo(() => {
    const volumes: Record<string, number> = {};
    if (!activePlan || !activePlan.selectedEntries) return volumes;

    activePlan.selectedEntries.forEach(selection => {
      const item = inventory.find(i => i.id === selection.entryId && i.itemType === 'blended_oil');
      if (!item) return;
      
      const name = item.name;
      // Use residue volume if it exists for this entry in this plan
      const vol = activePlan.residueVolumes?.[item.id] ?? item.totalAmount;
      volumes[name] = (volumes[name] || 0) + vol;
    });
    return volumes;
  }, [activePlan, inventory]);

  const requiredVolumeByFragrance = useMemo(() => {
    const volumes: Record<string, number> = {};
    if (!activePlan) return volumes;

    const lossMultiplier = 1 + (activePlan.lossPercentage / 100);
    
    activePlan.bottles.forEach(bottle => {
      const name = bottle.fragranceName || 'Unassigned';
      const vol = (bottle.capacityMl * bottle.count) * lossMultiplier;
      volumes[name] = (volumes[name] || 0) + vol;
    });
    return volumes;
  }, [activePlan]);

  const fragranceStatus = useMemo(() => {
    const status: Record<string, { available: number; required: number; difference: number; isEnough: boolean }> = {};
    
    // Combine all fragrance names from both available and required
    const allNames = new Set([...Object.keys(availableVolumeByFragrance), ...Object.keys(requiredVolumeByFragrance)]);
    
    allNames.forEach(name => {
      const available = availableVolumeByFragrance[name] || 0;
      const required = requiredVolumeByFragrance[name] || 0;
      const difference = available - required;
      status[name] = {
        available,
        required,
        difference,
        isEnough: difference >= 0
      };
    });
    
    return status;
  }, [availableVolumeByFragrance, requiredVolumeByFragrance]);

  const totalAvailableVolume = useMemo(() => {
    return (Object.values(availableVolumeByFragrance) as number[]).reduce((sum, v) => sum + v, 0);
  }, [availableVolumeByFragrance]);

  const totalRequiredVolume = useMemo(() => {
    return (Object.values(requiredVolumeByFragrance) as number[]).reduce((sum, v) => sum + v, 0);
  }, [requiredVolumeByFragrance]);

  const isOverallEnough = useMemo(() => {
    return (Object.values(fragranceStatus) as { isEnough: boolean }[]).every(s => s.isEnough);
  }, [fragranceStatus]);

  const volumeDifference = totalAvailableVolume - totalRequiredVolume;
  const isEnough = isOverallEnough;

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

  const costAnalysis = useMemo(() => {
    const analysis: Record<string, BottleCostAnalysis> = {};
    if (!activePlan) return analysis;

    activePlan.bottles.forEach(bottle => {
      const fragName = bottle.fragranceName;
      if (!fragName) return;

      // Find the formula for this fragrance name
      // We look in inventory first
      let formulaId = '';
      let inventoryCostPerMl = 0;
      activePlan.selectedEntries.forEach(selection => {
        const item = inventory.find(i => i.id === selection.entryId && i.itemType === 'blended_oil');
        if (item && item.name === fragName) {
          if (item.costPerMl) {
            inventoryCostPerMl = item.costPerMl;
          }
          
          if (item.formulaId) {
            formulaId = item.formulaId;
          } else {
            // Fallback: trace back via creation logs to the blend batch
            const creationLog = item.containers.flatMap(c => c.logs).find(l => l.action === 'add' && l.referenceId);
            if (creationLog && creationLog.referenceId) {
              const batch = plannedBatches.find(b => b.id === creationLog.referenceId);
              if (batch) {
                // Find the entry that matches this item's fragranceId
                const entry = batch.entries.find(e => e.fragranceId === item.itemId || `custom_${e.fragranceId}` === item.itemId || e.customFragranceName === item.name.replace(' (Blended Oil)', ''));
                if (entry && entry.formulaId) {
                  formulaId = entry.formulaId;
                }
              }
            }
            
            // Second fallback: name matching
            if (!formulaId) {
              const cleanFragName = fragName.replace(' (Blended Oil)', '');
              const formula = formulas.find(f => f.name === cleanFragName);
              if (formula) formulaId = formula.id;
            }
          }
        }
      });

      let formulaCostPerMl = formulaId ? getFormulaCostPerMl(formulaId) : 0;
      if (formulaCostPerMl === 0 && inventoryCostPerMl > 0) {
        formulaCostPerMl = inventoryCostPerMl;
      }
      
      // Find bottle price
      let bottleCost = 0;
      
      if (bottle.equipmentId) {
        // Find price entries for this specific equipment
        const bottleEntries = priceEntries.filter(p => p.itemType === 'equipment' && p.itemId === bottle.equipmentId);
        if (bottleEntries.length > 0) {
          bottleCost = Math.min(...bottleEntries.map(e => e.pricingType === 'capacity' ? e.priceTarget : e.priceTarget / (e.quantity || 1)));
        }
      } else {
        // Fallback to matching by capacity or label
        const bottleEntries = priceEntries.filter(p => 
          p.itemType === 'equipment' && 
          (p.quantity === bottle.capacityMl || p.customItemName?.toLowerCase().includes('bottle'))
        );
        
        if (bottleEntries.length > 0) {
          bottleCost = Math.min(...bottleEntries.map(e => e.pricingType === 'capacity' ? e.priceTarget : e.priceTarget / (e.quantity || 1)));
        }
      }

      const lossMultiplier = 1 + (activePlan.lossPercentage / 100);
      const totalFormulaCost = (formulaCostPerMl * bottle.capacityMl) * lossMultiplier;
      const otherCosts = bottle.otherCostsPerBottle || 0;
      const totalCostPerBottle = totalFormulaCost + bottleCost + otherCosts;
      
      const sellingPrice = bottle.sellingPrice || 0;
      const revenue = sellingPrice * bottle.count;
      const totalCost = totalCostPerBottle * bottle.count;
      const profit = revenue - totalCost;
      const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

      analysis[bottle.id] = {
        formulaCostPerMl,
        bottleCost,
        totalCostPerBottle,
        revenue,
        profit,
        roi
      };
    });

    return analysis;
  }, [activePlan, formulas, priceEntries, fragrances, inventory]);

  const handleCreatePlan = () => {
    const newPlan: BottlingPlan = {
      id: Date.now().toString(),
      name: `Bottling Session ${bottlingPlans.length + 1}`,
      date: new Date().toISOString().split('T')[0],
      selectedEntries: [],
      bottles: [{ id: Date.now().toString(), capacityMl: 30, count: 10, label: 'Standard' }],
      lossPercentage: 2
    };
    setBottlingPlans([...bottlingPlans, newPlan]);
    setActivePlanId(newPlan.id);
  };

  const updateActivePlan = (updates: Partial<BottlingPlan>) => {
    if (!activePlanId) return;
    setBottlingPlans(bottlingPlans.map(p => p.id === activePlanId ? { ...p, ...updates } : p));
  };

  const handleAddBottle = () => {
    if (!activePlan) return;
    const newBottle: BottleConfig = {
      id: Date.now().toString(),
      capacityMl: 50,
      count: 1,
      label: ''
    };
    updateActivePlan({ bottles: [...activePlan.bottles, newBottle] });
  };

  const updateBottle = (id: string, updates: Partial<BottleConfig>) => {
    if (!activePlan) return;
    updateActivePlan({
      bottles: activePlan.bottles.map(b => b.id === id ? { ...b, ...updates } : b)
    });
  };

  const removeBottle = (id: string) => {
    if (!activePlan) return;
    updateActivePlan({
      bottles: activePlan.bottles.filter(b => b.id !== id)
    });
  };

  const toggleEntry = (entryId: string) => {
    if (!activePlan) return;
    const selectedEntries = activePlan.selectedEntries || [];
    const isSelected = selectedEntries.some(e => e.entryId === entryId);
    const newEntries = isSelected
      ? selectedEntries.filter(e => e.entryId !== entryId)
      : [...selectedEntries, { batchId: 'inventory', entryId }];
    updateActivePlan({ selectedEntries: newEntries });
  };

  const toggleWholeBatch = (batchId: string) => {
    // This function is no longer used since we select individual inventory items
  };

  const handleDeletePlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirm('Delete Bottling Plan', 'Are you sure you want to delete this bottling plan?', () => {
      setBottlingPlans(bottlingPlans.filter(p => p.id !== id));
      if (activePlanId === id) setActivePlanId(null);
    });
  };

  const commitBottlingToInventory = (plan: BottlingPlan) => {
    if (!setInventory || !inventory) return;

    confirm('Update Inventory', 'This will deduct bulk fragrance and bottles from inventory, and add the finished products. Continue?', () => {
      let updatedInventory = [...inventory];

      // 1. Deduct Blended Oil
      (Object.entries(requiredVolumeByFragrance) as [string, number][]).forEach(([fragName, requiredAmount]) => {
        const invItemIndex = updatedInventory.findIndex(i => i.name === fragName && i.itemType === 'blended_oil');
        if (invItemIndex === -1) return;

        let remainingToDeduct = requiredAmount;
        const invItem = { ...updatedInventory[invItemIndex] };
        invItem.containers = invItem.containers.map(container => {
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
              note: `Used in bottling session: ${plan.name}`,
              referenceId: plan.id
            };
            return { ...container, currentAmount: container.currentAmount - deduct, logs: [log, ...container.logs] };
          }
          return container;
        });
        invItem.totalAmount = invItem.containers.reduce((sum, c) => sum + c.currentAmount, 0);
        updatedInventory[invItemIndex] = invItem;
      });

      // 2. Deduct Bottles (Equipment)
      plan.bottles.forEach(bottle => {
        if (!bottle.equipmentId) return;
        const invItemIndex = updatedInventory.findIndex(i => i.itemId === bottle.equipmentId && i.itemType === 'equipment');
        if (invItemIndex === -1) return;

        let remainingToDeduct = bottle.count;
        const invItem = { ...updatedInventory[invItemIndex] };
        invItem.containers = invItem.containers.map(container => {
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
              note: `Used in bottling session: ${plan.name}`,
              referenceId: plan.id
            };
            return { ...container, currentAmount: container.currentAmount - deduct, logs: [log, ...container.logs] };
          }
          return container;
        });
        invItem.totalAmount = invItem.containers.reduce((sum, c) => sum + c.currentAmount, 0);
        updatedInventory[invItemIndex] = invItem;
      });

      // 3. Add Finished Bottled Fragrance
      plan.bottles.forEach(bottle => {
        const fragName = (bottle.fragranceName || 'Unassigned').replace(' (Blended Oil)', '');
        const itemId = `bottled_${fragName}_${bottle.capacityMl}`;
        const invItemIndex = updatedInventory.findIndex(i => i.itemId === itemId && i.itemType === 'bottled_fragrance');
        
        const newLog: InventoryLog = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          action: 'add',
          amount: bottle.count,
          unit: 'unit',
          note: `Produced in bottling session: ${plan.name}`,
          referenceId: plan.id
        };

        if (invItemIndex > -1) {
          const invItem = { ...updatedInventory[invItemIndex] };
          if (invItem.containers.length > 0) {
            invItem.containers[0].currentAmount += bottle.count;
            invItem.containers[0].logs = [newLog, ...invItem.containers[0].logs];
          } else {
            invItem.containers.push({
              id: `cont_${generateId()}`,
              capacity: bottle.count * 2,
              unit: 'unit',
              currentAmount: bottle.count,
              logs: [newLog],
              label: 'Finished Stock'
            });
          }
          invItem.totalAmount = invItem.containers.reduce((sum, c) => sum + c.currentAmount, 0);
          updatedInventory[invItemIndex] = invItem;
        } else {
          updatedInventory.push({
            id: `inv_${generateId()}`,
            itemId,
            itemType: 'bottled_fragrance',
            name: `${fragName} (${bottle.capacityMl}ml)`,
            containers: [{
              id: `cont_${generateId()}`,
              capacity: bottle.count * 2,
              unit: 'unit',
              currentAmount: bottle.count,
              logs: [newLog],
              label: 'Finished Stock'
            }],
            totalAmount: bottle.count,
            unit: 'unit'
          });
        }
      });

      setInventory(updatedInventory);
      updateActivePlan({ isCommittedToInventory: true });
      alert('Inventory updated successfully!');
    });
  };

  const revertBottlingFromInventory = (plan: BottlingPlan) => {
    if (!setInventory || !inventory) return;

    confirm('Revert Inventory Update', 'This will add back the bulk fragrance and bottles, and remove the finished products from inventory. Continue?', () => {
      let updatedInventory = [...inventory];

      // 1. Add back Bulk Fragrance
      (Object.entries(requiredVolumeByFragrance) as [string, number][]).forEach(([fragName, requiredAmount]) => {
        const invItemIndex = updatedInventory.findIndex(i => i.name.includes(fragName) && i.itemType === 'blended_oil');
        if (invItemIndex === -1) return;

        const invItem = { ...updatedInventory[invItemIndex] };
        if (invItem.containers.length > 0) {
          const log: InventoryLog = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action: 'add',
            amount: requiredAmount,
            unit: invItem.containers[0].unit,
            note: `Reverted from bottling session: ${plan.name}`,
            referenceId: plan.id
          };
          invItem.containers[0].currentAmount += requiredAmount;
          invItem.containers[0].logs = [log, ...invItem.containers[0].logs];
        }
        invItem.totalAmount = invItem.containers.reduce((sum, c) => sum + c.currentAmount, 0);
        updatedInventory[invItemIndex] = invItem;
      });

      // 2. Add back Bottles (Equipment)
      plan.bottles.forEach(bottle => {
        if (!bottle.equipmentId) return;
        const invItemIndex = updatedInventory.findIndex(i => i.itemId === bottle.equipmentId && i.itemType === 'equipment');
        if (invItemIndex === -1) return;

        const invItem = { ...updatedInventory[invItemIndex] };
        if (invItem.containers.length > 0) {
          const log: InventoryLog = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action: 'add',
            amount: bottle.count,
            unit: invItem.containers[0].unit,
            note: `Reverted from bottling session: ${plan.name}`,
            referenceId: plan.id
          };
          invItem.containers[0].currentAmount += bottle.count;
          invItem.containers[0].logs = [log, ...invItem.containers[0].logs];
        }
        invItem.totalAmount = invItem.containers.reduce((sum, c) => sum + c.currentAmount, 0);
        updatedInventory[invItemIndex] = invItem;
      });

      // 3. Remove Finished Bottled Fragrance
      plan.bottles.forEach(bottle => {
        const fragName = (bottle.fragranceName || 'Unassigned').replace(' (Blended Oil)', '');
        const itemId = `bottled_${fragName}_${bottle.capacityMl}`;
        const invItemIndex = updatedInventory.findIndex(i => i.itemId === itemId && i.itemType === 'bottled_fragrance');
        
        if (invItemIndex > -1) {
          const invItem = { ...updatedInventory[invItemIndex] };
          if (invItem.containers.length > 0) {
            const deduct = Math.min(invItem.containers[0].currentAmount, bottle.count);
            const log: InventoryLog = {
              id: generateId(),
              timestamp: new Date().toISOString(),
              action: 'remove',
              amount: deduct,
              unit: 'unit',
              note: `Reverted from bottling session: ${plan.name}`,
              referenceId: plan.id
            };
            invItem.containers[0].currentAmount -= deduct;
            invItem.containers[0].logs = [log, ...invItem.containers[0].logs];
          }
          invItem.totalAmount = invItem.containers.reduce((sum, c) => sum + c.currentAmount, 0);
          
          if (invItem.totalAmount <= 0) {
            updatedInventory.splice(invItemIndex, 1);
          } else {
            updatedInventory[invItemIndex] = invItem;
          }
        }
      });

      setInventory(updatedInventory);
      updateActivePlan({ isCommittedToInventory: false });
      alert('Inventory update reverted successfully!');
    });
  };

  if (!activePlanId) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-app-text flex items-center gap-2">
              <Package className="text-app-accent" />
              Bottling & Filling Planner
            </h2>
            <p className="text-app-muted text-sm mt-1">Plan your bottling sessions and verify volume availability.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTutorial(true)}
              className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/5 rounded-full transition-colors"
              title="How to use"
            >
              <HelpCircle size={22} />
            </button>
            <button
              onClick={handleCreatePlan}
              className="flex items-center gap-2 px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover transition-colors font-medium shadow-sm"
            >
              <Plus size={20} />
              New Bottling Plan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bottlingPlans.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-app-card rounded-xl border border-dashed border-app-border">
              <Package className="mx-auto h-12 w-12 text-app-muted mb-3" />
              <h3 className="text-lg font-medium text-app-text">No bottling plans yet</h3>
              <p className="text-app-muted text-sm mt-1 mb-4">Create your first plan to start organizing your filling sessions.</p>
              <button
                onClick={handleCreatePlan}
                className="inline-flex items-center gap-2 px-4 py-2 bg-app-accent/10 text-app-accent rounded-lg hover:bg-app-accent/20 transition-colors font-medium"
              >
                <Plus size={18} />
                Create Plan
              </button>
            </div>
          ) : (
            bottlingPlans.map(plan => {
              const planVolume = plan.bottles.reduce((s, b) => s + (b.capacityMl * b.count), 0);
              return (
                <div 
                  key={plan.id}
                  onClick={() => setActivePlanId(plan.id)}
                  className="bg-app-card p-5 rounded-xl border border-app-border shadow-sm hover:shadow-md hover:border-app-accent transition-all cursor-pointer group relative"
                >
                  <button
                    onClick={(e) => handleDeletePlan(plan.id, e)}
                    className="absolute top-4 right-4 p-1.5 text-app-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all z-10"
                  >
                    <Trash2 size={16} />
                  </button>
                  <h3 className="font-bold text-lg text-app-text mb-1 pr-8">{plan.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-app-muted mb-4">
                    <Calendar size={14} />
                    {plan.date}
                  </div>
                  <div className="flex justify-between items-end mt-4 pt-4 border-t border-app-border">
                    <div className="text-sm text-app-muted">
                      <div>{plan.bottles.length} bottle types</div>
                      <div>{plan.selectedEntries?.length || 0} items selected</div>
                    </div>
                    <span className="font-bold text-app-accent text-lg">
                      {planVolume.toLocaleString()} ml
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {ConfirmModal}
        <TutorialModal 
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
          title="Bottling Planner Guide"
          steps={tutorialSteps}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActivePlanId(null)}
            className="p-2 text-app-muted hover:text-app-text hover:bg-app-card rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={activePlan?.name || ''}
                onChange={(e) => updateActivePlan({ name: e.target.value })}
                className="text-2xl font-bold text-app-text bg-transparent border-none focus:ring-0 p-0 hover:bg-app-card rounded px-2 -ml-2"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-app-muted mt-1">
              <Calendar size={14} />
              <input
                type="date"
                value={activePlan?.date || ''}
                onChange={(e) => updateActivePlan({ date: e.target.value })}
                className="bg-transparent border-none focus:ring-0 p-0 text-sm text-app-muted hover:text-app-text"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowTutorial(true)}
            className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/5 rounded-full transition-colors"
            title="How to use"
          >
            <HelpCircle size={22} />
          </button>
          <div className={`px-6 py-3 rounded-xl shadow-sm border flex items-center gap-4 transition-colors ${isEnough ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <div className="text-sm text-app-muted font-medium">Volume Status</div>
            <div className={`text-xl font-bold flex items-center gap-2 ${isEnough ? 'text-emerald-500' : 'text-red-500'}`}>
              {isEnough ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              {isEnough ? 'Sufficient' : 'Insufficient'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Batch Selection & Bottle Config */}
        <div className="lg:col-span-2 space-y-6">
          {/* Batch Selection */}
          <div className="bg-app-card rounded-xl border border-app-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-app-border flex items-center gap-2 bg-app-bg/50">
              <FlaskConical size={18} className="text-app-accent" />
              <h3 className="font-bold text-app-text">Step 1: Select Source Blended Oils</h3>
            </div>
            <div className="p-4">
              {activePlan?.isBalancePlan ? (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <RefreshCw size={18} className="animate-spin-slow" />
                    <span className="text-sm font-bold uppercase tracking-wider">Aura of Balance</span>
                  </div>
                  <p className="text-xs text-app-muted leading-relaxed">
                    This essence is drawn from the remaining spirit of <strong>{activePlan.parentPlanName}</strong>. 
                    The source lineages are preserved to honor the original blend.
                  </p>
                  <div className="space-y-2 pt-2 border-t border-emerald-500/10">
                    {activePlan.selectedEntries.map((se, idx) => {
                      const item = inventory.find(i => i.id === se.entryId && i.itemType === 'blended_oil');
                      if (!item) return null;
                      return (
                        <div key={idx} className="flex justify-between text-[11px] items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-emerald-400" />
                            <span className="text-app-text font-medium">{item.name}</span>
                          </div>
                          <span className="text-app-muted italic">Residual</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : inventory.filter(i => i.itemType === 'blended_oil').length === 0 ? (
                <div className="text-center py-6 text-app-muted italic text-sm">
                  No blended oils available in inventory. Create and commit some in the Blend Planner first.
                </div>
              ) : (
                <div className="space-y-3">
                  {inventory.filter(i => i.itemType === 'blended_oil').map(item => {
                    const isEntrySelected = activePlan?.selectedEntries.some(se => se.entryId === item.id);
                    return (
                      <div 
                        key={item.id}
                        onClick={() => toggleEntry(item.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          isEntrySelected 
                            ? 'bg-app-accent/10 border-app-accent/20 text-app-accent' 
                            : 'bg-app-bg border-app-border hover:border-app-accent/30 text-app-text'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isEntrySelected ? 'bg-app-accent border-app-accent text-white' : 'border-app-muted bg-app-card'}`}>
                            {isEntrySelected && <CheckCircle2 size={14} />}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{item.name}</div>
                            <div className="text-xs text-app-muted">{item.containers.length} container(s)</div>
                          </div>
                        </div>
                        <span className="text-sm font-bold">{item.totalAmount.toLocaleString()} ml</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottle Configuration */}
          <div className="bg-app-card rounded-xl border border-app-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-app-border flex justify-between items-center bg-app-bg/50">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-app-accent" />
                <h3 className="font-bold text-app-text">Step 2: Configure Bottles</h3>
              </div>
              <button 
                onClick={handleAddBottle}
                className="flex items-center gap-1.5 text-xs font-bold text-app-accent hover:text-app-accent-hover"
              >
                <Plus size={14} />
                Add Bottle Type
              </button>
            </div>
            <div className="p-4 space-y-4">
              {activePlan?.bottles.map((bottle, index) => (
                <div key={bottle.id} className="bg-app-bg p-4 rounded-xl border border-app-border group space-y-4">
                  {/* Row 1: Fragrance and Label */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-app-muted mb-1 uppercase tracking-wider">Fragrance</label>
                      <select
                        value={bottle.fragranceName || ''}
                        onChange={(e) => updateBottle(bottle.id, { fragranceName: e.target.value })}
                        className="w-full text-sm bg-app-card border-app-border rounded-md text-app-text focus:ring-app-accent"
                      >
                        <option value="">Select Fragrance...</option>
                        {availableFragrances.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-app-muted mb-1 uppercase tracking-wider">Label / Type</label>
                      <input 
                        type="text"
                        value={bottle.label}
                        onChange={(e) => updateBottle(bottle.id, { label: e.target.value })}
                        placeholder="e.g. Retail, Sample..."
                        className="w-full text-sm bg-app-card border-app-border rounded-md text-app-text focus:ring-app-accent"
                      />
                    </div>
                  </div>

                  {/* Row 2: Bottle Selection, Capacity, Quantity, Price, Other Costs */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-bold text-app-muted mb-1 uppercase tracking-wider">Bottle (Equipment)</label>
                      <select
                        value={bottle.equipmentId || ''}
                        onChange={(e) => {
                          const eqId = e.target.value;
                          const eq = equipments.find(item => item.id === eqId);
                          const updates: Partial<BottleConfig> = { equipmentId: eqId };
                          if (eq) {
                            // Try to extract capacity from size if it's a number
                            const sizeMatch = eq.size.match(/(\d+)/);
                            if (sizeMatch) {
                              updates.capacityMl = parseInt(sizeMatch[1]);
                            }
                          }
                          updateBottle(bottle.id, updates);
                        }}
                        className="w-full text-sm bg-app-card border-app-border rounded-md text-app-text focus:ring-app-accent"
                      >
                        <option value="">Select Bottle...</option>
                        {equipments.filter(e => e.type === 'Equipment' || e.type === 'Application').map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.name} ({eq.size})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-app-muted mb-1 uppercase tracking-wider">Capacity (ml)</label>
                      <input 
                        type="number"
                        min="1"
                        value={bottle.capacityMl}
                        onChange={(e) => updateBottle(bottle.id, { capacityMl: Number(e.target.value) || 0 })}
                        className="w-full text-sm bg-app-card border-app-border rounded-md text-app-text focus:ring-app-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-app-muted mb-1 uppercase tracking-wider">Quantity</label>
                      <input 
                        type="number"
                        min="1"
                        value={bottle.count}
                        onChange={(e) => updateBottle(bottle.id, { count: Number(e.target.value) || 0 })}
                        className="w-full text-sm bg-app-card border-app-border rounded-md text-app-text focus:ring-app-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-app-muted mb-1 uppercase tracking-wider">Sell Price ({settings.targetCurrency})</label>
                      <input 
                        type="text"
                        value={bottle.sellingPrice === undefined ? '' : bottle.sellingPrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            updateBottle(bottle.id, { sellingPrice: undefined });
                          } else if (!isNaN(Number(val))) {
                            updateBottle(bottle.id, { sellingPrice: Number(val) });
                          }
                        }}
                        placeholder="0.00"
                        className="w-full text-sm bg-app-card border-app-border rounded-md text-app-text focus:ring-app-accent px-3"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-app-muted mb-1 uppercase tracking-wider">Other Costs ({settings.targetCurrency})</label>
                      <input 
                        type="text"
                        value={bottle.otherCostsPerBottle === undefined ? '' : bottle.otherCostsPerBottle}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            updateBottle(bottle.id, { otherCostsPerBottle: undefined });
                          } else if (!isNaN(Number(val))) {
                            updateBottle(bottle.id, { otherCostsPerBottle: Number(val) });
                          }
                        }}
                        placeholder="0.00"
                        className="w-full text-sm bg-app-card border-app-border rounded-md text-app-text focus:ring-app-accent px-3"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 text-right">
                        <label className="block text-[10px] font-bold text-app-muted mb-1 uppercase tracking-wider">Subtotal</label>
                        <div className="text-sm font-bold text-app-text h-9 flex items-center justify-end">
                          {(bottle.capacityMl * bottle.count).toLocaleString()} ml
                        </div>
                      </div>
                      <button 
                        onClick={() => removeBottle(bottle.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-md transition-all mb-0.5"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {activePlan?.bottles.length === 0 && (
                <div className="text-center py-6 text-app-muted italic text-sm">
                  No bottles configured. Add one to start planning.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Calculations & Summary */}
        <div className="lg:sticky lg:top-24 space-y-6 self-start">
          {/* Volume Summary Card */}
          <div className="bg-app-card rounded-xl border border-app-border shadow-sm p-5">
            <h3 className="font-bold text-app-text mb-4 flex items-center gap-2">
              <Calculator className="text-app-accent" size={20} />
              Volume Analysis
            </h3>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-app-muted uppercase tracking-wider px-1">Fragrance Breakdown</div>
                {(Object.entries(fragranceStatus) as [string, { available: number; required: number; difference: number; isEnough: boolean }][]).map(([name, status]) => (
                  <div key={name} className={`p-3 rounded-lg border transition-colors ${status.isEnough ? 'bg-app-bg border-app-border' : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-xs font-bold text-app-text truncate mr-2" title={name}>{name}</div>
                      <div className={`text-xs font-bold ${status.isEnough ? 'text-emerald-500' : 'text-red-500'}`}>
                        {status.isEnough ? 'OK' : 'Short'}
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-app-muted">
                      <span>{status.available.toLocaleString()} ml available</span>
                      <span className={status.isEnough ? '' : 'text-red-400'}>{status.required.toLocaleString()} ml req.</span>
                    </div>
                    {!status.isEnough && (
                      <div className="mt-1 text-[10px] font-bold text-red-500">
                        Need {Math.abs(status.difference).toLocaleString()} ml more
                      </div>
                    )}
                  </div>
                ))}
                {Object.keys(fragranceStatus).length === 0 && (
                  <div className="text-center py-4 text-app-muted italic text-xs">
                    Select batches and configure bottles to see analysis.
                  </div>
                )}
              </div>

              <div className="px-3 pt-2">
                <label className="block text-[10px] font-bold text-app-muted mb-1 uppercase tracking-wider">Transfer Loss Factor (%)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={activePlan?.lossPercentage || 0}
                    onChange={(e) => updateActivePlan({ lossPercentage: Number(e.target.value) })}
                    className="flex-1 accent-app-accent"
                  />
                  <span className="text-sm font-bold text-app-text w-10">{activePlan?.lossPercentage}%</span>
                </div>
                <p className="text-[10px] text-app-muted mt-1 italic">Covers residue in beakers, syringes, and spillage.</p>
              </div>

              <div className={`p-4 rounded-xl border-2 flex flex-col items-center text-center gap-2 ${isEnough ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className={`text-sm font-bold uppercase tracking-widest ${isEnough ? 'text-emerald-500' : 'text-red-500'}`}>
                  {isEnough ? 'Volume Check Passed' : 'Volume Shortage'}
                </div>
                <div className={`text-3xl font-black ${isEnough ? 'text-emerald-600' : 'text-red-600'}`}>
                  {Math.abs(volumeDifference).toLocaleString()} ml
                </div>
                <div className="text-xs text-app-muted">
                  {isEnough ? 'Remaining surplus after filling' : 'Additional batch volume needed'}
                </div>
                
                {isEnough && volumeDifference > 0 && (
                  <button
                    onClick={() => {
                      const residueVolumes: Record<string, number> = {};
                      const requiredByFragrance = { ...requiredVolumeByFragrance };
                      
                      activePlan.selectedEntries.forEach(selection => {
                        const item = inventory.find(i => i.id === selection.entryId && i.itemType === 'blended_oil');
                        if (!item) return;
                        
                        const name = item.name;
                        const availableInEntry = item.totalAmount;
                        const needed = requiredByFragrance[name] || 0;
                        
                        if (needed >= availableInEntry) {
                          residueVolumes[item.id] = 0;
                          requiredByFragrance[name] -= availableInEntry;
                        } else {
                          residueVolumes[item.id] = availableInEntry - needed;
                          requiredByFragrance[name] = 0;
                        }
                      });

                      const newPlan: BottlingPlan = {
                        id: Date.now().toString(),
                        name: `${activePlan.name} Residue`,
                        date: activePlan.date,
                        selectedEntries: [...activePlan.selectedEntries],
                        bottles: [{ 
                          id: (Date.now() + 1).toString(), 
                          capacityMl: Math.min(volumeDifference, 30), 
                          count: 1, 
                          label: 'Balance' 
                        }],
                        lossPercentage: activePlan.lossPercentage,
                        isBalancePlan: true,
                        parentPlanName: activePlan.name,
                        residueVolumes
                      };
                      setBottlingPlans([...bottlingPlans, newPlan]);
                      setActivePlanId(newPlan.id);
                    }}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-2 rounded-lg font-bold text-xs hover:bg-emerald-600 transition-all shadow-sm"
                  >
                    <ArrowRight size={14} />
                    Plan for Balance
                  </button>
                )}
              </div>

              {!isEnough && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-3">
                  <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <strong>Warning:</strong> You are short by {Math.abs(volumeDifference).toLocaleString()} ml. 
                    Consider adding more batches or reducing bottle quantities.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-app-border space-y-3">
              <div className="flex items-center gap-2 text-xs text-app-muted">
                <Info size={14} />
                <span>Quick Stats</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-app-bg p-2 rounded border border-app-border text-center">
                  <div className="text-[10px] text-app-muted uppercase">Total Bottles</div>
                  <div className="font-bold text-app-text">{activePlan?.bottles.reduce((s, b) => s + b.count, 0)}</div>
                </div>
                <div className="bg-app-bg p-2 rounded border border-app-border text-center">
                  <div className="text-[10px] text-app-muted uppercase">Total Vol. Used</div>
                  <div className="font-bold text-app-text">
                    {activePlan?.bottles.reduce((s, b) => s + (b.capacityMl * b.count), 0).toLocaleString()} ml
                  </div>
                </div>
                <div className="bg-app-bg p-2 rounded border border-app-border text-center col-span-2">
                  <div className="text-[10px] text-app-muted uppercase">Avg. Bottle</div>
                  <div className="font-bold text-app-text">
                    {activePlan?.bottles.length ? Math.round(activePlan.bottles.reduce((s, b) => s + b.capacityMl, 0) / activePlan.bottles.length) : 0} ml
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Intelligence Card */}
          <div className="bg-app-card rounded-xl border border-app-border shadow-sm p-5">
            <h3 className="font-bold text-app-text mb-4 flex items-center gap-2">
              <Receipt className="text-emerald-500" size={20} />
              Cost Intelligence
            </h3>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-app-muted uppercase tracking-wider px-1">Cost per Bottle Breakdown</div>
                {activePlan?.bottles.map(bottle => {
                  const analysis = costAnalysis[bottle.id];
                  if (!analysis) return null;
                  
                  return (
                    <div key={bottle.id} className="p-3 rounded-lg border border-app-border bg-app-bg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs font-bold text-app-text truncate mr-2">
                          {bottle.fragranceName || 'Unassigned'} ({bottle.capacityMl}ml)
                        </div>
                        <div className="text-xs font-bold text-emerald-600">
                          {settings.currencySymbol} {analysis.totalCostPerBottle.toFixed(3)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-app-muted">
                          <span>Formula Cost</span>
                          <span>{settings.currencySymbol} {(analysis.formulaCostPerMl * bottle.capacityMl).toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-app-muted">
                          <span>Bottle/Packaging</span>
                          <span>{settings.currencySymbol} {analysis.bottleCost.toFixed(3)}</span>
                        </div>
                        {(bottle.otherCostsPerBottle || 0) > 0 && (
                          <div className="flex justify-between text-[10px] text-app-muted">
                            <span>Other Costs</span>
                            <span>{settings.currencySymbol} {(bottle.otherCostsPerBottle || 0).toFixed(3)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[10px] text-app-muted border-t border-app-border/50 pt-1 mt-1">
                          <span>Total per Bottle</span>
                          <span className="font-bold text-app-text">{settings.currencySymbol} {analysis.totalCostPerBottle.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-app-accent pt-1">
                          <span>Batch Total ({bottle.count}x)</span>
                          <span>{settings.currencySymbol} {(analysis.totalCostPerBottle * bottle.count).toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-emerald-600 pt-1 border-t border-app-border/50 mt-1">
                          <span>Sell Price</span>
                          <span>{settings.currencySymbol} {(bottle.sellingPrice || 0).toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-emerald-600">
                          <span>Est. Profit</span>
                          <span>{settings.currencySymbol} {analysis.profit.toFixed(3)} ({analysis.roi.toFixed(1)}% ROI)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {activePlan?.bottles.length === 0 && (
                  <div className="text-center py-4 text-app-muted italic text-xs">
                    Configure bottles to see cost analysis.
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/5 border-2 border-emerald-500/20 flex flex-col items-center text-center gap-2">
                <div className="text-sm font-bold uppercase tracking-widest text-emerald-600">
                  Total Production Cost
                </div>
                <div className="text-3xl font-black text-emerald-700">
                  {settings.currencySymbol} {Object.entries(costAnalysis).reduce((sum, [bottleId, analysis]: [string, BottleCostAnalysis]) => {
                    const bottle = activePlan?.bottles.find(b => b.id === bottleId);
                    return sum + (analysis.totalCostPerBottle * (bottle?.count || 0));
                  }, 0).toFixed(3)}
                </div>
                <div className="text-xs text-app-muted">
                  Estimated cost for the entire bottling session
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-app-accent/5 border border-app-accent/20 text-center">
                  <div className="text-[10px] font-bold uppercase text-app-muted mb-1">Total Revenue</div>
                  <div className="text-lg font-bold text-app-accent">
                    {settings.currencySymbol} {(Object.values(costAnalysis) as BottleCostAnalysis[]).reduce((sum, a) => sum + a.revenue, 0).toFixed(3)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Est. Net Profit</div>
                  <div className="text-lg font-bold text-emerald-700">
                    {settings.currencySymbol} {(Object.values(costAnalysis) as BottleCostAnalysis[]).reduce((sum, a) => sum + a.profit, 0).toFixed(3)}
                  </div>
                </div>
              </div>

              {!activePlan.isCommittedToInventory ? (
                <button
                  onClick={() => commitBottlingToInventory(activePlan)}
                  className="w-full py-4 bg-app-accent text-white rounded-xl font-bold hover:bg-app-accent-hover transition-all shadow-lg shadow-app-accent/20 flex items-center justify-center gap-2"
                >
                  <Package size={20} />
                  Update Inventory
                </button>
              ) : (
                <button
                  onClick={() => revertBottlingFromInventory(activePlan)}
                  className="w-full py-4 bg-orange-500/10 text-orange-600 rounded-xl font-bold border border-orange-500/20 flex items-center justify-center gap-2 hover:bg-orange-500/20 transition-all"
                >
                  <RefreshCw size={20} />
                  Revert Inventory Update
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {ConfirmModal}
    </div>
  );
}
