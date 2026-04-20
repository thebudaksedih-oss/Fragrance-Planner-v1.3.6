import React, { useState, useRef } from 'react';
import { X, Upload, Save, AlertTriangle, FileText, Check, Copy } from 'lucide-react';
import { RawMaterial } from '../types';
import { extractDataFromSheet } from '../lib/sheetUtils';
import { useConfirm } from '../hooks/useConfirm';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (materials: RawMaterial[]) => void;
  existingMaterials: RawMaterial[];
}

export default function ImportMaterialsModal({ isOpen, onClose, onImport, existingMaterials }: Props) {
  const [importMode, setImportMode] = useState<'upload' | 'confirm'>('upload');
  const [parsedMaterials, setParsedMaterials] = useState<(RawMaterial & { isDuplicate: boolean, keepDuplicate: boolean })[]>([]);
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
    const newMaterials: (RawMaterial & { isDuplicate: boolean, keepDuplicate: boolean })[] = [];
    
    // Find Headers
    let headerRowIndex = 0;
    let nameIdx = -1;
    let casIdx = -1;
    let typeIdx = -1;
    let familyIdx = -1;
    let descriptionIdx = -1;

    // Scan first few rows to find headers
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const row = rows[i];
        if (!Array.isArray(row)) continue;
        
        const stringRow = row.map(cell => String(cell || '').toLowerCase().trim());
        const hasName = stringRow.findIndex(cell => cell && (cell.includes('name') || cell.includes('commercial name') || cell.includes('ingredient')));
        const hasCas = stringRow.findIndex(cell => cell && cell.includes('cas'));
        
        if (hasName !== -1) {
            headerRowIndex = i;
            nameIdx = hasName;
            casIdx = hasCas;
            
            familyIdx = stringRow.findIndex(cell => cell && (cell === 'family' || cell.includes('olfactory') || cell.includes('family')));
            typeIdx = stringRow.findIndex(cell => cell && (cell === 'type' || cell === 'category' || cell === 'item type'));
            
            if (familyIdx === -1 && typeIdx === -1) {
                const combinedIdx = stringRow.findIndex(cell => cell && (cell.includes('type') || cell.includes('family')));
                typeIdx = combinedIdx;
                familyIdx = combinedIdx;
            } else if (familyIdx === -1) {
                familyIdx = typeIdx;
            } else if (typeIdx === -1) {
                typeIdx = familyIdx;
            }

            descriptionIdx = stringRow.findIndex(cell => cell && (cell.includes('description') || cell.includes('note')));
            break;
        }
    }

    // Default mapping if no headers found
    if (nameIdx === -1) {
       nameIdx = 0;
       casIdx = 1;
       typeIdx = 2;
       familyIdx = 2;
    }

    const OLFACTORY_FAMILIES: Record<string, string[]> = {
      'Citrus': ['Citrus Aromatic', 'Citrus Floral', 'Citrus Woody', 'Citrus Gourmand', 'Citrus Green', 'Citrus Musk'],
      'Floral': ['Soliflore (Single Floral)', 'Floral Bouquet', 'Floral Aldehydic', 'Floral Fruity', 'Floral Green', 'Floral Woody', 'Floral Aquatic', 'Floral Powdery', 'Floral Musky', 'Floral Gourmand', 'Indolic', 'Creamy'],
      'Fougère': ['Aromatic Fougère', 'Fresh Fougère', 'Woody Fougère', 'Oriental Fougère', 'Green Fougère'],
      'Chypre': ['Fruity Chypre', 'Floral Chypre', 'Green Chypre', 'Leather Chypre', 'Woody Chypre', 'Modern Chypre'],
      'Woody': ['Woody Aromatic', 'Woody Spicy', 'Woody Floral', 'Woody Amber', 'Woody Musky', 'Dry Woods', 'Creamy Woods', 'Earthy', 'Oriental', 'Smoky', 'Leathery', 'Soft', 'Clean'],
      'Amber': ['Soft Amber', 'Amber Spicy', 'Amber Floral', 'Amber Woody', 'Amber Vanilla', 'Amber Gourmand', 'Amber Resinous'],
      'Leather': ['Leather Floral', 'Leather Woody', 'Leather Smoky', 'Leather Animalic', 'Leather Tobacco'],
      'Fresh': ['Aquatic (Marine)', 'Green', 'Aromatic', 'Citrus Fresh', 'Ozonic'],
      'Fruity': ['Fresh', 'Sweet', 'Dark', 'Tropical', 'Citrus', 'Fruity Floral', 'Fruity Gourmand', 'Fruity Woody', 'Fruity Musky', 'Fruity Green', 'Fruity Aquatic', 'Fruity Spicy', 'Fruity Amber', 'Fruity Chypre'],
      'Gourmand': ['Vanilla', 'Caramel', 'Chocolate', 'Coffee', 'Nutty', 'Sweet Dessert', 'Amber', 'Sweet', 'Bitter', 'Roasted'],
      'Musk': ['Clean Musk', 'Powdery Musk', 'Skin Musk', 'Animalic Musk', 'Soft Musk'],
      'Spicy': ['Fresh Spicy (Pepper, Ginger)', 'Warm Spicy (Cinnamon, Clove)', 'Aromatic Spicy', 'Citrus', 'Oriental'],
      'Resinous / Balsamic': ['Incense', 'Myrrh', 'Frankincense', 'Balsams', 'Labdanum', 'Smoky', 'Oriental'],
      'Animalic': ['Civet', 'Castoreum', 'Ambergris', 'Leather Animalic', 'Earthy', 'Gourmand'],
      'Oakmoss': ['Tree Moss', 'Forest Moss', 'Earthy Moss', 'Damp Moss', 'Mossy Chypre', 'Mossy Woody', 'Mossy Green', 'Mossy Floral', 'Mossy Leather', 'Mossy Amber', 'Mossy Spicy', 'Mossy Aromatic', 'Mossy Musky', 'Mossy Earthy'],
      'Aromatic': ['Herbal Aromatic', 'Green Aromatic', 'Fresh Aromatic', 'Dry Aromatic', 'Camphoraceous Aromatic', 'Aromatic Citrus', 'Aromatic Floral', 'Aromatic Woody', 'Aromatic Spicy', 'Aromatic Fougere', 'Aromatic Aquatic', 'Aromatic Musky', 'Aromatic Amber', 'Aromatic Green', 'Aromatic Fruity'],
      'Green': ['Leafy Green', 'Grassy Green', 'Herbal Green', 'Vegetal Green', 'Bitter Green', 'Metallic', 'Aquatic', 'Green Floral', 'Green Fruity', 'Green Citrus', 'Green Aromatic', 'Green Woody', 'Green Aquatic', 'Green Musky', 'Green Spicy', 'Green Chypre', 'Green Moss'],
      'Powdery': ['Soft Powdery', 'Dry Powdery', 'Sweet Powdery', 'Cosmetic Powdery', 'Dusty Powdery', 'Powdery Floral', 'Powdery Musky', 'Powdery Woody', 'Powdery Amber', 'Powdery Gourmand', 'Powdery Fruity', 'Powdery Green', 'Powdery Aldehydic', 'Powdery Iris', 'Powdery Violet']
    };

    // Parse Rows
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || !row[nameIdx]) continue;

      let name = String(row[nameIdx]).trim();
      let casNumber = casIdx !== -1 && row[casIdx] ? String(row[casIdx]).trim() : '';
      let typeInput = typeIdx !== -1 && row[typeIdx] ? String(row[typeIdx]).trim() : '';
      let familyInput = familyIdx !== -1 && row[familyIdx] ? String(row[familyIdx]).trim() : '';
      let description = descriptionIdx !== -1 && row[descriptionIdx] ? String(row[descriptionIdx]).trim() : '';

      if (!name) continue;

      // Extract typical type mapping from catalog "Family" or "Type" columns
      let type = 'raw_material';
      let character = '';
      if (typeInput) {
         const tl = typeInput.toLowerCase();
         if (tl.includes('essential oil') || tl.includes('natural oil')) type = 'natural_oil';
         else if (tl.includes('absolute')) type = 'absolute';
         else if (tl.includes('labdanum') && tl.includes('absolute')) type = 'labdanum_absolute';
         else if (tl.includes('labdanum')) type = 'labdanum';
         else if (tl.includes('oil')) type = 'oil';
         else if (tl.includes('solvent')) type = 'solvent';
         
         character = typeInput; // Store raw input as character for context
      }

      let mainFamily: string | undefined;
      let subFamily: string | undefined;

      if (familyInput) {
        const fi = familyInput.toLowerCase();
        
        // 1. Try to find an exactly matching sub-family (more specific)
        for (const [main, subs] of Object.entries(OLFACTORY_FAMILIES)) {
          for (const sub of subs) {
            const subLower = sub.toLowerCase();
            // Match if input contains the sub-family name or if full match
            if (fi === subLower || fi.includes(subLower)) {
              mainFamily = main;
              subFamily = sub;
              break;
            }
          }
          if (mainFamily) break;
        }

        // 2. If no sub-family matched, check for main family keywords
        if (!mainFamily) {
          for (const [main, subs] of Object.entries(OLFACTORY_FAMILIES)) {
            const mainLower = main.toLowerCase();
            const mainParts = mainLower.split(/[\/\s()]/).filter(p => p.length > 2); // get meaningful parts like "amber", "resinous", "balsamic"
            
            const isMatch = fi === mainLower || fi.includes(mainLower) || 
                           mainParts.some(part => fi.includes(part)) ||
                           (main === 'Fougère' && fi.includes('fougere')) ||
                           (main === 'Amber' && fi.includes('oriental')) ||
                           (main === 'Oakmoss' && (fi.includes('moss') || fi.includes('oak'))) ||
                           (main === 'Resinous / Balsamic' && (fi.includes('resin') || fi.includes('balsam')));

            if (isMatch) {
              mainFamily = main;
              // Pick the first sub as default or a generic one if possible
              subFamily = subs[0];
              break;
            }
          }
        }
      }

      const isDuplicate = existingMaterials.some(m => {
        const nameA = (m.name || '').toLowerCase().trim();
        const nameB = (name || '').toLowerCase().trim();
        if (nameA === nameB) return true;
        // Identify similar names with slight differences
        if (nameA.length > 4 && nameB.includes(nameA)) return true;
        if (nameB.length > 4 && nameA.includes(nameB)) return true;
        
        // Also flag as duplicate if CAS numbers match
        if (casNumber && m.casNumber) {
          const firstCas = String(casNumber).split(' / ')[0].split(',')[0];
          if (String(m.casNumber).includes(firstCas)) return true;
        }
        return false;
      });

      newMaterials.push({
        id: crypto.randomUUID(),
        name,
        casNumber: casNumber || undefined,
        description: description || undefined,
        type: 'raw_material', // Primary deprecated type
        types: [type],
        mainFamily,
        subFamily,
        character,
        isDiluted: false,
        isDuplicate,
        keepDuplicate: !isDuplicate 
      });
    }
    setParsedMaterials(newMaterials);
    setImportMode('confirm');
  };

  const handleFinalize = () => {
    const toImport = parsedMaterials
      .filter(m => !m.isDuplicate || m.keepDuplicate)
      .map(m => {
        const { isDuplicate, keepDuplicate, ...rest } = m;
        return rest;
      });
    
    onImport(toImport);
    handleClose();
  };

  const handleClose = () => {
    setImportMode('upload');
    setParsedMaterials([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-app-bg max-w-2xl w-full rounded-2xl shadow-2xl border border-app-border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-app-border flex justify-between items-center bg-app-card sticky top-0">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Upload className="text-app-accent" />
              Import Materials (Spreadsheet)
            </h2>
            <p className="text-xs text-app-muted mt-1 uppercase tracking-wider font-bold">
              Cannot be undone. Please ensure you have backups.
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-app-bg rounded-full transition-colors text-app-muted">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {importMode === 'upload' && (
            <div className="space-y-6 text-center">
              <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-xl flex items-start text-left gap-3">
                <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                <div className="text-sm shadow-sm font-medium">
                  <strong>Warning:</strong> Imported materials will be merged into your database permanently.
                </div>
              </div>
              <div className="bg-app-card border border-app-border p-4 rounded-xl text-left">
                <h3 className="font-bold text-sm mb-2 text-app-text">Supported Spreadsheet Format</h3>
                <p className="text-xs text-app-muted space-y-1">
                  Upload a <strong>.CSV, .XLSX, or .XLS</strong> file. The system will auto-detect columns with headers like "Name", "CAS", and "Family" or default to using columns left-to-right.
                </p>
              </div>
              
               <div 
                  className="border-2 border-dashed border-app-border rounded-xl p-12 hover:border-app-accent hover:bg-app-accent/5 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="mx-auto h-12 w-12 text-app-muted mb-4" />
                  <p className="font-medium text-app-text mb-1">Click to select CSV / Excel file</p>
                  <p className="text-sm text-app-muted">Extracts rows intelligently for material import</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                  />
                </div>
                {isProcessing && <p className="text-app-accent animate-pulse">Processing spreadsheet data...</p>}
            </div>
          )}

          {importMode === 'confirm' && (
            <div className="space-y-4">
              <h3 className="font-bold text-app-text flex items-center justify-between">
                <span>Confirm Import ({parsedMaterials.length} found)</span>
              </h3>
              
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                {parsedMaterials.map((m, i) => (
                  <div key={i} className={`p-4 rounded-xl border flex flex-col md:flex-row gap-4 items-center justify-between ${m.isDuplicate ? 'bg-red-500/5 border-red-500/20' : 'bg-app-card border-app-border'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-app-text truncate flex items-center gap-2">
                        {m.name}
                        {m.isDuplicate && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded uppercase font-black tracking-wider">Duplicate</span>}
                      </div>
                      <div className="text-xs text-app-muted mt-1 flex flex-wrap gap-2">
                        <span className="bg-app-bg px-2 py-0.5 rounded border border-app-border truncate">{m.type || 'Unknown'}</span>
                        {m.casNumber && <span className="bg-app-bg px-2 py-0.5 rounded border border-app-border truncate font-mono text-app-accent">CAS: {m.casNumber}</span>}
                        {m.character && <span className="bg-app-bg px-2 py-0.5 rounded border border-app-border truncate">{m.character}</span>}
                        {m.mainFamily && <span className="bg-app-bg px-2 py-0.5 rounded border border-app-border text-yellow-500 truncate">{m.mainFamily}{m.subFamily ? ` / ${m.subFamily}` : ''}</span>}
                      </div>
                    </div>
                    {m.isDuplicate && (
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-xs flex items-center gap-1.5 font-medium whitespace-nowrap bg-app-bg px-2 py-1.5 rounded-md border border-app-border cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={m.keepDuplicate}
                            onChange={(e) => {
                              const newMats = [...parsedMaterials];
                              newMats[i].keepDuplicate = e.target.checked;
                              setParsedMaterials(newMats);
                            }}
                            className="bg-app-card border-app-border text-app-accent rounded focus:ring-app-accent"
                          />
                          Keep Both
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
                <button onClick={() => setImportMode('upload')} className="px-4 py-2 rounded-lg border border-app-border hover:bg-app-card">Cancel</button>
                <button onClick={handleFinalize} className="px-5 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover font-medium flex items-center gap-2">
                  <Check size={18} />
                  Import Selected
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
