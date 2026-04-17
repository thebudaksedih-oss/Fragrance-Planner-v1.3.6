export type Theme = 'light' | 'dark' | 'dark-gold' | 'white-gold';

export type AppSettings = {
  currencySymbol: string;
  currencyMultiplier: number;
  baseCurrency: string;
  targetCurrency: string;
};

export type RawMaterial = {
  id: string;
  name: string;
  description?: string;
  character?: 'Top Note' | 'Heart Note' | 'Base Note' | string;
  type: string; // Deprecated, use types
  types?: string[]; // e.g. ['raw_material', 'solvent']
  isDiluted: boolean;
  dilutionPercentage?: number;
  solventId?: string;
};

export type AccordReference = {
  id: string;
  accordId: string;
  amount: number;
  unit: 'g' | 'ml' | 'drops' | '%' | 'mg';
};

export type Material = {
  id: string;
  rawMaterialId: string;
  percentage: number;
  amount?: number;
  unit?: 'g' | 'ml' | 'drops' | '%' | 'mg';
};

export type FragranceOil = {
  id: string;
  fragranceId: string; // If not hybrid, this might be empty or a generic ID
  percentage: number;
};

export type Formula = {
  id: string;
  name: string;
  type?: 'formula' | 'accord';
  isHybrid?: boolean;
  accordCapacity?: number;
  accordCapacityUnit?: 'ml' | 'g' | 'kg' | 'mg';
  fragranceOils: FragranceOil[];
  materials: Material[];
  alcohols: Material[];
  accords?: AccordReference[];
  version?: number;
  parentFormulaId?: string;
  originalFormulaId?: string;
  versionNote?: string;
};

export type UserTheme = {
  id: string;
  name: string;
  top: string;
  bottom: string;
  text: string;
  subText: string;
  accent: string;
  border: string;
  tagBg: string;
  tagText: string;
  nameText?: string;
  houseText?: string;
  inspiredText?: string;
  isCustom?: boolean;
  isGradient?: boolean;
  gradientDirection?: 'to right' | 'to bottom' | 'to bottom right' | 'to top right';
  color1?: string;
  color2?: string;
};

export type Fragrance = {
  id: string;
  name: string;
  house: string;
  originalScent: string;
  description: string;
  smellProfile: string;
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  tags: string[];
  colorTheme?: string;
  customColor?: string;
  customTheme?: UserTheme;
  macerationPeriodWeeks?: number;
};

export type BlendEntry = {
  id: string;
  formulaId: string;
  fragranceId: string;
  customFragranceName?: string;
  capacityMl: number;
  multiplier?: number;
  costPerMl?: number;
};

export type PlannedBatch = {
  id: string;
  name: string;
  date: string;
  entries: BlendEntry[];
  isCommittedToInventory?: boolean;
  isMaterialsTaken?: boolean;
};

export type Maceration = {
  id: string;
  blendEntryId?: string;
  batchId?: string;
  type: 'single' | 'batch';
  startDate: string;
  periodWeeks?: number;
};

export type CalculatorHistoryEntry = {
  id: string;
  timestamp: string;
  formulaId: string;
  formulaName: string;
  fragranceId?: string;
  fragranceName?: string;
  capacityMl: number;
  results: { 
    name: string; 
    type: string;
    percentage: number;
    requiredMl: number;
  }[];
};

export type Supplier = {
  id: string;
  name: string;
};

export type Equipment = {
  id: string;
  name: string;
  type: 'Equipment' | 'Application';
  size: string;
  description: string;
};

export type PriceEntry = {
  id: string;
  supplierId: string;
  itemId: string; // RawMaterial id, Fragrance id, or Equipment id
  itemType: 'raw_material' | 'fragrance' | 'equipment';
  customItemName?: string; // For typeable fragrance names
  priceBase: number;
  priceTarget: number;
  quantity: number;
  unit: string;
  pricingType?: 'unit' | 'capacity'; // 'unit' = price per quantity (e.g. $/100g), 'capacity' = price for whole item (e.g. $10 for 1 bottle)
  location?: string;
  platform?: string;
  isDiluted?: boolean;
  dilutionPercentage?: number;
  priceUSD?: number; // For backward compatibility
  priceMYR?: number; // For backward compatibility
  notes?: string;
};

