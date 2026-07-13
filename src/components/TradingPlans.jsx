import React, { useState } from 'react';

export default function TradingPlans({ plans = [], setups = [], onSavePlan, onDeletePlan, onSaveSetups, requestConfirm, requestAlert }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanRules, setNewPlanRules] = useState('');
  
  // Custom Setups State
  const [showAddSetup, setShowAddSetup] = useState(false);
  const [newSetupName, setNewSetupName] = useState('');

  const handleAddSetup = () => {
    if (!newSetupName.trim()) return;
    if (setups.includes(newSetupName.trim())) {
      if (requestAlert) requestAlert("Warning", "Setup name already exists!");
      return;
    }
    onSaveSetups([...setups, newSetupName.trim()]);
    setNewSetupName('');
    setShowAddSetup(false);
  };

  const handleDeleteSetup = (setupName) => {
    onSaveSetups(setups.filter(s => s !== setupName));
  };

  const handleSave = () => {
    if (!newPlanName.trim()) return;
    onSavePlan({
      id: 'plan-' + Date.now(),
      name: newPlanName,
      rules: newPlanRules,
      createdAt: new Date().toISOString()
    });
    setNewPlanName('');
    setNewPlanRules('');
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="crypto-card p-6 flex flex-col gap-6 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-4">
          <div>
            <h2 className="text-xl font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">
              📝 Trading Plans & Playbooks
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Define your edge and stick to the rules</p>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors cursor-pointer"
          >
            {showAddForm ? 'Cancel' : '+ New Plan'}
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Playbook Name</label>
              <input 
                type="text" 
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                placeholder="e.g. Day Breakout Setup, Dip Buying..."
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Trading Rules & Checklist</label>
              <textarea 
                rows="5"
                value={newPlanRules}
                onChange={(e) => setNewPlanRules(e.target.value)}
                placeholder="1. Market must be trending up...&#10;2. Wait for pullback to 20EMA...&#10;3. Risk max 1% of portfolio..."
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded focus:outline-none focus:border-amber-500 text-sm font-mono whitespace-pre-wrap"
              ></textarea>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded-lg text-sm cursor-pointer shadow-sm">
                Save Playbook
              </button>
            </div>
          </div>
        )}

        {/* Plans List */}
        {plans.length === 0 && !showAddForm ? (
          <div className="text-center py-10">
            <span className="text-4xl block mb-2">📋</span>
            <h3 className="text-slate-600 dark:text-slate-400 font-bold">No Trading Plans Yet</h3>
            <p className="text-sm text-slate-500 mt-1">Create your first playbook to start tracking adherence.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex flex-col gap-3 relative group">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{plan.name}</h3>
                  <button 
                    onClick={() => {
                      if(requestConfirm) {
                        requestConfirm("ลบแผนการเทรด", "Are you sure you want to delete this plan?", () => onDeletePlan(plan.id));
                      } else if(window.confirm('Are you sure you want to delete this plan?')) {
                        onDeletePlan(plan.id);
                      }
                    }}
                    className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-bold"
                  >
                    Delete
                  </button>
                </div>
                <div className="bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-850/50 flex-grow">
                  <p className="text-sm font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words">{plan.rules}</p>
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-right">
                  Created: {new Date(plan.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* --- Custom Setups Section --- */}
      <div className="crypto-card p-6 flex flex-col gap-6 relative overflow-hidden mt-2">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-4">
          <div>
            <h2 className="text-xl font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              🎯 Custom Setups & Strategies
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Manage your personal setups for context tracking</p>
          </div>
          <button 
            onClick={() => setShowAddSetup(!showAddSetup)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors cursor-pointer"
          >
            {showAddSetup ? 'Cancel' : '+ New Setup'}
          </button>
        </div>

        {showAddSetup && (
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Setup Name</label>
              <input 
                type="text" 
                value={newSetupName}
                onChange={(e) => setNewSetupName(e.target.value)}
                placeholder="e.g. VCP Breakout, Moving Average Bounce..."
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            <div className="flex justify-end">
              <button onClick={handleAddSetup} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded-lg text-sm cursor-pointer shadow-sm">
                Save Setup
              </button>
            </div>
          </div>
        )}

        {setups.length === 0 && !showAddSetup ? (
          <div className="text-center py-10">
            <h3 className="text-slate-600 dark:text-slate-400 font-bold">No Custom Setups</h3>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {setups.map(setup => (
              <div key={setup} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-2 px-4 rounded-lg flex items-center gap-3 group transition-colors hover:border-indigo-300 dark:hover:border-indigo-700">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{setup}</span>
                <button 
                  onClick={() => {
                    if(requestConfirm) {
                      requestConfirm("ลบ Setup", `Are you sure you want to delete '${setup}'?`, () => handleDeleteSetup(setup));
                    } else if(window.confirm(`Are you sure you want to delete '${setup}'?`)) {
                      handleDeleteSetup(setup);
                    }
                  }}
                  className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
