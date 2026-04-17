import React, { useState, useEffect, useRef } from 'react';
import { Beaker, BookOpen, Calculator, ListChecks, Timer, Database, DollarSign, MessageSquare, Download, Upload, X, Receipt, Wrench, Sun, Moon, Sparkles, Palette, Trash2, Package, Droplets, Users, TrendingUp, Settings as SettingsIcon } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Formula, Fragrance, PlannedBatch, Maceration, RawMaterial, PriceEntry, Feedback, ShipmentOption, BudgetItem, BudgetPlan, Equipment, Theme, BottlingPlan, InventoryItem, AppSettings } from './types';

import FormulaList from './components/FormulaList';
import FragranceDatabase from './components/FragranceDatabase';
import BlendCalculator from './components/BlendCalculator';
import BlendPlanner from './components/BlendPlanner';
import MacerationTracker from './components/MacerationTracker';
import MaterialList from './components/MaterialList';
import EquipmentList from './components/EquipmentList';
import PriceTracker from './components/PriceTracker';
import FeedbackTab from './components/FeedbackTab';
import BudgetPlanner from './components/BudgetPlanner';
import BottlingPlanner from './components/BottlingPlanner';
import DilutionCalculator from './components/DilutionCalculator';
import AgentContactManager from './components/AgentContactManager';
import SellTracker from './components/SellTracker';
import SettingsTab from './components/Settings';

import InventoryManager from './components/InventoryManager';
import TabDrawer from './components/TabDrawer';
import { Menu, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Agent, CustomerContact, ShopItem, SaleOrder, OrderBatch } from './types';

type Tab = 'formulas' | 'database' | 'calculator' | 'planner' | 'maceration' | 'materials' | 'equipment' | 'prices' | 'feedback' | 'budget' | 'bottling' | 'dilution' | 'contacts' | 'sales' | 'settings';

import { Capacitor } from '@capacitor/core';

