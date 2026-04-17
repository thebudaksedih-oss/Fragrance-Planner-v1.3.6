import React, { useState } from 'react';
import { X } from 'lucide-react';

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({ 
    title: '', 
    message: '', 
    onConfirm: () => {}, 
    confirmText: 'Confirm',
    confirmVariant: 'primary' as 'primary' | 'danger'
  });

  const confirm = (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    confirmText: string = 'Confirm',
    confirmVariant: 'primary' | 'danger' = 'primary'
  ) => {
    setConfig({ title, message, onConfirm, confirmText, confirmVariant });
    setIsOpen(true);
  };

  const ConfirmModal = isOpen ? (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-app-card rounded-xl shadow-xl w-full max-w-sm border border-app-border overflow-hidden">
        <div className="p-4 border-b border-app-border flex justify-between items-center">
          <h3 className="font-bold text-app-text">{config.title}</h3>
          <button onClick={() => setIsOpen(false)} className="text-app-muted hover:text-app-text transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 text-app-text text-sm">
          {config.message}
        </div>
        <div className="p-4 border-t border-app-border flex justify-end gap-3 bg-app-bg">
          <button 
            onClick={() => setIsOpen(false)} 
            className="px-4 py-2 text-sm font-medium text-app-text bg-app-card border border-app-border rounded-md hover:bg-app-bg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => { 
              config.onConfirm(); 
              setIsOpen(false); 
            }} 
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors shadow-sm ${
              config.confirmVariant === 'danger' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-app-accent hover:bg-app-accent-hover'
            }`}
          >
            {config.confirmText}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmModal };
}