export type Feedback = {
  id: string;
  fragranceId: string;
  name: string;
  date: string;
  gender: string;
  contact?: string;
  comment: string;
  sprayCount: number | '';
  longevityHours?: number;
  sillageHours?: number;
  projectionMeters?: number;
  performance?: 'beast' | 'above average' | 'average' | 'weak' | 'muted' | string;
  timeWear?: string;
  scentCheckTime?: string;
};

export type ShipmentOption = {
  id: string;
  name: string;
  price: number;
  rate: string;
};

export type BudgetItem = {
  id: string;
  category: 'raw_material' | 'equipment' | 'fragrance_oil' | 'shipment';
  itemId?: string;
  supplierId?: string;
  priceEntryId?: string; // Link to specific price entry
  customName?: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
};

export type BudgetPlan = {
  id: string;
  name: string;
  date: string;
  items: BudgetItem[];
};

export type BottleConfig = {
  id: string;
  capacityMl: number;
  count: number;
  label?: string;
  fragranceName?: string;
  sellingPrice?: number;
  equipmentId?: string;
  otherCostsPerBottle?: number;
};

export type SelectedBatchEntry = {
  batchId: string;
  entryId: string;
};

export type BottlingPlan = {
  id: string;
  name: string;
  date: string;
  selectedEntries: SelectedBatchEntry[];
  bottles: BottleConfig[];
  lossPercentage: number;
  notes?: string;
  isBalancePlan?: boolean;
  parentPlanName?: string;
  residueVolumes?: Record<string, number>; // Maps entryId to remaining volume
  isCommittedToInventory?: boolean;
};

export type InventoryLog = {
  id: string;
  timestamp: string;
  action: 'add' | 'remove' | 'update' | 'bottling' | 'blending' | 'sale' | 'manual';
  amount: number;
  unit: string;
  note: string;
  referenceId?: string; // ID of the plan/batch/sale that triggered this
};

export type InventoryContainer = {
  id: string;
  capacity: number;
  unit: 'ml' | 'g' | 'kg' | 'mg' | 'unit';
  currentAmount: number;
  costPerMl?: number; // Cost per ml for blended oils
  logs: InventoryLog[];
  label?: string;
};

export type InventoryItem = {
  id: string;
  itemId: string; // ID from RawMaterial, Equipment, or Fragrance
  itemType: 'raw_material' | 'equipment' | 'bottled_fragrance' | 'bulk_fragrance' | 'blended_oil' | 'fragrance_oil';
  name: string;
  containers: InventoryContainer[];
  totalAmount: number;
  costPerMl?: number; // Average cost per ml
  unit: string;
  formulaId?: string;
};

export interface Agent {
  id: string;
  name: string;
  contactNumber: string;
  bankAccountNumber: string;
  bankType: string;
  location: string;
  createdAt: string;
  notes?: string;
  gender?: 'Male' | 'Female';
}

export interface CustomerContact {
  id: string;
  name: string;
  styles: string[]; // Tags
  telephoneNumber: string;
  email: string;
  location: string;
  bankAccountNumber: string;
  createdAt: string;
  notes?: string;
  gender?: 'Male' | 'Female';
}

export type ShopItem = {
  id: string;
  inventoryItemId: string; // Links to InventoryItem (itemType: 'bottled_fragrance')
  name: string;
  price: number;
  capacityMl: number;
  description?: string;
};

export type OrderItem = {
  shopItemId: string;
  quantity: number;
  priceAtSale: number;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  blendedDate?: string;
  deliveredDate?: string;
  postage?: number;
  paymentMethod?: 'Cash' | 'QR' | 'Bank Transfer' | string;
};

export type SaleOrder = {
  id: string;
  orderNumber: string;
  date: string;
  items: OrderItem[];
  agentId?: string; // Who sold it
  commissionValue?: number;
  commissionType?: 'percentage' | 'fixed';
  customerId?: string; // Who bought it (from CustomerContact)
  customCustomerName?: string; // If buyer is not in contact manager
  customCustomerPhone?: string;
  totalAmount: number;
  discountValue?: number;
  discountType?: 'percentage' | 'fixed';
  paymentMethod?: 'Cash' | 'QR' | 'Bank Transfer' | string;
  postage?: number;
  notes?: string;
  orderName?: string;
  status: 'completed' | 'pending' | 'cancelled';
  batchId?: string; // Optional grouping
};

export type OrderBatch = {
  id: string;
  name: string;
  date: string;
  orderIds: string[];
};
