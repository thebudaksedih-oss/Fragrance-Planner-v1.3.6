import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, HelpCircle, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface TutorialStep {
  title: string;
  content: string;
  icon?: React.ReactNode;
}

interface Props {
  steps: TutorialStep[];
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export default function TutorialModal({ steps, isOpen, onClose, title }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-app-card w-full max-w-lg rounded-2xl shadow-2xl border border-app-border overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-app-bg/50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-app-accent/10 rounded-lg text-app-accent">
                <HelpCircle size={20} />
              </div>
              <h3 className="font-bold text-app-text">{title}</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-app-accent/5 rounded-full flex items-center justify-center text-app-accent border-4 border-app-accent/10">
                    {steps[currentStep].icon || <Lightbulb size={40} />}
                  </div>
                </div>
                
                <div className="text-center space-y-3">
                  <h4 className="text-xl font-bold text-app-text">{steps[currentStep].title}</h4>
                  <p className="text-app-muted leading-relaxed">
                    {steps[currentStep].content}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-app-border bg-app-bg/30 flex justify-between items-center">
            <div className="flex gap-1">
              {steps.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-app-accent' : 'w-1.5 bg-app-border'}`}
                />
              ))}
            </div>
            
            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-1 px-4 py-2 text-app-text font-medium hover:bg-app-bg rounded-lg transition-colors"
                >
                  <ChevronLeft size={18} />
                  Back
                </button>
              )}
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2 bg-app-accent text-white font-bold rounded-lg hover:bg-app-accent-hover transition-all shadow-lg shadow-app-accent/20"
              >
                {currentStep === steps.length - 1 ? 'Got it!' : 'Next'}
                {currentStep < steps.length - 1 && <ChevronRight size={18} />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
