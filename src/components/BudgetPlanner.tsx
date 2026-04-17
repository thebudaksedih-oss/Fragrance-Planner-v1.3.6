import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Truck, Package, FlaskConical, Wrench, Receipt, Percent, DollarSign, Save, ChevronLeft, Edit2, Calendar, HelpCircle } from 'lucide-react';
import { RawMaterial, PriceEntry, ShipmentOption, BudgetItem, BudgetPlan, Fragrance, Equipment, Formula, PlannedBatch, BlendEntry, AppSettings } from '../types';
import { useConfirm } from '../hooks/useConfirm';
import TutorialModal from './TutorialModal';

interface BudgetPlannerProps {
  rawMaterials: RawMaterial[];
  equipments: Equipment[];
  priceEntries: PriceEntry[];
  shipmentOptions: ShipmentOption[];
  setShipmentOptions: (options: ShipmentOption[]) => void;
  budgetPlans: BudgetPlan[];
  setBudgetPlans: (plans: BudgetPlan[]) => void;
  settings: AppSettings;
  formulas?: Formula[];
  fragrances?: Fragrance[];
  plannedBatches?: PlannedBatch[];
}

export default function BudgetPlanner({
  rawMaterials,
  equipments,
  priceEntries,
  shipmentOptions,
  setShipmentOptions,
  budgetPlans,
  setBudgetPlans,
  settings,
  formulas = [],
  fragrances = [],
  plannedBatches = []
}: BudgetPlannerProps) {
  const targetCurrency = settings.targetCurrency;
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [newShipment, setNewShipment] = useState({ name: '', price: 0, rate: 'flat fee' });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'batch' | 'formula'>('batch');
  const [selectedImportId, setSelectedImportId] = useState<string>('');
  const [importTargetAmount, setImportTargetAmount] = useState<number>(100);
  const [showTutorial, setShowTutorial] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  const tutorialSteps = [
    {
      title: 'Create Plans',
      content: 'Start by creating a new budget plan for your project to track estimated costs.',
      icon: <Receipt size={40} />
    },
    {
      title: 'Quick Import',
      content: 'Import materials and fragrances directly from your planned batches or formulas to save time.',
      icon: <Plus size={40} />
    },
    {
      title: 'Smart Quantity',
      content: 'The planner automatically calculates the number of units to buy based on your price entries and needed amounts.',
      icon: <FlaskConical size={40} />
    },
    {
      title: 'Shipment Options',
      content: 'Manage different shipping methods and apply them to your plan for accurate total costs.',
      icon: <Truck size={40} />
    },
    {
      title: 'Cost Breakdown',
      content: 'View a detailed summary of costs categorized by material type to stay within your budget.',
      icon: <DollarSign size={40} />
    }
  ];

  const activePlan = useMemo(() => budgetPlans.find(p => p.id === activePlanId), [budgetPlans, activePlanId]);

  const fragranceOptions = useMemo(() => {
    const options = new Map();
    priceEntries.filter(p => p.itemType === 'fragrance').forEach(p => {
      const name = p.customItemName || 'Unknown Fragrance';
      const key = p.itemId || p.customItemName || p.id;
      if (!options.has(key)) {
        options.set(key, { id: key, name });
      }
    });
    return Array.from(options.values());
  }, [priceEntries]);

  const handleImport = () => {
    if (!activePlan) return;
    
    const materialQuantities = new Map<string, number>();
    const fragranceQuantities = new Map<string, number>();

    const addMaterial = (id: string, amount: number) => {
      if (!id) return;
      materialQuantities.set(id, (materialQuantities.get(id) || 0) + amount);
    };
    const addFragrance = (id: string, amount: number) => {
      if (!id) return;
      fragranceQuantities.set(id, (fragranceQuantities.get(id) || 0) + amount);
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

    const processFormula = (form: Formula, volume: number, entry?: BlendEntry) => {
      form.materials?.forEach(m => {
        const rm = rawMaterials.find(r => r.id === m.rawMaterialId);
        let amount = volume * ((m.percentage || 0) / 100);
        // Dilution handling: if material is 10% diluted, we need 1/10th of the pure material
        if (rm?.isDiluted && rm.dilutionPercentage) {
          amount = amount * (rm.dilutionPercentage / 100);
        }
        addMaterial(m.rawMaterialId, amount);
      });

      form.alcohols?.forEach((a, idx) => {
        const pct = getAlcoholPercentage(form, a, idx);
        addMaterial(a.rawMaterialId, volume * (pct / 100));
      });

      form.fragranceOils?.forEach(o => {
        const amount = volume * ((o.percentage || 0) / 100);
        let id = o.fragranceId;
        if (!form.isHybrid && entry) {
          id = entry.customFragranceName || entry.fragranceId || o.fragranceId;
        }
        addFragrance(id, amount);
      });

      form.accords?.forEach(a => {
        const accordForm = formulas.find(f => f.id === a.accordId);
        if (accordForm) {
          let accordVolume = 0;
          if (a.unit === '%') accordVolume = volume * ((a.amount || 0) / 100);
          else accordVolume = a.amount || 0;
          processFormula(accordForm, accordVolume, entry);
        }
      });
    };

    if (importType === 'batch') {
      const batch = plannedBatches.find(b => b.id === selectedImportId);
      if (batch) {
        batch.entries.forEach(entry => {
          const formula = formulas.find(f => f.id === entry.formulaId);
          if (formula) {
            const totalVolume = (entry.capacityMl || 0) * (entry.multiplier || 1);
            processFormula(formula, totalVolume, entry);
          }
        });
      }
    } else if (importType === 'formula') {
      const formula = formulas.find(f => f.id === selectedImportId);
      if (formula) {
        processFormula(formula, importTargetAmount);
      }
    }

    const newItems: BudgetItem[] = [...activePlan.items];
    
    // Process Materials with Smart Quantity Logic
    materialQuantities.forEach((neededAmount, id) => {
      const possibleEntries = priceEntries.filter(p => p.itemId === id && p.itemType === 'raw_material');
      
      if (possibleEntries.length > 0) {
        // Sort by price per unit (lowest first)
        const sortedEntries = [...possibleEntries].sort((a, b) => {
          let qtyA = (a.unit?.toLowerCase() === 'kg' || a.unit?.toLowerCase() === 'l') ? (a.quantity || 1) * 1000 : (a.unit?.toLowerCase() === 'mg' ? (a.quantity || 1) / 1000 : (a.quantity || 1));
          if (a.isDiluted && a.dilutionPercentage) {
            qtyA = qtyA * (a.dilutionPercentage / 100);
          }
          
          let qtyB = (b.unit?.toLowerCase() === 'kg' || b.unit?.toLowerCase() === 'l') ? (b.quantity || 1) * 1000 : (b.unit?.toLowerCase() === 'mg' ? (b.quantity || 1) / 1000 : (b.quantity || 1));
          if (b.isDiluted && b.dilutionPercentage) {
            qtyB = qtyB * (b.dilutionPercentage / 100);
          }
          
          const ppuA = a.priceTarget / qtyA;
          const ppuB = b.priceTarget / qtyB;
          return ppuA - ppuB;
        });

        const bestEntry = sortedEntries[0];
        const normalizedQty = (bestEntry.unit?.toLowerCase() === 'kg' || bestEntry.unit?.toLowerCase() === 'l') ? (bestEntry.quantity || 1) * 1000 : (bestEntry.unit?.toLowerCase() === 'mg' ? (bestEntry.quantity || 1) / 1000 : (bestEntry.quantity || 1));
        
        let effectivePureQty = normalizedQty;
        if (bestEntry.isDiluted && bestEntry.dilutionPercentage) {
          effectivePureQty = normalizedQty * (bestEntry.dilutionPercentage / 100);
        }
        
        const buyQuantity = Math.ceil(neededAmount / effectivePureQty);
        
        newItems.push({
          id: Date.now().toString() + Math.random().toString(),
          category: 'raw_material',
          itemId: id,
          quantity: buyQuantity,
          unitPrice: bestEntry.priceTarget,
          priceEntryId: bestEntry.id,
          discountPercentage: 0
        });
      } else {
        newItems.push({
          id: Date.now().toString() + Math.random().toString(),
          category: 'raw_material',
          itemId: id,
          quantity: Number(neededAmount.toFixed(2)),
          unitPrice: 0,
          discountPercentage: 0
        });
      }
    });

    // Process Fragrances with Smart Quantity Logic and Name Matching
    fragranceQuantities.forEach((neededAmount, id) => {
      const fragrance = fragrances.find(f => 
        f.id === id || 
        f.name.toLowerCase() === id.toLowerCase() || 
        f.originalScent.toLowerCase() === id.toLowerCase()
      );

      const possibleEntries = priceEntries.filter(p => {
        if (p.itemType !== 'fragrance') return false;
        if (p.itemId === id) return true;
        if (p.customItemName?.toLowerCase() === id.toLowerCase()) return true;
        if (fragrance) {
          if (p.itemId === fragrance.id) return true;
          if (p.customItemName?.toLowerCase() === fragrance.name.toLowerCase()) return true;
          if (p.customItemName?.toLowerCase() === fragrance.originalScent.toLowerCase()) return true;
        }
        return false;
      });

      if (possibleEntries.length > 0) {
        const sortedEntries = [...possibleEntries].sort((a, b) => {
          const qtyA = (a.unit?.toLowerCase() === 'kg' || a.unit?.toLowerCase() === 'l') ? (a.quantity || 1) * 1000 : (a.unit?.toLowerCase() === 'mg' ? (a.quantity || 1) / 1000 : (a.quantity || 1));
          const qtyB = (b.unit?.toLowerCase() === 'kg' || b.unit?.toLowerCase() === 'l') ? (b.quantity || 1) * 1000 : (b.unit?.toLowerCase() === 'mg' ? (b.quantity || 1) / 1000 : (b.quantity || 1));
          const ppuA = a.priceTarget / qtyA;
          const ppuB = b.priceTarget / qtyB;
          return ppuA - ppuB;
        });

        const bestEntry = sortedEntries[0];
        const bestItemId = bestEntry.itemId || bestEntry.customItemName || bestEntry.id;
        const normalizedQty = (bestEntry.unit?.toLowerCase() === 'kg' || bestEntry.unit?.toLowerCase() === 'l') ? (bestEntry.quantity || 1) * 1000 : (bestEntry.unit?.toLowerCase() === 'mg' ? (bestEntry.quantity || 1) / 1000 : (bestEntry.quantity || 1));
        const buyQuantity = Math.ceil(neededAmount / normalizedQty);

        newItems.push({
          id: Date.now().toString() + Math.random().toString(),
          category: 'fragrance_oil',
          itemId: bestItemId,
          quantity: buyQuantity,
          unitPrice: bestEntry.priceTarget,
          priceEntryId: bestEntry.id,
          discountPercentage: 0
        });
      } else {
        newItems.push({
          id: Date.now().toString() + Math.random().toString(),
          category: 'fragrance_oil',
          itemId: id,
          quantity: Number(neededAmount.toFixed(2)),
          unitPrice: 0,
          discountPercentage: 0
        });
      }
    });

    updateActivePlan({ items: newItems });
    setShowImportModal(false);
  };

  const handleCreatePlan = () => {
    const newPlan: BudgetPlan = {
      id: Date.now().toString(),
      name: `Budget Plan ${budgetPlans.length + 1}`,
      date: new Date().toISOString().split('T')[0],
      items: []
    };
    setBudgetPlans([...budgetPlans, newPlan]);
    setActivePlanId(newPlan.id);
  };

  const handleDeletePlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Ensure the plan is NOT active when deleting from the front page
    // to prevent the ConfirmModal from being unmounted if it's inside the active view
    confirm('Delete Budget Plan', 'Are you sure you want to delete this budget plan?', () => {
      setBudgetPlans(budgetPlans.filter(p => p.id !== id));
      if (activePlanId === id) setActivePlanId(null);
    });
  };

  const updateActivePlan = (updates: Partial<BudgetPlan>) => {
    if (!activePlanId) return;
    setBudgetPlans(budgetPlans.map(p => p.id === activePlanId ? { ...p, ...updates } : p));
  };

  const handleAddShipmentOption = () => {
    if (!newShipment.name) return;
    const newOption: ShipmentOption = {
      id: Date.now().toString(),
      name: newShipment.name,
      price: newShipment.price,
      rate: newShipment.rate
    };
    setShipmentOptions([...shipmentOptions, newOption]);
    setShowShipmentModal(false);
    setNewShipment({ name: '', price: 0, rate: 'flat fee' });
  };

  const handleAddItem = (category: BudgetItem['category']) => {
    if (!activePlan) return;
    const newItem: BudgetItem = {
      id: Date.now().toString(),
      category,
      quantity: 1,
      unitPrice: 0,
      discountPercentage: 0
    };
    updateActivePlan({ items: [...activePlan.items, newItem] });
  };

  const updateItem = (id: string, updates: Partial<BudgetItem>) => {
    if (!activePlan) return;
    updateActivePlan({
      items: activePlan.items.map(item => item.id === id ? { ...item, ...updates } : item)
    });
  };

  const removeItem = (id: string) => {
    if (!activePlan) return;
    updateActivePlan({
      items: activePlan.items.filter(item => item.id !== id)
    });
  };

  const calculateItemTotal = (item: BudgetItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const discount = subtotal * (item.discountPercentage / 100);
    return subtotal - discount;
  };

  const calculateCategoryTotal = (plan: BudgetPlan, category: BudgetItem['category']) => {
    return plan.items
      .filter(item => item.category === category)
      .reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateGrandTotal = (plan: BudgetPlan) => {
    return plan.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const getUnitLabel = (item: BudgetItem) => {
    if (item.priceEntryId) {
      const entry = priceEntries.find(e => e.id === item.priceEntryId);
      if (entry) {
        if (entry.pricingType === 'capacity') return 'items';
        return entry.unit;
      }
    }
    return 'units';
  };

  const renderCategorySection = (
    title: string, 
    category: BudgetItem['category'], 
    icon: React.ReactNode, 
    colorClass: string,
    bgClass: string
  ) => {
    if (!activePlan) return null;
    const items = activePlan.items.filter(item => item.category === category);
    
    return (
      <div className={`rounded-xl border shadow-sm overflow-hidden mb-6 ${bgClass}`}>
        <div className={`px-4 py-3 border-b border-app-border flex justify-between items-center bg-app-card/50`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${colorClass} bg-app-bg shadow-sm`}>
              {icon}
            </div>
            <h3 className="font-bold text-app-text">{title}</h3>
          </div>
          <div className="text-sm font-bold text-app-text">
            {settings.currencySymbol} {calculateCategoryTotal(activePlan, category).toFixed(2)}
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-4 text-sm text-app-muted italic">
              No items added to {title.toLowerCase()} yet.
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex flex-col gap-3 bg-app-bg p-3 rounded-lg shadow-sm border border-app-border">
                {/* Item Selection Row */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                  {category === 'raw_material' ? (
                    <>
                      <select
                        value={item.itemId || ''}
                        onChange={(e) => updateItem(item.id, { itemId: e.target.value, priceEntryId: undefined, unitPrice: 0 })}
                        className="flex-1 min-w-[200px] text-sm bg-app-bg border-app-border rounded-md shadow-sm text-app-text focus:border-app-accent focus:ring-app-accent"
                      >
                        <option value="">Select Material...</option>
                        {rawMaterials.map(rm => (
                          <option key={rm.id} value={rm.id}>{rm.name}</option>
                        ))}
                      </select>
                      {item.itemId && (
                        <select
                          value={item.priceEntryId || ''}
                          onChange={(e) => {
                            const entryId = e.target.value;
                            const entry = priceEntries.find(p => p.id === entryId);
                            const pricePerUnit = entry && entry.pricingType === 'capacity' 
                              ? entry.priceTarget 
                              : (entry && entry.quantity > 0 ? entry.priceTarget / entry.quantity : 0);
                            updateItem(item.id, { priceEntryId: entryId, unitPrice: pricePerUnit });
                          }}
                          className="flex-1 min-w-[200px] text-sm bg-app-bg border-app-border rounded-md shadow-sm text-app-text focus:border-app-accent focus:ring-app-accent"
                        >
                          <option value="">Select Supplier...</option>
                          {priceEntries.filter(p => p.itemId === item.itemId && p.itemType === 'raw_material').map(p => (
                            <option key={p.id} value={p.id}>
                              {p.supplierId || 'Unknown'} ({settings.currencySymbol} {p.priceTarget} / {p.quantity}{p.unit})
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  ) : category === 'fragrance_oil' ? (
                    <>
                      <select
                        value={item.itemId || ''}
                        onChange={(e) => updateItem(item.id, { itemId: e.target.value, priceEntryId: undefined, unitPrice: 0 })}
                        className="flex-1 min-w-[200px] text-sm bg-app-bg border-app-border rounded-md shadow-sm text-app-text focus:border-app-accent focus:ring-app-accent"
                      >
                        <option value="">Select Fragrance Oil...</option>
                        {fragranceOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                      </select>
                      {item.itemId && (
                        <select
                          value={item.priceEntryId || ''}
                          onChange={(e) => {
                            const entryId = e.target.value;
                            const entry = priceEntries.find(p => p.id === entryId);
                            const pricePerUnit = entry && entry.pricingType === 'capacity' 
                              ? entry.priceTarget 
                              : (entry && entry.quantity > 0 ? entry.priceTarget / entry.quantity : 0);
                            updateItem(item.id, { priceEntryId: entryId, unitPrice: pricePerUnit });
                          }}
                          className="flex-1 min-w-[200px] text-sm bg-app-bg border-app-border rounded-md shadow-sm text-app-text focus:border-app-accent focus:ring-app-accent"
                        >
                          <option value="">Select Supplier...</option>
                          {priceEntries.filter(p => p.itemType === 'fragrance' && (p.itemId === item.itemId || p.customItemName === item.itemId)).map(p => (
                            <option key={p.id} value={p.id}>
                              {p.supplierId || 'Unknown'} ({settings.currencySymbol} {p.priceTarget} / {p.quantity}{p.unit})
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  ) : category === 'equipment' ? (
                    <>
                      <select
                        value={item.itemId || ''}
                        onChange={(e) => updateItem(item.id, { itemId: e.target.value, priceEntryId: undefined, unitPrice: 0 })}
                        className="flex-1 min-w-[200px] text-sm bg-app-bg border-app-border rounded-md shadow-sm text-app-text focus:border-app-accent focus:ring-app-accent"
                      >
                        <option value="">Select Equipment...</option>
                        {equipments.map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.name}</option>
                        ))}
                      </select>
                      {item.itemId && (
                        <select
                          value={item.priceEntryId || ''}
                          onChange={(e) => {
                            const entryId = e.target.value;
                            const entry = priceEntries.find(p => p.id === entryId);
                            const pricePerUnit = entry && entry.pricingType === 'capacity' 
                              ? entry.priceTarget 
                              : (entry && entry.quantity > 0 ? entry.priceTarget / entry.quantity : 0);
                            updateItem(item.id, { priceEntryId: entryId, unitPrice: pricePerUnit });
                          }}
                          className="flex-1 min-w-[200px] text-sm bg-app-bg border-app-border rounded-md shadow-sm text-app-text focus:border-app-accent focus:ring-app-accent"
                        >
                          <option value="">Select Supplier...</option>
                          {priceEntries.filter(p => p.itemId === item.itemId && p.itemType === 'equipment').map(p => (
                            <option key={p.id} value={p.id}>
                              {p.supplierId || 'Unknown'} ({settings.currencySymbol} {p.priceTarget} / {p.quantity}{p.unit})
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  ) : category === 'shipment' ? (
                    <select
                      value={item.itemId || ''}
                      onChange={(e) => {
                        const optId = e.target.value;
                        const opt = shipmentOptions.find(o => o.id === optId);
                        updateItem(item.id, { itemId: optId, unitPrice: opt ? opt.price : 0 });
                      }}
                      className="flex-1 min-w-[200px] text-sm bg-app-bg border-app-border rounded-md shadow-sm text-app-text focus:border-app-accent focus:ring-app-accent"
                    >
                      <option value="">Select Shipment Option...</option>
                      {shipmentOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name} ({opt.rate})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Equipment name..."
                      value={item.customName || ''}
                      onChange={(e) => updateItem(item.id, { customName: e.target.value })}
                      className="flex-1 min-w-[200px] text-sm bg-app-bg border-app-border rounded-md shadow-sm text-app-text focus:border-app-accent focus:ring-app-accent"
                    />
                  )}
                </div>

                {/* Quantity & Price Row */}
                <div className="flex items-center gap-2 w-full justify-between border-t border-app-border pt-2 mt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-24">
                      <label className="block text-[10px] font-medium text-app-muted mb-0.5">
                        Qty ({category === 'raw_material' || category === 'fragrance_oil' || category === 'equipment' ? getUnitLabel(item) : 'units'})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity || 0}
                        onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) || 0 })}
                        className="w-full text-sm bg-app-bg border-app-border rounded-md shadow-sm text-app-text focus:border-app-accent focus:ring-app-accent"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-[10px] font-medium text-app-muted mb-0.5">Price / Unit</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice || 0}
                        onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) || 0 })}
                        disabled={!!item.priceEntryId || category === 'shipment'}
                        className="w-full text-sm bg-app-bg border-app-border rounded-md shadow-sm text-app-text focus:border-app-accent focus:ring-app-accent disabled:bg-app-bg/50 disabled:text-app-muted"
                      />
                    </div>
                    <div className="w-20">
                      <label className="block text-[10px] font-medium text-app-muted mb-0.5">Discount %</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercentage || 0}
                          onChange={(e) => updateItem(item.id, { discountPercentage: Number(e.target.value) || 0 })}
                          className="w-full text-sm bg-app-bg border-app-border rounded-md shadow-sm text-app-text focus:border-app-accent focus:ring-app-accent pr-6"
                        />
                        <Percent size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-app-muted" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <label className="block text-[10px] font-medium text-app-muted mb-0.5">Total</label>
                      <div className="text-sm font-semibold text-app-text">
                        {calculateItemTotal(item).toFixed(2)}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-md transition-colors mt-3"
                      title="Remove Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
          
          <button
            onClick={() => handleAddItem(category)}
            className="flex items-center gap-1.5 text-sm font-medium text-app-accent hover:text-app-accent-hover px-2 py-1 rounded-md hover:bg-app-accent/10 transition-colors"
          >
            <Plus size={16} />
            Add {title}
          </button>
        </div>
      </div>
    );
  };

  if (!activePlanId) {
    return (
      <>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-app-text flex items-center gap-2">
                <Receipt className="text-app-accent" />
                Budget Planner
              </h2>
              <p className="text-app-muted text-sm mt-1">Manage your budget plans and track estimated costs.</p>
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
                New Budget Plan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetPlans.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-app-card rounded-xl border border-dashed border-app-border">
                <Receipt className="mx-auto h-12 w-12 text-app-muted mb-3" />
                <h3 className="text-lg font-medium text-app-text">No budget plans yet</h3>
                <p className="text-app-muted text-sm mt-1 mb-4">Create your first budget plan to start estimating costs.</p>
                <button
                  onClick={handleCreatePlan}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-app-accent/10 text-app-accent rounded-lg hover:bg-app-accent/20 transition-colors font-medium"
                >
                  <Plus size={18} />
                  Create Plan
                </button>
              </div>
            ) : (
              budgetPlans.map(plan => (
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
                    <span className="text-sm text-app-muted">{plan.items.length} items</span>
                    <span className="font-bold text-app-accent text-lg">
                      {settings.currencySymbol} {calculateGrandTotal(plan).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {ConfirmModal}
        </div>
        <TutorialModal 
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
          title="Budget Planner Guide"
          steps={tutorialSteps}
        />
      </>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                className="text-xl md:text-2xl font-bold text-app-text bg-transparent border-none focus:ring-0 p-0 hover:bg-app-card rounded px-2 -ml-2"
              />
              <Edit2 size={16} className="text-app-muted" />
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
        
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTutorial(true)}
              className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/5 rounded-full transition-colors"
              title="How to use"
            >
              <HelpCircle size={22} />
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 md:px-4 py-2 bg-app-accent/10 text-app-accent rounded-lg hover:bg-app-accent/20 transition-colors font-medium text-xs md:text-sm flex items-center gap-2"
            >
              <Plus size={16} />
              Quick Import
            </button>
          </div>
          <div className="bg-app-card px-4 md:px-6 py-2 md:py-3 rounded-xl shadow-sm border border-app-border flex items-center gap-3 md:gap-4">
            <div className="text-[10px] md:text-sm text-app-muted font-medium leading-tight">Estimated<br className="md:hidden" /> Total</div>
            <div className="text-lg md:text-2xl font-bold text-app-accent">
              {settings.currencySymbol} {activePlan ? calculateGrandTotal(activePlan).toFixed(2) : '0.00'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {renderCategorySection('Raw Materials', 'raw_material', <FlaskConical size={18} />, 'text-emerald-500', 'bg-emerald-500/5 border-emerald-500/20')}
          {renderCategorySection('Fragrance Oils', 'fragrance_oil', <Package size={18} />, 'text-amber-500', 'bg-amber-500/5 border-amber-500/20')}
          {renderCategorySection('Equipment & Application', 'equipment', <Wrench size={18} />, 'text-blue-500', 'bg-blue-500/5 border-blue-500/20')}
          {renderCategorySection('Shipment & Logistics', 'shipment', <Truck size={18} />, 'text-purple-500', 'bg-purple-500/5 border-purple-500/20')}
        </div>
        
        <div className="space-y-6">
          {/* Shipment Options Manager */}
          <div className="bg-app-card rounded-xl shadow-sm border border-app-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="text-purple-500" size={20} />
              <h3 className="font-bold text-app-text">Shipment Options</h3>
            </div>
            
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
              {shipmentOptions.length === 0 ? (
                <p className="text-sm text-app-muted italic">No shipment options saved yet.</p>
              ) : (
                shipmentOptions.map(opt => (
                  <div key={opt.id} className="flex justify-between items-center p-2.5 bg-app-bg rounded-lg border border-app-border">
                    <div>
                      <div className="font-medium text-sm text-app-text">{opt.name}</div>
                      <div className="text-xs text-app-muted">{opt.rate}</div>
                    </div>
                    <div className="font-semibold text-sm text-app-text">
                      {settings.currencySymbol} {opt.price.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <button
              onClick={() => setShowShipmentModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-app-accent/10 text-app-accent hover:bg-app-accent/20 rounded-lg font-medium text-sm transition-colors"
            >
              <Plus size={16} />
              Add Shipment Info
            </button>
          </div>

          {/* Summary Card */}
          {activePlan && (
            <div className="bg-app-card rounded-xl shadow-sm border border-app-border p-5 sticky top-24">
              <h3 className="font-bold text-app-text mb-4 flex items-center gap-2">
                <DollarSign className="text-emerald-500" size={20} />
                Cost Breakdown
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-app-muted">
                  <span>Raw Materials</span>
                  <span>{settings.currencySymbol} {calculateCategoryTotal(activePlan, 'raw_material').toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-app-muted">
                  <span>Fragrance Oils</span>
                  <span>{settings.currencySymbol} {calculateCategoryTotal(activePlan, 'fragrance_oil').toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-app-muted">
                  <span>Equipment</span>
                  <span>{settings.currencySymbol} {calculateCategoryTotal(activePlan, 'equipment').toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-app-muted">
                  <span>Shipment</span>
                  <span>{settings.currencySymbol} {calculateCategoryTotal(activePlan, 'shipment').toFixed(2)}</span>
                </div>
                
                <div className="pt-3 mt-3 border-t border-app-border">
                  <div className="flex justify-between items-center font-bold text-lg text-app-text">
                    <span>Total Cost</span>
                    <div className="text-right">
                      <span className="text-app-accent font-black text-xl">{settings.currencySymbol} {calculateGrandTotal(activePlan).toFixed(2)}</span>
                      <p className="text-[10px] text-app-muted font-bold uppercase">Estimating in {settings.targetCurrency}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Shipment Modal */}
      {showShipmentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-card rounded-xl shadow-xl max-sm w-full p-6 border border-app-border">
            <h3 className="text-lg font-bold text-app-text mb-4">Add Shipment Option</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Shipment Name</label>
                <input
                  type="text"
                  placeholder="e.g., DHL Express"
                  value={newShipment.name || ''}
                  onChange={(e) => setNewShipment({ ...newShipment, name: e.target.value })}
                  className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Price ({targetCurrency})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newShipment.price || 0}
                    onChange={(e) => setNewShipment({ ...newShipment, price: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Rate Type</label>
                  <select
                    value={newShipment.rate || 'flat fee'}
                    onChange={(e) => setNewShipment({ ...newShipment, rate: e.target.value })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                  >
                    <option value="flat fee">Flat Fee</option>
                    <option value="per kg">Per kg</option>
                    <option value="per item">Per item</option>
                    <option value="per liter">Per liter</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowShipmentModal(false)}
                className="px-4 py-2 text-app-text bg-app-bg border border-app-border hover:bg-app-card rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddShipmentOption}
                disabled={!newShipment.name}
                className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover disabled:opacity-50 font-medium transition-colors shadow-sm"
              >
                Save Option
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-card rounded-xl shadow-xl w-full max-w-md p-6 border border-app-border">
            <h3 className="text-lg font-bold text-app-text mb-4">Quick Import</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Import Source</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setImportType('batch'); setSelectedImportId(''); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${importType === 'batch' ? 'bg-app-accent text-white border-app-accent' : 'bg-app-bg text-app-text border-app-border hover:bg-app-card'}`}
                  >
                    Blend Batch
                  </button>
                  <button
                    onClick={() => { setImportType('formula'); setSelectedImportId(''); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${importType === 'formula' ? 'bg-app-accent text-white border-app-accent' : 'bg-app-bg text-app-text border-app-border hover:bg-app-card'}`}
                  >
                    Formula / Accord
                  </button>
                </div>
              </div>

              {importType === 'batch' && (
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Select Batch</label>
                  <select
                    value={selectedImportId}
                    onChange={(e) => setSelectedImportId(e.target.value)}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                  >
                    <option value="">-- Select a Batch --</option>
                    {plannedBatches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.date})</option>
                    ))}
                  </select>
                </div>
              )}

              {importType === 'formula' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-app-text mb-1">Select Formula</label>
                    <select
                      value={selectedImportId}
                      onChange={(e) => setSelectedImportId(e.target.value)}
                      className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    >
                      <option value="">-- Select a Formula --</option>
                      {formulas.map(f => (
                        <option key={f.id} value={f.id}>{f.name} {f.type === 'accord' ? '(Accord)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-text mb-1">Target Amount (ml/g)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={importTargetAmount || 0}
                      onChange={(e) => setImportTargetAmount(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-app-text bg-app-bg border border-app-border hover:bg-app-card rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!selectedImportId}
                className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover disabled:opacity-50 font-medium transition-colors shadow-sm"
              >
                Import Items
              </button>
            </div>
          </div>
        </div>
      )}

      {ConfirmModal}

      <TutorialModal 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title="Budget Planner Guide"
        steps={tutorialSteps}
      />
    </div>
  );
}
