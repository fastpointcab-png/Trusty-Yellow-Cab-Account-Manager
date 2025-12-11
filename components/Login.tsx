import React, { useState } from 'react';
import { Driver, User, UserRole } from '../types';
import * as storageService from '../services/storageService';
import { KeyRound, ShieldCheck, CarTaxiFront, CheckCircle2, User as UserIcon } from 'lucide-react';

interface LoginProps {
  drivers: Driver[];
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ drivers, onLogin }) => {
  const [role, setRole] = useState<UserRole>(UserRole.DRIVER);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === UserRole.ADMIN) {
      const storedAdminPin = await storageService.getAdminPassword();
      if (pin === storedAdminPin) {
        onLogin({ id: 'admin', name: 'Administrator', role: UserRole.ADMIN });
      } else {
        setError('Invalid Admin Password.');
      }
    } else {
      const driver = drivers.find(d => d.id === selectedDriverId);
      if (driver && driver.pin === pin) {
        onLogin({ id: driver.id, name: driver.name, role: UserRole.DRIVER, vehicle: driver.vehicle });
      } else {
        setError('Invalid Driver PIN.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-dark-bg flex items-center justify-center p-4 md:p-6 transition-colors duration-500 overflow-hidden relative">
      
      {/* Theme Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#E4D9EE] rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse dark:bg-[#2F0058] dark:opacity-30"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#D3D1EB] rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse delay-1000 dark:bg-[#451075] dark:opacity-30"></div>
      <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-[#BDB2CE] rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-pulse delay-500 dark:hidden"></div>

      <div className="relative z-10 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-2xl rounded-[2rem] shadow-card overflow-hidden w-full max-w-md flex flex-col border border-lavender dark:border-primary/30 transition-colors duration-300">
        
        <div className="w-full p-8 md:p-10 flex flex-col">
          <div className="text-center mb-8">
             <h1 className="text-3xl font-extrabold text-primary dark:text-white tracking-tight">Trusty Yellow Cab</h1>
             <p className="text-secondary dark:text-accent font-medium mt-2">Account Manager</p>
          </div>

          {/* Toggle Role */}
          <div className="flex p-1.5 mb-8 bg-lavender dark:bg-primary/20 rounded-2xl border border-lavender/50 dark:border-primary/30">
            <button
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                role === UserRole.DRIVER 
                ? 'bg-white dark:bg-primary shadow-soft text-primary dark:text-white' 
                : 'text-secondary dark:text-accent hover:text-primary dark:hover:text-white'
              }`}
              onClick={() => { setRole(UserRole.DRIVER); setPin(''); setError(''); }}
            >
              <CarTaxiFront size={18}/>
              Driver
            </button>
            <button
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                role === UserRole.ADMIN 
                ? 'bg-white dark:bg-primary shadow-soft text-primary dark:text-white' 
                : 'text-secondary dark:text-accent hover:text-primary dark:hover:text-white'
              }`}
              onClick={() => { setRole(UserRole.ADMIN); setPin(''); setError(''); }}
            >
              <ShieldCheck size={18}/>
              Admin
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {role === UserRole.DRIVER && (
              <div>
                <label className="block text-xs font-bold text-secondary dark:text-accent uppercase mb-2 ml-1">Select Profile</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-3.5 text-secondary/60 dark:text-accent/60 transition-colors" size={20} />
                  <select
                    className="w-full rounded-2xl border border-accent dark:border-primary/40 bg-white dark:bg-dark-bg p-3 pl-11 focus:ring-2 focus:ring-primary dark:focus:ring-accent outline-none transition-all appearance-none text-primary dark:text-white font-medium cursor-pointer shadow-sm hover:border-secondary/40"
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    required
                  >
                    <option value="">Choose your name...</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} &mdash; {d.vehicle}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-secondary dark:text-accent uppercase mb-2 ml-1">
                 {role === UserRole.ADMIN ? 'Admin Password' : 'Security PIN'}
              </label>
              <div className="relative group">
                <KeyRound className="absolute left-4 top-3.5 text-secondary/60 dark:text-accent/60 transition-colors" size={20} />
                <input
                  type="password"
                  className="w-full rounded-2xl border border-accent dark:border-primary/40 bg-white dark:bg-dark-bg p-3 pl-11 focus:ring-2 focus:ring-primary dark:focus:ring-accent outline-none transition-all placeholder:text-secondary/40 font-medium text-primary dark:text-white shadow-sm hover:border-secondary/40"
                  placeholder={role === UserRole.ADMIN ? "••••••••" : "4-digit PIN"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-rose-600 dark:text-rose-400 text-sm bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl flex items-center gap-2 border border-rose-100 dark:border-rose-900/30 animate-fade-in">
                <CheckCircle2 size={16} className="rotate-45" />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 dark:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6"
            >
              Sign In
              <CheckCircle2 size={20} />
            </button>
          </form>
          
          <div className="mt-8 text-center">
             <p className="text-xs text-secondary/60 font-medium">
               &copy; {new Date().getFullYear()} Trusty Yellow Cab
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};