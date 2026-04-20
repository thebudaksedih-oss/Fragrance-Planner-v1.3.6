import React, { useState, useRef } from 'react';
import { X, Upload, Check, AlertTriangle, FileText, LayoutTemplate, FlaskConical, Beaker } from 'lucide-react';
import { Formula, RawMaterial, Material } from '../types';
import { extractDataFromSheet } from '../lib/sheetUtils';
import { useConfirm } from '../hooks/useConfirm';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (formula: Formula, newMaterials: RawMaterial[]) => void;
  existingMaterials: RawMaterial[];
}

export default function ImportFormulaModal({ isOpen, onClose, onImport, existingMaterials }: Props) {
  const [importMode, setImportMode] = useState<'select' | 'upload' | 'text' | 'review' | 'confirm'>('select');
  const [formulaType, setFormulaType] = useState<'formula' | 'accord'>('formula');
  const [extractedText, setExtractedText] = useState('');
  const [parsedName, setParsedName] = useState('Imported Formula');
  const [parsedCapacity, setParsedCapacity] = useState<number | ''>('');
  const [parsedMaterials, setParsedMaterials] = useState<Material[]>([]);
  const [createdRawMaterials, setCreatedRawMaterials] = useState<RawMaterial[]>([]);
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
        setParsedName(file.name.replace(/\.[^/.]+$/, ''));
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
    const newMaterials: Material[] = [];
    const newRaw: RawMaterial[] = [];
    
    // Find Headers
    let headerRowIndex = 0;
    let nameIdx = -1;
    let amountIdx = -1;
    let unitIdx = -1;

    for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const row = rows[i];
        if (!Array.isArray(row)) continue;
        
        const stringRow = row.map(cell => String(cell || '').toLowerCase().trim());
        const hasName = stringRow.findIndex(cell => cell && (cell.includes('name') || cell.includes('ingredient') || cell.includes('material')));
        const hasAmount = stringRow.findIndex(cell => cell && (cell.includes('amount') || cell.includes('qty') || cell.includes('quantity') || cell.includes('%') || cell.includes('percentage')));
        
        if (hasName !== -1) {
            headerRowIndex = i;
            nameIdx = hasName;
            amountIdx = hasAmount;
            unitIdx = stringRow.findIndex(cell => cell && (cell === 'unit' || cell === 'uom'));
            break;
        }
    }

    if (nameIdx === -1) {
       nameIdx = 0;
       amountIdx = 1;
    }

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || !row[nameIdx]) continue;

      let nameStr = String(row[nameIdx]).trim();
      if (!nameStr) continue;

      let amountRaw = amountIdx !== -1 ? String(row[amountIdx]).trim() : '';
      let unitStr = unitIdx !== -1 && row[unitIdx] ? String(row[unitIdx]).trim().toLowerCase() : 'g';

      // Clean amount: e.g. "12.5g" -> 12.5, unit = g
      let amount = parseFloat(amountRaw);
      if (isNaN(amount)) {
         // Maybe it's combined like 12.5g in the amount column without a unit column
         const match = amountRaw.match(/([\d.]+)\s*(g|ml|mg|drops|%)?/i);
         if (match) {
            amount = parseFloat(match[1]);
            if (match[2]) unitStr = match[2].toLowerCase();
         }
      }

      if (!isNaN(amount) && nameStr.length > 2) {
          let unit: any = 'g';
          if (['g', 'ml', 'drops', '%', 'mg'].includes(unitStr)) unit = unitStr;
          if (amountRaw.includes('%')) unit = '%'; // Hard override if % symbol was inside the cell

          // Find existing
          let rawMat = existingMaterials.find(m => m.name.toLowerCase() === nameStr.toLowerCase());
          if (!rawMat) {
            rawMat = newRaw.find(m => m.name.toLowerCase() === nameStr.toLowerCase());
          }

          if (!rawMat) {
            rawMat = {
              id: crypto.randomUUID(),
              name: nameStr,
              type: 'raw_material',
              types: ['raw_material'],
              isDiluted: false
            };
            newRaw.push(rawMat);
          }

          const isPercentage = unit === '%';
          newMaterials.push({
            id: crypto.randomUUID(),
            rawMaterialId: rawMat.id,
            percentage: isPercentage ? amount : 0,
            amount: !isPercentage ? amount : undefined,
            unit: !isPercentage ? unit : undefined
          });
      }
    }

    setParsedMaterials(newMaterials);
    setCreatedRawMaterials(newRaw);
    setImportMode('confirm');
  };

  const parseTextAndReview = () => {
    const lines = extractedText.split('\n').filter(l => l.trim().length > 0);
    const newMaterials: Material[] = [];
    const newRaw: RawMaterial[] = [];
    
    let capacityExtract: number | '' = '';
    let isExtractingCapacity = false;

    // Simple heuristic parser
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('capacity') || lower.includes('total') || lower.includes('amount')) {
        const match = lower.match(/[\d.]+/);
        if (match && !capacityExtract) {
          capacityExtract = parseFloat(match[0]);
        }
      }

      // Try to split logic: Name - Amount (optional Unit)
      // We look for a number in the line
      const numberMatch = line.match(/([\d.]+)\s*(g|ml|mg|drops|%)?/i);
      
      if (numberMatch && numberMatch.index && numberMatch.index > 0) {
        let nameStr = line.substring(0, numberMatch.index).replace(/[^a-zA-Z0-9 -]/g, '').trim();
        if (nameStr.length > 2) {
          const amount = parseFloat(numberMatch[1]);
          const unitStr = numberMatch[2]?.toLowerCase() || 'g';
          let unit: any = 'g';
          if (['g', 'ml', 'drops', '%', 'mg'].includes(unitStr)) unit = unitStr;

          // Find existing
          let rawMat = existingMaterials.find(m => m.name.toLowerCase() === nameStr.toLowerCase());
          if (!rawMat) {
            rawMat = newRaw.find(m => m.name.toLowerCase() === nameStr.toLowerCase());
          }

          if (!rawMat) {
            rawMat = {
              id: crypto.randomUUID(),
              name: nameStr,
              type: 'raw_material',
              types: ['raw_material'],
              isDiluted: false
            };
            newRaw.push(rawMat);
          }

          const isPercentage = unit === '%';
          newMaterials.push({
            id: crypto.randomUUID(),
            rawMaterialId: rawMat.id,
            percentage: isPercentage ? amount : 0,
            amount: !isPercentage ? amount : undefined,
            unit: !isPercentage ? unit : undefined
          });
        }
      }
    }

    setParsedMaterials(newMaterials);
    setCreatedRawMaterials(newRaw);
    if (capacityExtract) setParsedCapacity(capacityExtract);
    setImportMode('confirm');
  };

  const handleFinalize = () => {
    const newFormula: Formula = {
      id: crypto.randomUUID(),
      name: parsedName || 'Imported Formula',
      type: formulaType,
      accordCapacity: parsedCapacity ? Number(parsedCapacity) : undefined,
      materials: parsedMaterials,
      alcohols: [],
      fragranceOils: []
    };
    onImport(newFormula, createdRawMaterials);
    handleClose();
  };

  const handleClose = () => {
    setImportMode('select');
    setParsedMaterials([]);
    setCreatedRawMaterials([]);
    setExtractedText('');
    setParsedName('Imported Formula');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-app-bg max-w-3xl w-full rounded-2xl shadow-2xl border border-app-border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-app-border flex justify-between items-center bg-app-card sticky top-0">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <LayoutTemplate className="text-app-accent" />
              Import Formula
              <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-1 rounded uppercase tracking-wider font-black border border-red-500/30">
                Experimental
              </span>
            </h2>
            <p className="text-xs text-app-muted mt-1 font-medium">
              Extract formulas from PDF or text. Prone to errors, please review before finalizing.
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-app-bg rounded-full transition-colors text-app-muted">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {importMode === 'select' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => setFormulaType('formula')}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${formulaType === 'formula' ? 'border-app-accent bg-app-accent/5' : 'border-app-border bg-app-card hover:border-app-muted'}`}
                >
                  <FlaskConical className={`mb-2 ${formulaType === 'formula' ? 'text-app-accent' : 'text-app-muted'}`} />
                  <div className="font-bold">Normal Formula</div>
                  <div className="text-xs text-app-muted mt-1">Import a complete fragrance formula</div>
                </div>
                <div 
                  onClick={() => setFormulaType('accord')}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${formulaType === 'accord' ? 'border-app-accent bg-app-accent/5' : 'border-app-border bg-app-card hover:border-app-muted'}`}
                >
                  <Beaker className={`mb-2 ${formulaType === 'accord' ? 'text-app-accent' : 'text-app-muted'}`} />
                  <div className="font-bold">Accord Formula</div>
                  <div className="text-xs text-app-muted mt-1">Import an accord block or base</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div 
                   className="border-2 border-dashed border-app-border rounded-xl p-8 hover:border-app-accent hover:bg-app-accent/5 transition-colors cursor-pointer text-center"
                   onClick={() => fileInputRef.current?.click()}
                 >
                   <Upload className="mx-auto h-8 w-8 text-app-muted mb-3" />
                   <div className="font-medium">Import Spreadsheet (CSV/XLSX)</div>
                   <input
                     type="file"
                     ref={fileInputRef}
                     onChange={handleFileUpload}
                     accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                     className="hidden"
                   />
                 </div>
                 <div 
                   className="border-2 border-dashed border-app-border rounded-xl p-8 hover:border-app-accent hover:bg-app-accent/5 transition-colors cursor-pointer text-center"
                   onClick={() => setImportMode('text')}
                 >
                   <FileText className="mx-auto h-8 w-8 text-app-muted mb-3" />
                   <div className="font-medium">Paste Text (TXT)</div>
                 </div>
              </div>
            </div>
          )}

          {importMode === 'text' && (
            <div className="space-y-4">
              <div className="bg-app-card border border-app-border p-4 rounded-xl">
                <h3 className="font-bold text-sm mb-2 text-app-text">Perfect Formatting Guide</h3>
                <p className="text-xs text-app-muted">
                  For the best accuracy, format your text like this:<br/>
                  <code className="text-[10px] bg-app-bg px-1 py-0.5 rounded text-app-accent">Material Name  12.5g</code><br/>
                  <code className="text-[10px] bg-app-bg px-1 py-0.5 rounded text-app-accent">Material Name  5%</code><br/>
                  Include words like "Capacity: 100ml" to auto-detect formula capacity.
                </p>
              </div>
              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="w-full h-64 p-4 text-sm font-mono bg-app-card border border-app-border rounded-xl focus:ring-1 focus:ring-app-accent"
                placeholder="Paste your formula text here..."
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setImportMode('select')} className="px-4 py-2 rounded-lg border border-app-border hover:bg-app-card">Back</button>
                <button onClick={() => { setImportMode('review'); parseTextAndReview(); }} className="px-5 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover font-medium">Parse Text</button>
              </div>
            </div>
          )}

          {importMode === 'review' && (
            <div className="space-y-4">
              <div className="bg-app-card border border-app-border p-4 rounded-xl">
                <h3 className="font-bold text-sm mb-2 text-app-text">Review Extracted Text</h3>
                <p className="text-xs text-app-muted">
                  Fix any formatting errors before parsing. Ideal format: <code className="text-[10px] bg-app-bg px-1 py-0.5 rounded text-app-accent">Material 10g</code>
                </p>
              </div>
              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="w-full h-64 p-4 text-sm font-mono bg-app-card border border-app-border rounded-xl focus:ring-1 focus:ring-app-accent"
                placeholder="Edit text here..."
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setImportMode('select')} className="px-4 py-2 rounded-lg border border-app-border hover:bg-app-card">Back</button>
                <button onClick={parseTextAndReview} className="px-5 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover font-medium">Parse and Match</button>
              </div>
            </div>
          )}

          {importMode === 'confirm' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-app-muted mb-1">Formula Name</label>
                  <input
                    type="text"
                    value={parsedName}
                    onChange={(e) => setParsedName(e.target.value)}
                    className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-lg text-app-text"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-muted mb-1">Capacity Detected</label>
                  <input
                    type="number"
                    value={parsedCapacity}
                    onChange={(e) => setParsedCapacity(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-lg text-app-text"
                    placeholder="E.g. 100"
                  />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-bold text-sm mb-2 flex justify-between items-center">
                  <span>Importing {parsedMaterials.length} Materials</span>
                  {createdRawMaterials.length > 0 && (
                    <span className="text-xs text-app-accent border border-app-accent/30 bg-app-accent/10 px-2 py-0.5 rounded">
                      Will create {createdRawMaterials.length} new raw materials
                    </span>
                  )}
                </h3>
                <div className="border border-app-border rounded-xl overflow-hidden bg-app-card max-h-[40vh] overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-app-bg border-b border-app-border text-xs uppercase font-black text-app-muted tracking-wider sticky top-0">
                      <tr>
                        <th className="px-4 py-3">Ingredient</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3">Unit</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {parsedMaterials.map((m, i) => {
                        const isNew = createdRawMaterials.some(r => r.id === m.rawMaterialId);
                        const rawName = isNew 
                          ? createdRawMaterials.find(r => r.id === m.rawMaterialId)?.name 
                          : existingMaterials.find(r => r.id === m.rawMaterialId)?.name;
                        
                        return (
                          <tr key={i} className="hover:bg-app-bg">
                            <td className="px-4 py-3 font-medium text-app-text">{rawName || 'Unknown'}</td>
                            <td className="px-4 py-3 text-right">{m.percentage > 0 ? m.percentage : m.amount}</td>
                            <td className="px-4 py-3 text-app-muted">{m.percentage > 0 ? '%' : m.unit || 'g'}</td>
                            <td className="px-4 py-3">
                              {isNew ? (
                                <span className="text-[10px] bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded uppercase font-bold">New Material</span>
                              ) : (
                                <span className="text-[10px] bg-green-500/20 text-green-600 px-2 py-1 rounded uppercase font-bold">Matched</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {parsedMaterials.length === 0 && (
                    <div className="p-8 text-center text-app-muted">
                      No materials found. Check your formatting.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-app-border mt-6">
                <button onClick={() => setImportMode('select')} className="px-4 py-2 rounded-lg border border-app-border hover:bg-app-card">Start Over</button>
                <button 
                  onClick={handleFinalize} 
                  disabled={parsedMaterials.length === 0}
                  className="px-5 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <Check size={18} />
                  Complete Import
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
