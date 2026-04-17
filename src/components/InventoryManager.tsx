import React, { useState, useMemo } from 'react';
import { Package, Plus, Search, ChevronRight, History, Trash2, Edit2, ArrowUpRight, ArrowDownLeft, Info, Box, X } from 'lucide-react';
import { InventoryItem, InventoryContainer, InventoryLog, RawMaterial, Equipment, Fragrance } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useConfirm } from '../hooks/useConfirm';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  setInventory: (inventory: InventoryItem[]) => void;
  rawMaterials: RawMaterial[];
  equipments: Equipment[];
  fragrances: Fragrance[];
}

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

export default function InventoryManager({ inventory, setInventory, rawMaterials, equipments, fragrances }: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  // Stock Update Modal State
  const [stockUpdateModal, setStockUpdateModal] = useState<{
    isOpen: boolean;
    itemId: string;
    containerId: string;
    delta: number;
    amount: string;
    note: string;
  }>({
    isOpen: false,
    itemId: '',
    containerId: '',
    delta: 1,
    amount: '',
    note: ''
  });

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || item.itemType === filterType;
      return matchesSearch && matchesType;
    });
  }, [inventory, searchTerm, filterType]);

  const handleAddItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as string;
    const itemId = formData.get('itemId') as string;
    const capacity = Number(formData.get('capacity'));
    const unit = formData.get('unit') as any;
    const amount = Number(formData.get('amount'));
    const label = formData.get('label') as string;

    let name = '';
    if (type === 'raw_material') name = rawMaterials.find(m => m.id === itemId)?.name || 'Unknown Material';
    if (type === 'equipment') name = equipments.find(e => e.id === itemId)?.name || 'Unknown Equipment';
    if (type === 'bottled_fragrance' || type === 'fragrance_oil' || type === 'bulk_fragrance') {
      name = fragrances.find(f => f.id === itemId)?.name || 'Unknown Fragrance';
    }

    const newLog: InventoryLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      action: 'add',
      amount: amount,
      unit: unit,
      note: 'Initial stock entry',
    };

    const newContainer: InventoryContainer = {
      id: `cont_${generateId()}`,
      capacity,
      unit,
      currentAmount: amount,
      logs: [newLog],
      label: label || `${capacity}${unit} Container`,
    };

    const existingItemIndex = inventory.findIndex(item => item.itemId === itemId && item.itemType === type);

    if (existingItemIndex > -1) {
      const updatedInventory = [...inventory];
      const item = updatedInventory[existingItemIndex];
      item.containers.push(newContainer);
      item.totalAmount = item.containers.reduce((sum, c) => sum + c.currentAmount, 0);
      setInventory(updatedInventory);
    } else {
      const newItem: InventoryItem = {
        id: `inv_${generateId()}`,
        itemId,
        itemType: type as any,
        name,
        containers: [newContainer],
        totalAmount: amount,
        unit,
      };
      setInventory([...inventory, newItem]);
    }

    setIsAddModalOpen(false);
  };

  const deleteInventoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirm('Delete Inventory Item', 'Are you sure you want to delete this entire inventory item? This will remove all containers and history.', () => {
      setInventory(inventory.filter(item => item.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
    }, 'Delete', 'danger');
  };

  const openStockUpdate = (itemId: string, containerId: string, delta: number) => {
    setStockUpdateModal({
      isOpen: true,
      itemId,
      containerId,
      delta,
      amount: '',
      note: delta > 0 ? 'Manual addition' : 'Manual removal'
    });
  };

  const handleStockUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { itemId, containerId, delta, amount, note } = stockUpdateModal;
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) return;

    const updatedInventory = inventory.map(item => {
      if (item.id === itemId) {
        const updatedContainers = item.containers.map(container => {
          if (container.id === containerId) {
            const newAmount = Math.max(0, container.currentAmount + (delta > 0 ? numAmount : -numAmount));
            const log: InventoryLog = {
              id: generateId(),
              timestamp: new Date().toISOString(),
              action: delta > 0 ? 'add' : 'remove',
              amount: numAmount,
              unit: container.unit,
              note: note || (delta > 0 ? 'Manual addition' : 'Manual removal'),
            };
            return {
              ...container,
              currentAmount: newAmount,
              logs: [log, ...container.logs],
            };
          }
          return container;
        });
        return {
          ...item,
          containers: updatedContainers,
          totalAmount: updatedContainers.reduce((sum, c) => sum + c.currentAmount, 0),
        };
      }
      return item;
    });
    setInventory(updatedInventory);
    
    // Update selected item if it's the one being modified
    if (selectedItem?.id === itemId) {
      setSelectedItem(updatedInventory.find(i => i.id === itemId) || null);
    }

    setStockUpdateModal(prev => ({ ...prev, isOpen: false }));
  };

  const deleteContainer = (itemId: string, containerId: string) => {
    confirm('Remove Container', 'Are you sure you want to remove this container from inventory?', () => {
      const updatedInventory = inventory.map(item => {
        if (item.id === itemId) {
          const updatedContainers = item.containers.filter(c => c.id !== containerId);
          return {
            ...item,
            containers: updatedContainers,
            totalAmount: updatedContainers.reduce((sum, c) => sum + c.currentAmount, 0),
          };
        }
        return item;
      }).filter(item => item.containers.length > 0);

      setInventory(updatedInventory);
      if (selectedItem?.id === itemId) {
        const stillExists = updatedInventory.find(i => i.id === itemId);
        setSelectedItem(stillExists || null);
      }
    }, 'Remove', 'danger');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-app-text flex items-center gap-2">
            <Package className="text-app-accent" />
            Inventory Manager
          </h2>
          <p className="text-app-muted text-sm">Track your materials, equipment, and finished products.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-app-accent text-white rounded-xl hover:bg-app-accent-hover transition-all shadow-lg shadow-app-accent/20 font-bold"
        >
          <Plus size={20} />
          Add Item
        </button>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" size={20} />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-app-card border border-app-border rounded-xl focus:ring-2 focus:ring-app-accent focus:border-app-accent outline-none transition-all"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-4 py-3 bg-app-card border border-app-border rounded-xl focus:ring-2 focus:ring-app-accent focus:border-app-accent outline-none transition-all text-app-text font-medium"
          >
            <option value="all">All Types</option>
            <option value="raw_material">Raw Materials</option>
            <option value="equipment">Equipment</option>
            <option value="fragrance_oil">Fragrance Oils</option>
            <option value="bulk_fragrance">Bulk Fragrance</option>
            <option value="blended_oil">Blended Oils</option>
            <option value="bottled_fragrance">Finished Products</option>
          </select>
        </div>
        <div className="bg-app-card px-6 py-3 rounded-xl border border-app-border flex items-center gap-3 min-w-[160px]">
          <Box className="text-app-accent" size={24} />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-app-muted leading-none mb-1">Total Items</p>
            <p className="text-xl font-bold text-app-text leading-none">{inventory.length}</p>
          </div>
        </div>
      </div>

      {/* Inventory List */}
      <div className="bg-app-card rounded-xl border border-app-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-app-border bg-app-bg/50">
                <th className="p-4 text-xs font-bold text-app-muted uppercase tracking-wider">Item Name</th>
                <th className="p-4 text-xs font-bold text-app-muted uppercase tracking-wider">Type</th>
                <th className="p-4 text-xs font-bold text-app-muted uppercase tracking-wider text-right">Total Stock</th>
                <th className="p-4 text-xs font-bold text-app-muted uppercase tracking-wider text-right">Containers</th>
                <th className="p-4 text-xs font-bold text-app-muted uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map(item => (
                <tr 
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="border-b border-app-border hover:bg-app-bg/50 cursor-pointer transition-colors group"
                >
                  <td className="p-4">
                    <span className="font-bold text-app-text group-hover:text-app-accent transition-colors">{item.name}</span>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md inline-block ${
                      item.itemType === 'raw_material' ? 'bg-blue-500/10 text-blue-500' :
                      item.itemType === 'equipment' ? 'bg-purple-500/10 text-purple-500' :
                      item.itemType === 'bulk_fragrance' ? 'bg-indigo-500/10 text-indigo-500' :
                      item.itemType === 'fragrance_oil' ? 'bg-pink-500/10 text-pink-500' :
                      item.itemType === 'blended_oil' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-green-500/10 text-green-500'
                    }`}>
                      {item.itemType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-bold text-app-text">{item.totalAmount}</span>
                    <span className="text-xs text-app-muted ml-1 uppercase">{item.unit}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-sm text-app-muted">{item.containers.length}</span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={(e) => deleteInventoryItem(item.id, e)}
                        className="p-2 text-app-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight className="text-app-muted group-hover:text-app-accent transition-all" size={18} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-app-muted">
                    No inventory items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence mode="wait">
        {selectedItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-app-card w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col border border-app-border shadow-2xl"
            >
              <div className="p-6 border-b border-app-border flex justify-between items-center bg-app-bg/50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-app-accent/10 text-app-accent rounded">
                      {selectedItem.itemType.replace('_', ' ')}
                    </span>
                    <h2 className="text-2xl font-bold text-app-text">{selectedItem.name}</h2>
                  </div>
                  <p className="text-sm text-app-muted">Manage individual containers and stock history.</p>
                </div>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="p-2 hover:bg-app-bg rounded-xl text-app-muted hover:text-app-text transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Containers Grid */}
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-app-muted mb-4 flex items-center gap-2">
                    <Box size={16} />
                    Storage Containers
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedItem.containers.map(container => (
                      <div key={container.id} className="bg-app-bg p-4 rounded-2xl border border-app-border space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-app-text">{container.label}</p>
                            <p className="text-xs text-app-muted">Capacity: {container.capacity}{container.unit}</p>
                          </div>
                          <button 
                            onClick={() => deleteContainer(selectedItem.id, container.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-app-muted">Current Fill</span>
                              <span className="text-app-text">{container.currentAmount} / {container.capacity} {container.unit}</span>
                            </div>
                            <div className="w-full bg-app-card h-2 rounded-full overflow-hidden border border-app-border">
                              <div 
                                className={`h-full transition-all duration-500 ${
                                  (container.currentAmount / container.capacity) < 0.2 ? 'bg-red-500' : 'bg-app-accent'
                                }`}
                                style={{ width: `${(container.currentAmount / container.capacity) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => openStockUpdate(selectedItem.id, container.id, 1)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-app-accent/10 text-app-accent rounded-xl font-bold text-xs hover:bg-app-accent hover:text-white transition-all"
                          >
                            <ArrowUpRight size={14} />
                            Add
                          </button>
                          <button
                            onClick={() => openStockUpdate(selectedItem.id, container.id, -1)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 text-red-500 rounded-xl font-bold text-xs hover:bg-red-500 hover:text-white transition-all"
                          >
                            <ArrowDownLeft size={14} />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* History Log */}
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-app-muted mb-4 flex items-center gap-2">
                    <History size={16} />
                    Stock History
                  </h3>
                  <div className="space-y-2">
                    {selectedItem.containers.flatMap(c => c.logs.map(l => ({ ...l, containerLabel: c.label })))
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map(log => (
                        <div key={log.id} className="flex items-center justify-between p-3 bg-app-bg rounded-xl border border-app-border text-sm">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              log.action === 'add' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                              {log.action === 'add' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                            </div>
                            <div>
                              <p className="font-bold text-app-text">{log.note}</p>
                              <p className="text-[10px] text-app-muted uppercase font-bold">
                                {new Date(log.timestamp).toLocaleString()} • {log.containerLabel}
                              </p>
                            </div>
                          </div>
                          <p className={`font-black ${log.action === 'add' ? 'text-green-500' : 'text-red-500'}`}>
                            {log.action === 'add' ? '+' : '-'}{log.amount} {log.unit}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-card w-full max-w-md rounded-3xl p-6 border border-app-border shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-app-text">Add to Inventory</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-app-muted hover:text-app-text">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-app-muted mb-1">Item Type</label>
                <select name="type" required className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl text-app-text outline-none focus:ring-2 focus:ring-app-accent">
                  <option value="raw_material">Raw Material</option>
                  <option value="equipment">Equipment / Bottle</option>
                  <option value="fragrance_oil">Fragrance Oil</option>
                  <option value="bulk_fragrance">Bulk Fragrance</option>
                  <option value="bottled_fragrance">Finished Fragrance</option>
                  <option value="blended_oil">Blended Oil</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-app-muted mb-1">Select Item</label>
                <select name="itemId" required className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl text-app-text outline-none focus:ring-2 focus:ring-app-accent">
                  <optgroup label="Raw Materials">
                    {rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </optgroup>
                  <optgroup label="Equipment">
                    {equipments.map(e => <option key={e.id} value={e.id}>{e.name} ({e.size})</option>)}
                  </optgroup>
                  <optgroup label="Fragrances">
                    {fragrances.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-app-muted mb-1">Container Capacity</label>
                  <input type="number" name="capacity" required step="0.01" className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl text-app-text outline-none focus:ring-2 focus:ring-app-accent" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-app-muted mb-1">Unit</label>
                  <select name="unit" required className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl text-app-text outline-none focus:ring-2 focus:ring-app-accent">
                    <option value="ml">ml</option>
                    <option value="g">g</option>
                    <option value="unit">unit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-app-muted mb-1">Initial Stock Level</label>
                <input type="number" name="amount" required step="0.01" className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl text-app-text outline-none focus:ring-2 focus:ring-app-accent" />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-app-muted mb-1">Container Label (Optional)</label>
                <input type="text" name="label" placeholder="e.g. Main Stock, Small Vial A" className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl text-app-text outline-none focus:ring-2 focus:ring-app-accent" />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-app-accent text-white rounded-xl font-bold hover:bg-app-accent-hover transition-all shadow-lg shadow-app-accent/20 mt-4"
              >
                Add to Inventory
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {stockUpdateModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-app-card w-full max-w-md rounded-3xl p-6 border border-app-border shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-app-text">
                {stockUpdateModal.delta > 0 ? 'Add Stock' : 'Remove Stock'}
              </h2>
              <button 
                onClick={() => setStockUpdateModal(prev => ({ ...prev, isOpen: false }))} 
                className="text-app-muted hover:text-app-text"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleStockUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-app-muted mb-1">Amount</label>
                <input 
                  type="number" 
                  required 
                  step="0.01" 
                  min="0.01"
                  value={stockUpdateModal.amount}
                  onChange={e => setStockUpdateModal(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl text-app-text outline-none focus:ring-2 focus:ring-app-accent" 
                  placeholder="Enter amount..."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-app-muted mb-1">Note</label>
                <textarea 
                  value={stockUpdateModal.note}
                  onChange={e => setStockUpdateModal(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl text-app-text outline-none focus:ring-2 focus:ring-app-accent h-24 resize-none" 
                  placeholder="Enter a note for this update..."
                />
              </div>

              <button
                type="submit"
                className={`w-full py-3 text-white rounded-xl font-bold transition-all shadow-lg mt-4 ${
                  stockUpdateModal.delta > 0 
                    ? 'bg-app-accent hover:bg-app-accent-hover shadow-app-accent/20' 
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                }`}
              >
                {stockUpdateModal.delta > 0 ? 'Add to Stock' : 'Remove from Stock'}
              </button>
            </form>
          </div>
        </div>
      )}

      {ConfirmModal}
    </motion.div>
  );
}