// Inside App
export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('formulas');

  // State Management with LocalStorage
  const [formulas, setFormulas] = useLocalStorage<Formula[]>('fragrance_formulas', []);
  const [fragrances, setFragrances] = useLocalStorage<Fragrance[]>('fragrance_database', []);
  const [plannedBatches, setPlannedBatches] = useLocalStorage<PlannedBatch[]>('fragrance_planned_batches', []);
  const [macerations, setMacerations] = useLocalStorage<Maceration[]>('fragrance_macerations', []);
  const [rawMaterials, setRawMaterials] = useLocalStorage<RawMaterial[]>('fragrance_raw_materials', []);
  const [equipments, setEquipments] = useLocalStorage<Equipment[]>('fragrance_equipments', []);
  const [priceEntries, setPriceEntries] = useLocalStorage<PriceEntry[]>('fragrance_price_entries', []);
  const [feedbacks, setFeedbacks] = useLocalStorage<Feedback[]>('fragrance_feedbacks', []);
  const [calculatorHistory, setCalculatorHistory] = useLocalStorage<any[]>('fragrance_calculator_history', []);
  const [userFragranceThemes, setUserFragranceThemes] = useLocalStorage<any[]>('fragrance_user_themes', []);
  const [shipmentOptions, setShipmentOptions] = useLocalStorage<ShipmentOption[]>('fragrance_shipment_options', []);
  const [budgetPlans, setBudgetPlans] = useLocalStorage<BudgetPlan[]>('fragrance_budget_plans', []);
  const [bottlingPlans, setBottlingPlans] = useLocalStorage<BottlingPlan[]>('fragrance_bottling_plans', []);
  const [inventory, setInventory] = useLocalStorage<InventoryItem[]>('fragrance_inventory', []);
  const [theme, setTheme] = useLocalStorage<Theme>('fragrance_theme', 'light');
  const [uiScale, setUiScale] = useLocalStorage<number>('fragrance_ui_scale', 1);
  const [dilutionHistory, setDilutionHistory] = useLocalStorage<any[]>('fragrance_dilution_history', []);
  const [agents, setAgents] = useLocalStorage<Agent[]>('fragrance_agents', []);
  const [customers, setCustomers] = useLocalStorage<CustomerContact[]>('fragrance_customers', []);
  const [shopItems, setShopItems] = useLocalStorage<ShopItem[]>('fragrance_shop_items', []);
  const [saleOrders, setSaleOrders] = useLocalStorage<SaleOrder[]>('fragrance_sale_orders', []);
  const [orderBatches, setOrderBatches] = useLocalStorage<OrderBatch[]>('fragrance_order_batches', []);
  const [appSettings, setAppSettings] = useLocalStorage<AppSettings>('fragrance_app_settings', {
    currencySymbol: '$',
    currencyMultiplier: 1.0,
    baseCurrency: 'USD',
    targetCurrency: 'USD'
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${uiScale * 16}px`;
  }, [uiScale]);

  // Sanitize collections to fix duplicate IDs from previous versions
  useEffect(() => {
    const sanitizeCollection = (data: any[], prefix: string, setter: (data: any[]) => void) => {
      if (data.length === 0) return;
      const seenIds = new Set<string>();
      let hasDuplicates = false;
      const sanitized = data.map(item => {
        if (seenIds.has(item.id)) {
          hasDuplicates = true;
          return { ...item, id: `${prefix}_${Math.random().toString(36).substring(2, 11)}` };
        }
        seenIds.add(item.id);
        return item;
      });
      if (hasDuplicates) setter(sanitized);
    };

    sanitizeCollection(inventory, 'inv', setInventory);
    sanitizeCollection(plannedBatches, 'batch', setPlannedBatches);
    sanitizeCollection(bottlingPlans, 'bottling', setBottlingPlans);
    sanitizeCollection(formulas, 'form', setFormulas);
    sanitizeCollection(fragrances, 'frag', setFragrances);
    sanitizeCollection(rawMaterials, 'mat', setRawMaterials);
    sanitizeCollection(equipments, 'eq', setEquipments);
  }, []);

  const formatDate = (date: Date) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`;
  };

  const EXPORT_IMPORT_OPTIONS = [
    { id: 'formulas', label: 'Formula List' },
    { id: 'fragrances', label: 'Fragrance DB' },
    { id: 'rawMaterials', label: 'Material List' },
    { id: 'equipments', label: 'Equipment List' },
    { id: 'plannedBatches', label: 'Blend Planner' },
    { id: 'macerations', label: 'Maceration Tracker' },
    { id: 'priceEntries', label: 'Price Tracker' },
    { id: 'feedbacks', label: 'Feedback' },
    { id: 'budget', label: 'Budget Planner' },
    { id: 'bottling', label: 'Bottling Planner' },
    { id: 'inventory', label: 'Inventory Manager' },
    { id: 'dilutionHistory', label: 'Dilution History' },
    { id: 'agents', label: 'Agents' },
    { id: 'customers', label: 'Customers' },
    { id: 'shopItems', label: 'Item Shop' },
    { id: 'saleOrders', label: 'Sells Records' },
    { id: 'orderBatches', label: 'Order Batches' },
  ];

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    formulas: true,
    fragrances: true,
    rawMaterials: true,
    equipments: true,
    plannedBatches: true,
    macerations: true,
    priceEntries: true,
    feedbacks: true,
    budget: true,
    bottling: true,
    inventory: true,
    dilutionHistory: true,
    agents: true,
    customers: true,
    shopItems: true,
    saleOrders: true,
    orderBatches: true,
  });
  const [exportFilename, setExportFilename] = useState('');

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importOptions, setImportOptions] = useState({
    formulas: true,
    fragrances: true,
    rawMaterials: true,
    equipments: true,
    plannedBatches: true,
    macerations: true,
    priceEntries: true,
    feedbacks: true,
    budget: true,
    bottling: true,
    inventory: true,
    dilutionHistory: true,
    agents: true,
    customers: true,
    shopItems: true,
    saleOrders: true,
    orderBatches: true,
  });
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeOptions, setPurgeOptions] = useState({
    formulas: false,
    fragrances: false,
    rawMaterials: false,
    equipments: false,
    plannedBatches: false,
    macerations: false,
    priceEntries: false,
    feedbacks: false,
    budget: false,
    bottling: false,
    inventory: false,
    dilutionHistory: false,
    agents: false,
    customers: false,
    shopItems: false,
    saleOrders: false,
    orderBatches: false,
  });

  // Handle Mobile Back Button
  useEffect(() => {
    const handleBackButton = (e: PopStateEvent) => {
      e.preventDefault();
      
      // Check if any modals are open
      if (exportModalOpen) {
        setExportModalOpen(false);
        window.history.pushState(null, '', window.location.pathname);
        return;
      }
      if (importModalOpen) {
        setImportModalOpen(false);
        window.history.pushState(null, '', window.location.pathname);
        return;
      }
      if (purgeModalOpen) {
        setPurgeModalOpen(false);
        window.history.pushState(null, '', window.location.pathname);
        return;
      }
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
        window.history.pushState(null, '', window.location.pathname);
        return;
      }
      
      const confirmExit = window.confirm('Are you sure you want to exit the app?');
      if (confirmExit) {
        // Allow exit (this might not work perfectly in all PWA setups, but it's a standard approach)
        window.history.back();
      } else {
        // Push state again to prevent exit
        window.history.pushState(null, '', window.location.pathname);
      }
    };

    // Push initial state so we have something to pop
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handleBackButton);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [exportModalOpen, importModalOpen, purgeModalOpen, isDrawerOpen]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openPurgeModal = () => {
    setPurgeOptions({
      formulas: false,
      fragrances: false,
      rawMaterials: false,
      equipments: false,
      plannedBatches: false,
      macerations: false,
      priceEntries: false,
      feedbacks: false,
      budget: false,
      bottling: false,
      inventory: false,
      dilutionHistory: false,
      agents: false,
      customers: false,
      shopItems: false,
      saleOrders: false,
      orderBatches: false,
    });
    setPurgeModalOpen(true);
  };

  const confirmPurge = () => {
    if (purgeOptions.formulas) setFormulas([]);
    if (purgeOptions.fragrances) setFragrances([]);
    if (purgeOptions.rawMaterials) setRawMaterials([]);
    if (purgeOptions.equipments) setEquipments([]);
    if (purgeOptions.plannedBatches) setPlannedBatches([]);
    if (purgeOptions.macerations) setMacerations([]);
    if (purgeOptions.priceEntries) setPriceEntries([]);
    if (purgeOptions.feedbacks) setFeedbacks([]);
    if (purgeOptions.budget) {
      setShipmentOptions([]);
      setBudgetPlans([]);
    }
    if (purgeOptions.bottling) setBottlingPlans([]);
    if (purgeOptions.inventory) setInventory([]);
    if (purgeOptions.dilutionHistory) setDilutionHistory([]);
    if (purgeOptions.agents) setAgents([]);
    if (purgeOptions.customers) setCustomers([]);
    if (purgeOptions.shopItems) setShopItems([]);
    if (purgeOptions.saleOrders) setSaleOrders([]);
    if (purgeOptions.orderBatches) setOrderBatches([]);
    setPurgeModalOpen(false);
  };

  const openExportModal = () => {
    setExportFilename(formatDate(new Date()));
    setExportOptions({
      formulas: true,
      fragrances: true,
      rawMaterials: true,
      equipments: true,
      plannedBatches: true,
      macerations: true,
      priceEntries: true,
      feedbacks: true,
      budget: true,
      bottling: true,
      inventory: true,
      dilutionHistory: true,
      agents: true,
      customers: true,
      shopItems: true,
      saleOrders: true,
      orderBatches: true,
    });
    setExportModalOpen(true);
  };

  const confirmExport = () => {
    const data: any = {};
    if (exportOptions.formulas) data.formulas = formulas;
    if (exportOptions.fragrances) data.fragrances = fragrances;
    if (exportOptions.rawMaterials) data.rawMaterials = rawMaterials;
    if (exportOptions.equipments) data.equipments = equipments;
    if (exportOptions.plannedBatches) data.plannedBatches = plannedBatches;
    if (exportOptions.macerations) data.macerations = macerations;
    if (exportOptions.priceEntries) data.priceEntries = priceEntries;
    if (exportOptions.feedbacks) data.feedbacks = feedbacks;
    if (exportOptions.budget) {
      data.shipmentOptions = shipmentOptions;
      data.budgetPlans = budgetPlans;
    }
    if (exportOptions.bottling) data.bottlingPlans = bottlingPlans;
    if (exportOptions.inventory) data.inventory = inventory;
    if (exportOptions.dilutionHistory) data.dilutionHistory = dilutionHistory;
    if (exportOptions.agents) data.agents = agents;
    if (exportOptions.customers) data.customers = customers;
    if (exportOptions.shopItems) data.shopItems = shopItems;
    if (exportOptions.saleOrders) data.saleOrders = saleOrders;
    if (exportOptions.orderBatches) data.orderBatches = orderBatches;
    
    data.appSettings = appSettings;

    const jsonString = JSON.stringify(data, null, 2);
    const fileName = `${exportFilename}.fgp`;
    
    // Fallback for native wrapper
    if (Capacitor.isNativePlatform()) {
       import('@capacitor/filesystem').then(({ Filesystem, Directory, Encoding }) => {
          Filesystem.writeFile({
             path: `Fragrance Planner/${fileName}`,
             data: jsonString,
             directory: Directory.Documents,
             encoding: Encoding.UTF8,
             recursive: true
          }).then(() => {
             alert(`Exported to Documents/Fragrance Planner/${fileName}`);
          }).catch((e) => {
             console.error('Export fail', e);
             alert('Failed to export. Please check permissions.');
          });
       });
    } else {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    setExportModalOpen(false);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        setImportData(data);
        setImportOptions({
          formulas: !!data.formulas,
          fragrances: !!data.fragrances,
          rawMaterials: !!data.rawMaterials,
          equipments: !!data.equipments,
          plannedBatches: !!data.plannedBatches,
          macerations: !!data.macerations,
          priceEntries: !!data.priceEntries,
          feedbacks: !!data.feedbacks,
          budget: !!data.shipmentOptions || !!data.budgetPlans,
          bottling: !!data.bottlingPlans,
          inventory: !!data.inventory,
          dilutionHistory: !!data.dilutionHistory,
          agents: !!data.agents,
          customers: !!data.customers,
          shopItems: !!data.shopItems,
          saleOrders: !!data.saleOrders,
          orderBatches: !!data.orderBatches,
        });
        setImportModalOpen(true);
      } catch (error) {
        console.error('Failed to parse import file:', error);
        setErrorMessage('Failed to read the file. Please ensure it is a valid .fgp backup.');
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!importData) return;
    
    const summaryParts = [];
    
    const mergeData = (existing: any[], imported: any[]) => {
      if (importMode === 'replace') return imported;
      
      const newItems: any[] = [];
      
      imported.forEach((importedItem: any) => {
        // Check for exact match (same ID or same Name)
        const isDuplicate = existing.some(ex => {
          if (ex.id === importedItem.id) return true;
          if (ex.name && importedItem.name && ex.name.toLowerCase() === importedItem.name.toLowerCase()) return true;
          return false;
        });
        
        if (!isDuplicate) {
          newItems.push({
            ...importedItem,
            id: importedItem.id || `imp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
          });
        }
      });
      
      return [...existing, ...newItems];
    };
    
    if (importOptions.formulas && importData.formulas) {
      setFormulas(mergeData(formulas, importData.formulas));
      summaryParts.push(`${importData.formulas.length} Formulas`);
    }
    if (importOptions.fragrances && importData.fragrances) {
      setFragrances(mergeData(fragrances, importData.fragrances));
      summaryParts.push(`${importData.fragrances.length} Fragrances`);
    }
    if (importOptions.rawMaterials && importData.rawMaterials) {
      setRawMaterials(mergeData(rawMaterials, importData.rawMaterials));
      summaryParts.push(`${importData.rawMaterials.length} Materials`);
    }
    if (importOptions.equipments && importData.equipments) {
      setEquipments(mergeData(equipments, importData.equipments));
      summaryParts.push(`${importData.equipments.length} Equipments`);
    }
    if (importOptions.plannedBatches && importData.plannedBatches) {
      setPlannedBatches(mergeData(plannedBatches, importData.plannedBatches));
      summaryParts.push(`${importData.plannedBatches.length} Planned Batches`);
    }
    if (importOptions.macerations && importData.macerations) {
      setMacerations(mergeData(macerations, importData.macerations));
      summaryParts.push(`${importData.macerations.length} Macerations`);
    }
    if (importOptions.priceEntries && importData.priceEntries) {
      setPriceEntries(mergeData(priceEntries, importData.priceEntries));
      summaryParts.push(`${importData.priceEntries.length} Price Entries`);
    }
    if (importOptions.feedbacks && importData.feedbacks) {
      setFeedbacks(mergeData(feedbacks, importData.feedbacks));
      summaryParts.push(`${importData.feedbacks.length} Feedbacks`);
    }
    if (importOptions.budget) {
      if (importData.shipmentOptions) {
        setShipmentOptions(mergeData(shipmentOptions, importData.shipmentOptions));
        summaryParts.push(`${importData.shipmentOptions.length} Shipment Options`);
      }
      if (importData.budgetPlans) {
        setBudgetPlans(mergeData(budgetPlans, importData.budgetPlans));
        summaryParts.push(`${importData.budgetPlans.length} Budget Plans`);
      }
    }
    if (importOptions.bottling && importData.bottlingPlans) {
      setBottlingPlans(mergeData(bottlingPlans, importData.bottlingPlans));
      summaryParts.push(`${importData.bottlingPlans.length} Bottling Plans`);
    }
    if (importOptions.inventory && importData.inventory) {
      setInventory(mergeData(inventory, importData.inventory));
      summaryParts.push(`${importData.inventory.length} Inventory Items`);
    }
    if (importOptions.dilutionHistory && importData.dilutionHistory) {
      setDilutionHistory(mergeData(dilutionHistory, importData.dilutionHistory));
      summaryParts.push(`${importData.dilutionHistory.length} Dilution Records`);
    }
    if (importOptions.agents && importData.agents) {
      setAgents(mergeData(agents, importData.agents));
      summaryParts.push(`${importData.agents.length} Agents`);
    }
    if (importOptions.customers && importData.customers) {
      setCustomers(mergeData(customers, importData.customers));
      summaryParts.push(`${importData.customers.length} Customers`);
    }
    if (importOptions.shopItems && importData.shopItems) {
      setShopItems(mergeData(shopItems, importData.shopItems));
      summaryParts.push(`${importData.shopItems.length} Shop Items`);
    }
    if (importOptions.saleOrders && importData.saleOrders) {
      setSaleOrders(mergeData(saleOrders, importData.saleOrders));
      summaryParts.push(`${importData.saleOrders.length} Sale Orders`);
    }
    if (importOptions.orderBatches && importData.orderBatches) {
      setOrderBatches(mergeData(orderBatches, importData.orderBatches));
      summaryParts.push(`${importData.orderBatches.length} Order Batches`);
    }

    if (importData.appSettings) setAppSettings(importData.appSettings);

    setImportModalOpen(false);
    setImportData(null);
    
    if (summaryParts.length > 0) {
      const modeText = importMode === 'merge' ? 'added to' : 'replaced in';
      setImportSummary(`✨ Magic complete! You've successfully ${modeText} your planner:\n\n• ${summaryParts.join('\n• ')}\n\nHappy blending! 🧪`);
    } else {
      setImportSummary(`No data was imported. Your planner remains unchanged!`);
    }
  };

  // Migrate old price entries
  useEffect(() => {
    let migrated = false;
    const newEntries = priceEntries.map(entry => {
      if (entry.priceUSD !== undefined || entry.priceMYR !== undefined) {
        migrated = true;
        const { priceUSD, priceMYR, ...rest } = entry;
        return {
          ...rest,
          priceBase: priceUSD || entry.priceBase || 0,
          priceTarget: priceMYR || entry.priceTarget || 0,
        };
      }
      return entry;
    });
    if (migrated) {
      setPriceEntries(newEntries);
    }
  }, [priceEntries, setPriceEntries]);

  const tabs = [
    { id: 'formulas', label: 'Formula List', icon: Beaker },
    { id: 'database', label: 'Fragrance DB', icon: BookOpen },
    { id: 'materials', label: 'Material List', icon: Database },
    { id: 'equipment', label: 'Equipment & App', icon: Wrench },
    { id: 'calculator', label: 'Blend Calculator', icon: Calculator },
    { id: 'dilution', label: 'Dilution Wizard', icon: Droplets },
    { id: 'planner', label: 'Blend Planner', icon: ListChecks },
    { id: 'maceration', label: 'Maceration Tracker', icon: Timer },
    { id: 'prices', label: 'Price Tracker', icon: DollarSign },
    { id: 'budget', label: 'Budget Planner', icon: Receipt },
    { id: 'inventory', label: 'Inventory Manager', icon: Package },
    { id: 'bottling', label: 'Bottling Planner', icon: Package },
    { id: 'contacts', label: 'Agent & Contacts', icon: Users },
    { id: 'sales', label: 'Sell Tracker', icon: TrendingUp },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ] as const;

  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'dark-gold', label: 'Dark Gold', icon: Sparkles },
    { id: 'white-gold', label: 'White Gold', icon: Palette },
  ] as const;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-app-bg text-app-text font-sans transition-colors duration-300">
      {/* Header */}
      <header className="bg-app-card shadow-sm border-b border-app-border sticky top-0 z-10 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="bg-app-accent p-2 rounded-lg hover:bg-app-accent-hover transition-colors shadow-sm"
              >
                <Menu className="text-white" size={24} />
              </button>
              <h1 className="text-xl font-bold text-app-text tracking-tight hidden sm:block">
                Fragrance Planner
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {/* UI Scaling - Hidden on Mobile */}
              <div className="hidden md:flex items-center bg-app-bg p-1 rounded-lg border border-app-border mr-2">
                <button
                  onClick={() => setUiScale(Math.max(0.8, uiScale - 0.1))}
                  className="p-1.5 rounded-md text-app-muted hover:text-app-text hover:bg-app-card transition-all"
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <div className="px-2 text-[10px] font-bold text-app-muted w-10 text-center">
                  {Math.round(uiScale * 100)}%
                </div>
                <button
                  onClick={() => setUiScale(Math.min(1.5, uiScale + 0.1))}
                  className="p-1.5 rounded-md text-app-muted hover:text-app-text hover:bg-app-card transition-all"
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={() => setUiScale(1)}
                  className="p-1.5 rounded-md text-app-muted hover:text-app-text hover:bg-app-card transition-all border-l border-app-border ml-1"
                  title="Reset Zoom"
                >
                  <Maximize size={14} />
                </button>
              </div>

              {/* Theme Switcher - Hidden on Mobile */}
              <div className="hidden md:flex items-center bg-app-bg p-1 rounded-lg border border-app-border mr-2">
                {themes.map((t) => {
                  const Icon = t.icon;
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`p-1.5 rounded-md transition-all ${
                        isActive 
                          ? 'bg-app-accent text-white shadow-sm' 
                          : 'text-app-muted hover:text-app-text hover:bg-app-card'
                      }`}
                      title={t.label}
                    >
                      <Icon size={16} />
                    </button>
                  );
                })}
              </div>

              <input 
                type="file" 
                accept=".fgp" 
                ref={fileInputRef} 
                onChange={handleImportFile} 
                className="hidden" 
              />
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-app-text bg-app-bg hover:bg-app-card border border-app-border rounded-md transition-colors"
                  title="Import Data"
                >
                  <Upload size={16} />
                  <span className="hidden sm:inline">Import</span>
                </button>
                <button
                  onClick={openExportModal}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-app-accent hover:bg-app-accent-hover rounded-md transition-colors shadow-sm"
                  title="Export Data"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={openPurgeModal}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-500 bg-app-bg hover:bg-red-500/10 border border-red-500/20 rounded-md transition-colors"
                  title="Purge Data"
                >
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">Purge</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Drawer (Mobile) */}
      <div className="lg:hidden">
        <TabDrawer 
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          tabs={tabs}
          activeTab={activeTab}
          onTabSelect={setActiveTab}
          theme={theme}
          setTheme={setTheme}
          uiScale={uiScale}
          setUiScale={setUiScale}
          onImport={() => fileInputRef.current?.click()}
          onExport={openExportModal}
          onPurge={openPurgeModal}
        />
      </div>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar (Desktop) */}
        <aside className={`${isDrawerOpen ? 'lg:block' : 'lg:hidden'} hidden w-64 shrink-0 border-r border-app-border h-[calc(100vh-64px)] sticky top-16 overflow-y-auto p-4 space-y-1 bg-app-card/50`}>
          <div className="mb-4 px-4 py-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-app-muted">Menu</h2>
          </div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-app-accent text-white shadow-md shadow-app-accent/10'
                    : 'text-app-muted hover:bg-app-bg hover:text-app-text'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-app-muted'} />
                {tab.label}
              </button>
            );
          })}
          <div className="mt-8 pt-8 border-t border-app-border px-4 text-center lg:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-muted">
              Fragrance Planner v1.4.3
            </p>
            <p className="text-[9px] font-bold text-app-accent/60 uppercase tracking-widest mt-1">
              Created by Sengeh Fragrance
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
          {activeTab === 'formulas' && (
          <FormulaList 
            formulas={formulas} 
            setFormulas={setFormulas} 
            rawMaterials={rawMaterials}
            fragrances={fragrances}
          />
        )}
        {activeTab === 'database' && (
          <FragranceDatabase 
            fragrances={fragrances} 
            setFragrances={setFragrances} 
            userThemes={userFragranceThemes}
            setUserThemes={setUserFragranceThemes}
          />
        )}
        {activeTab === 'materials' && (
          <MaterialList rawMaterials={rawMaterials} setRawMaterials={setRawMaterials} />
        )}
        {activeTab === 'equipment' && (
          <EquipmentList equipments={equipments} setEquipments={setEquipments} />
        )}
        {activeTab === 'calculator' && (
          <BlendCalculator 
            formulas={formulas} 
            fragrances={fragrances} 
            rawMaterials={rawMaterials}
            history={calculatorHistory}
            setHistory={setCalculatorHistory}
          />
        )}
        {activeTab === 'dilution' && (
          <DilutionCalculator 
            rawMaterials={rawMaterials} 
            history={dilutionHistory}
            setHistory={setDilutionHistory}
          />
        )}
        {activeTab === 'planner' && (
          <BlendPlanner 
            formulas={formulas} 
            fragrances={fragrances} 
            setFragrances={setFragrances}
            plannedBatches={plannedBatches} 
            setPlannedBatches={setPlannedBatches} 
            rawMaterials={rawMaterials}
            inventory={inventory}
            setInventory={setInventory}
            priceEntries={priceEntries}
          />
        )}
        {activeTab === 'maceration' && (
          <MacerationTracker 
            plannedBatches={plannedBatches} 
            fragrances={fragrances} 
            macerations={macerations} 
            setMacerations={setMacerations}
            formulas={formulas}
          />
        )}
        {activeTab === 'prices' && (
          <PriceTracker 
            priceEntries={priceEntries} 
            setPriceEntries={setPriceEntries}
            rawMaterials={rawMaterials}
            equipments={equipments}
            fragrances={fragrances}
            settings={appSettings}
            setSettings={setAppSettings}
          />
        )}
        {activeTab === 'feedback' && (
          <FeedbackTab 
            feedbacks={feedbacks} 
            setFeedbacks={setFeedbacks}
            fragrances={fragrances}
          />
        )}
        {activeTab === 'budget' && (
          <BudgetPlanner
            rawMaterials={rawMaterials}
            equipments={equipments}
            priceEntries={priceEntries}
            shipmentOptions={shipmentOptions}
            setShipmentOptions={setShipmentOptions}
            budgetPlans={budgetPlans}
            setBudgetPlans={setBudgetPlans}
            settings={appSettings}
            formulas={formulas}
            fragrances={fragrances}
            plannedBatches={plannedBatches}
          />
        )}
        {activeTab === 'bottling' && (
          <BottlingPlanner
            bottlingPlans={bottlingPlans}
            setBottlingPlans={setBottlingPlans}
            plannedBatches={plannedBatches}
            fragrances={fragrances}
            formulas={formulas}
            priceEntries={priceEntries}
            rawMaterials={rawMaterials}
            equipments={equipments}
            settings={appSettings}
            inventory={inventory}
            setInventory={setInventory}
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryManager
            inventory={inventory}
            setInventory={setInventory}
            rawMaterials={rawMaterials}
            equipments={equipments}
            fragrances={fragrances}
          />
        )}
          {activeTab === 'contacts' && (
          <AgentContactManager 
            agents={agents}
            setAgents={setAgents}
            customers={customers}
            setCustomers={setCustomers}
          />
        )}
        {activeTab === 'sales' && (
          <SellTracker
            shopItems={shopItems}
            setShopItems={setShopItems}
            saleOrders={saleOrders}
            setSaleOrders={setSaleOrders}
            orderBatches={orderBatches}
            setOrderBatches={setOrderBatches}
            inventory={inventory}
            setInventory={setInventory}
            agents={agents}
            setAgents={setAgents}
            customers={customers}
            setCustomers={setCustomers}
            settings={appSettings}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab 
            settings={appSettings} 
            setSettings={setAppSettings} 
          />
        )}
      </main>
      </div>

      {/* Export Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-card rounded-xl shadow-xl max-w-md w-full p-6 border border-app-border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-app-text">Export Data</h2>
              <button onClick={() => setExportModalOpen(false)} className="text-app-muted hover:text-app-text">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-muted mb-1">Filename</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={exportFilename} 
                    onChange={(e) => setExportFilename(e.target.value)}
                    className="flex-1 px-3 py-2 border border-app-border bg-app-bg text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
                  />
                  <span className="text-app-muted font-medium">.fgp</span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-app-muted">Select tabs to export</label>
                  <button 
                    onClick={() => {
                      const allSelected = Object.values(exportOptions).every(Boolean);
                      setExportOptions({
                        formulas: !allSelected,
                        fragrances: !allSelected,
                        rawMaterials: !allSelected,
                        plannedBatches: !allSelected,
                        macerations: !allSelected,
                        priceEntries: !allSelected,
                        feedbacks: !allSelected,
                        equipments: !allSelected,
                        budget: !allSelected,
                        bottling: !allSelected,
                        inventory: !allSelected,
                        dilutionHistory: !allSelected,
                        agents: !allSelected,
                        customers: !allSelected,
                        shopItems: !allSelected,
                        saleOrders: !allSelected,
                        orderBatches: !allSelected,
                      });
                    }}
                    className="text-xs text-app-accent hover:text-app-accent-hover font-medium"
                  >
                    {Object.values(exportOptions).every(Boolean) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-2 bg-app-bg p-3 rounded-lg border border-app-border">
                  {EXPORT_IMPORT_OPTIONS.map(opt => (
                    <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={exportOptions[opt.id as keyof typeof exportOptions] || false}
                        onChange={(e) => setExportOptions({...exportOptions, [opt.id]: e.target.checked})}
                        className="rounded text-app-accent focus:ring-app-accent w-4 h-4"
                      />
                      <span className="text-sm text-app-text">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 text-app-text bg-app-bg hover:bg-app-card border border-app-border rounded-md transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={confirmExport}
                disabled={!Object.values(exportOptions).some(Boolean) || !exportFilename.trim()}
                className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover transition-colors disabled:opacity-50 font-medium flex items-center gap-2 shadow-sm"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModalOpen && importData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-card rounded-xl shadow-xl max-w-md w-full p-6 border border-app-border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-app-text">Import Data</h2>
              <button onClick={() => { setImportModalOpen(false); setImportData(null); }} className="text-app-muted hover:text-app-text">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-app-accent/5 p-3 rounded-lg border border-app-accent/10 mb-4">
                <label className="block text-sm font-semibold text-app-text mb-2">How would you like to import?</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-app-accent/10 transition-colors">
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-1 text-app-accent focus:ring-app-accent"
                    />
                    <div>
                      <span className="block text-sm font-medium text-app-text">🪄 Merge (Add to existing)</span>
                      <span className="block text-xs text-app-muted mt-0.5">Safely adds the imported items to your current planner without deleting anything.</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-red-500/10 transition-colors">
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-1 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-red-600">⚠️ Replace (Overwrite)</span>
                      <span className="block text-xs text-red-500/80 mt-0.5">Deletes your current data in the selected tabs and replaces it completely.</span>
                    </div>
                  </label>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-app-muted">Select tabs to import</label>
                  <button 
                    onClick={() => {
                      const availableKeys = Object.keys(importOptions).filter(key => {
                        if (key === 'budget') return !!importData.shipmentOptions || !!importData.budgetPlans;
                        if (key === 'bottling') return !!importData.bottlingPlans;
                        return !!importData[key];
                      });
                      const allSelected = availableKeys.length > 0 && availableKeys.every(key => importOptions[key as keyof typeof importOptions]);
                      
                      setImportOptions({
                        formulas: !allSelected && !!importData.formulas,
                        fragrances: !allSelected && !!importData.fragrances,
                        rawMaterials: !allSelected && !!importData.rawMaterials,
                        plannedBatches: !allSelected && !!importData.plannedBatches,
                        macerations: !allSelected && !!importData.macerations,
                        priceEntries: !allSelected && !!importData.priceEntries,
                        feedbacks: !allSelected && !!importData.feedbacks,
                        equipments: !allSelected && !!importData.equipments,
                        budget: !allSelected && (!!importData.shipmentOptions || !!importData.budgetPlans),
                        bottling: !allSelected && !!importData.bottlingPlans,
                        inventory: !allSelected && !!importData.inventory,
                        dilutionHistory: !allSelected && !!importData.dilutionHistory,
                        agents: !allSelected && !!importData.agents,
                        customers: !allSelected && !!importData.customers,
                        shopItems: !allSelected && !!importData.shopItems,
                        saleOrders: !allSelected && !!importData.saleOrders,
                        orderBatches: !allSelected && !!importData.orderBatches,
                      });
                    }}
                    className="text-xs text-app-accent hover:text-app-accent-hover font-medium"
                  >
                    {(() => {
                      const availableKeys = Object.keys(importOptions).filter(key => {
                        if (key === 'budget') return !!importData?.shipmentOptions || !!importData?.budgetPlans;
                        if (key === 'bottling') return !!importData?.bottlingPlans;
                        return !!importData?.[key];
                      });
                      const allSelected = availableKeys.length > 0 && availableKeys.every(key => importOptions[key as keyof typeof importOptions]);
                      return allSelected ? 'Deselect All' : 'Select All';
                    })()}
                  </button>
                </div>
                <div className="space-y-2 bg-app-bg p-3 rounded-lg border border-app-border max-h-60 overflow-y-auto">
                  {EXPORT_IMPORT_OPTIONS.map(opt => {
                    let hasData = false;
                    let count = 0;

                    if (opt.id === 'budget') {
                      hasData = !!importData.shipmentOptions || !!importData.budgetPlans;
                      count = (importData.shipmentOptions?.length || 0) + (importData.budgetPlans?.length || 0);
                    } else if (opt.id === 'bottling') {
                      hasData = !!importData.bottlingPlans;
                      count = importData.bottlingPlans?.length || 0;
                    } else {
                      hasData = !!importData[opt.id];
                      count = hasData ? importData[opt.id].length : 0;
                    }
                    
                    return (
                      <label key={opt.id} className={`flex items-center gap-2 ${hasData ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                        <input 
                          type="checkbox" 
                          checked={importOptions[opt.id as keyof typeof importOptions] || false}
                          onChange={(e) => setImportOptions({...importOptions, [opt.id]: e.target.checked})}
                          disabled={!hasData}
                          className="rounded text-app-accent focus:ring-app-accent w-4 h-4"
                        />
                        <span className="text-sm text-app-text flex-1">{opt.label}</span>
                        {hasData && <span className="text-xs text-app-muted bg-app-card px-2 py-0.5 rounded-full font-medium border border-app-border">{count} items</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => {
                  setImportModalOpen(false);
                  setImportData(null);
                }}
                className="px-4 py-2 text-app-text bg-app-bg hover:bg-app-card border border-app-border rounded-md transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={confirmImport}
                disabled={!Object.values(importOptions).some(Boolean)}
                className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover transition-colors disabled:opacity-50 font-medium flex items-center gap-2 shadow-sm"
              >
                <Upload size={16} />
                Import Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Summary Modal */}
      {importSummary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-app-card rounded-xl shadow-xl max-w-sm w-full p-6 text-center border border-app-border">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
              <Database size={32} />
            </div>
            <h2 className="text-2xl font-bold text-app-text mb-2">Import Successful!</h2>
            <div className="text-app-muted text-sm mb-6 whitespace-pre-line text-left bg-app-bg p-4 rounded-lg border border-app-border font-medium">
              {importSummary}
            </div>
            <button 
              onClick={() => setImportSummary(null)}
              className="w-full px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover transition-colors font-medium shadow-sm"
            >
              Awesome, let's go!
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-app-card rounded-xl shadow-xl max-w-sm w-full p-6 text-center border border-app-border">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <X size={32} />
            </div>
            <h2 className="text-xl font-bold text-app-text mb-2">Oops! Something went wrong</h2>
            <p className="text-app-muted text-sm mb-6">
              {errorMessage}
            </p>
            <button 
              onClick={() => setErrorMessage(null)}
              className="w-full px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover transition-colors font-medium shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Purge Modal */}
      {purgeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-app-card rounded-xl shadow-xl max-w-md w-full p-6 border border-app-border">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-red-500">
                <Trash2 size={24} />
                <h2 className="text-xl font-bold">Purge Data</h2>
              </div>
              <button onClick={() => setPurgeModalOpen(false)} className="text-app-muted hover:text-app-text">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-app-muted text-sm mb-4">
              Select the categories you want to permanently delete. This action cannot be undone.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-app-muted">Select tabs to purge</label>
                  <button 
                    onClick={() => {
                      const allSelected = Object.values(purgeOptions).every(Boolean);
                      setPurgeOptions({
                        formulas: !allSelected,
                        fragrances: !allSelected,
                        rawMaterials: !allSelected,
                        plannedBatches: !allSelected,
                        macerations: !allSelected,
                        priceEntries: !allSelected,
                        feedbacks: !allSelected,
                        equipments: !allSelected,
                        budget: !allSelected,
                        bottling: !allSelected,
                        inventory: !allSelected,
                        dilutionHistory: !allSelected,
                        agents: !allSelected,
                        customers: !allSelected,
                        shopItems: !allSelected,
                        saleOrders: !allSelected,
                        orderBatches: !allSelected,
                      });
                    }}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    {Object.values(purgeOptions).every(Boolean) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-2 bg-app-bg p-3 rounded-lg border border-app-border">
                  {EXPORT_IMPORT_OPTIONS.map(opt => (
                    <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={purgeOptions[opt.id as keyof typeof purgeOptions] || false}
                        onChange={(e) => setPurgeOptions({...purgeOptions, [opt.id]: e.target.checked})}
                        className="rounded text-red-500 focus:ring-red-500 w-4 h-4"
                      />
                      <span className="text-sm text-app-text group-hover:text-red-500 transition-colors">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setPurgeModalOpen(false)}
                className="px-4 py-2 text-app-text bg-app-bg hover:bg-app-card border border-app-border rounded-md transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={confirmPurge}
                disabled={!Object.values(purgeOptions).some(Boolean)}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 font-medium flex items-center gap-2 shadow-sm"
              >
                <Trash2 size={16} />
                Purge Selected Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
