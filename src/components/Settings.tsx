import React from 'react';
import { AppSettings } from '../types';
import { Settings as SettingsIcon, DollarSign, RefreshCw, Save } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export default function Settings({ settings, setSettings }: SettingsProps) {
  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = React.useState(false);

  const handleSave = () => {
    setSettings(localSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-app-text tracking-tight flex items-center gap-3">
          <SettingsIcon size={32} className="text-app-accent" />
          Settings
        </h1>
        <p className="text-app-muted font-medium mt-1">Configure global application settings and preferences.</p>
      </div>

      <div className="bg-app-card rounded-2xl border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-bg/50">
          <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-500" />
            Currency & Conversion
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black uppercase text-app-muted mb-2 tracking-widest">Global Currency Symbol</label>
              <input
                type="text"
                value={localSettings.currencySymbol}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, currencySymbol: e.target.value }))}
                className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl focus:ring-2 focus:ring-app-accent outline-none text-app-text"
                placeholder="e.g. $, €, £, RM"
              />
              <p className="text-xs text-app-muted mt-2">This symbol will be displayed across the app (Budgets, Sell Tracker, etc.)</p>
            </div>
            
            <div>
              <label className="block text-xs font-black uppercase text-app-muted mb-2 tracking-widest">Base Currency Name</label>
              <input
                type="text"
                value={localSettings.baseCurrency}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, baseCurrency: e.target.value }))}
                className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl focus:ring-2 focus:ring-app-accent outline-none text-app-text"
                placeholder="e.g. USD"
              />
            </div>
            
            <div>
              <label className="block text-xs font-black uppercase text-app-muted mb-2 tracking-widest">Target Currency Name</label>
              <input
                type="text"
                value={localSettings.targetCurrency}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, targetCurrency: e.target.value }))}
                className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl focus:ring-2 focus:ring-app-accent outline-none text-app-text"
                placeholder="e.g. EUR"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-app-muted mb-2 tracking-widest flex justify-between">
                <span>Conversion Multiplier</span>
                <span className="text-app-accent text-[10px]">1 {localSettings.baseCurrency || 'Base'} = {localSettings.currencyMultiplier} {localSettings.targetCurrency || 'Target'}</span>
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={localSettings.currencyMultiplier}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, currencyMultiplier: parseFloat(e.target.value) || 1 }))}
                className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl focus:ring-2 focus:ring-app-accent outline-none text-app-text"
                placeholder="e.g. 1.0"
              />
              <p className="text-[10px] text-app-muted mt-2">
                This multiplier can be used in your calculations. Note: Currently this doesn't auto-convert your historical data but updates future UI interactions where applied.
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-app-border flex justify-between items-center">
            <span className="text-[10px] font-black text-app-muted uppercase tracking-[0.2em]">Fragrance Planner v1.3.5</span>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-app-accent text-white rounded-xl hover:bg-app-accent-hover transition-all font-bold shadow-sm"
            >
              {isSaved ? <span className="flex items-center gap-2"><RefreshCw size={18} className="animate-spin" /> Saved</span> : <span className="flex items-center gap-2"><Save size={18} /> Save Settings</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
