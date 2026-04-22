import React, { useState, useRef } from 'react';
import { X, Upload, Save, AlertTriangle, FileText, Check, Copy, HelpCircle, Info } from 'lucide-react';
import { Equipment } from '../types';
import { extractDataFromSheet } from '../lib/sheetUtils';
import { useConfirm } from '../hooks/useConfirm';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (equipments: Equipment[]) => void;
  existingEquipments: Equipment[];
}

export default function ImportEquipmentModal({ isOpen, onClose, onImport, existingEquipments }: Props) {
  const [importMode, setImportMode] = useState<'upload' | 'confirm'>('upload');
  const [showHelp, setShowHelp] = useState(false);
  const [parsedEquipments, setParsedEquipments] = useState<(Equipment & { isDuplicate: boolean, keepDuplicate: boolean })[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    if (fileNameLower.endsWith('.csv') || fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
      setIsProcessing(true);
      try {
        const rows = await extractDataFromSheet(file);
        parseSpreadsheetData(rows);
      } catch (err: any) {
        console.error(err);
        alert(`Failed to extract data from spreadsheet. ${err?.message || ''}`);
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } else {
      alert('Only .csv, .xlsx, or .xls files are supported.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const parseSpreadsheetData = (rows: any[][]) => {
    const newEquipments: (Equipment & { isDuplicate: boolean, keepDuplicate: boolean })[] = [];
    
    // Find Headers
    let headerRowIndex = 0;
    let nameIdx = -1;
    let typeIdx = -1;
    let sizeIdx = -1;
    let descriptionIdx = -1;

    // Scan first few rows to find headers
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const row = rows[i];
        if (!Array.isArray(row)) continue;
        
        const stringRow = row.map(cell => String(cell || '').toLowerCase().trim());
        const hasName = stringRow.findIndex(cell => cell && (cell.includes('name') || cell.includes('item')));
        
        if (hasName !== -1) {
            headerRowIndex = i;
            nameIdx = hasName;
            
            typeIdx = stringRow.findIndex(cell => cell && (cell.includes('type') || cell.includes('category')));
            sizeIdx = stringRow.findIndex(cell => cell && (cell.includes('size') || cell.includes('capacity') || cell.includes('volume')));
            descriptionIdx = stringRow.findIndex(cell => cell && (cell.includes('description') || cell.includes('note')));
            break;
        }
    }

    // Default mapping if no headers found
    if (nameIdx === -1) {
       nameIdx = 0;
       typeIdx = 1;
       sizeIdx = 2;
       descriptionIdx = 3;
    }

    // Parse Rows
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || !row[nameIdx]) continue;

      let name = String(row[nameIdx]).trim();
      let typeInput = typeIdx !== -1 && row[typeIdx] ? String(row[typeIdx]).trim() : '';
      let sizeInput = sizeIdx !== -1 && row[sizeIdx] ? String(row[sizeIdx]).trim() : '';
      let description = descriptionIdx !== -1 && row[descriptionIdx] ? String(row[descriptionIdx]).trim() : '';

      if (!name) continue;

      let type: 'Equipment' | 'Application' = 'Equipment';
      if (typeInput.toLowerCase().includes('application') || typeInput.toLowerCase().includes('app')) {
        type = 'Application';
      }

      const isDuplicate = existingEquipments.some(
        (eq) => eq.name.toLowerCase() === name.toLowerCase()
      );

      newEquipments.push({
        id: crypto.randomUUID(),
        name,
        type,
        size: sizeInput,
        description,
        isDuplicate,
        keepDuplicate: !isDuplicate,
      });
    }

    setParsedEquipments(newEquipments);
    setImportMode('confirm');
  };

  const handleConfirmImport = () => {
    const toImport = parsedEquipments
      .filter((eq) => eq.keepDuplicate)
      .map(({ isDuplicate, keepDuplicate, ...rest }) => rest);
    
    if (toImport.length > 0) {
      onImport(toImport);
    }
    onClose();
  };

  const sampleData = `Name\tType\tSize\tDescription
Beaker\tEquipment\t100ml\tGlass beaker for mixing
Atomizer\tApplication\t50ml\tFine mist spray bottle
Magnetic Stirrer\tEquipment\tOne Size\tFor mixing compounds`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-app-card rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-app-border overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-app-border bg-app-bg">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-app-text">Import Equipment</h3>
            <button 
                onClick={() => setShowHelp(!showHelp)}
                className="text-app-muted hover:text-app-accent hover:bg-app-accent/10 p-1.5 rounded-full transition-colors"
                title="Show Import Format Help"
            >
                <HelpCircle size={18} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-app-muted hover:text-app-text transition-colors p-2 hover:bg-app-bg rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-app-bg/50">
          {showHelp && (
            <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-16 translate-x-16 blur-2xl pointer-events-none"></div>
                <div className="flex items-start gap-3 relative z-10">
                    <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-semibold text-blue-500 mb-1">How to perfectly format your import file</h4>
                        <p className="text-sm text-app-text/90 mb-3">
                            The system will try to auto-detect your columns if they have the right header names. Your spreadsheet (Excel or CSV) should ideally have a header row with the following column names:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="bg-app-card border border-app-border rounded-md p-3">
                                <span className="text-xs font-bold text-app-muted uppercase tracking-wider block mb-1">Column 1</span>
                                <span className="font-medium text-app-text">Name</span>
                                <p className="text-xs text-app-muted mt-1">Required. The equipment name.</p>
                            </div>
                            <div className="bg-app-card border border-app-border rounded-md p-3">
                                <span className="text-xs font-bold text-app-muted uppercase tracking-wider block mb-1">Column 2</span>
                                <span className="font-medium text-app-text">Type</span>
                                <p className="text-xs text-app-muted mt-1">"Equipment" or "Application".</p>
                            </div>
                            <div className="bg-app-card border border-app-border rounded-md p-3">
                                <span className="text-xs font-bold text-app-muted uppercase tracking-wider block mb-1">Column 3</span>
                                <span className="font-medium text-app-text">Size</span>
                                <p className="text-xs text-app-muted mt-1">Optional. Output capacity or dimension.</p>
                            </div>
                            <div className="bg-app-card border border-app-border rounded-md p-3">
                                <span className="text-xs font-bold text-app-muted uppercase tracking-wider block mb-1">Column 4</span>
                                <span className="font-medium text-app-text">Description</span>
                                <p className="text-xs text-app-muted mt-1">Optional. Details.</p>
                            </div>
                        </div>
                        <div className="mt-4 bg-app-card border border-app-border p-3 rounded-md">
                           <div className="flex justify-between items-center mb-2">
                               <span className="text-sm font-medium text-app-text">Example Data:</span>
                               <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(sampleData);
                                    alert("Copied sample data to clipboard! Paste it into Excel.");
                                }}
                                className="flex items-center gap-1.5 text-xs bg-app-bg hover:bg-app-accent hover:text-white border border-app-border px-2 py-1 rounded transition-colors text-app-muted"
                                >
                                    <Copy size={12} /> Copy to Clipboard
                               </button>
                           </div>
                           <pre className="text-xs text-app-muted overflow-x-auto p-2 bg-app-bg rounded border border-app-border">
{sampleData}
                           </pre>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {importMode === 'upload' ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-app-border rounded-xl bg-app-card">
              <Upload size={48} className="text-app-muted mb-4" />
              <h4 className="text-lg font-medium text-app-text mb-2">
                Drop your spreadsheet here
              </h4>
              <p className="text-app-muted text-center max-w-sm mb-6">
                Supports .xlsx, .xls, and .csv files. We'll automatically identify columns based on headings.
              </p>
              
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
                id="file-upload"
                ref={fileInputRef}
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
              <label
                htmlFor="file-upload"
                className={`flex items-center gap-2 px-6 py-3 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover transition-colors shadow-sm cursor-pointer ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {isProcessing ? 'Processing...' : 'Browse Files'}
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-end bg-app-card p-4 rounded-lg border border-app-border">
                <div>
                  <h4 className="font-semibold text-app-text text-lg">Review Import</h4>
                  <p className="text-sm text-app-muted mt-1">
                    Found {parsedEquipments.length} items. Please review duplicates before saving.
                  </p>
                </div>
                <div className="flex gap-2">
                   <button
                    onClick={() => {
                        const allSelected = parsedEquipments.every(m => m.keepDuplicate);
                        setParsedEquipments(parsedEquipments.map(m => ({ ...m, keepDuplicate: !allSelected })));
                    }}
                    className="text-sm px-3 py-1.5 bg-app-bg border border-app-border text-app-text rounded-md hover:bg-app-card transition-colors"
                   >
                       {parsedEquipments.every(m => m.keepDuplicate) ? 'Deselect All' : 'Select All'}
                   </button>
                </div>
              </div>

              <div className="bg-app-card border border-app-border rounded-lg overflow-hidden shadow-sm">
                <div className="max-h-[50vh] overflow-auto">
                    <table className="w-full text-left text-sm">
                    <thead className="bg-app-bg sticky top-0 z-10">
                        <tr className="border-b border-app-border">
                        <th className="p-3 w-12 text-center">
                            <Check size={16} className="mx-auto text-app-muted" />
                        </th>
                        <th className="p-3 font-semibold text-app-text">Name</th>
                        <th className="p-3 font-semibold text-app-text">Type</th>
                        <th className="p-3 font-semibold text-app-text">Size</th>
                        <th className="p-3 font-semibold text-app-text">Description</th>
                        <th className="p-3 font-semibold text-app-text">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                        {parsedEquipments.map((eq, idx) => (
                        <tr key={idx} className={`hover:bg-app-bg/50 transition-colors ${!eq.keepDuplicate ? 'opacity-50 bg-app-bg' : ''}`}>
                            <td className="p-3 text-center">
                            <input
                                type="checkbox"
                                checked={eq.keepDuplicate}
                                onChange={(e) => {
                                const newParsed = [...parsedEquipments];
                                newParsed[idx].keepDuplicate = e.target.checked;
                                setParsedEquipments(newParsed);
                                }}
                                className="rounded border-app-border text-app-accent focus:ring-app-accent cursor-pointer"
                            />
                            </td>
                            <td className="p-3 font-medium text-app-text">{eq.name}</td>
                            <td className="p-3 text-app-muted">{eq.type}</td>
                            <td className="p-3 text-app-muted">{eq.size}</td>
                            <td className="p-3 text-app-muted truncate max-w-[200px]" title={eq.description}>{eq.description}</td>
                            <td className="p-3">
                            {eq.isDuplicate ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/10 text-yellow-600 text-xs font-medium border border-yellow-500/20">
                                <AlertTriangle size={12} />
                                Duplicate
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 text-green-600 text-xs font-medium border border-green-500/20">
                                <Check size={12} />
                                New
                                </span>
                            )}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {importMode === 'confirm' && (
          <div className="flex justify-end gap-3 p-6 border-t border-app-border bg-app-bg">
            <button
              onClick={() => {
                setImportMode('upload');
                setParsedEquipments([]);
              }}
              className="px-4 py-2 text-app-text hover:bg-app-card rounded-md font-medium border border-app-border transition-colors bg-app-bg"
            >
              Back
            </button>
            <button
              onClick={handleConfirmImport}
              className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover transition-colors font-medium shadow-sm flex items-center gap-2"
              disabled={!parsedEquipments.some(m => m.keepDuplicate)}
            >
              <Save size={18} />
              Import {parsedEquipments.filter(m => m.keepDuplicate).length} Items
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
