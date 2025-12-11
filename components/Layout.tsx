import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { LogOut, LayoutDashboard, FileText, UserCircle, Settings, Menu, X, Sun, Moon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentView, setCurrentView }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  if (!user) return <div className="min-h-screen bg-background dark:bg-slate-900 flex flex-col transition-colors duration-300">{children}</div>;

  const NavItem = ({ view, icon: Icon, label }: any) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
        currentView === view 
          ? 'bg-accent/20 text-white shadow-sm border border-white/10' 
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon size={20} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background dark:bg-slate-900 flex flex-col md:flex-row transition-colors duration-300 font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-primary dark:bg-slate-950 text-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
           <span className="font-bold text-lg tracking-tight">Trusty Yellow Cab</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-white/70 hover:text-white transition-colors"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-white/70 hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-primary dark:bg-slate-950 pt-20 px-4 animate-fade-in">
          <div className="flex flex-col gap-2">
            <div className="mb-6 px-2 flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                 <UserCircle size={24} />
               </div>
               <div>
                 <p className="font-medium text-white">{user.name}</p>
                 <p className="text-xs text-white/60 uppercase">{user.role}</p>
               </div>
            </div>
            
            <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
            
            {user.role === UserRole.DRIVER && (
              <NavItem view="new-report" icon={FileText} label="New Report" />
            )}

            {user.role === UserRole.ADMIN && (
              <>
                <NavItem view="reports" icon={FileText} label="All Reports" />
                <NavItem view="management" icon={Settings} label="Manage System" />
              </>
            )}

            <div className="h-px bg-white/10 my-4 mx-2"></div>
            
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-200 hover:bg-red-900/20 hover:text-white rounded-xl transition-colors font-medium"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex bg-primary dark:bg-slate-950 text-white w-72 flex-shrink-0 flex-col h-screen sticky top-0 shadow-soft z-10 transition-colors duration-300">
        <div className="p-8 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none">Trusty Yellow Cab</h1>
            <p className="text-xs text-white/60 mt-1">Account Manager</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Menu</p>
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          
          {user.role === UserRole.DRIVER && (
            <NavItem view="new-report" icon={FileText} label="New Report" />
          )}

          {user.role === UserRole.ADMIN && (
             <>
              <NavItem view="reports" icon={FileText} label="All Reports" />
              <NavItem view="management" icon={Settings} label="Manage System" />
             </>
          )}
        </nav>

        {/* Theme Toggle in Desktop Sidebar */}
        <div className="px-8 pb-2">
            <button
                onClick={toggleTheme}
                className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors"
            >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
        </div>

        <div className="p-4 m-4 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-sm">
           <div className="flex items-center gap-3 mb-3">
             <div className="bg-white/10 p-2 rounded-full">
               <UserCircle size={20} className="text-white"/>
             </div>
             <div className="overflow-hidden">
               <p className="font-medium text-sm truncate">{user.name}</p>
               <p className="text-xs text-white/50">{user.role}</p>
             </div>
           </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-200 hover:bg-red-500/10 hover:text-white rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-[100vw] bg-background dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto animate-fade-in pb-20 md:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
};