import React, { useState, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Receipt, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  User, 
  Calendar, 
  DollarSign, 
  Tag, 
  Package, 
  ArrowRight,
  Save,
  X,
  PlusCircle,
  AlertCircle,
  Table as TableIcon,
  CheckCircle2,
  LayoutGrid,
  History,
  Download,
  Upload,
  Ban,
  UserCheck
} from 'lucide-react';
import { 
  ShopItem, 
  SaleOrder, 
  InventoryItem, 
  Agent, 
  CustomerContact,
  OrderItem,
  InventoryLog,
  OrderBatch,
  AppSettings
} from '../types';

import { useConfirm } from '../hooks/useConfirm';
import { Capacitor } from '@capacitor/core';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface SellTrackerProps {
  shopItems: ShopItem[];
  setShopItems: (items: ShopItem[]) => void;
  saleOrders: SaleOrder[];
  setSaleOrders: (orders: SaleOrder[]) => void;
  orderBatches: OrderBatch[];
  setOrderBatches: (batches: OrderBatch[]) => void;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
  customers: CustomerContact[];
  setCustomers: (customers: CustomerContact[]) => void;
  settings: AppSettings;
}

export default function SellTracker({
  shopItems,
  setShopItems,
  saleOrders,
  setSaleOrders,
  orderBatches,
  setOrderBatches,
  inventory,
  setInventory,
  agents,
  setAgents,
  customers,
  setCustomers,
  settings
}: SellTrackerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'shop' | 'records'>('shop');
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<ShopItem> | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Partial<SaleOrder> | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [isEditingBatch, setIsEditingBatch] = useState(false);
  const [editingBatchData, setEditingBatchData] = useState<Partial<OrderBatch> | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [agentExportFileName, setAgentExportFileName] = useState('');
  const [exportSelection, setExportSelection] = useState({
    shopItems: true,
    stock: true
  });
  
  const { confirm, ConfirmModal } = useConfirm();
  const [suppressStatusPrompt, setSuppressStatusPrompt] = useState(false);
  const [statusConfirmState, setStatusConfirmState] = useState<{
    isOpen: boolean;
    orderId: string;
    newStatus: string;
    oldStatus: string;
  }>({
    isOpen: false,
    orderId: '',
    newStatus: '',
    oldStatus: ''
  });

  // --- Item Shop Logic ---
  const bottledFragrances = useMemo(() => 
    inventory.filter(item => item.itemType === 'bottled_fragrance'),
    [inventory]
  );

  const shopItemsByCategory = useMemo(() => {
    const groups: Record<string, ShopItem[]> = {};
    shopItems.forEach(item => {
      if (!groups[item.name]) groups[item.name] = [];
      groups[item.name].push(item);
    });
    return groups;
  }, [shopItems]);

  const handleSaveItem = () => {
    if (!editingItem?.inventoryItemId || !editingItem?.price || !editingItem?.name) return;
    
    const itemToSave: ShopItem = {
      id: editingItem.id || crypto.randomUUID(),
      inventoryItemId: editingItem.inventoryItemId as string,
      name: editingItem.name as string,
      price: Number(editingItem.price),
      capacityMl: Number(editingItem.capacityMl),
      description: editingItem.description || ''
    };

    if (editingItem.id) {
      setShopItems(shopItems.map(it => it.id === editingItem.id ? itemToSave : it));
    } else {
      setShopItems([...shopItems, itemToSave]);
    }
    setIsEditingItem(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    confirm('Remove Item', 'Are you sure you want to remove this item from the shop? This will not affect your inventory.', () => {
      setShopItems(shopItems.filter(it => it.id !== id));
    }, 'Remove', 'danger');
  };

  // --- Sells Records Logic ---
  const calculateOrderTotals = useCallback((order: Partial<SaleOrder> | null) => {
    if (!order || !order.items) return { subtotal: 0, orderDiscount: 0, total: 0, commissionAmount: 0 };
    
    let subtotal = 0;
    order.items.forEach(i => {
       const lineTotal = i.quantity * i.priceAtSale;
       let lineDisc = 0;
       if (i.discountValue) {
           lineDisc = i.discountType === 'percentage' ? (lineTotal * i.discountValue / 100) : i.discountValue;
       }
       subtotal += Math.max(0, lineTotal - lineDisc);
    });

    let orderDiscount = 0;
    if (order.discountValue) {
        orderDiscount = order.discountType === 'percentage' 
            ? (subtotal * order.discountValue / 100) 
            : order.discountValue;
    }
    
    const subtotalAfterDiscount = Math.max(0, subtotal - orderDiscount);
    const finalTotal = subtotalAfterDiscount + (order.postage || 0);

    let commissionAmount = 0;
    if (order.agentId && order.commissionValue) {
       commissionAmount = order.commissionType === 'percentage'
          ? (subtotalAfterDiscount * order.commissionValue / 100)
          : order.commissionValue;
    }

    return { subtotal, orderDiscount, total: finalTotal, commissionAmount };
  }, [settings.currencySymbol]);

  const financialSummary = useMemo(() => {
    let totalSells = 0;
    let totalCommission = 0;

    saleOrders.forEach(order => {
      if (order.status !== 'cancelled') {
        const { total, commissionAmount } = calculateOrderTotals(order);
        totalSells += total;
        totalCommission += commissionAmount;
      }
    });

    return { totalSells, totalCommission };
  }, [saleOrders, calculateOrderTotals]);

  const handleCreateOrder = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const prefix = `${day}${month}${year}`;

    const todaysOrders = saleOrders.filter(o => o.orderNumber?.startsWith(prefix));
    const nextNum = todaysOrders.length + 1;
    
    // Data Inheritance Fix: Get latest sale order for inheritance
    const latestOrder = saleOrders.length > 0 ? saleOrders[0] : null;

    setEditingOrder({
      id: crypto.randomUUID(),
      orderNumber: `${prefix}${nextNum}`,
      date: today.toISOString().split('T')[0],
      items: [],
      totalAmount: 0,
      status: 'completed',
      discountValue: 0,
      discountType: 'fixed',
      paymentMethod: 'QR',
      agentId: latestOrder?.agentId,
      commissionValue: latestOrder?.commissionValue,
      commissionType: latestOrder?.commissionType || 'percentage'
    });
    setIsCreatingOrder(true);
  };

  const handleDeleteOrder = (id: string) => {
    confirm('Delete Record', 'Are you sure you want to delete this order? This action cannot be undone.', () => {
      setSaleOrders(saleOrders.filter(o => o.id !== id));
    }, 'Delete', 'danger');
  };

  const handleExportOrder = (order: SaleOrder) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(order, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `Order_${order.orderNumber}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const receiptRef = React.useRef<HTMLDivElement>(null);

  const handleExportReceiptPDF = async () => {
    if (!receiptRef.current || !editingOrder) return;
    
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const fileName = `Receipt_${editingOrder.orderNumber}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const base64Data = pdf.output('datauristring').split(',')[1];
        import('@capacitor/filesystem').then(({ Filesystem, Directory }) => {
          Filesystem.writeFile({
            path: `Fragrance Planner/${fileName}`,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true
          }).then(() => {
            alert(`Receipt exported to Documents/Fragrance Planner/${fileName}`);
          }).catch((e) => {
            console.error('Export fail', e);
            alert('Failed to save PDF.');
          });
        });
      } else {
        pdf.save(fileName);
      }
    } catch (e) {
      console.error('PDF Generation Failed', e);
    }
  };

  const handleImportOrder = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          
          if (imported.type === 'fgs_agent_data') {
             let message = 'Agent data imported successfully!\n';
             if (imported.shopItems) {
                setShopItems(imported.shopItems);
                message += '- Item Shop Data updated\n';
             }
             if (imported.inventory) {
                const newInventory = [...inventory];
                imported.inventory.forEach((importedInv: any) => {
                   const existingIdx = newInventory.findIndex(i => i.id === importedInv.id);
                   if (existingIdx > -1) {
                      newInventory[existingIdx] = importedInv;
                   } else {
                      newInventory.push(importedInv);
                   }
                });
                setInventory(newInventory);
                message += '- Stock Inventory updated\n';
             }
             alert(message);
          } else if (imported.type === 'fgs_backup' && imported.orders && Array.isArray(imported.orders)) {
             const newBatchId = crypto.randomUUID();
             const newBatch = { 
               ...(imported.batch || {}), 
               id: newBatchId, 
               name: imported.batch ? `${imported.batch.name} (Imported)` : 'Imported Records',
               date: imported.batch?.date || new Date().toISOString().split('T')[0],
               orderIds: [] as string[]
             };
             const mappedOrders = imported.orders.map((o: any) => ({ ...o, id: crypto.randomUUID(), batchId: newBatchId }));
             newBatch.orderIds = mappedOrders.map((o: any) => o.id);
             
             setOrderBatches([newBatch, ...orderBatches]);
             setSaleOrders([...mappedOrders, ...saleOrders]);
             mappedOrders.forEach((mo: any) => updateInventoryForSale(mo));
             alert('Records imported successfully!');
          } else if (imported && imported.date && imported.orderNumber) {
             // Legacy single order
             const newBatchId = crypto.randomUUID();
             const newBatch = { id: newBatchId, name: `Imported_${imported.orderNumber}`, date: new Date().toISOString().split('T')[0], orderIds: [] };
             const newOrder = { ...imported, id: crypto.randomUUID(), batchId: newBatchId } as SaleOrder;
             newBatch.orderIds = [newOrder.id];
             
             setOrderBatches([newBatch, ...orderBatches]);
             setSaleOrders([newOrder, ...saleOrders]);
             updateInventoryForSale(newOrder); 
             alert('Record imported successfully!');
          } else {
             alert('Invalid file structure.');
          }
        } catch (err) {
          console.error("Failed to parse order", err);
          alert("Invalid order file (must be valid .fgs data).");
        }
      };
      reader.readAsText(file);
    }
    // Reset file input
    if (event.target) event.target.value = '';
  };

  const [batchExportModalOpen, setBatchExportModalOpen] = useState(false);
  const [batchExportFileName, setBatchExportFileName] = useState('');
  const [batchExportTargetId, setBatchExportTargetId] = useState<string | null>(null);

  const confirmExportBatch = async () => {
     if (!batchExportTargetId) return;
     const batchId = batchExportTargetId;
     
     let batchToExport;
     let ordersToExport: SaleOrder[] = [];
     if (batchId === 'legacy') {
        const legacyOrders = saleOrders.filter(o => !o.batchId);
        batchToExport = { id: crypto.randomUUID(), name: 'Legacy Data', date: new Date().toISOString().split('T')[0], orderIds: legacyOrders.map(o => o.id) };
        ordersToExport = legacyOrders;
     } else {
        batchToExport = orderBatches.find(b => b.id === batchId);
        if (!batchToExport) return;
        ordersToExport = saleOrders.filter(o => batchToExport?.orderIds.includes(o.id) || o.batchId === batchId);
     }

     const exportData = {
        type: 'fgs_backup',
        batch: batchToExport,
        orders: ordersToExport
     };
     const jsonString = JSON.stringify(exportData, null, 2);
     
     if (!batchExportFileName) return;
     const fileName = batchExportFileName.endsWith('.fgs') ? batchExportFileName : `${batchExportFileName}.fgs`;

     setBatchExportModalOpen(false);

     if (Capacitor.isNativePlatform()) {
        try {
           const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
           const { Share } = await import('@capacitor/share');
           
           const result = await Filesystem.writeFile({
              path: `Fragrance Planner/${fileName}`,
              data: jsonString,
              directory: Directory.Documents,
              encoding: Encoding.UTF8,
              recursive: true
           });

           if (window.confirm(`File saved: Documents/Fragrance Planner/${fileName}\n\nWould you like to share this file?`)) {
              await Share.share({
                 title: 'Share .fgs backup',
                 text: 'Fragrance Planner Sell Tracker Backup',
                 url: result.uri,
                 dialogTitle: 'Share File'
              });
           }
        } catch (e) {
           console.error('Export fail', e);
           alert('Failed to export. Please check permissions.');
        }
     } else {
        const file = new File([jsonString], fileName, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
           try {
              await navigator.share({
                 files: [file],
                 title: 'Share .fgs backup',
                 text: 'Fragrance Planner Sell Tracker Backup'
              });
           } catch (e) {
              downloadFileWeb(jsonString, fileName);
           }
        } else {
           downloadFileWeb(jsonString, fileName);
        }
     }
  };

  const handleExportBatch = (batchId: string) => {
     let batchName = 'Legacy Data';
     if (batchId !== 'legacy') {
        const batch = orderBatches.find(b => b.id === batchId);
        if (batch) batchName = batch.name;
     }
     const defaultName = `Batch_${batchName.replace(/\s+/g, '_')}`;
     setBatchExportFileName(defaultName);
     setBatchExportTargetId(batchId);
     setBatchExportModalOpen(true);
  };

  const downloadFileWeb = (content: string, fileName: string) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(content);
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const handleSaveBatch = () => {
    if (!editingBatchData?.name) return;
    
    if (editingBatchData.id) {
      setOrderBatches(orderBatches.map(b => b.id === editingBatchData.id ? { ...b, name: editingBatchData.name as string, date: editingBatchData.date || b.date } : b));
    } else {
      const newBatch: OrderBatch = {
        id: crypto.randomUUID(),
        name: editingBatchData.name,
        date: editingBatchData.date || new Date().toISOString().split('T')[0],
        orderIds: []
      };
      setOrderBatches([newBatch, ...orderBatches]);
      setActiveBatchId(newBatch.id);
    }
    setIsEditingBatch(false);
    setEditingBatchData(null);
  };

  const handleCreateEntry = () => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    const prefix = `${d}${m}${y}`;
    const todaysCount = orderBatches.filter(b => b.name === `${prefix}${b.name.replace(prefix, '')}`).length;

    setEditingBatchData({
      name: `${prefix}${todaysCount + 1}`,
      date: new Date().toISOString().split('T')[0]
    });
    setIsEditingBatch(true);
  };

  const handleDeleteBatch = (batchId: string) => {
    confirm('Delete Entry', 'Are you sure you want to delete this entry and all its associated records?', () => {
      if (batchId === 'legacy') {
        setSaleOrders(saleOrders.filter(o => o.batchId));
      } else {
        setOrderBatches(orderBatches.filter(b => b.id !== batchId));
        setSaleOrders(saleOrders.filter(o => o.batchId !== batchId));
      }
      if (activeBatchId === batchId) setActiveBatchId(null);
    }, 'Delete Entry', 'danger');
  };

  const updateInventoryForSale = (order: SaleOrder) => {
    setInventory((prevInventory: InventoryItem[]) => {
      const newInventory = [...prevInventory];
      order.items.forEach(item => {
        const shopItem = shopItems.find(si => si.id === item.shopItemId);
        if (!shopItem) return;

        const invItemIndex = newInventory.findIndex(ii => ii.id === shopItem.inventoryItemId);
        if (invItemIndex === -1) return;

        const invItem = { ...newInventory[invItemIndex] };
        let remainingToDeduct = item.quantity;
        const newContainers = invItem.containers.map(c => {
          if (remainingToDeduct <= 0) return c;
          const deduct = Math.min(c.currentAmount, remainingToDeduct);
          remainingToDeduct -= deduct;
          
          const newLogs: InventoryLog[] = [
            ...c.logs,
            {
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              action: 'sale',
              amount: -deduct,
              unit: 'unit',
              note: `Sale Order ${order.orderNumber}`,
              referenceId: order.id
            }
          ];

          return {
            ...c,
            currentAmount: c.currentAmount - deduct,
            logs: newLogs
          };
        });

        invItem.containers = newContainers;
        invItem.totalAmount = newContainers.reduce((sum, c) => sum + c.currentAmount, 0);
        newInventory[invItemIndex] = invItem;
      });
      return newInventory;
    });
  };

  const restoreInventoryForCancelledSale = (order: SaleOrder) => {
    setInventory((prevInventory: InventoryItem[]) => {
      const newInventory = [...prevInventory];
      let inventoryModified = false;

      order.items.forEach(item => {
        const shopItem = shopItems.find(si => si.id === item.shopItemId);
        if (!shopItem) return;

        const invItemIndex = newInventory.findIndex(ii => ii.id === shopItem.inventoryItemId);
        if (invItemIndex === -1) return;

        const invItem = { ...newInventory[invItemIndex] };
        if (invItem.containers.length > 0) {
          const targetContainer = { ...invItem.containers[0] };
          
          const newLogs: InventoryLog[] = [
            ...targetContainer.logs,
            {
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              action: 'manual',
              amount: item.quantity,
              unit: 'unit',
              note: `Cancelled Order Return: ${order.orderNumber || ''}`,
              referenceId: order.id
            }
          ];

          targetContainer.currentAmount += item.quantity;
          targetContainer.logs = newLogs;

          invItem.containers = [targetContainer, ...invItem.containers.slice(1)];
          invItem.totalAmount += item.quantity;
          newInventory[invItemIndex] = invItem;
          inventoryModified = true;
        }
      });

      return inventoryModified ? newInventory : prevInventory;
    });
  };

  const promptChangeOrderStatus = (orderId: string, oldStatus: string, newStatus: string) => {
    if (newStatus === oldStatus) return;
    if (suppressStatusPrompt) {
      applyChangeOrderStatus(orderId, newStatus as any);
      return;
    }
    setStatusConfirmState({ isOpen: true, orderId, oldStatus, newStatus });
  };

  const applyChangeOrderStatus = (orderId: string, newStatus: 'pending' | 'completed' | 'cancelled') => {
    const order = saleOrders.find(o => o.id === orderId);
    if (!order) return;
    
    if (newStatus === 'cancelled' && order.status !== 'cancelled') {
        restoreInventoryForCancelledSale(order);
    } else if (order.status === 'cancelled' && newStatus !== 'cancelled') {
        updateInventoryForSale(order);
    }

    setSaleOrders(saleOrders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const handleSaveOrder = () => {
    if (!editingOrder || !editingOrder.items || editingOrder.items.length === 0) return;
    
    const { total } = calculateOrderTotals(editingOrder);

    const orderToSave = { ...editingOrder, totalAmount: total, batchId: activeBatchId !== 'legacy' ? activeBatchId || undefined : undefined } as SaleOrder;
    
    if (saleOrders.find(o => o.id === orderToSave.id)) {
      const oldOrder = saleOrders.find(o => o.id === orderToSave.id);
      setSaleOrders(saleOrders.map(o => o.id === orderToSave.id ? orderToSave : o));
      
      if (oldOrder?.status !== 'cancelled' && orderToSave.status === 'cancelled') {
        restoreInventoryForCancelledSale(orderToSave);
      }
    } else {
      setSaleOrders([orderToSave, ...saleOrders]);
      updateInventoryForSale(orderToSave);

      if (activeBatchId && activeBatchId !== 'legacy') {
        setOrderBatches(orderBatches.map(b => b.id === activeBatchId ? { ...b, orderIds: [...b.orderIds, orderToSave.id] } : b));
      }
    }
    
    setIsCreatingOrder(false);
    setEditingOrder(null);
  };

  const addCustomerFromOrder = (name: string) => {
    const newContact: CustomerContact = {
      id: crypto.randomUUID(),
      name,
      styles: [],
      telephoneNumber: '',
      email: '',
      location: '',
      bankAccountNumber: '',
      createdAt: new Date().toISOString()
    };
    setCustomers([...customers, newContact]);
      setEditingOrder(prev => prev ? { ...prev, customerId: newContact.id, customCustomerName: undefined } : prev);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {ConfirmModal}
      
      {/* Custom Status Confirm Modal */}
      {statusConfirmState.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-app-card rounded-xl shadow-xl w-full max-w-sm border border-app-border overflow-hidden">
            <div className="p-4 border-b border-app-border flex justify-between items-center">
              <h3 className="font-bold text-app-text">Change Order Status</h3>
              <button onClick={() => setStatusConfirmState({ ...statusConfirmState, isOpen: false })} className="text-app-muted hover:text-app-text transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 text-app-text text-sm">
              <p className="mb-4">Are you sure you want to change the status to <span className="font-bold capitalize text-app-accent">{statusConfirmState.newStatus}</span>?</p>
              
              <label className="flex items-center gap-2 cursor-pointer mt-4 p-2 bg-app-bg rounded-lg border border-app-border">
                <input 
                  type="checkbox" 
                  checked={suppressStatusPrompt}
                  onChange={(e) => setSuppressStatusPrompt(e.target.checked)}
                  className="rounded border-app-border text-app-accent focus:ring-app-accent"
                />
                <span className="text-xs text-app-muted font-medium">Don't show this again until restart</span>
              </label>
            </div>
            <div className="p-4 border-t border-app-border flex justify-end gap-3 bg-app-bg">
              <button 
                onClick={() => setStatusConfirmState({ ...statusConfirmState, isOpen: false })} 
                className="px-4 py-2 text-sm font-medium text-app-text bg-app-card border border-app-border rounded-md hover:bg-app-bg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => { 
                  applyChangeOrderStatus(statusConfirmState.orderId, statusConfirmState.newStatus as any);
                  setStatusConfirmState({ ...statusConfirmState, isOpen: false }); 
                }} 
                className="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors shadow-sm bg-app-accent hover:bg-app-accent-hover"
              >
                Confirm Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-app-text tracking-tight flex items-center gap-3">
            <TrendingUp size={32} className="text-emerald-500" />
            Sell Tracker
          </h1>
          <p className="text-app-muted font-medium mt-1">Manage your shop items and track sales performance.</p>
        </div>
        
        <div className="flex bg-app-card p-1 rounded-xl border border-app-border shadow-sm">
          <button
            onClick={() => setActiveSubTab('shop')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeSubTab === 'shop' 
                ? 'bg-app-accent text-white shadow-md' 
                : 'text-app-muted hover:text-app-text hover:bg-app-bg'
            }`}
          >
            <ShoppingBag size={18} />
            Item Shop
          </button>
          <button
            onClick={() => setActiveSubTab('records')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeSubTab === 'records' 
                ? 'bg-app-accent text-white shadow-md' 
                : 'text-app-muted hover:text-app-text hover:bg-app-bg'
            }`}
          >
            <Receipt size={18} />
            Sells Records
          </button>
        </div>
      </div>

      {activeSubTab === 'shop' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-app-card p-4 rounded-xl border border-app-border">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" size={18} />
              <input 
                type="text" 
                placeholder="Search shop items..." 
                className="w-full pl-10 pr-4 py-2 bg-app-bg border border-app-border rounded-lg text-sm focus:ring-2 focus:ring-app-accent outline-none"
              />
            </div>
            <button
              onClick={() => {
                setEditingItem({ id: undefined, name: '', price: 0, description: '' });
                setIsEditingItem(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all font-bold shadow-lg shadow-emerald-500/20"
            >
              <PlusCircle size={20} />
              Add Item
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {Object.entries(shopItemsByCategory).map(([groupName, items]) => {
              const typedItems = items as ShopItem[];
              return (
              <div key={groupName} className="bg-app-card rounded-2xl border border-app-border overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-app-bg/50 border-b border-app-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-app-accent/10 flex items-center justify-center text-app-accent">
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-app-text">{groupName}</h3>
                      <p className="text-xs text-app-muted font-bold uppercase tracking-wider">{typedItems.length} Variations</p>
                    </div>
                  </div>
                </div>
                
                <div className="divide-y divide-app-border">
                  {typedItems.map(item => {
                    const currentStock = inventory.find(inv => inv.id === item.inventoryItemId)?.totalAmount || 0;
                    const stockStatus = currentStock === 0 ? 'out' : currentStock <= 5 ? 'low' : 'ok';
                    
                    return (
                    <div key={item.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-app-accent/5 transition-colors relative overflow-hidden group">
                      {stockStatus === 'out' && (
                        <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden pointer-events-none">
                          <div className="absolute top-4 -right-8 w-32 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest text-center py-1 rotate-45 shadow-lg">
                            Out of Stock
                          </div>
                        </div>
                      )}
                      {stockStatus === 'low' && (
                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-2xl"></div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-app-bg border border-app-border rounded-lg text-sm font-black text-app-text">
                          {item.capacityMl}ml
                        </div>
                        <div>
                          <p className="text-app-text font-bold text-lg">{settings.currencySymbol}{item.price}</p>
                          <p className="text-xs text-app-muted mt-0.5 line-clamp-1">{item.description || 'No description'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                         <div className="flex flex-col items-end mr-4">
                           <span className="text-[10px] font-black uppercase text-app-muted">Stock</span>
                           <div className="flex items-center gap-1">
                             <span className={`text-sm font-bold ${stockStatus === 'out' ? 'text-red-500' : stockStatus === 'low' ? 'text-amber-500' : 'text-app-text'}`}>
                               {currentStock}
                             </span>
                             <span className="text-[10px] font-bold text-app-muted uppercase">Units</span>
                           </div>
                           {stockStatus === 'low' && (
                             <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                               <AlertCircle size={10} /> Low Stock Warning
                             </span>
                           )}
                         </div>
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setIsEditingItem(true);
                          }}
                          className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/10 rounded-lg transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 text-app-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                 })}
                </div>
              </div>
            );
        })}
        </div>
      </div>
      ) : activeSubTab === 'records' ? (
        <div className="space-y-6">
          {/* Global Records Summary */}
          {!activeBatchId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm flex items-center gap-4">
                  <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                     <TrendingUp size={32} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase text-app-muted tracking-[0.2em] mb-1">Cumulative Sales</p>
                     <p className="text-3xl font-black text-app-text">{settings.currencySymbol}{financialSummary.totalSells.toFixed(2)}</p>
                  </div>
               </div>
               <div className="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm flex items-center gap-4">
                  <div className="p-4 bg-purple-500/10 text-purple-500 rounded-2xl">
                     <UserCheck size={32} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase text-app-muted tracking-[0.2em] mb-1">Total Commissions</p>
                     <p className="text-3xl font-black text-app-text">{settings.currencySymbol}{financialSummary.totalCommission.toFixed(2)}</p>
                  </div>
               </div>
            </div>
          )}

          {activeBatchId ? (
            <div className="space-y-6">
               {(() => {
                 const entryOrders = saleOrders.filter(o => activeBatchId === 'legacy' ? !o.batchId : o.batchId === activeBatchId);
                 let entrySells = 0;
                 let entryCommission = 0;
                 
                 entryOrders.forEach(o => {
                   if (o.status !== 'cancelled') {
                     const { total, commissionAmount } = calculateOrderTotals(o);
                     entrySells += total;
                     entryCommission += commissionAmount;
                   }
                 });

                 return (
                   <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-4 bg-app-card p-4 rounded-xl border border-app-border">
                         <button onClick={() => setActiveBatchId(null)} className="p-2 text-app-muted hover:text-app-text bg-app-bg hover:bg-app-accent/10 rounded-lg transition-colors">
                            <ArrowRight size={20} className="rotate-180" />
                         </button>
                         <h2 className="text-xl font-black text-app-text">
                            {activeBatchId === 'legacy' ? 'Legacy Records' : orderBatches.find(b => b.id === activeBatchId)?.name || 'Entry Details'}
                         </h2>
                         <div className="ml-auto flex items-center gap-2">
                            <button
                               onClick={handleCreateOrder}
                               className="flex items-center gap-2 px-6 py-2 bg-app-accent text-white rounded-xl hover:bg-app-accent-hover transition-all font-bold shadow-lg shadow-app-accent/20"
                            >
                               <Plus size={18} /> Add Record
                            </button>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="bg-app-card border border-app-border rounded-2xl p-4 shadow-sm flex items-center gap-3">
                           <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                              <TrendingUp size={20} />
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase text-app-muted tracking-[0.2em]">Entry Sells</p>
                              <p className="text-lg font-black text-app-text">{settings.currencySymbol}{entrySells.toFixed(2)}</p>
                           </div>
                        </div>
                        <div className="bg-app-card border border-app-border rounded-2xl p-4 shadow-sm flex items-center gap-3">
                           <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                              <UserCheck size={20} />
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase text-app-muted tracking-[0.2em]">Entry Commission</p>
                              <p className="text-lg font-black text-app-text">{settings.currencySymbol}{entryCommission.toFixed(2)}</p>
                           </div>
                        </div>
                      </div>
                   </div>
                 )
               })()}

               <div className="bg-app-card rounded-2xl border border-app-border overflow-x-auto shadow-sm">
                  <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
                     <thead>
                       <tr className="bg-app-bg border-b border-app-border text-[10px] font-black uppercase tracking-widest text-app-muted">
                          <th className="px-4 py-4 text-center w-12">#</th>
                           <th className="px-6 py-4">Order Record</th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Buyer</th>
                          <th className="px-6 py-4">Agent</th>
                          <th className="px-6 py-4 text-center">Items</th>
                          <th className="px-6 py-4 text-center text-purple-500">Commission</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-right">Total</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-app-border font-medium text-sm text-app-text">
                       {saleOrders.filter(o => activeBatchId === 'legacy' ? !o.batchId : o.batchId === activeBatchId).map((order, index) => (
                          <tr key={order.id} className={`hover:bg-app-accent/5 transition-colors group ${order.status === 'cancelled' ? 'opacity-50' : ''}`}>
                              <td className="px-4 py-4 text-center font-black text-app-muted">{index + 1}</td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded-md tracking-wider">
                                   {order.orderName || order.orderNumber}
                                </span>
                             </td>
                             <td className="px-6 py-4">{order.date}</td>
                             <td className="px-6 py-4 font-bold">{customers.find(c => c.id === order.customerId)?.name || order.customCustomerName || 'Walk-in'}</td>
                             <td className="px-6 py-4">{agents.find(a => a.id === order.agentId)?.name || 'Direct'}</td>
                             <td className="px-6 py-4 text-center">{order.items.length}</td>
                             <td className="px-6 py-4 text-center font-bold text-purple-500">
                                {settings.currencySymbol}{calculateOrderTotals(order).commissionAmount.toFixed(2)}
                             </td>
                             <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button 
                                    onClick={() => promptChangeOrderStatus(order.id, order.status, 'completed')}
                                    className={`px-2 py-1 text-[10px] font-black uppercase rounded-md tracking-wider transition-colors ${
                                      order.status === 'completed' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-transparent text-app-muted hover:bg-emerald-500/10 hover:text-emerald-500'
                                    }`}
                                  >
                                    C
                                  </button>
                                  <button 
                                    onClick={() => promptChangeOrderStatus(order.id, order.status, 'pending')}
                                    className={`px-2 py-1 text-[10px] font-black uppercase rounded-md tracking-wider transition-colors ${
                                      order.status === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'bg-transparent text-app-muted hover:bg-amber-500/10 hover:text-amber-500'
                                    }`}
                                  >
                                    P
                                  </button>
                                  <button 
                                    onClick={() => promptChangeOrderStatus(order.id, order.status, 'cancelled')}
                                    className={`px-2 py-1 text-[10px] font-black uppercase rounded-md tracking-wider transition-colors ${
                                      order.status === 'cancelled' ? 'bg-red-500 text-white shadow-sm' : 'bg-transparent text-app-muted hover:bg-red-500/10 hover:text-red-500'
                                    }`}
                                  >
                                    X
                                  </button>
                                </div>
                             </td>
                             <td className="px-6 py-4 text-right font-black text-app-accent">{settings.currencySymbol}{order.totalAmount.toFixed(2)}</td>
                             <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => { setEditingOrder(order); setIsCreatingOrder(true); }} title="Edit Record" className="p-2 text-app-muted hover:text-emerald-500 transition-colors"><Edit2 size={16} /></button>
                                   <button onClick={() => handleDeleteOrder(order.id)} title="Delete Record" className="p-2 text-app-muted hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                </div>
                             </td>
                          </tr>
                       ))}
                       {saleOrders.filter(o => activeBatchId === 'legacy' ? !o.batchId : o.batchId === activeBatchId).length === 0 && (
                         <tr>
                           <td colSpan={8} className="px-6 py-8 text-center text-app-muted">No records in this entry. Add an item to get started.</td>
                         </tr>
                       )}
                     </tbody>
                  </table>
               </div>
            </div>
          ) : (
            <>
               <div className="flex justify-between items-center bg-app-card p-4 rounded-xl border border-app-border">
                <div className="flex items-center gap-4 flex-grow">
                   <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" size={18} />
                    <input 
                      type="text" 
                      placeholder="Filter entries..." 
                      className="w-full pl-10 pr-4 py-2 bg-app-bg border border-app-border rounded-lg text-sm focus:ring-2 focus:ring-app-accent outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsExportModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-app-bg text-emerald-500 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/10 transition-all font-bold"
                  >
                    <Upload size={18} />
                    <span className="hidden sm:inline">Export for Agent</span>
                  </button>
                  <input 
                    type="file" 
                    accept=".fgs" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleImportOrder} 
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-app-bg text-app-text border border-app-border rounded-xl hover:bg-app-card transition-all font-bold"
                  >
                    <Download size={18} />
                    <span className="hidden sm:inline">Import .fgs</span>
                  </button>
                  <button
                    onClick={handleCreateEntry}
                    className="flex items-center gap-2 px-6 py-2 bg-app-accent text-white rounded-xl hover:bg-app-accent-hover transition-all font-bold shadow-lg shadow-app-accent/20"
                  >
                    <PlusCircle size={20} />
                    <span className="hidden sm:inline">Create New Entry</span>
                    <span className="sm:hidden">New Entry</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orderBatches.map(batch => {
                  const entryOrdersCount = saleOrders.filter(o => o.batchId === batch.id).length;
                  return (
                  <div key={batch.id} className="bg-app-card rounded-2xl border border-app-border overflow-hidden hover:shadow-md transition-all p-6 cursor-pointer group" onClick={() => setActiveBatchId(batch.id)}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                        <Package size={24} />
                      </div>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleExportBatch(batch.id); }} className="text-app-muted hover:text-emerald-500 p-2"><Download size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteBatch(batch.id); }} className="text-app-muted hover:text-red-500 p-2"><Trash2 size={18} /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-app-text">{batch.name}</h3>
                      <button onClick={(e) => {
                         e.stopPropagation();
                         setEditingBatchData(batch);
                         setIsEditingBatch(true);
                      }} className="text-app-muted hover:text-app-accent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1">
                        <Edit2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-app-muted mt-2">
                      <Calendar size={14}/> {batch.date}
                    </div>
                    <div className="mt-4 pt-4 border-t border-app-border flex justify-between items-center text-sm font-bold">
                      <span className="text-app-muted">{entryOrdersCount} Records</span>
                      <span className="text-app-accent">Open <ArrowRight size={16} className="inline ml-1" /></span>
                    </div>
                  </div>
                )})}
                {saleOrders.filter(o => !o.batchId).length > 0 && (
                  <div className="bg-app-card rounded-2xl border border-app-border overflow-hidden hover:shadow-md transition-all p-6 cursor-pointer group" onClick={() => setActiveBatchId('legacy')}>
                     <div className="flex justify-between items-start mb-4">
                       <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                         <History size={24} />
                       </div>
                       <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => { e.stopPropagation(); handleExportBatch('legacy'); }} className="text-app-muted hover:text-emerald-500 p-2"><Download size={18} /></button>
                         <button onClick={(e) => { e.stopPropagation(); handleDeleteBatch('legacy'); }} className="text-app-muted hover:text-red-500 p-2"><Trash2 size={18} /></button>
                       </div>
                     </div>
                     <h3 className="text-lg font-black text-app-text">Legacy Records (Uncategorized)</h3>
                     <div className="mt-4 pt-4 border-t border-app-border flex justify-between items-center text-sm font-bold">
                       <span className="text-app-muted">{saleOrders.filter(o => !o.batchId).length} Records</span>
                       <span className="text-app-accent">Open <ArrowRight size={16} className="inline ml-1" /></span>
                     </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* Batch Editing Modal */}
      {isEditingBatch && editingBatchData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-card rounded-2xl shadow-2xl max-w-md w-full p-8 border border-app-border space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-app-text tracking-tight flex items-center gap-3">
                <Package className="text-app-accent" />
                {editingBatchData.id ? 'Edit Entry' : 'New Entry'}
              </h2>
              <button onClick={() => setIsEditingBatch(false)} className="text-app-muted hover:text-app-text p-2 hover:bg-app-bg rounded-lg transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-app-muted mb-1 tracking-widest">Entry Name</label>
                <input
                  type="text"
                  value={editingBatchData.name || ''}
                  onChange={(e) => setEditingBatchData({ ...editingBatchData, name: e.target.value })}
                  placeholder="e.g., September Expo Bulk Sale"
                  className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-app-text focus:ring-2 focus:ring-app-accent outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-app-muted mb-1 tracking-widest">Entry Date</label>
                <div className="relative">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" size={18} />
                   <input
                    type="date"
                    value={editingBatchData.date || ''}
                    onChange={(e) => setEditingBatchData({ ...editingBatchData, date: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-app-bg border border-app-border rounded-xl text-app-text focus:ring-2 focus:ring-app-accent outline-none font-bold"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveBatch}
              className="w-full flex items-center justify-center gap-2 py-4 bg-app-accent text-white rounded-2xl hover:bg-app-accent-hover transition-all font-black text-lg shadow-xl shadow-app-accent/20"
            >
              <Save size={24} />
              Save Entry
            </button>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {isEditingItem && editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-card rounded-2xl shadow-2xl max-w-lg w-full p-8 border border-app-border space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-app-text tracking-tight flex items-center gap-3">
                <ShoppingBag className="text-app-accent" />
                {editingItem.id ? 'Edit Shop Item' : 'New Shop Item'}
              </h2>
              <button onClick={() => setIsEditingItem(false)} className="text-app-muted hover:text-app-text p-2 hover:bg-app-bg rounded-lg transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-app-muted mb-1 tracking-widest">Source Bottle</label>
                <select
                  value={editingItem.inventoryItemId || ''}
                  onChange={(e) => {
                    const selected = bottledFragrances.find(it => it.id === e.target.value);
                    if (selected) {
                      let extractedCapacity = 0;
                      if (selected.name.includes('ml)')) {
                        const match = selected.name.match(/\((\d+)ml\)/);
                        if (match) extractedCapacity = Number(match[1]);
                      } else if (selected.itemId.startsWith('bottled_')) {
                        const parts = selected.itemId.split('_');
                        if (parts.length > 0) extractedCapacity = Number(parts[parts.length - 1]);
                      }
                      
                      setEditingItem({
                        ...editingItem,
                        inventoryItemId: selected.id,
                        name: selected.name,
                        capacityMl: extractedCapacity || 0
                      });
                    }
                  }}
                  className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-app-text focus:ring-2 focus:ring-app-accent outline-none font-bold"
                >
                  <option value="">Select from inventory...</option>
                  {bottledFragrances.map(it => (
                    <option key={it.id} value={it.id}>{it.name} ({it.totalAmount} in stock)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-app-muted mb-1 tracking-widest">Selling Name</label>
                <input
                  type="text"
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="e.g., Luxury Scent Gold Edition"
                  className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-app-text focus:ring-2 focus:ring-app-accent outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-app-muted mb-1 tracking-widest">Selling Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" size={18} />
                    <input
                      type="number"
                      value={editingItem.price || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                      className="w-full pl-10 pr-4 py-3 bg-app-bg border border-app-border rounded-xl text-app-text focus:ring-2 focus:ring-app-accent outline-none font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-app-muted mb-1 tracking-widest">Capacity (ml)</label>
                  <input
                    type="number"
                    value={editingItem.capacityMl || ''}
                    readOnly
                    className="w-full px-4 py-3 bg-app-bg/50 border border-app-border rounded-xl text-app-muted outline-none font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-app-muted mb-1 tracking-widest">Description</label>
                <textarea
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Tell customers about this item..."
                  className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-app-text focus:ring-2 focus:ring-app-accent outline-none h-24 resize-none font-medium"
                />
              </div>
            </div>

            <button
              onClick={handleSaveItem}
              className="w-full flex items-center justify-center gap-2 py-4 bg-app-accent text-white rounded-2xl hover:bg-app-accent-hover transition-all font-black text-lg shadow-xl shadow-app-accent/20"
            >
              <Save size={24} />
              Save Item
            </button>
          </div>
        </div>
      )}

      {/* Order Modal (Advanced Bulk Order) */}
      {isCreatingOrder && editingOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto p-8 border border-app-border space-y-8">
             <div className="flex justify-between items-center bg-app-card sticky -top-8 pt-2 pb-4 z-10 border-b border-app-border -mx-8 px-8">
              <div className="flex items-center gap-4 flex-grow">
                <div className="p-3 bg-app-accent/10 rounded-2xl text-app-accent">
                  <Receipt size={24} />
                </div>
                <div className="flex-grow max-w-sm">
                  <input
                     type="text"
                     value={editingOrder.orderName || ''}
                     onChange={(e) => setEditingOrder({ ...editingOrder, orderName: e.target.value })}
                     placeholder="Record Name (optional)"
                     className="w-full bg-transparent text-2xl font-black text-app-text tracking-tight outline-none placeholder:text-app-muted/30 focus:border-b-2 focus:border-app-accent border-b-2 border-transparent transition-all"
                  />
                  <p className="text-xs text-app-muted font-bold uppercase tracking-widest mt-1">{editingOrder.orderNumber}</p>
                </div>
              </div>
              <button onClick={() => setIsCreatingOrder(false)} className="text-app-muted hover:text-app-text p-2 hover:bg-app-bg rounded-lg transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Customer Info */}
              <div className="space-y-6">
                <div className="bg-app-bg rounded-2xl p-6 border border-app-border space-y-4">
                   <h3 className="text-[10px] font-black uppercase text-app-accent tracking-widest flex items-center gap-2">
                     <User size={14} /> Customer Information
                   </h3>
                   <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-app-muted mb-1 tracking-widest">Buyer / Customer</label>
                        <select
                           value={editingOrder.customerId || (editingOrder.customCustomerName !== undefined ? 'custom' : '')}
                           onChange={(e) => {
                             if (e.target.value === 'custom') {
                                setEditingOrder({ ...editingOrder, customerId: undefined, customCustomerName: '' });
                             } else if (e.target.value === '') {
                                setEditingOrder({ ...editingOrder, customerId: undefined, customCustomerName: undefined });
                             } else {
                                setEditingOrder({ ...editingOrder, customerId: e.target.value, customCustomerName: undefined });
                             }
                           }}
                           className="w-full px-4 py-3 bg-app-card border border-app-border rounded-xl text-app-text focus:ring-2 focus:ring-app-accent outline-none font-bold"
                        >
                           <option value="">Walk-in Customer</option>
                           <optgroup label="Saved Contacts">
                              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                           </optgroup>
                           <option value="custom">+ New Custom Name</option>
                        </select>
                      </div>

                      {editingOrder.customCustomerName !== undefined && (
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={editingOrder.customCustomerName}
                            onChange={(e) => setEditingOrder({ ...editingOrder, customCustomerName: e.target.value })}
                            className="w-full px-4 py-3 bg-app-card border border-app-border rounded-xl text-app-text focus:ring-2 focus:ring-app-accent outline-none font-bold"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Phone Number"
                              value={editingOrder.customCustomerPhone || ''}
                              onChange={(e) => setEditingOrder({ ...editingOrder, customCustomerPhone: e.target.value })}
                              className="flex-grow px-4 py-3 bg-app-card border border-app-border rounded-xl text-app-text focus:ring-2 focus:ring-app-accent outline-none font-bold"
                            />
                            <button
                              onClick={() => addCustomerFromOrder(editingOrder.customCustomerName!)}
                              title="Save Contact"
                              className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20"
                            >
                              <Plus size={24} />
                            </button>
                          </div>
                        </div>
                      )}
                   </div>
                </div>

                <div className="bg-app-bg rounded-2xl p-6 border border-app-border space-y-4">
                   <h3 className="text-[10px] font-black uppercase text-app-accent tracking-widest flex items-center gap-2">
                     <History size={14} /> Order Timeline
                   </h3>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-app-muted mb-1 tracking-widest">Order Date</label>
                        <div className="relative">
                           <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" size={16} />
                           <input
                             type="date"
                             value={editingOrder.date}
                             onChange={(e) => setEditingOrder({ ...editingOrder, date: e.target.value })}
                             className="w-full pl-10 pr-4 py-3 bg-app-card border border-app-border rounded-xl text-app-text focus:ring-2 focus:ring-app-accent outline-none font-bold"
                           />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-app-muted mb-1 tracking-widest">Selling Agent</label>
                        <select
                          value={editingOrder.agentId || ''}
                          onChange={(e) => setEditingOrder({ ...editingOrder, agentId: e.target.value })}
                          className="w-full px-4 py-3 bg-app-card border border-app-border rounded-xl text-app-text focus:ring-2 focus:ring-app-accent outline-none font-bold"
                        >
                          <option value="">Direct Sale</option>
                          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                   </div>
                   
                   {editingOrder.agentId && (
                      <div className="mt-4 pt-4 border-t border-app-border">
                        <label className="block text-[10px] font-black uppercase text-emerald-500 mb-2 tracking-widest flex items-center gap-2">
                           <User size={12} /> Agent Commission
                        </label>
                        <div className="flex items-center gap-2 max-w-[200px]">
                           <input
                             type="number"
                             value={editingOrder.commissionValue || ''}
                             onChange={(e) => setEditingOrder({ ...editingOrder, commissionValue: Number(e.target.value) })}
                             placeholder="0"
                             min="0"
                             className="w-full px-4 py-3 bg-app-card border border-app-border rounded-xl text-app-text focus:ring-2 focus:ring-app-accent outline-none font-bold"
                           />
                           <button 
                             onClick={() => setEditingOrder({ ...editingOrder, commissionType: editingOrder.commissionType === 'percentage' ? 'fixed' : 'percentage' })}
                             className="px-4 py-3 bg-app-card border border-app-border rounded-xl text-app-text font-black hover:bg-app-accent/10 hover:text-app-accent transition-colors"
                           >
                             {editingOrder.commissionType === 'percentage' ? '%' : settings.currencySymbol}
                           </button>
                        </div>
                      </div>
                   )}

                   <div>
                      <label className="block text-[10px] font-black uppercase text-app-muted mb-1 tracking-widest">Order Status</label>
                      <div className="flex gap-2">
                        {['pending', 'completed', 'cancelled'].map(st => (
                          <button
                            key={st}
                            onClick={() => setEditingOrder({ ...editingOrder, status: st as any })}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                              editingOrder.status === st 
                                ? 'bg-app-accent text-white border-app-accent shadow-md' 
                                : 'bg-app-card text-app-muted border-app-border hover:border-app-accent/50'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="bg-app-bg rounded-2xl p-6 border border-app-border space-y-4">
                   <h3 className="text-[10px] font-black uppercase text-app-accent tracking-widest flex items-center gap-2">
                     <DollarSign size={14} /> Adjustments & Payment
                   </h3>
                   <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-app-muted mb-1 tracking-widest">Payment Method</label>
                        <select
                           value={editingOrder.paymentMethod || 'QR'}
                           onChange={(e) => setEditingOrder({ ...editingOrder, paymentMethod: e.target.value })}
                           className="w-full px-4 py-3 bg-app-card border border-app-border rounded-xl text-app-text focus:ring-2 focus:ring-app-accent outline-none font-bold"
                        >
                           <option value="QR">QR Pay</option>
                           <option value="Cash">Cash</option>
                           <option value="Bank Transfer">Bank Transfer</option>
                           <option value="Card">Card</option>
                           <option value="Other">Other</option>
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-[10px] font-black uppercase text-app-muted mb-1 tracking-widest">Discount</label>
                            <div className="flex items-center gap-2">
                               <input
                                 type="number"
                                 value={editingOrder.discountValue || ''}
                                 onChange={(e) => setEditingOrder({ ...editingOrder, discountValue: Number(e.target.value) })}
                                 placeholder="0"
                                 min="0"
                                 className="w-full px-4 py-3 bg-app-card border border-app-border rounded-xl text-app-text focus:ring-2 focus:ring-app-accent outline-none font-bold"
                               />
                               <button 
                                 onClick={() => setEditingOrder({ ...editingOrder, discountType: editingOrder.discountType === 'percentage' ? 'fixed' : 'percentage' })}
                                 className="px-4 py-3 bg-app-card border border-app-border rounded-xl text-app-text font-black hover:bg-app-accent/10 hover:text-app-accent transition-colors"
                               >
                                 {editingOrder.discountType === 'percentage' ? '%' : settings.currencySymbol}
                               </button>
                            </div>
                         </div>
                         <div>
                            <label className="block text-[10px] font-black uppercase text-app-muted mb-1 tracking-widest">Postage / Fee</label>
                            <div className="relative">
                               <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" size={16} />
                               <input
                                 type="number"
                                 value={editingOrder.postage || ''}
                                 onChange={(e) => setEditingOrder({ ...editingOrder, postage: Number(e.target.value) })}
                                 placeholder="0.00"
                                 min="0"
                                 className="w-full pl-10 pr-4 py-3 bg-app-card border border-app-border rounded-xl text-app-text focus:ring-2 focus:ring-app-accent outline-none font-bold"
                               />
                            </div>
                         </div>
                      </div>
                   </div>
                 </div>
              </div>

              {/* Items Detail */}
              <div className="space-y-6">
                <div className="bg-app-bg rounded-3xl p-6 border border-app-border space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase text-app-accent tracking-widest flex items-center gap-2">
                       <LayoutGrid size={14} /> Itemized Order
                    </h3>
                    <p className="text-xs font-black text-app-muted">{editingOrder.items?.length || 0} ITEMS</p>
                  </div>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {editingOrder.items?.map((item, idx) => {
                      const si = shopItems.find(s => s.id === item.shopItemId);
                      return (
                        <div key={idx} className="bg-app-card p-4 rounded-2xl border border-app-border group relative hover:border-app-accent/50 transition-colors">
                          <button 
                            onClick={() => {
                              const newItems = editingOrder.items?.filter((_, i) => i !== idx);
                              const tempOrder = { ...editingOrder, items: newItems };
                              setEditingOrder({ ...tempOrder, totalAmount: calculateOrderTotals(tempOrder).total });
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-100 transition-opacity"
                          >
                            <X size={14} />
                          </button>
                          
                          <div className="flex justify-between items-start mb-4">
                            <div>
                               <p className="text-sm font-black text-app-text">{si?.name || 'Unknown Item'}</p>
                               <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{si?.capacityMl}ML</span>
                            </div>
                            <div className="text-right">
                               <p className="text-xs font-black text-app-accent">
                                 {settings.currencySymbol}
                                 {(() => {
                                   const lineTotal = item.quantity * item.priceAtSale;
                                   const disc = item.discountType === 'percentage' 
                                      ? (lineTotal * (item.discountValue || 0) / 100) 
                                      : (item.discountValue || 0);
                                   return Math.max(0, lineTotal - disc).toFixed(2);
                                 })()}
                               </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                             <div>
                                <label className="block text-[8px] font-black uppercase text-app-muted mb-1 tracking-widest">Quantity</label>
                                <div className="flex items-center gap-2 bg-app-bg rounded-lg border border-app-border px-2">
                                   <button 
                                      onClick={() => {
                                        const newItems = editingOrder.items?.map((i, subIdx) => 
                                          subIdx === idx ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i
                                        );
                                        const tempOrder = { ...editingOrder, items: newItems };
                                        setEditingOrder({ ...tempOrder, totalAmount: calculateOrderTotals(tempOrder).total });
                                      }}
                                      className="p-1 text-app-accent hover:bg-app-accent/10 rounded"
                                   >
                                      <ChevronDown size={14} />
                                   </button>
                                   <span className="flex-grow text-center text-xs font-black">{item.quantity}</span>
                                   <button 
                                      onClick={() => {
                                        const newItems = editingOrder.items?.map((i, subIdx) => 
                                          subIdx === idx ? { ...i, quantity: i.quantity + 1 } : i
                                        );
                                        const tempOrder = { ...editingOrder, items: newItems };
                                        setEditingOrder({ ...tempOrder, totalAmount: calculateOrderTotals(tempOrder).total });
                                      }}
                                      className="p-1 text-app-accent hover:bg-app-accent/10 rounded"
                                   >
                                      <ChevronDown className="rotate-180" size={14} />
                                   </button>
                                </div>
                             </div>
                             <div>
                                <label className="block text-[8px] font-black uppercase text-app-muted mb-1 tracking-widest">Price / Unit</label>
                                <div className="flex items-center gap-1 bg-app-bg rounded-lg border border-app-border px-2 py-1">
                                   <DollarSign size={10} className="text-app-muted" />
                                   <input 
                                      type="number"
                                      value={item.priceAtSale}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        const newItems = editingOrder.items?.map((i, subIdx) => subIdx === idx ? { ...i, priceAtSale: val } : i);
                                        const tempOrder = { ...editingOrder, items: newItems };
                                        setEditingOrder({ ...tempOrder, totalAmount: calculateOrderTotals(tempOrder).total });
                                      }}
                                      className="w-full bg-transparent outline-none text-xs font-black"
                                   />
                                </div>
                             </div>
                             <div>
                                <label className="block text-[8px] font-black uppercase text-app-muted mb-1 tracking-widest">Item Disc</label>
                                <div className="flex items-center gap-1 bg-app-bg rounded-lg border border-app-border px-2 py-1">
                                   <input 
                                      type="number"
                                      value={item.discountValue || ''}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        const newItems = editingOrder.items?.map((i, subIdx) => subIdx === idx ? { ...i, discountValue: val } : i);
                                        const tempOrder = { ...editingOrder, items: newItems };
                                        setEditingOrder({ ...tempOrder, totalAmount: calculateOrderTotals(tempOrder).total });
                                      }}
                                      className="w-full bg-transparent outline-none text-xs font-black"
                                   />
                                   <button 
                                      onClick={() => {
                                        const newType = item.discountType === 'percentage' ? 'fixed' : 'percentage';
                                        const newItems = editingOrder.items?.map((i, subIdx) => subIdx === idx ? { ...i, discountType: newType } : i);
                                        const tempOrder = { ...editingOrder, items: newItems };
                                        setEditingOrder({ ...tempOrder, totalAmount: calculateOrderTotals(tempOrder).total });
                                      }}
                                      className="text-xs font-black text-app-accent hover:opacity-80 transition-opacity"
                                   >
                                      {item.discountType === 'percentage' ? '%' : settings.currencySymbol}
                                   </button>
                                </div>
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2">
                     <select 
                       className="w-full px-4 py-3 bg-app-card border-2 border-dashed border-app-border rounded-2xl text-xs font-black text-app-accent text-center focus:border-app-accent outline-none transition-all cursor-pointer hover:bg-app-accent/5"
                       onChange={(e) => {
                         const item = shopItems.find(si => si.id === e.target.value);
                         if (item) {
                           const existing = editingOrder.items?.find(i => i.shopItemId === item.id);
                           let newItems: OrderItem[] = [];
                           if (existing) {
                              newItems = editingOrder.items?.map(i => i.shopItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i) || [];
                           } else {
                              newItems = [...(editingOrder.items || []), {
                                shopItemId: item.id,
                                quantity: 1,
                                priceAtSale: item.price,
                                discountValue: 0,
                                discountType: 'percentage'
                              }];
                           }
                           const newTotal = calculateOrderTotals({ ...editingOrder, items: newItems }).total;
                           setEditingOrder({ ...editingOrder, items: newItems, totalAmount: newTotal });
                         }
                       }}
                     >
                       <option value="">+ CLICK TO ADD FRAGRANCE</option>
                       {shopItems.map(si => (
                         <option key={si.id} value={si.id}>{si.name} ({si.capacityMl}ML) - {settings.currencySymbol}{si.price}</option>
                       ))}
                     </select>
                  </div>
                </div>
              </div>
            </div>

             {/* Total Section */}
            {(() => {
                const { subtotal, orderDiscount, total, commissionAmount } = calculateOrderTotals(editingOrder);
                
                // Calculate item-level discount total to display
                let itemLevelDiscountsTotal = 0;
                editingOrder.items?.forEach(i => {
                   const lineTotal = i.quantity * i.priceAtSale;
                   if (i.discountValue) {
                       itemLevelDiscountsTotal += i.discountType === 'percentage' ? (lineTotal * i.discountValue / 100) : i.discountValue;
                   }
                });
                
                const customerName = editingOrder.customCustomerName || customers.find(c => c.id === editingOrder.customerId)?.name || 'Guest / Walk-In';

                return (
                  <div className="space-y-6">
                    {/* Order Summary Receipt Version */}
                    <div className="bg-app-card border border-app-border rounded-3xl p-6 shadow-sm max-w-sm mx-auto">
                       <div ref={receiptRef} className="font-mono text-sm text-app-text p-4 bg-white">
                          <div className="text-center mb-6">
                            <h3 className="font-bold text-lg mb-1">FRAGRANCE PLANNER</h3>
                            <p className="text-xs text-app-muted">Receipt / Order Breakdown</p>
                          </div>
                          
                          <div className="space-y-1 mb-6 border-b-2 border-dashed border-app-border pb-4 text-xs">
                            <div className="flex justify-between">
                              <span>Order #</span>
                              <span>{editingOrder.orderNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Date</span>
                              <span>{editingOrder.date}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Customer</span>
                              <span className="font-bold">{customerName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Payment</span>
                              <span>{editingOrder.paymentMethod}</span>
                            </div>
                          </div>

                          <div className="space-y-3 mb-6 border-b-2 border-dashed border-app-border pb-4">
                            <div className="flex justify-between font-bold mb-2"><span>Item</span><span>Total</span></div>
                            
                            {editingOrder.items?.map((item, idx) => {
                                const itemInfo = shopItems.find(i => i.id === item.shopItemId);
                                const lineTotal = item.quantity * item.priceAtSale;
                                const disc = item.discountType === 'percentage' 
                                    ? (lineTotal * (item.discountValue || 0) / 100) 
                                    : (item.discountValue || 0);
                                const finalLine = Math.max(0, lineTotal - disc);

                                return (
                                    <div key={idx} className="flex justify-between items-start">
                                      <div className="flex-1 pr-4">
                                        <div className="break-words">{itemInfo?.name || 'Item'} ({itemInfo?.capacityMl}ML)</div>
                                        <div className="text-xs text-app-muted">{item.quantity} x {settings.currencySymbol}{item.priceAtSale.toFixed(2)}</div>
                                      </div>
                                      <div className="whitespace-nowrap">{settings.currencySymbol}{finalLine.toFixed(2)}</div>
                                    </div>
                                )
                            })}
                          </div>

                          <div className="space-y-2 mb-6 border-b-2 border-dashed border-app-border pb-4 text-app-muted text-xs">
                            <div className="flex justify-between">
                              <span>Subtotal</span>
                              <span>{settings.currencySymbol}{(subtotal + itemLevelDiscountsTotal).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-app-text">
                              <span>Discount</span>
                              <span>-{settings.currencySymbol}{(orderDiscount + itemLevelDiscountsTotal).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-app-text">
                              <span>Postage</span>
                              <span>+{settings.currencySymbol}{(editingOrder.postage || 0).toFixed(2)}</span>
                            </div>
                          </div>
                          
                          <div className="flex justify-between font-black text-lg mb-4 text-app-text">
                              <span>TOTAL</span>
                              <span>{settings.currencySymbol}{total.toFixed(2)}</span>
                          </div>
                       </div>
                       
                       <div className="text-center mt-4">
                         <button 
                           onClick={handleExportReceiptPDF}
                           className="text-xs font-bold text-app-accent hover:underline flex items-center justify-center gap-1 w-full p-2"
                         >
                           Export Receipt to PDF
                         </button>
                       </div>
                    </div>
                    
                    {/* Internal Financial Breakdown */}
                    <div className="bg-app-bg border border-app-border rounded-2xl p-4 shadow-inner max-w-sm mx-auto">
                        <h4 className="text-[10px] font-black uppercase text-app-muted mb-3 flex items-center gap-2 tracking-widest"><TrendingUp size={12}/> Internal Revenue Report</h4>
                        <div className="space-y-2 text-sm font-medium">
                            <div className="flex justify-between text-app-text">
                                <span>Gross Total</span>
                                <span>{settings.currencySymbol}{(subtotal + itemLevelDiscountsTotal).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-500">
                                <span>Total Discounts</span>
                                <span>-{settings.currencySymbol}{(orderDiscount + itemLevelDiscountsTotal).toFixed(2)}</span>
                            </div>
                            {commissionAmount > 0 && (
                                <div className="flex justify-between text-purple-500">
                                    <span>Agent Commission</span>
                                    <span>-{settings.currencySymbol}{commissionAmount.toFixed(2)}</span>
                                </div>
                            )}
                            {(editingOrder.postage || 0) > 0 && (
                                <div className="flex justify-between text-amber-500">
                                    <span>Postage Fee (Pass-through)</span>
                                    <span>+{settings.currencySymbol}{(editingOrder.postage || 0).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="border-t border-app-border pt-2 mt-2 flex justify-between font-black text-app-accent text-base">
                                <span>Net Sales Revenue</span>
                                <span>{settings.currencySymbol}{(subtotal - orderDiscount - commissionAmount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Separate Confirm Order UI */}
                    <div className="bg-black text-white rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-app-accent opacity-50"></div>
                       <div className="flex items-center gap-4 z-10">
                          <div className="p-4 bg-white/10 text-emerald-400 rounded-2xl hidden md:flex items-center justify-center">
                             <CheckCircle2 size={32} />
                          </div>
                          <div className="text-center sm:text-left">
                             <p className="text-[10px] font-black uppercase text-white/50 mb-1 tracking-widest">Ready to finalize</p>
                             <p className="text-xl md:text-2xl font-black text-white">Confirm Order</p>
                          </div>
                       </div>
                       <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3 min-w-[250px] z-10">
                           <button onClick={() => { setIsCreatingOrder(false); }} className="w-full sm:w-auto px-6 py-4 bg-white/5 hover:bg-white/10 text-white/70 font-bold rounded-2xl transition-all text-sm uppercase tracking-widest">
                              Discard
                           </button>
                           <button
                            onClick={handleSaveOrder}
                            disabled={!editingOrder.items || editingOrder.items.length === 0}
                            className="w-full sm:w-auto px-10 py-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all font-black text-lg shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-3"
                           >
                            <Save size={20} />
                            COMPLETE ORDER
                           </button>
                       </div>
                    </div>
                  </div>
                );
            })()}
          </div>
        </div>
      )}
      {/* Batch Export Modal */}
      {batchExportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-card rounded-2xl shadow-2xl max-w-sm w-full p-8 border border-app-border space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-app-text flex items-center gap-2">
                 <Download className="text-emerald-500" /> Export Entry .fgs
              </h2>
              <button onClick={() => setBatchExportModalOpen(false)} className="text-app-muted hover:text-app-text p-2 hover:bg-app-bg rounded-lg transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
               <div>
                  <label className="block text-[10px] font-black text-app-muted uppercase mb-1 tracking-widest">File Name</label>
                  <input
                     type="text"
                     className="w-full px-4 py-3 font-bold text-app-text bg-app-bg border border-app-border rounded-xl outline-none focus:border-app-accent"
                     value={batchExportFileName}
                     onChange={(e) => setBatchExportFileName(e.target.value)}
                  />
               </div>
               
               <button
                  onClick={confirmExportBatch}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all font-black text-lg shadow-xl shadow-emerald-500/20"
               >
                  <Download size={24} /> Export & Share
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Export to Agent Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-card rounded-2xl shadow-2xl max-w-sm w-full p-8 border border-app-border space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-app-text flex items-center gap-2">
                 <Upload className="text-emerald-500" /> Export to Agent
              </h2>
              <button onClick={() => setIsExportModalOpen(false)} className="text-app-muted hover:text-app-text p-2 hover:bg-app-bg rounded-lg transition-all">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-app-muted">Select the data you want to export to your agents. They can import this file to update their inventory and shop.</p>
            
            <div className="space-y-4">
               <div>
                  <label className="block text-[10px] font-black text-app-muted uppercase mb-1 tracking-widest">File Name</label>
                  <input
                     type="text"
                     className="w-full px-4 py-3 font-bold text-app-text bg-app-bg border border-app-border rounded-xl outline-none focus:border-app-accent"
                     value={agentExportFileName}
                     onChange={(e) => setAgentExportFileName(e.target.value)}
                  />
               </div>
               <label className="flex items-center gap-3 p-4 bg-app-bg rounded-xl border border-app-border cursor-pointer hover:border-app-accent/50 transition-colors">
                  <input type="checkbox" checked={exportSelection.shopItems} onChange={(e) => setExportSelection({...exportSelection, shopItems: e.target.checked})} className="rounded text-app-accent focus:ring-app-accent" />
                  <div>
                    <div className="font-bold text-sm text-app-text">Item Shop Data</div>
                    <div className="text-xs text-app-muted">Prices, variations, and active items</div>
                  </div>
               </label>
               <label className="flex items-center gap-3 p-4 bg-app-bg rounded-xl border border-app-border cursor-pointer hover:border-app-accent/50 transition-colors">
                  <input type="checkbox" checked={exportSelection.stock} onChange={(e) => setExportSelection({...exportSelection, stock: e.target.checked})} className="rounded text-app-accent focus:ring-app-accent" />
                  <div>
                    <div className="font-bold text-sm text-app-text">Stock Data</div>
                    <div className="text-xs text-app-muted">Available bottled fragrance quantities</div>
                  </div>
               </label>
            </div>
            
            <button
               onClick={async () => {
                  const exportData: any = { type: 'fgs_agent_data', timestamp: new Date().toISOString() };
                  if (exportSelection.shopItems) exportData.shopItems = shopItems;
                  if (exportSelection.stock) exportData.inventory = inventory.filter((i: InventoryItem) => i.itemType === 'bottled_fragrance');
                  
                  const jsonString = JSON.stringify(exportData, null, 2);
                  const fileName = agentExportFileName.endsWith('.fgs') ? agentExportFileName : `${agentExportFileName}.fgs`;

                  setIsExportModalOpen(false);

                  if (Capacitor.isNativePlatform()) {
                     try {
                        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
                        const { Share } = await import('@capacitor/share');
                        
                        const result = await Filesystem.writeFile({
                           path: `Fragrance Planner/${fileName}`,
                           data: jsonString,
                           directory: Directory.Documents,
                           encoding: Encoding.UTF8,
                           recursive: true
                        });
                        
                        if (window.confirm(`File saved: Documents/Fragrance Planner/${fileName}\n\nWould you like to share this file?`)) {
                           await Share.share({
                              title: 'Share Agent Data',
                              text: 'Fragrance Planner Agent Data',
                              url: result.uri,
                              dialogTitle: 'Share File'
                           });
                        }
                     } catch (e) {
                        console.error('Export fail', e);
                        alert('Failed to export. Please check permissions.');
                     }
                  } else {
                     const file = new File([jsonString], fileName, { type: 'application/json' });
                     if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        try {
                           await navigator.share({
                              files: [file],
                              title: 'Share Agent Data',
                              text: 'Fragrance Planner Agent Data'
                           });
                        } catch (e) {
                           downloadFileWeb(jsonString, fileName);
                        }
                     } else {
                        downloadFileWeb(jsonString, fileName);
                     }
                  }

                  setIsExportModalOpen(false);
               }}
               disabled={!exportSelection.shopItems && !exportSelection.stock}
               className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all font-black text-lg shadow-xl shadow-emerald-500/20 disabled:opacity-50"
            >
               <Upload size={24} /> Export File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
