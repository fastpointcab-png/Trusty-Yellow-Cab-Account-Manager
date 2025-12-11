
import React, { useState } from 'react';
import { Driver } from '../types';
import * as storageService from '../services/storageService';
import { v4 as uuidv4 } from 'uuid';
import { Save, Trash2, Plus, Lock, UserCog, X, Edit2, ShieldCheck, Car } from 'lucide-react';

interface AdminManagementProps {
  drivers: Driver[];
  onUpdateDrivers: () => void;
}

export const AdminManagement: React.FC<AdminManagementProps> = ({ drivers, onUpdateDrivers }) => {
  const [isEditing, setIsEditing] = useState(false);
  // Use 'any' type to allow string inputs during editing
  const [currentDriver, setCurrentDriver] = useState<any>({});
  
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [pwdMessage, setPwdMessage] = useState({ text: '', type: '' });

  const handleEditDriver = (driver: Driver) => {
    setCurrentDriver(driver);
    setIsEditing(true);
  };

  const handleAddDriver = () => {
    setCurrentDriver({ name: '', vehicle: '', pin: '' });
    setIsEditing(true);
  };

  const handleDeleteDriver = (id: string) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      storageService.deleteDriver(id);
      onUpdateDrivers();
    }
  };

  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDriver.name || !currentDriver.pin) return;

    const driverToSave: Driver = {
      id: currentDriver.id || uuidv4(),
      name: currentDriver.name,
      vehicle: currentDriver.vehicle || '',
      pin: currentDriver.pin
    };

    storageService.saveDriver(driverToSave);
    onUpdateDrivers();
    setIsEditing(false);
    setCurrentDriver({});
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminPassword !== confirmAdminPassword) {
      setPwdMessage({ text: 'Passwords do not match', type: 'error' });
      return;
    }
    if (newAdminPassword.length < 4) {
      setPwdMessage({ text: 'Password must be at least 4 characters', type: 'error' });
      return;
    }

    storageService.setAdminPassword(newAdminPassword);
    setPwdMessage({ text: 'Admin password updated successfully', type: 'success' });
    setNewAdminPassword('');
    setConfirmAdminPassword('');
    setTimeout(() => setPwdMessage({ text: '', type: '' }), 3000);
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-bold text-secondary dark:text-white tracking-tight">System Settings</h2>
        <p className="text-accent mt-1">Configure drivers and security.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Driver List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col transition-colors duration-300">
            <div className="p-6 border-b border-gray-50 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                 <div className="bg-primary/10 p-2 rounded-lg text-primary dark:text-accent">
                   <UserCog size={24} />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800 dark:text-white">Drivers</h3>
              </div>
              <button 
                onClick={handleAddDriver}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-xl hover:bg-primary transition-colors text-sm font-bold shadow-lg shadow-primary/20"
              >
                <Plus size={18} />
                Add New
              </button>
            </div>
            
            {/* Edit/Add Form Overlay */}
            {isEditing && (
              <div className="bg-lavender-light dark:bg-slate-700 p-6 border-b border-lavender/50 dark:border-slate-600 animate-fade-in">
                <div className="flex justify-between items-start mb-6">
                  <h4 className="font-bold text-secondary dark:text-white text-lg">{currentDriver.id ? 'Edit Driver' : 'New Driver'}</h4>
                  <button onClick={() => setIsEditing(false)} className="p-1 bg-white dark:bg-slate-600 rounded-full shadow-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleSaveDriver} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={currentDriver.name || ''} 
                      onChange={e => setCurrentDriver({...currentDriver, name: e.target.value})}
                      className="w-full rounded-xl border-gray-200 dark:border-slate-500 dark:bg-slate-800 dark:text-white p-3 text-sm focus:ring-primary focus:border-primary outline-none shadow-sm"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Vehicle</label>
                    <input 
                      type="text" 
                      value={currentDriver.vehicle || ''} 
                      onChange={e => setCurrentDriver({...currentDriver, vehicle: e.target.value})}
                      className="w-full rounded-xl border-gray-200 dark:border-slate-500 dark:bg-slate-800 dark:text-white p-3 text-sm focus:ring-primary focus:border-primary outline-none shadow-sm"
                      placeholder="e.g. Toyota (TX-1234)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">PIN</label>
                    <input 
                      type="text" 
                      required
                      value={currentDriver.pin || ''} 
                      onChange={e => setCurrentDriver({...currentDriver, pin: e.target.value})}
                      className="w-full rounded-xl border-gray-200 dark:border-slate-500 dark:bg-slate-800 dark:text-white p-3 text-sm focus:ring-primary focus:border-primary outline-none shadow-sm"
                      placeholder="e.g. 1234"
                    />
                  </div>
                  <div className="md:col-span-2 lg:col-span-3 flex items-end justify-end gap-3">
                    <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-600 rounded-xl border border-gray-200 dark:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500">Cancel</button>
                    <button type="submit" className="px-5 py-3 text-sm bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover flex items-center gap-2">
                      <Save size={18} />
                      Save
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50/80 dark:bg-slate-800/80 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Vehicle</th>
                    <th className="px-6 py-4">PIN</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {drivers.map((driver) => (
                    <tr key={driver.id} className="bg-white dark:bg-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{driver.name}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-gray-400 flex items-center gap-2">
                        <Car size={14} />
                        {driver.vehicle}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-slate-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 rounded px-2 py-1 text-xs font-medium border border-gray-200 dark:border-slate-600">
                          {driver.pin}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => handleEditDriver(driver)}
                          className="p-2 text-primary dark:text-accent bg-lavender-light dark:bg-slate-700 hover:bg-lavender dark:hover:bg-slate-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteDriver(driver.id)}
                          className="p-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {drivers.length === 0 && (
                    <tr><td colSpan={4} className="p-12 text-center text-gray-400">No drivers added yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Security */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
             <div className="p-6 border-b border-gray-50 dark:border-slate-700 flex items-center gap-3 bg-gray-50/50 dark:bg-slate-800/50">
                <div className="bg-rose-50 dark:bg-rose-900/20 p-2 rounded-lg text-rose-500 dark:text-rose-400">
                   <ShieldCheck size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Admin Access</h3>
             </div>
             <form onSubmit={handlePasswordChange} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                    <input 
                      type="password"
                      value={newAdminPassword}
                      onChange={e => setNewAdminPassword(e.target.value)}
                      className="w-full rounded-xl border-gray-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white border p-3 pl-10 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm transition-all"
                      placeholder="New password"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                    <input 
                      type="password"
                      value={confirmAdminPassword}
                      onChange={e => setConfirmAdminPassword(e.target.value)}
                      className="w-full rounded-xl border-gray-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white border p-3 pl-10 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm transition-all"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>

                {pwdMessage.text && (
                  <div className={`text-xs p-3 rounded-xl font-medium flex items-center gap-2 ${pwdMessage.type === 'error' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${pwdMessage.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                    {pwdMessage.text}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={!newAdminPassword}
                  className="w-full bg-secondary text-white font-bold py-3 rounded-xl hover:bg-primary transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  Update Credentials
                </button>
             </form>
          </div>
        </div>
      </div>
    </div>
  );
};
