import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sun, Moon, Sparkles, Palette, ZoomIn, ZoomOut, Maximize, Upload, Download, Trash2 } from 'lucide-react';

interface TabDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: readonly { id: string; label: string; icon: any }[];
  activeTab: string;
  onTabSelect: (id: any) => void;
  theme: string;
  setTheme: (theme: any) => void;
  uiScale: number;
  setUiScale: (scale: number) => void;
  onImport: () => void;
  onExport: () => void;
  onPurge: () => void;
}

export default function TabDrawer({ 
  isOpen, 
  onClose, 
  tabs, 
  activeTab, 
  onTabSelect,
  theme,
  setTheme,
  uiScale,
  setUiScale,
  onImport,
  onExport,
  onPurge
}: TabDrawerProps) {
  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'dark-gold', label: 'Dark Gold', icon: Sparkles },
    { id: 'white-gold', label: 'White Gold', icon: Palette },
  ] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-80 bg-app-card border-r border-app-border z-50 shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-app-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-app-text">Navigation</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-app-bg rounded-xl text-app-muted hover:text-app-text transition-all"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="space-y-2">
                <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-app-muted mb-2">Tabs</h3>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onTabSelect(tab.id);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-app-accent text-white shadow-lg shadow-app-accent/20'
                          : 'text-app-muted hover:bg-app-bg hover:text-app-text'
                      }`}
                    >
                      <Icon size={20} className={isActive ? 'text-white' : 'text-app-muted'} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4 pt-4 border-t border-app-border">
                <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-app-muted">Settings & Tools</h3>
                
                {/* Theme Switcher */}
                <div className="px-4">
                  <p className="text-xs font-bold text-app-muted mb-2">Theme</p>
                  <div className="grid grid-cols-4 gap-2 bg-app-bg p-1.5 rounded-xl border border-app-border">
                    {themes.map((t) => {
                      const Icon = t.icon;
                      const isActive = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all ${
                            isActive 
                              ? 'bg-app-accent text-white shadow-sm' 
                              : 'text-app-muted hover:text-app-text hover:bg-app-card'
                          }`}
                        >
                          <Icon size={18} />
                          <span className="text-[8px] font-bold uppercase">{t.label.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* UI Scaling */}
                <div className="px-4">
                  <p className="text-xs font-bold text-app-muted mb-2">UI Scaling</p>
                  <div className="flex items-center justify-between bg-app-bg p-2 rounded-xl border border-app-border">
                    <button
                      onClick={() => setUiScale(Math.max(0.8, uiScale - 0.1))}
                      className="p-2 rounded-lg text-app-muted hover:text-app-text hover:bg-app-card transition-all"
                    >
                      <ZoomOut size={20} />
                    </button>
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-app-text">{Math.round(uiScale * 100)}%</span>
                      <button 
                        onClick={() => setUiScale(1)}
                        className="text-[10px] text-app-accent font-bold uppercase"
                      >
                        Reset
                      </button>
                    </div>
                    <button
                      onClick={() => setUiScale(Math.min(1.5, uiScale + 0.1))}
                      className="p-2 rounded-lg text-app-muted hover:text-app-text hover:bg-app-card transition-all"
                    >
                      <ZoomIn size={20} />
                    </button>
                  </div>
                </div>

                {/* Data Actions */}
                <div className="px-4 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { onImport(); onClose(); }}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-app-bg border border-app-border text-app-muted hover:text-app-text hover:border-app-accent transition-all"
                  >
                    <Upload size={20} />
                    <span className="text-[10px] font-bold uppercase">Import</span>
                  </button>
                  <button
                    onClick={() => { onExport(); onClose(); }}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-app-bg border border-app-border text-app-muted hover:text-app-text hover:border-app-accent transition-all"
                  >
                    <Download size={20} />
                    <span className="text-[10px] font-bold uppercase">Export</span>
                  </button>
                  <button
                    onClick={() => { onPurge(); onClose(); }}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-app-bg border border-app-border text-red-500 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={20} />
                    <span className="text-[10px] font-bold uppercase">Purge</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-app-border bg-app-bg/50 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-muted">
                Fragrance Planner v1.4.4
              </p>
              <p className="text-[9px] font-bold text-app-accent/60 uppercase tracking-widest mt-1">
                Created by Sengeh Fragrance
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
