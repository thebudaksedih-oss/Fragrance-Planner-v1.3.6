import React, { useState, useRef, useEffect } from 'react';
import { Users, UserCircle, Briefcase, Tag, Phone, Mail, MapPin, CreditCard, TrendingUp, Plus, Edit2, Trash2, ChevronLeft, Save, X, Share } from 'lucide-react';
import { Agent, CustomerContact } from '../types';
import { useConfirm } from '../hooks/useConfirm';
import { Capacitor } from '@capacitor/core';

interface AgentContactManagerProps {
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
  customers: CustomerContact[];
  setCustomers: (customers: CustomerContact[]) => void;
}

export default function AgentContactManager({ agents, setAgents, customers, setCustomers }: AgentContactManagerProps) {
  const [activeTab, setActiveTab] = useState<'agents' | 'customers'>('agents');
  const [viewState, setViewState] = useState<'list' | 'edit' | 'view'>('list');
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerContact | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerContact | null>(null);
  
  // Tagging state for customers
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const { confirm, ConfirmModal } = useConfirm();

  // Extract all unique styles from existing customers for suggestions
  const allStyles = Array.from(new Set(customers.flatMap(c => c.styles || []))).sort();
  const filteredStyles = allStyles.filter(s => s.toLowerCase().includes(tagInput.toLowerCase()) && !(editingCustomer?.styles || []).includes(s));

  const handleAddAgent = () => {
    setEditingAgent({
      id: crypto.randomUUID(),
      name: '',
      contactNumber: '',
      bankAccountNumber: '',
      bankType: '',
      location: '',
      createdAt: new Date().toISOString(),
      notes: ''
    });
    setViewState('edit');
  };

  const handleAddCustomer = () => {
    setEditingCustomer({
      id: crypto.randomUUID(),
      name: '',
      styles: [],
      telephoneNumber: '',
      email: '',
      location: '',
      bankAccountNumber: '',
      createdAt: new Date().toISOString(),
      notes: ''
    });
    setViewState('edit');
  };

  const handleViewAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setViewState('view');
  };

  const handleViewCustomer = (customer: CustomerContact) => {
    setSelectedCustomer(customer);
    setViewState('view');
  };

  const generateAgentDisplayId = (name: string, currentAgents: Agent[]) => {
    let maxCounter = 0;
    currentAgents.forEach(a => {
      if (a.displayId && a.displayId.startsWith('FGA')) {
        const match = a.displayId.match(/^FGA(\d+)-/);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxCounter) {
            maxCounter = num;
          }
        }
      }
    });
    const nextCounter = (maxCounter + 1).toString().padStart(4, '0');
    // Take first word of name or just up to 10 chars, uppercase
    const cleanName = name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `FGA${nextCounter}-${cleanName}`;
  };

  const saveAgent = () => {
    if (!editingAgent || !editingAgent.name) return;
    const exists = agents.find(a => a.id === editingAgent.id);
    if (exists) {
      setAgents(agents.map(a => a.id === editingAgent.id ? editingAgent : a));
    } else {
      const displayId = generateAgentDisplayId(editingAgent.name, agents);
      setAgents([...agents, { ...editingAgent, displayId }]);
    }
    setViewState('list');
    setEditingAgent(null);
  };

  const saveCustomer = () => {
    if (!editingCustomer || !editingCustomer.name) return;
    const exists = customers.find(c => c.id === editingCustomer.id);
    if (exists) {
      setCustomers(customers.map(c => c.id === editingCustomer.id ? editingCustomer : c));
    } else {
      setCustomers([...customers, editingCustomer]);
    }
    setViewState('list');
    setEditingCustomer(null);
  };

  const deleteAgent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirm('Delete Agent', 'Are you sure you want to delete this agent?', () => {
      setAgents(agents.filter(a => a.id !== id));
      if (selectedAgent?.id === id) setViewState('list');
    });
  };

  const deleteCustomer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirm('Delete Contact', 'Are you sure you want to delete this customer contact?', () => {
      setCustomers(customers.filter(c => c.id !== id));
      if (selectedCustomer?.id === id) setViewState('list');
    });
  };

  const addTag = (tag: string) => {
    if (!editingCustomer) return;
    const trimmed = tag.trim();
    if (trimmed && !(editingCustomer.styles || []).includes(trimmed)) {
      setEditingCustomer({
        ...editingCustomer,
        styles: [...(editingCustomer.styles || []), trimmed]
      });
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    if (!editingCustomer) return;
    setEditingCustomer({
      ...editingCustomer,
      styles: (editingCustomer.styles || []).filter(t => t !== tagToRemove)
    });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && (editingCustomer?.styles?.length || 0) > 0) {
      removeTag(editingCustomer!.styles![editingCustomer!.styles!.length - 1]);
    }
  };

  const [aidExportModalOpen, setAidExportModalOpen] = useState(false);
  const [aidExportFileName, setAidExportFileName] = useState('');

  const confirmExportAid = async () => {
    if (!selectedAgent) return;
    
    const aidData = {
      type: 'fgs_agent_identity',
      agentId: selectedAgent.id,
      displayId: selectedAgent.displayId,
      name: selectedAgent.name,
      defaultCommission: selectedAgent.defaultCommission || 0
    };
    
    const jsonString = JSON.stringify(aidData, null, 2);
    const fileName = aidExportFileName.endsWith('.aid') ? aidExportFileName : `${aidExportFileName}.aid`;

    setAidExportModalOpen(false);

    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        
        const result = await Filesystem.writeFile({
          path: `Fragrance Planner/${fileName}`,
          data: jsonString,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true
        });
        
        if (window.confirm(`File saved: Documents/Fragrance Planner/${fileName}\n\nWould you like to share this file?`)) {
          await Share.share({
            title: 'Share .aid file',
            text: 'Fragrance Planner Agent Identity',
            url: result.uri,
            dialogTitle: 'Share File'
          });
        }
      } catch (e) {
        console.error('Export fail', e);
        alert('Failed to save .aid file. Please check permissions.');
      }
    } else {
      const file = new File([jsonString], fileName, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Share .aid file',
            text: 'Fragrance Planner Agent Identity'
          });
        } catch (e) {
          downloadFileWeb(jsonString, fileName);
        }
      } else {
        downloadFileWeb(jsonString, fileName);
      }
    }
  };

  const handleExportAid = () => {
    if (!selectedAgent) return;
    const defaultName = `Agent_${selectedAgent.name.replace(/\s+/g, '_')}`;
    setAidExportFileName(defaultName);
    setAidExportModalOpen(true);
  };

  const downloadFileWeb = (content: string, fileName: string) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(content);
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  if (viewState === 'view') {
    if (activeTab === 'agents' && selectedAgent) {
      return (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setViewState('list')}
                className="p-2 text-app-muted hover:text-app-text hover:bg-app-card rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-2xl font-bold text-app-text flex items-center gap-2">
                <Briefcase className="text-app-accent" />
                Agent Details
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportAid}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors font-medium"
              >
                <Share size={18} />
                Export .aid
              </button>
              <button
                onClick={() => {
                  setEditingAgent(selectedAgent);
                  setViewState('edit');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-app-accent/10 text-app-accent rounded-lg hover:bg-app-accent/20 transition-colors font-medium"
              >
                <Edit2 size={18} />
                Edit
              </button>
              <button
                onClick={(e) => deleteAgent(selectedAgent.id, e)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors font-medium"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>

          {aidExportModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="w-full max-w-sm p-6 bg-app-card border border-app-border rounded-xl">
                <h3 className="text-lg font-bold text-app-text mb-4">Export Agent Link (.aid)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-app-muted uppercase mb-1 tracking-widest">File Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 font-bold text-app-text bg-app-bg border border-app-border rounded-xl outline-none focus:border-app-accent"
                      value={aidExportFileName}
                      onChange={(e) => setAidExportFileName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-4">
                    <button onClick={() => setAidExportModalOpen(false)} className="px-4 py-2 font-bold text-app-muted hover:text-app-text bg-app-bg hover:bg-app-accent/10 transition-colors rounded-xl flex-1">Cancel</button>
                    <button onClick={confirmExportAid} className="px-4 py-2 flex-1 text-white bg-app-accent hover:bg-app-accent-hover transition-colors rounded-xl font-black">Export & Share</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <div className="bg-app-card rounded-xl p-6 border border-app-border shadow-sm text-center">
                <div className="h-24 w-24 rounded-full bg-app-accent/10 flex items-center justify-center text-app-accent font-bold text-4xl mx-auto mb-4">
                  {selectedAgent.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-app-text flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-2">
                    {selectedAgent.name}
                    {selectedAgent.gender && (
                      <span className="text-xs px-2 py-0.5 bg-app-bg text-app-muted rounded-full border border-app-border font-medium">
                        {selectedAgent.gender}
                      </span>
                    )}
                  </div>
                  {selectedAgent.displayId && (
                    <span className="text-sm font-mono text-emerald-500 font-bold">{selectedAgent.displayId}</span>
                  )}
                </h3>
                <p className="text-app-muted text-sm mt-1 flex items-center justify-center gap-1">
                  <MapPin size={14} /> {selectedAgent.location || 'No location set'}
                </p>
                {selectedAgent.defaultCommission !== undefined && (
                  <div className="mt-4 inline-block px-3 py-1 bg-emerald-500/10 text-emerald-500 font-bold rounded-lg border border-emerald-500/20">
                    {selectedAgent.defaultCommission}% Commission
                  </div>
                )}
              </div>

              <div className="bg-app-card rounded-xl p-6 border border-app-border shadow-sm space-y-4">
                <h4 className="text-sm font-black uppercase tracking-widest text-app-muted">Contact Info</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-app-bg rounded-lg text-app-muted">
                      <Phone size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-app-muted">Phone</p>
                      <p className="text-app-text font-medium">{selectedAgent.contactNumber || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div className="bg-app-card rounded-xl p-6 border border-app-border shadow-sm space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-app-muted">Banking Details</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-app-bg rounded-lg text-app-muted">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-app-muted">Bank / Provider</p>
                          <p className="text-app-text font-medium">{selectedAgent.bankType || 'Not set'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-app-bg rounded-lg text-app-muted">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-app-muted">Account Number</p>
                          <p className="text-app-text font-medium font-mono">{selectedAgent.bankAccountNumber || 'Not set'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-app-muted">Additional Info</h4>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-app-muted mb-1">Notes</p>
                      <div className="bg-app-bg p-3 rounded-lg border border-app-border min-h-[80px] text-sm text-app-text whitespace-pre-wrap italic">
                        {selectedAgent.notes || 'No notes added.'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-app-border">
                  <h3 className="text-lg font-bold text-app-text mb-4 flex items-center gap-2">
                    <TrendingUp className="text-emerald-500" />
                    Sales Records
                  </h3>
                  <div className="bg-app-bg/50 border border-app-border border-dashed rounded-xl p-8 text-center">
                    <TrendingUp className="mx-auto h-10 w-10 text-app-muted mb-3 opacity-50" />
                    <p className="text-app-text font-medium">Sales Tracker Integration Coming Soon</p>
                    <p className="text-sm text-app-muted mt-1">In v1.3.0, you will be able to track total sales, types sold, and view monthly/weekly reports directly from this agent profile.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'customers' && selectedCustomer) {
      return (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setViewState('list')}
                className="p-2 text-app-muted hover:text-app-text hover:bg-app-card rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-2xl font-bold text-app-text flex items-center gap-2">
                <UserCircle className="text-app-accent" />
                Customer Details
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingCustomer(selectedCustomer);
                  setViewState('edit');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-app-accent/10 text-app-accent rounded-lg hover:bg-app-accent/20 transition-colors font-medium"
              >
                <Edit2 size={18} />
                Edit
              </button>
              <button
                onClick={(e) => deleteCustomer(selectedCustomer.id, e)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors font-medium"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <div className="bg-app-card rounded-xl p-6 border border-app-border shadow-sm text-center">
                <div className="h-24 w-24 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-4xl mx-auto mb-4">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-app-text flex items-center justify-center gap-2">
                  {selectedCustomer.name}
                  {selectedCustomer.gender && (
                    <span className="text-xs px-2 py-0.5 bg-app-bg text-app-muted rounded-full border border-app-border font-medium">
                      {selectedCustomer.gender}
                    </span>
                  )}
                </h3>
                <p className="text-app-muted text-sm mt-1 flex items-center justify-center gap-1">
                  <MapPin size={14} /> {selectedCustomer.location || 'No location set'}
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                  {(selectedCustomer.styles || []).map(style => (
                    <span key={style} className="text-[10px] px-2 py-0.5 bg-app-accent/10 text-app-accent rounded-full font-bold border border-app-accent/20">
                      #{style}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-app-card rounded-xl p-6 border border-app-border shadow-sm space-y-4">
                <h4 className="text-sm font-black uppercase tracking-widest text-app-muted">Contact Info</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-app-bg rounded-lg text-app-muted">
                      <Phone size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-app-muted">Phone</p>
                      <p className="text-app-text font-medium">{selectedCustomer.telephoneNumber || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-app-bg rounded-lg text-app-muted">
                      <Mail size={18} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] uppercase font-bold text-app-muted">Email</p>
                      <p className="text-app-text font-medium truncate">{selectedCustomer.email || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div className="bg-app-card rounded-xl p-6 border border-app-border shadow-sm space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-app-muted">Banking & Payment</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-app-bg rounded-lg text-app-muted">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-app-muted">Account Number</p>
                          <p className="text-app-text font-medium font-mono">{selectedCustomer.bankAccountNumber || 'Not set'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-app-muted">Additional Info</h4>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-app-muted mb-1">Notes</p>
                      <div className="bg-app-bg p-3 rounded-lg border border-app-border min-h-[80px] text-sm text-app-text whitespace-pre-wrap italic">
                        {selectedCustomer.notes || 'No notes added.'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-app-border">
                  <h3 className="text-lg font-bold text-app-text mb-4 flex items-center gap-2">
                    <TrendingUp className="text-emerald-500" />
                    Buy Records
                  </h3>
                  <div className="bg-app-bg/50 border border-app-border border-dashed rounded-xl p-8 text-center">
                    <TrendingUp className="mx-auto h-10 w-10 text-app-muted mb-3 opacity-50" />
                    <p className="text-app-text font-medium">Sales Tracker Integration Coming Soon</p>
                    <p className="text-sm text-app-muted mt-1">In v1.3.0, you will be able to track this customer's purchase history, favorite products, and total spent.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  if (viewState === 'edit') {
    if (activeTab === 'agents' && editingAgent) {
      return (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewState('list')}
              className="p-2 text-app-muted hover:text-app-text hover:bg-app-card rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-bold text-app-text flex items-center gap-2">
              <Briefcase className="text-app-accent" />
              {editingAgent.name ? 'Edit Agent' : 'New Agent'}
            </h2>
          </div>

          <div className="bg-app-card rounded-xl p-6 border border-app-border shadow-sm space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-app-text mb-1">Gender</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setEditingAgent({ ...editingAgent, gender: 'Male' })}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${editingAgent.gender === 'Male' ? 'bg-app-accent text-white' : 'bg-app-bg text-app-muted hover:text-app-text'}`}
                >
                  Male
                </button>
                <button
                  onClick={() => setEditingAgent({ ...editingAgent, gender: 'Female' })}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${editingAgent.gender === 'Female' ? 'bg-app-accent text-white' : 'bg-app-bg text-app-muted hover:text-app-text'}`}
                >
                  Female
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Agent Name *</label>
                  <input
                    type="text"
                    value={editingAgent.name}
                    onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    placeholder="e.g., John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Default Commission (%)</label>
                  <input
                    type="number"
                    value={editingAgent.defaultCommission || ''}
                    onChange={(e) => setEditingAgent({ ...editingAgent, defaultCommission: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    placeholder="e.g., 5"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1 flex items-center gap-2">
                    <Phone size={14} className="text-app-muted" /> Contact Number
                  </label>
                  <input
                    type="text"
                    value={editingAgent.contactNumber}
                    onChange={(e) => setEditingAgent({ ...editingAgent, contactNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1 flex items-center gap-2">
                    <MapPin size={14} className="text-app-muted" /> Location
                  </label>
                  <input
                    type="text"
                    value={editingAgent.location}
                    onChange={(e) => setEditingAgent({ ...editingAgent, location: e.target.value })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    placeholder="City, Region"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1 flex items-center gap-2">
                    <CreditCard size={14} className="text-app-muted" /> Bank Name / Type
                  </label>
                  <input
                    type="text"
                    value={editingAgent.bankType}
                    onChange={(e) => setEditingAgent({ ...editingAgent, bankType: e.target.value })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    placeholder="e.g., Chase, PayPal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1 flex items-center gap-2">
                    <CreditCard size={14} className="text-app-muted" /> Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={editingAgent.bankAccountNumber}
                    onChange={(e) => setEditingAgent({ ...editingAgent, bankAccountNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    placeholder="Account Number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Notes</label>
                  <textarea
                    value={editingAgent.notes || ''}
                    onChange={(e) => setEditingAgent({ ...editingAgent, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent h-[104px] resize-none"
                    placeholder="Additional details..."
                  />
                </div>
              </div>
            </div>

            {/* Placeholder for future Sells Tracker integration */}
            <div className="mt-8 pt-6 border-t border-app-border">
              <h3 className="text-lg font-bold text-app-text mb-4 flex items-center gap-2">
                <TrendingUp className="text-emerald-500" />
                Sales Records
              </h3>
              <div className="bg-app-bg/50 border border-app-border border-dashed rounded-xl p-8 text-center">
                <TrendingUp className="mx-auto h-10 w-10 text-app-muted mb-3 opacity-50" />
                <p className="text-app-text font-medium">Sales Tracker Integration Coming Soon</p>
                <p className="text-sm text-app-muted mt-1">In v1.3.0, you will be able to track total sales, types sold, and view monthly/weekly reports directly from this agent profile.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-app-border">
              <button
                onClick={() => setViewState('list')}
                className="px-4 py-2 text-app-muted hover:text-app-text font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAgent}
                disabled={!editingAgent.name}
                className="flex items-center gap-2 px-6 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Save size={18} />
                Save Agent
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'customers' && editingCustomer) {
      return (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewState('list')}
              className="p-2 text-app-muted hover:text-app-text hover:bg-app-card rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-bold text-app-text flex items-center gap-2">
              <UserCircle className="text-app-accent" />
              {editingCustomer.name ? 'Edit Contact' : 'New Contact'}
            </h2>
          </div>

          <div className="bg-app-card rounded-xl p-6 border border-app-border shadow-sm space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-app-text mb-1">Gender</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setEditingCustomer({ ...editingCustomer, gender: 'Male' })}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${editingCustomer.gender === 'Male' ? 'bg-app-accent text-white' : 'bg-app-bg text-app-muted hover:text-app-text'}`}
                >
                  Male
                </button>
                <button
                  onClick={() => setEditingCustomer({ ...editingCustomer, gender: 'Female' })}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${editingCustomer.gender === 'Female' ? 'bg-app-accent text-white' : 'bg-app-bg text-app-muted hover:text-app-text'}`}
                >
                  Female
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    placeholder="e.g., Jane Smith"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1 flex items-center gap-2">
                    <Tag size={14} className="text-app-muted" /> Style / Preferences
                  </label>
                  <div className="relative">
                    <div className="flex flex-wrap gap-2 p-2 border border-app-border rounded-md focus-within:ring-1 focus-within:ring-app-accent focus-within:border-app-accent bg-app-bg min-h-[42px]">
                      {(editingCustomer.styles || []).map(tag => (
                        <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-app-accent/10 text-app-accent text-sm rounded-md border border-app-accent/20">
                          #{tag}
                          <button type="button" onClick={() => removeTag(tag)} className="text-app-accent hover:text-app-accent-hover p-0.5 rounded-full hover:bg-app-accent/20 transition-colors">
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                      <input
                        ref={tagInputRef}
                        type="text"
                        value={tagInput}
                        onChange={e => {
                          const val = e.target.value;
                          if (val.endsWith(',') || val.endsWith('.')) {
                            addTag(val.slice(0, -1));
                          } else {
                            setTagInput(val);
                            setShowTagSuggestions(true);
                          }
                        }}
                        onKeyDown={handleTagKeyDown}
                        onFocus={() => setShowTagSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                        placeholder={(editingCustomer.styles || []).length === 0 ? "e.g., Floral, Fresh..." : ""}
                        className="flex-1 min-w-[120px] outline-none text-sm bg-transparent text-app-text placeholder:text-app-muted"
                      />
                    </div>
                    {showTagSuggestions && tagInput && filteredStyles.length > 0 && (
                      <ul className="absolute z-10 w-full mt-1 bg-app-card border border-app-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredStyles.map(s => (
                          <li 
                            key={s} 
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-app-bg text-app-text"
                            onClick={() => addTag(s)}
                          >
                            #{s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text mb-1 flex items-center gap-2">
                    <Phone size={14} className="text-app-muted" /> Telephone Number
                  </label>
                  <input
                    type="text"
                    value={editingCustomer.telephoneNumber}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, telephoneNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1 flex items-center gap-2">
                    <Mail size={14} className="text-app-muted" /> Email
                  </label>
                  <input
                    type="email"
                    value={editingCustomer.email}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    placeholder="customer@example.com"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1 flex items-center gap-2">
                    <MapPin size={14} className="text-app-muted" /> Location
                  </label>
                  <input
                    type="text"
                    value={editingCustomer.location}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, location: e.target.value })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    placeholder="City, Region"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1 flex items-center gap-2">
                    <CreditCard size={14} className="text-app-muted" /> Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={editingCustomer.bankAccountNumber}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, bankAccountNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text mb-1">Notes</label>
                  <textarea
                    value={editingCustomer.notes || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent h-[104px] resize-none"
                    placeholder="Additional details..."
                  />
                </div>
              </div>
            </div>

            {/* Placeholder for future Sells Tracker integration */}
            <div className="mt-8 pt-6 border-t border-app-border">
              <h3 className="text-lg font-bold text-app-text mb-4 flex items-center gap-2">
                <TrendingUp className="text-emerald-500" />
                Buy Records
              </h3>
              <div className="bg-app-bg/50 border border-app-border border-dashed rounded-xl p-8 text-center">
                <TrendingUp className="mx-auto h-10 w-10 text-app-muted mb-3 opacity-50" />
                <p className="text-app-text font-medium">Sales Tracker Integration Coming Soon</p>
                <p className="text-sm text-app-muted mt-1">In v1.3.0, you will be able to track this customer's purchase history, favorite products, and total spent.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-app-border">
              <button
                onClick={() => setViewState('list')}
                className="px-4 py-2 text-app-muted hover:text-app-text font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomer}
                disabled={!editingCustomer.name}
                className="flex items-center gap-2 px-6 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Save size={18} />
                Save Contact
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-app-text flex items-center gap-2">
            <Users className="text-app-accent" />
            Agent & Contact Manager
          </h2>
          <p className="text-app-muted text-sm mt-1">Manage your sales agents and customer relationships.</p>
        </div>
        <div className="flex bg-app-card p-1 rounded-lg border border-app-border">
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'agents'
                ? 'bg-app-accent text-white shadow-sm'
                : 'text-app-muted hover:text-app-text hover:bg-app-bg'
            }`}
          >
            <Briefcase size={16} />
            Agents
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'customers'
                ? 'bg-app-accent text-white shadow-sm'
                : 'text-app-muted hover:text-app-text hover:bg-app-bg'
            }`}
          >
            <UserCircle size={16} />
            Customers
          </button>
        </div>
      </div>

      {activeTab === 'agents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-app-text">Sales Agents ({agents.length})</h3>
            <button
              onClick={handleAddAgent}
              className="flex items-center gap-2 px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover transition-colors font-medium shadow-sm"
            >
              <Plus size={18} />
              New Agent
            </button>
          </div>

          {agents.length === 0 ? (
            <div className="text-center py-12 bg-app-card rounded-xl border border-dashed border-app-border">
              <Briefcase className="mx-auto h-12 w-12 text-app-muted mb-3" />
              <h3 className="text-lg font-medium text-app-text">No agents found</h3>
              <p className="text-app-muted text-sm mt-1 mb-4">Add your first sales agent to start tracking their performance.</p>
              <button
                onClick={handleAddAgent}
                className="inline-flex items-center gap-2 px-4 py-2 bg-app-accent/10 text-app-accent rounded-lg hover:bg-app-accent/20 transition-colors font-medium"
              >
                <Plus size={18} />
                Add Agent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map(agent => (
                <div 
                  key={agent.id} 
                  onClick={() => handleViewAgent(agent)}
                  className="bg-app-card rounded-xl border border-app-border p-5 shadow-sm hover:shadow-md transition-all group relative cursor-pointer hover:border-app-accent/50"
                >
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAgent(agent);
                        setViewState('edit');
                      }}
                      className="p-1.5 text-app-muted hover:text-app-accent hover:bg-app-accent/10 rounded-md transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => deleteAgent(agent.id, e)}
                      className="p-1.5 text-app-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-app-accent/10 flex items-center justify-center text-app-accent font-bold text-lg">
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-app-text">{agent.name}</h4>
                      {agent.displayId && (
                        <div className="text-xs font-mono font-bold text-emerald-500">{agent.displayId}</div>
                      )}
                      <div className="text-xs text-app-muted flex items-center gap-1 mt-0.5">
                        <MapPin size={12} /> {agent.location || 'No location'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-app-muted">
                      <Phone size={14} />
                      <span className="text-app-text">{agent.contactNumber || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-app-muted">
                      <CreditCard size={14} />
                      <span className="text-app-text truncate max-w-[150px]">{agent.bankType ? `${agent.bankType} ` : ''}{agent.bankAccountNumber ? `(${agent.bankAccountNumber})` : '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-app-text">Customer Contacts ({customers.length})</h3>
            <button
              onClick={handleAddCustomer}
              className="flex items-center gap-2 px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover transition-colors font-medium shadow-sm"
            >
              <Plus size={18} />
              New Contact
            </button>
          </div>

          {customers.length === 0 ? (
            <div className="text-center py-12 bg-app-card rounded-xl border border-dashed border-app-border">
              <UserCircle className="mx-auto h-12 w-12 text-app-muted mb-3" />
              <h3 className="text-lg font-medium text-app-text">No customers found</h3>
              <p className="text-app-muted text-sm mt-1 mb-4">Add your first customer contact to build your database.</p>
              <button
                onClick={handleAddCustomer}
                className="inline-flex items-center gap-2 px-4 py-2 bg-app-accent/10 text-app-accent rounded-lg hover:bg-app-accent/20 transition-colors font-medium"
              >
                <Plus size={18} />
                Add Contact
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map(customer => (
                <div 
                  key={customer.id} 
                  onClick={() => handleViewCustomer(customer)}
                  className="bg-app-card rounded-xl border border-app-border p-5 shadow-sm hover:shadow-md transition-all group relative cursor-pointer hover:border-app-accent/50"
                >
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCustomer(customer);
                        setViewState('edit');
                      }}
                      className="p-1.5 text-app-muted hover:text-app-accent hover:bg-app-accent/10 rounded-md transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => deleteCustomer(customer.id, e)}
                      className="p-1.5 text-app-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-lg">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-app-text">{customer.name}</h4>
                      <div className="text-xs text-app-muted flex items-center gap-1">
                        <MapPin size={12} /> {customer.location || 'No location'}
                      </div>
                    </div>
                  </div>

                  {(customer.styles || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {customer.styles!.map(style => (
                        <span key={style} className="text-[10px] px-1.5 py-0.5 bg-app-accent/10 text-app-accent rounded font-medium border border-app-accent/20">
                          #{style}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-app-muted">
                      <Phone size={14} />
                      <span className="text-app-text">{customer.telephoneNumber || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-app-muted">
                      <Mail size={14} />
                      <span className="text-app-text truncate">{customer.email || '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {ConfirmModal}
    </div>
  );
}
