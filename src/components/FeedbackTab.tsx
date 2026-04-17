import React, { useState } from 'react';
import { Plus, Trash2, Save, X, MessageSquare, ArrowUp, ArrowDown, HelpCircle, Star, Clock, User, MessageCircle } from 'lucide-react';
import { Feedback, Fragrance } from '../types';
import { useConfirm } from '../hooks/useConfirm';
import TutorialModal from './TutorialModal';

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

interface Props {
  feedbacks: Feedback[];
  setFeedbacks: React.Dispatch<React.SetStateAction<Feedback[]>>;
  fragrances: Fragrance[];
}

export default function FeedbackTab({ feedbacks, setFeedbacks, fragrances }: Props) {
  const [selectedFragranceId, setSelectedFragranceId] = useState<string | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [sortBy, setSortBy] = useState<'manual' | 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('manual');
  const [showTutorial, setShowTutorial] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  const tutorialSteps = [
    {
      title: 'Select Fragrance',
      content: 'Choose a fragrance from the sidebar to view its existing feedback or add a new review.',
      icon: <Star size={40} />
    },
    {
      title: 'Performance Tracking',
      content: 'Track longevity, sillage, and projection for each review to understand how your creations perform.',
      icon: <Clock size={40} />
    },
    {
      title: 'Auto-Calculation',
      content: 'The app automatically rates the performance (e.g., "Beast Mode") based on your inputs and spray count.',
      icon: <MessageSquare size={40} />
    },
    {
      title: 'Detailed Reviews',
      content: 'Add comments, specific wear times, and scent check times to keep a thorough record of the experience.',
      icon: <MessageCircle size={40} />
    },
    {
      title: 'Reviewer Info',
      content: 'Record the reviewer\'s name and gender to track how different scents perform for different people.',
      icon: <User size={40} />
    }
  ];

  const addFeedback = (fragranceId: string) => {
    const newFeedback: Feedback = {
      id: crypto.randomUUID(),
      fragranceId,
      name: '',
      date: new Date().toISOString().split('T')[0],
      gender: '',
      contact: '',
      comment: '',
      sprayCount: 1,
    };
    setEditingFeedback(newFeedback);
  };

  const deleteFeedback = (id: string) => {
    confirm('Delete Feedback', 'Are you sure you want to delete this feedback?', () => {
      setFeedbacks(feedbacks.filter(f => f.id !== id));
      if (editingFeedback?.id === id) {
        setEditingFeedback(null);
      }
    });
  };

  const moveFeedback = (e: React.MouseEvent, id: string, direction: 'up' | 'down') => {
    e.stopPropagation();
    const index = feedbacks.findIndex(f => f.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === feedbacks.length - 1) return;
    
    const newFeedbacks = [...feedbacks];
    const temp = newFeedbacks[index];
    newFeedbacks[index] = newFeedbacks[index + (direction === 'up' ? -1 : 1)];
    newFeedbacks[index + (direction === 'up' ? -1 : 1)] = temp;
    
    setFeedbacks(newFeedbacks);
  };

  const handleSaveAndContinue = () => {
    if (!editingFeedback || !editingFeedback.name) return;
    
    const exists = feedbacks.some(f => f.id === editingFeedback.id);
    if (exists) {
      setFeedbacks(feedbacks.map(f => f.id === editingFeedback.id ? editingFeedback : f));
    } else {
      setFeedbacks([...feedbacks, editingFeedback]);
    }
    
    setEditingFeedback({
      ...editingFeedback,
      id: generateId(),
      name: '', // Reset name for the new entry
      comment: '', // Reset comment
    });
  };

  const handleSave = () => {
    if (!editingFeedback || !editingFeedback.name) return;
    
    const exists = feedbacks.some(f => f.id === editingFeedback.id);
    if (exists) {
      setFeedbacks(feedbacks.map(f => f.id === editingFeedback.id ? editingFeedback : f));
    } else {
      setFeedbacks([...feedbacks, editingFeedback]);
    }
    
    setEditingFeedback(null);
  };

  const handleCancel = () => {
    setEditingFeedback(null);
  };

  const calculatePerformance = (longevity: number = 0, sillage: number = 0, projection: number = 0, sprayCount: number | string = 6): string => {
    const count = typeof sprayCount === 'number' ? sprayCount : (parseInt(sprayCount as string) || 6);
    
    if (longevity === 0 && sillage === 0 && projection === 0) return '';

    // Baseline targets for 100% score (at 6 sprays)
    const targetLongevity = 8; // 8 hours is "Good"
    const targetProjection = 2; // 2 meters is solid
    const targetSillage = 4; // 4 hours of trail persistence is excellent

    // Calculate raw scores (0 to 1.5 range roughly)
    const longevityScore = Math.min(longevity / targetLongevity, 1.5);
    const projectionScore = Math.min(projection / targetProjection, 1.5);
    const sillageScore = Math.min(sillage / targetSillage, 1.5);

    // Weighted average (Sillage is 50%, others 25% each)
    let weightedScore = (sillageScore * 0.5) + (longevityScore * 0.25) + (projectionScore * 0.25);

    // Spray Efficiency Factor
    // High efficiency: 1-6 sprays (boosts score)
    // Standard: 7-14 sprays (pivot point)
    // Penalty: 15+ sprays (penalizes score)
    let efficiencyFactor = 1.0;
    if (count > 0) {
      if (count <= 6) efficiencyFactor = 1.3; // High efficiency boost
      else if (count <= 14) efficiencyFactor = 1.0; // Standard
      else if (count <= 20) efficiencyFactor = 0.7; // Penalty
      else efficiencyFactor = 0.5; // Heavy penalty for extreme overspraying
    }

    const finalScore = weightedScore * efficiencyFactor;

    if (finalScore >= 1.2) return 'beast';
    if (finalScore >= 0.9) return 'above_average';
    if (finalScore >= 0.6) return 'average';
    if (finalScore >= 0.3) return 'below_average';
    return 'weak';
  };

  const updateEditingFeedback = (field: keyof Feedback, value: any) => {
    if (editingFeedback) {
      const updated = { ...editingFeedback, [field]: value };
      
      // Auto-calculate performance if relevant fields change
      if (['longevityHours', 'sillageHours', 'projectionMeters', 'sprayCount'].includes(field)) {
        updated.performance = calculatePerformance(
          updated.longevityHours,
          updated.sillageHours,
          updated.projectionMeters,
          updated.sprayCount
        );
      }
      
      setEditingFeedback(updated);
    }
  };

  const getFragranceFeedbacks = (fragranceId: string) => {
    let filtered = feedbacks.filter(f => f.fragranceId === fragranceId);
    
    if (sortBy === 'date-desc') {
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === 'date-asc') {
      filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (sortBy === 'name-asc') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name-desc') {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    }
    
    return filtered;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-app-text">Feedback</h2>
        <button
          onClick={() => setShowTutorial(true)}
          className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/5 rounded-full transition-colors"
          title="How to use"
        >
          <HelpCircle size={22} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fragrance List Sidebar */}
        <div className="md:col-span-1 bg-app-card rounded-lg shadow border border-app-border overflow-hidden">
          <div className="p-4 bg-app-bg/50 border-b border-app-border font-semibold text-app-text">
            Fragrances
          </div>
          <ul className="divide-y divide-app-border max-h-[600px] overflow-y-auto">
            {fragrances.length === 0 ? (
              <li className="p-4 text-app-muted text-center italic">No fragrances in DB.</li>
            ) : (
              fragrances.map((fragrance) => {
                const count = feedbacks.filter(f => f.fragranceId === fragrance.id).length;
                return (
                  <li
                    key={fragrance.id}
                    className={`p-4 cursor-pointer hover:bg-app-accent/10 transition-colors flex justify-between items-center ${
                      selectedFragranceId === fragrance.id ? 'bg-app-accent/10 border-l-4 border-app-accent' : ''
                    }`}
                    onClick={() => {
                      setSelectedFragranceId(fragrance.id);
                      setEditingFeedback(null);
                    }}
                  >
                    <div>
                      <span className="font-medium text-app-text block">{fragrance.name}</span>
                      {fragrance.house && <span className="text-xs text-app-muted">{fragrance.house}</span>}
                    </div>
                    <span className="bg-app-bg text-app-muted text-xs px-2 py-1 rounded-full border border-app-border">
                      {count}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* Feedback Content */}
        <div className="md:col-span-2">
          {!selectedFragranceId ? (
            <div className="bg-app-card rounded-lg shadow border border-app-border p-12 text-center text-app-muted">
              Select a fragrance from the list to view or add feedback.
            </div>
          ) : editingFeedback ? (
            <div className="bg-app-card rounded-lg shadow border border-app-border p-6">
              <h3 className="text-lg font-semibold text-app-text mb-6">
                {feedbacks.some(f => f.id === editingFeedback.id) ? 'Edit Feedback' : 'New Feedback'}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-app-text mb-1">Name *</label>
                    <input
                      type="text"
                      value={editingFeedback.name}
                      onChange={(e) => updateEditingFeedback('name', e.target.value)}
                      className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                      placeholder="Reviewer Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-text mb-1">Date</label>
                    <input
                      type="date"
                      value={editingFeedback.date}
                      onChange={(e) => updateEditingFeedback('date', e.target.value)}
                      className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-text mb-1">Gender</label>
                    <input
                      type="text"
                      value={editingFeedback.gender}
                      onChange={(e) => updateEditingFeedback('gender', e.target.value)}
                      className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                      placeholder="e.g., Male, Female, Unisex"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-text mb-1">Contact</label>
                    <input
                      type="text"
                      value={editingFeedback.contact || ''}
                      onChange={(e) => updateEditingFeedback('contact', e.target.value)}
                      className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                      placeholder="Email, Phone, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-text mb-1">Spray Count</label>
                    <input
                      type="number"
                      min="1"
                      value={editingFeedback.sprayCount === undefined ? '' : editingFeedback.sprayCount}
                      onChange={(e) => updateEditingFeedback('sprayCount', e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-text mb-1">Longevity (Hours)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editingFeedback.longevityHours || ''}
                      onChange={(e) => updateEditingFeedback('longevityHours', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-text mb-1">Sillage (Trail Persistence)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editingFeedback.sillageHours || ''}
                      onChange={(e) => updateEditingFeedback('sillageHours', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                      placeholder="Hours trail lingers"
                    />
                    <p className="text-[10px] text-app-muted mt-1 italic">Biggest factor in performance</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-text mb-1">Projection (Meters)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editingFeedback.projectionMeters || ''}
                      onChange={(e) => updateEditingFeedback('projectionMeters', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-text mb-1">Performance (Auto-calculated)</label>
                    <div className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text capitalize opacity-80">
                      {editingFeedback.performance ? editingFeedback.performance.replace('_', ' ') : 'Pending...'}
                    </div>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-app-text mb-1">Time Wear</label>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={editingFeedback.timeWear || ''}
                          onChange={(e) => updateEditingFeedback('timeWear', e.target.value)}
                          className="flex-1 px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                        />
                        <button
                          onClick={() => {
                            const now = new Date();
                            const timeString = now.toTimeString().slice(0, 5); // HH:MM
                            updateEditingFeedback('timeWear', timeString);
                          }}
                          className="px-4 py-2 bg-app-bg text-app-text border border-app-border rounded-md hover:bg-app-card transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          Current Time
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-app-text mb-1">Scent Check Time</label>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={editingFeedback.scentCheckTime || ''}
                          onChange={(e) => updateEditingFeedback('scentCheckTime', e.target.value)}
                          className="flex-1 px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                        />
                        <button
                          onClick={() => {
                            const now = new Date();
                            const timeString = now.toTimeString().slice(0, 5); // HH:MM
                            updateEditingFeedback('scentCheckTime', timeString);
                          }}
                          className="px-4 py-2 bg-app-bg text-app-text border border-app-border rounded-md hover:bg-app-card transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          Current Time
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Comment</label>
                  <textarea
                    value={editingFeedback.comment}
                    onChange={(e) => updateEditingFeedback('comment', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    placeholder="Detailed feedback..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 text-app-text bg-app-bg border border-app-border rounded-md hover:bg-app-card transition-colors"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAndContinue}
                    disabled={!editingFeedback.name}
                    className="flex items-center gap-2 px-4 py-2 bg-app-accent/10 text-app-accent rounded-md hover:bg-app-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={18} />
                    Save & Continue
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!editingFeedback.name}
                    className="flex items-center gap-2 px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Save size={18} />
                    Save Feedback
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-app-card p-4 rounded-lg shadow border border-app-border gap-4">
                <div>
                  <h3 className="text-lg font-bold text-app-text">
                    {fragrances.find(f => f.id === selectedFragranceId)?.name}
                  </h3>
                  <p className="text-sm text-app-muted">Feedback & Reviews</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent text-sm flex-1 sm:flex-none"
                  >
                    <option value="manual">Manual Order</option>
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                  </select>
                  <button
                    onClick={() => addFeedback(selectedFragranceId)}
                    className="flex items-center gap-2 bg-app-accent text-white px-4 py-2 rounded-md hover:bg-app-accent-hover transition-colors whitespace-nowrap shadow-sm"
                  >
                    <Plus size={18} />
                    Add Feedback
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {getFragranceFeedbacks(selectedFragranceId).length === 0 ? (
                  <div className="bg-app-card rounded-lg shadow border border-app-border p-8 text-center text-app-muted">
                    No feedback yet for this fragrance.
                  </div>
                ) : (
                  getFragranceFeedbacks(selectedFragranceId).map((feedback) => {
                    const originalIndex = feedbacks.findIndex(f => f.id === feedback.id);
                    return (
                    <div key={feedback.id} className="bg-app-card rounded-lg shadow border border-app-border p-5 relative group">
                      {sortBy === 'manual' && (
                        <div className="absolute top-3 right-24 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={(e) => moveFeedback(e, feedback.id, 'up')}
                            disabled={originalIndex <= 0}
                            className="p-1.5 text-app-muted hover:text-app-accent transition-colors rounded hover:bg-app-bg disabled:opacity-30"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button 
                            onClick={(e) => moveFeedback(e, feedback.id, 'down')}
                            disabled={originalIndex === -1 || originalIndex >= feedbacks.length - 1}
                            className="p-1.5 text-app-muted hover:text-app-accent transition-colors rounded hover:bg-app-bg disabled:opacity-30"
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-3">
                        <div className="pr-16">
                          <h4 className="font-bold text-app-text">{feedback.name}</h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-app-muted mt-1">
                            <span>{feedback.date}</span>
                            {feedback.gender && <span>• {feedback.gender}</span>}
                            {feedback.contact && <span>• {feedback.contact}</span>}
                            <span>• {feedback.sprayCount} sprays</span>
                            {feedback.timeWear && <span>• Worn at {feedback.timeWear}</span>}
                            {feedback.scentCheckTime && <span>• Checked at {feedback.scentCheckTime}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingFeedback(feedback)}
                            className="p-1.5 text-app-muted hover:text-app-accent transition-colors rounded hover:bg-app-bg"
                          >
                            <MessageSquare size={16} />
                          </button>
                          <button
                            onClick={() => deleteFeedback(feedback.id)}
                            className="p-1.5 text-app-muted hover:text-red-500 transition-colors rounded hover:bg-red-500/10"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {feedback.longevityHours !== undefined && feedback.longevityHours > 0 && (
                          <span className="px-2 py-1 bg-blue-500/10 text-blue-600 rounded text-xs font-medium border border-blue-500/20">
                            Longevity: {feedback.longevityHours}h
                          </span>
                        )}
                        {feedback.sillageHours !== undefined && feedback.sillageHours > 0 && (
                          <span className="px-2 py-1 bg-purple-500/10 text-purple-600 rounded text-xs font-medium border border-purple-500/20">
                            Sillage: {feedback.sillageHours}h
                          </span>
                        )}
                        {feedback.projectionMeters !== undefined && feedback.projectionMeters > 0 && (
                          <span className="px-2 py-1 bg-teal-500/10 text-teal-600 rounded text-xs font-medium border border-teal-500/20">
                            Projection: {feedback.projectionMeters}m
                          </span>
                        )}
                        {feedback.performance && (
                          <span className={`px-2 py-1 rounded text-xs font-bold border capitalize shadow-sm ${
                            feedback.performance === 'beast' ? 'bg-red-600 text-white border-red-700' :
                            feedback.performance === 'above_average' ? 'bg-orange-500 text-white border-orange-600' :
                            feedback.performance === 'average' ? 'bg-amber-400 text-white border-amber-500' :
                            feedback.performance === 'below_average' ? 'bg-gray-400 text-white border-gray-500' :
                            'bg-app-bg text-app-muted border-app-border'
                          }`}>
                            {feedback.performance.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-app-text text-sm whitespace-pre-wrap">{feedback.comment}</p>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {ConfirmModal}

      <TutorialModal 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title="Feedback Guide"
        steps={tutorialSteps}
      />
    </div>
  );
}
