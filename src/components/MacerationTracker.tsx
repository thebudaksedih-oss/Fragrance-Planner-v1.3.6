import React, { useState } from 'react';
import { Plus, Trash2, Clock, ChevronLeft, ArrowUp, ArrowDown, HelpCircle, Calendar, FlaskConical, Bell, CheckCircle2 } from 'lucide-react';
import { PlannedBatch, Fragrance, Maceration, Formula } from '../types';
import { useConfirm } from '../hooks/useConfirm';
import TutorialModal from './TutorialModal';

interface Props {
  plannedBatches: PlannedBatch[];
  fragrances: Fragrance[];
  macerations: Maceration[];
  setMacerations: React.Dispatch<React.SetStateAction<Maceration[]>>;
  formulas: Formula[];
}

export default function MacerationTracker({ plannedBatches, fragrances, macerations, setMacerations, formulas }: Props) {
  const [selectedEntryId, setSelectedEntryId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'manual' | 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'days-desc' | 'days-asc'>('manual');
  
  const [viewState, setViewState] = useState<'list' | 'detail'>('list');
  const [selectedMaceration, setSelectedMaceration] = useState<Maceration | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  const tutorialSteps = [
    {
      title: 'Maceration Tracking',
      content: 'Track the aging process of your perfume blends. Maceration is crucial for the scent to stabilize and develop its full character.',
      icon: <Clock size={40} />
    },
    {
      title: 'Batch Integration',
      content: 'Start tracking directly from your planned batches. You can track an entire batch or individual fragrance entries.',
      icon: <FlaskConical size={40} />
    },
    {
      title: 'Milestones',
      content: 'The tracker automatically calculates key milestones: 2 weeks, 1 month, and 2 months. These are standard check-in points.',
      icon: <Calendar size={40} />
    },
    {
      title: 'Status Updates',
      content: 'Use the detail view to see exactly how many days have passed and which milestones have been reached.',
      icon: <CheckCircle2 size={40} />
    }
  ];

  const handleStartTracking = () => {
    if (!selectedEntryId || !startDate) return;

    const isBatch = selectedEntryId.startsWith('batch_');
    let periodWeeks = 4; // Default

    if (!isBatch) {
      const details = findEntryDetails(selectedEntryId);
      const fragrance = fragrances.find(f => f.id === details?.entry.fragranceId);
      if (fragrance?.macerationPeriodWeeks) {
        periodWeeks = fragrance.macerationPeriodWeeks;
      }
    }
    
    const newMaceration: Maceration = {
      id: crypto.randomUUID(),
      type: isBatch ? 'batch' : 'single',
      batchId: isBatch ? selectedEntryId.replace('batch_', '') : undefined,
      blendEntryId: isBatch ? undefined : selectedEntryId,
      startDate: startDate,
      periodWeeks: periodWeeks,
    };

    setMacerations([...macerations, newMaceration]);
    setSelectedEntryId('');
  };

  const deleteMaceration = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    confirm('Delete Tracking', 'Are you sure you want to stop tracking this maceration?', () => {
      setMacerations(macerations.filter((m) => m.id !== id));
      if (selectedMaceration?.id === id) {
        setViewState('list');
        setSelectedMaceration(null);
      }
    });
  };

  const moveMaceration = (e: React.MouseEvent, id: string, direction: 'up' | 'down') => {
    e.stopPropagation();
    const index = macerations.findIndex(m => m.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === macerations.length - 1) return;
    
    const newMacerations = [...macerations];
    const temp = newMacerations[index];
    newMacerations[index] = newMacerations[index + (direction === 'up' ? -1 : 1)];
    newMacerations[index + (direction === 'up' ? -1 : 1)] = temp;
    
    setMacerations(newMacerations);
  };

  const updateMaceration = (id: string, updates: Partial<Maceration>) => {
    setMacerations(macerations.map(m => m.id === id ? { ...m, ...updates } : m));
    if (selectedMaceration?.id === id) {
      setSelectedMaceration({ ...selectedMaceration, ...updates });
    }
  };

  const calculateDates = (startStr: string, periodWeeks: number = 4) => {
    const start = new Date(startStr);
    
    const twoWeeks = new Date(start);
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    
    const oneMonth = new Date(start);
    oneMonth.setMonth(oneMonth.getMonth() + 1);
    
    const twoMonths = new Date(start);
    twoMonths.setMonth(twoMonths.getMonth() + 2);

    const readyDate = new Date(start);
    readyDate.setDate(readyDate.getDate() + (periodWeeks * 7));

    const now = new Date();
    const diffTime = now.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // If start date is in the future, days passed is 0
    const daysPassed = now < start ? 0 : diffDays;

    const totalDays = periodWeeks * 7;
    const progress = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
    const daysRemaining = Math.max(0, totalDays - daysPassed);
    const isReady = daysPassed >= totalDays;

    return {
      twoWeeks,
      oneMonth,
      twoMonths,
      readyDate,
      daysPassed,
      daysRemaining,
      progress,
      isReady,
      now
    };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper to find an entry and its batch
  const findEntryDetails = (entryId: string) => {
    for (const batch of plannedBatches) {
      const entry = batch.entries.find(e => e.id === entryId);
      if (entry) {
        return { batch, entry };
      }
    }
    return null;
  };

  const getMacerationInfo = (maceration: Maceration) => {
    if (maceration.type === 'batch') {
      const batch = plannedBatches.find(b => b.id === maceration.batchId);
      return {
        title: `📦 Batch: ${batch?.name || 'Unknown Batch'}`,
        subtitle: `${batch?.entries.length || 0} fragrances`,
        batch,
        fragrance: null,
      };
    } else {
      const details = maceration.blendEntryId ? findEntryDetails(maceration.blendEntryId) : null;
      const fragrance = fragrances.find((f) => f.id === details?.entry.fragranceId);
      const formula = formulas.find((f) => f.id === details?.entry.formulaId);
      const title = formula?.type === 'accord' 
        ? (details?.entry.customFragranceName || '~') 
        : (fragrance?.name || 'Unknown Fragrance');
        
      return {
        title,
        subtitle: `Batch: ${details?.batch.name || 'Unknown'} • ${formula?.type === 'accord' ? `${details?.entry.multiplier || 1}x` : `${details?.entry.capacityMl || '?'}mL`}`,
        batch: details?.batch,
        fragrance,
      };
    }
  };

  const filteredMacerations = macerations.filter(maceration => {
    const info = getMacerationInfo(maceration);
    const dates = calculateDates(maceration.startDate, maceration.periodWeeks);
    
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = info.title.toLowerCase().includes(q);
      const matchSubtitle = info.subtitle.toLowerCase().includes(q);
      const matchOgName = info.fragrance?.originalScent?.toLowerCase().includes(q);
      if (!matchTitle && !matchSubtitle && !matchOgName) return false;
    }

    // Filter by day
    if (dayFilter !== 'all') {
      const days = dates.daysPassed;
      if (dayFilter === '<14' && days >= 14) return false;
      if (dayFilter === '14-30' && (days < 14 || days >= 30)) return false;
      if (dayFilter === '30-60' && (days < 30 || days >= 60)) return false;
      if (dayFilter === '>60' && days < 60) return false;
      if (dayFilter === 'ready' && !dates.isReady) return false;
      if (dayFilter === 'aging' && dates.isReady) return false;
    }

    return true;
  });

  const getSortedMacerations = () => {
    let sorted = [...filteredMacerations];
    
    if (sortBy === 'date-desc') {
      sorted.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    } else if (sortBy === 'date-asc') {
      sorted.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    } else if (sortBy === 'name-asc') {
      sorted.sort((a, b) => {
        const infoA = getMacerationInfo(a);
        const infoB = getMacerationInfo(b);
        return infoA.title.localeCompare(infoB.title);
      });
    } else if (sortBy === 'name-desc') {
      sorted.sort((a, b) => {
        const infoA = getMacerationInfo(a);
        const infoB = getMacerationInfo(b);
        return infoB.title.localeCompare(infoA.title);
      });
    } else if (sortBy === 'days-desc') {
      sorted.sort((a, b) => {
        const daysA = calculateDates(a.startDate, a.periodWeeks).daysPassed;
        const daysB = calculateDates(b.startDate, b.periodWeeks).daysPassed;
        return daysB - daysA;
      });
    } else if (sortBy === 'days-asc') {
      sorted.sort((a, b) => {
        const daysA = calculateDates(a.startDate, a.periodWeeks).daysPassed;
        const daysB = calculateDates(b.startDate, b.periodWeeks).daysPassed;
        return daysA - daysB;
      });
    }
    
    return sorted;
  };

  if (viewState === 'detail' && selectedMaceration) {
    const dates = calculateDates(selectedMaceration.startDate, selectedMaceration.periodWeeks);
    const info = getMacerationInfo(selectedMaceration);

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setViewState('list'); setSelectedMaceration(null); }}
              className="p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-app-text">{info.title}</h2>
              <p className="text-app-muted text-sm">Started: {formatDate(new Date(selectedMaceration.startDate))}</p>
            </div>
          </div>
          <button
            onClick={() => deleteMaceration(selectedMaceration.id)}
            className="flex items-center gap-2 px-4 py-2 bg-app-card border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <Trash2 size={18} />
            Delete
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-app-card rounded-xl shadow-sm border border-app-border p-6">
              <div className="flex flex-col items-center justify-center gap-2 mb-6">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-app-bg"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray={364.4}
                      strokeDashoffset={364.4 - (364.4 * dates.progress) / 100}
                      strokeLinecap="round"
                      className={`${dates.isReady ? 'text-emerald-500' : 'text-app-accent'} transition-all duration-1000`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold ${dates.isReady ? 'text-emerald-500' : 'text-app-accent'}`}>{Math.round(dates.progress)}%</span>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <div className={`text-lg font-bold ${dates.isReady ? 'text-emerald-600' : 'text-app-text'}`}>
                    {dates.isReady ? 'Ready to Bottle' : 'Still Aging'}
                  </div>
                  <div className="text-sm text-app-muted">
                    {dates.isReady ? 'Maceration complete' : `${dates.daysRemaining} days remaining`}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3 rounded-md border border-app-border bg-app-bg">
                  <label className="block text-[10px] font-bold text-app-muted uppercase mb-1">Start Date</label>
                  <input 
                    type="date"
                    value={selectedMaceration.startDate}
                    onChange={(e) => updateMaceration(selectedMaceration.id, { startDate: e.target.value })}
                    className="w-full px-2 py-1 text-sm bg-app-card border border-app-border rounded text-app-text focus:ring-1 focus:ring-app-accent outline-none"
                  />
                </div>

                <div className="p-3 rounded-md border border-app-border bg-app-bg">
                  <label className="block text-[10px] font-bold text-app-muted uppercase mb-1">Maceration Period</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      min="1"
                      value={selectedMaceration.periodWeeks || 4}
                      onChange={(e) => updateMaceration(selectedMaceration.id, { periodWeeks: parseInt(e.target.value) || 1 })}
                      className="w-16 px-2 py-1 text-sm bg-app-card border border-app-border rounded text-app-text focus:ring-1 focus:ring-app-accent outline-none"
                    />
                    <span className="text-sm text-app-text font-medium">Weeks</span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-md border border-app-border bg-app-bg">
                  <div>
                    <div className="text-sm font-medium text-app-text">Ready Date</div>
                    <div className="text-xs text-app-muted">{formatDate(dates.readyDate)}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${dates.isReady ? 'bg-emerald-500/10 text-emerald-600' : 'bg-app-accent/10 text-app-accent'}`}>
                    {dates.isReady ? 'Ready' : 'Aging'}
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-md border border-app-border bg-app-bg">
                  <div>
                    <div className="text-sm font-medium text-app-text">2 Weeks Milestone</div>
                    <div className="text-xs text-app-muted">{formatDate(dates.twoWeeks)}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${dates.now >= dates.twoWeeks ? 'bg-green-500/10 text-green-600' : 'bg-app-bg text-app-muted border border-app-border'}`}>
                    {dates.now >= dates.twoWeeks ? 'Reached' : 'Pending'}
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 rounded-md border border-app-border bg-app-bg">
                  <div>
                    <div className="text-sm font-medium text-app-text">1 Month Milestone</div>
                    <div className="text-xs text-app-muted">{formatDate(dates.oneMonth)}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${dates.now >= dates.oneMonth ? 'bg-green-500/10 text-green-600' : 'bg-app-bg text-app-muted border border-app-border'}`}>
                    {dates.now >= dates.oneMonth ? 'Reached' : 'Pending'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-app-card rounded-xl shadow-sm border border-app-border overflow-hidden">
              <div className="p-4 border-b border-app-border bg-app-bg/50">
                <h3 className="font-bold text-app-text">Contents</h3>
              </div>
              <div className="divide-y divide-app-border">
                {selectedMaceration.type === 'batch' && info.batch ? (
                  info.batch.entries.map(entry => {
                    const fragrance = fragrances.find(f => f.id === entry.fragranceId);
                    const formula = formulas.find(f => f.id === entry.formulaId);
                    return (
                      <div key={entry.id} className="p-4 hover:bg-app-bg/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-app-text">{formula?.type === 'accord' ? (entry.customFragranceName || '~') : (fragrance?.name || 'Unknown Fragrance')}</h4>
                            <p className="text-sm text-app-muted mt-1">Formula: <span className="font-medium text-app-accent">{formula?.name || 'Unknown'}</span></p>
                          </div>
                          <span className="text-sm font-medium text-app-muted bg-app-bg px-2 py-1 rounded border border-app-border">{formula?.type === 'accord' ? `${entry.multiplier || 1}x` : `${entry.capacityMl} mL`}</span>
                        </div>
                      </div>
                    );
                  })
                ) : selectedMaceration.type === 'single' && selectedMaceration.blendEntryId ? (
                  (() => {
                    const details = findEntryDetails(selectedMaceration.blendEntryId);
                    const formula = formulas.find(f => f.id === details?.entry.formulaId);
                    return (
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-app-text">{info.fragrance?.name || 'Unknown Fragrance'}</h4>
                            <p className="text-sm text-app-muted mt-1">Formula: <span className="font-medium text-app-accent">{formula?.name || 'Unknown'}</span></p>
                          </div>
                          <span className="text-sm font-medium text-app-muted bg-app-bg px-2 py-1 rounded border border-app-border">{details?.entry.capacityMl} mL</span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-4 text-app-muted italic">No contents found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-app-text">Maceration Tracker</h2>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowTutorial(true)}
            className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/5 rounded-full transition-colors"
            title="How to use"
          >
            <HelpCircle size={22} />
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-2 bg-app-card border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent text-sm"
          >
            <option value="manual">Manual Order</option>
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="days-desc">Most Days Passed</option>
            <option value="days-asc">Least Days Passed</option>
          </select>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search fragrance, batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-app-card border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent text-sm"
            />
          </div>
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-app-card border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent text-sm"
          >
            <option value="all">All Status</option>
            <option value="aging">Still Aging</option>
            <option value="ready">Ready to Bottle</option>
            <option value="<14">Less than 2 weeks</option>
            <option value="14-30">2 weeks - 1 month</option>
            <option value="30-60">1 month - 2 months</option>
            <option value=">60">More than 2 months</option>
          </select>
        </div>
      </div>

      {/* Add New Tracker */}
      <div className="bg-app-card rounded-lg shadow border border-app-border p-6">
        <h3 className="text-lg font-semibold text-app-text mb-4">Start New Maceration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-app-muted mb-1">Select Blend Entry or Batch</label>
            <select
              value={selectedEntryId}
              onChange={(e) => setSelectedEntryId(e.target.value)}
              className="w-full px-3 py-2 bg-app-bg border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
            >
              <option value="">-- Choose an Entry --</option>
              {plannedBatches.map((batch) => (
                <optgroup key={batch.id} label={batch.name} className="bg-app-card">
                  <option value={`batch_${batch.id}`}>📦 Entire Batch: {batch.name}</option>
                  {batch.entries.map((entry) => {
                    const fragrance = fragrances.find((f) => f.id === entry.fragranceId);
                    const formula = formulas.find((f) => f.id === entry.formulaId);
                    const name = formula?.type === 'accord' ? (entry.customFragranceName || '~') : (fragrance?.name || 'Unknown');
                    const size = formula?.type === 'accord' ? `${entry.multiplier || 1}x` : `${entry.capacityMl}mL`;
                    return (
                      <option key={entry.id} value={entry.id}>
                        ↳ {name} ({size})
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-app-muted mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-app-bg border border-app-border text-app-text rounded-md focus:ring-app-accent focus:border-app-accent"
            />
          </div>
          <div className="md:col-span-1">
            <button
              onClick={handleStartTracking}
              disabled={!selectedEntryId || !startDate}
              className="w-full flex justify-center items-center gap-2 bg-app-accent text-white px-4 py-2 rounded-md hover:bg-app-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Plus size={18} />
              Start Tracking
            </button>
          </div>
        </div>
      </div>

      {/* Active Trackers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {getSortedMacerations().length === 0 ? (
          <div className="col-span-full bg-app-card rounded-lg shadow border border-app-border p-12 text-center text-app-muted italic">
            No active macerations matching your criteria.
          </div>
        ) : (
          getSortedMacerations().map((maceration) => {
            const info = getMacerationInfo(maceration);
            const dates = calculateDates(maceration.startDate, maceration.periodWeeks);
            const originalIndex = macerations.findIndex(m => m.id === maceration.id);
            
            return (
              <div 
                key={maceration.id} 
                className={`bg-app-card rounded-lg shadow border transition-all cursor-pointer hover:shadow-md group relative overflow-hidden ${dates.isReady ? 'border-emerald-500/30' : 'border-app-border'}`}
                onClick={() => {
                  setSelectedMaceration(maceration);
                  setViewState('detail');
                }}
              >
                {dates.isReady && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-widest z-20">
                    Ready
                  </div>
                )}
                
                <div className="absolute top-3 right-12 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={(e) => moveMaceration(e, maceration.id, 'up')}
                    disabled={originalIndex <= 0}
                    className="p-1.5 text-app-muted hover:text-app-accent transition-colors rounded hover:bg-app-bg disabled:opacity-30"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button 
                    onClick={(e) => moveMaceration(e, maceration.id, 'down')}
                    disabled={originalIndex === -1 || originalIndex >= macerations.length - 1}
                    className="p-1.5 text-app-muted hover:text-app-accent transition-colors rounded hover:bg-app-bg disabled:opacity-30"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
                <div className="p-4 border-b border-app-border bg-app-bg/50 flex justify-between items-start group-hover:bg-app-accent/5 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg text-app-text group-hover:text-app-accent transition-colors pr-16">
                      {info.title}
                    </h3>
                    <p className="text-sm text-app-muted">
                      {info.subtitle}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteMaceration(maceration.id, e)}
                    className="p-1.5 text-app-muted hover:text-red-500 transition-colors rounded hover:bg-red-50 z-10 relative"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="p-5 space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div className="text-xs font-bold text-app-muted uppercase tracking-wider">Maceration Progress</div>
                      <div className={`text-sm font-black ${dates.isReady ? 'text-emerald-500' : 'text-app-accent'}`}>{Math.round(dates.progress)}%</div>
                    </div>
                    <div className="h-2 w-full bg-app-bg rounded-full overflow-hidden border border-app-border">
                      <div 
                        className={`h-full transition-all duration-1000 ${dates.isReady ? 'bg-emerald-500' : 'bg-app-accent'}`}
                        style={{ width: `${dates.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-app-bg p-3 rounded-lg border border-app-border text-center">
                      <div className="text-[10px] font-bold text-app-muted uppercase mb-1">Days Passed</div>
                      <div className="text-xl font-bold text-app-text">{dates.daysPassed}</div>
                    </div>
                    <div className={`p-3 rounded-lg border text-center ${dates.isReady ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-app-bg border-app-border'}`}>
                      <div className="text-[10px] font-bold text-app-muted uppercase mb-1">
                        {dates.isReady ? 'Status' : 'Remaining'}
                      </div>
                      <div className={`text-xl font-bold ${dates.isReady ? 'text-emerald-600' : 'text-app-text'}`}>
                        {dates.isReady ? 'Ready' : `${dates.daysRemaining}d`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-app-muted font-medium bg-app-bg p-2 rounded border border-app-border">
                    <Calendar size={12} />
                    Ready Date: <span className="text-app-text">{formatDate(dates.readyDate)}</span>
                    <span className="ml-auto">({maceration.periodWeeks || 4}w)</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {ConfirmModal}

      <TutorialModal 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title="Maceration Guide"
        steps={tutorialSteps}
      />
    </div>
  );
}

