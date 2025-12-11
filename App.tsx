import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { DriverDashboard } from './components/DriverDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminManagement } from './components/AdminManagement';
import { ReportForm } from './components/ReportForm';
import { User, UserRole, Driver, DailyReport } from './types';
import * as storageService from './services/storageService';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const [loadedDrivers, loadedReports] = await Promise.all([
          storageService.getDrivers(),
          storageService.getReports()
        ]);
        setDrivers(loadedDrivers);
        setReports(loadedReports);
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  const refreshDrivers = async () => {
    const d = await storageService.getDrivers();
    setDrivers(d);
  };

  const refreshReports = async () => {
    const r = await storageService.getReports();
    setReports(r);
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
  };

  const handleSubmitReport = async (report: DailyReport) => {
    await storageService.saveReport(report);
    await refreshReports(); // Refresh state
    setCurrentView('dashboard');
    
    // Simulate Notification
    if (user?.role === UserRole.DRIVER) {
       alert("Report submitted successfully! Admin has been notified.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4EAF1] dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <Loader2 size={40} className="animate-spin text-[#8E83A9]" />
           <p className="text-[#8E83A9] font-medium">Loading Trusty Yellow Cab...</p>
        </div>
      </div>
    );
  }

  // Render Logic
  if (!user) {
    return <Login drivers={drivers} onLogin={handleLogin} />;
  }

  const renderContent = () => {
    if (user.role === UserRole.DRIVER) {
      if (currentView === 'new-report') {
        const currentDriver = drivers.find(d => d.id === user.id);
        if (!currentDriver) return <div>Error loading driver data</div>;
        return (
          <ReportForm 
            driver={currentDriver} 
            onSubmit={handleSubmitReport} 
            onCancel={() => setCurrentView('dashboard')} 
          />
        );
      }
      return (
        <DriverDashboard 
          driver={drivers.find(d => d.id === user.id)!} 
          reports={reports} 
          onUpdateReports={refreshReports}
        />
      );
    }

    if (user.role === UserRole.ADMIN) {
       if (currentView === 'management') {
          return <AdminManagement drivers={drivers} onUpdateDrivers={refreshDrivers} />;
       }
       // Default to dashboard/reports for other views
       return <AdminDashboard reports={reports} drivers={drivers} onUpdateReports={refreshReports} />;
    }

    return <div>Unknown Role</div>;
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      currentView={currentView}
      setCurrentView={setCurrentView}
    >
      {renderContent()}
    </Layout>
  );
}