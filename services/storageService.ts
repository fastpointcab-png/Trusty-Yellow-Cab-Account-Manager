
import { supabase } from './supabase';
import { Driver, DailyReport } from '../types';

// Fallback Keys for LocalStorage
const LS_DRIVERS = 'tyc_drivers';
const LS_REPORTS = 'tyc_reports';
const LS_ADMIN_PWD = 'tyc_admin_pwd';

// Mock Data for initial fallback
const MOCK_DRIVERS: Driver[] = [
  { id: '1', name: 'Ramesh Kumar', vehicle: 'TN 38 BR 1234', pin: '1234' },
  { id: '2', name: 'Suresh Raj', vehicle: 'TN 38 CS 5678', pin: '5678' }
];

// --- Drivers ---

export const getDrivers = async (): Promise<Driver[]> => {
  try {
    const { data, error } = await supabase.from('drivers').select('*');
    if (error) throw error;
    
    if (data) {
        return data.map((d: any) => ({
            id: d.id,
            name: d.name,
            vehicle: d.vehicle,
            pin: d.pin
            // dailySalary is optional/handled via reports now
        }));
    }
    return [];
  } catch (err: any) {
    console.warn("Supabase unavailable (using LocalStorage fallback). Details:", err.message || err);
    const stored = localStorage.getItem(LS_DRIVERS);
    if (!stored) {
        // Initialize mock data if empty so app isn't blank
        localStorage.setItem(LS_DRIVERS, JSON.stringify(MOCK_DRIVERS));
        return MOCK_DRIVERS;
    }
    return JSON.parse(stored);
  }
};

export const saveDriver = async (driver: Driver) => {
  try {
    const { error } = await supabase.from('drivers').upsert({
      id: driver.id,
      name: driver.name,
      vehicle: driver.vehicle,
      pin: driver.pin
    });
    if (error) throw error;
  } catch (err) {
     console.warn("Using LocalStorage for saveDriver");
     const drivers = await getDrivers(); // Gets from LS if Supabase failed
     const index = drivers.findIndex(d => d.id === driver.id);
     if (index >= 0) drivers[index] = driver;
     else drivers.push(driver);
     localStorage.setItem(LS_DRIVERS, JSON.stringify(drivers));
  }
};

export const deleteDriver = async (id: string) => {
    try {
        const { error } = await supabase.from('drivers').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.warn("Using LocalStorage for deleteDriver");
        const drivers = await getDrivers();
        const filtered = drivers.filter(d => d.id !== id);
        localStorage.setItem(LS_DRIVERS, JSON.stringify(filtered));
    }
};

// --- Reports ---

export const getReports = async (): Promise<DailyReport[]> => {
    try {
        const { data, error } = await supabase.from('daily_reports').select('*');
        if (error) throw error;

        return (data || []).map((r: any) => ({
            id: r.id,
            driverId: r.driver_id,
            driverName: r.driver_name,
            date: r.date,
            kmsDriven: Number(r.kms_driven),
            loginTime: r.login_time,
            logoutTime: r.logout_time,
            income: r.income,     // JSONB auto-parsed
            expenses: r.expenses, // JSONB auto-parsed
            totalIncome: Number(r.total_income),
            totalExpenses: Number(r.total_expenses),
            driverSalary: Number(r.driver_salary),
            netProfit: Number(r.net_profit),
            notes: r.notes,
            timestamp: Number(r.timestamp)
        }));
    } catch (err: any) {
        console.warn("Supabase unavailable (using LocalStorage fallback). Details:", err.message || err);
        const stored = localStorage.getItem(LS_REPORTS);
        return stored ? JSON.parse(stored) : [];
    }
};

export const saveReport = async (report: DailyReport) => {
    try {
        // Map camelCase App types to snake_case DB columns
        const dbReport = {
            id: report.id,
            driver_id: report.driverId,
            driver_name: report.driverName,
            date: report.date,
            kms_driven: report.kmsDriven,
            login_time: report.loginTime,
            logout_time: report.logoutTime,
            income: report.income,
            expenses: report.expenses,
            total_income: report.totalIncome,
            total_expenses: report.totalExpenses,
            driver_salary: report.driverSalary,
            net_profit: report.netProfit,
            notes: report.notes,
            timestamp: report.timestamp
        };
        const { error } = await supabase.from('daily_reports').upsert(dbReport);
        if (error) throw error;
    } catch (err) {
        console.warn("Using LocalStorage for saveReport");
        const reports = await getReports();
        const index = reports.findIndex(r => r.id === report.id);
        if (index >= 0) reports[index] = report;
        else reports.push(report);
        localStorage.setItem(LS_REPORTS, JSON.stringify(reports));
    }
};

export const deleteReport = async (id: string) => {
    try {
        const { error } = await supabase.from('daily_reports').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.warn("Using LocalStorage for deleteReport");
        const reports = await getReports();
        const filtered = reports.filter(r => r.id !== id);
        localStorage.setItem(LS_REPORTS, JSON.stringify(filtered));
    }
};

// --- Admin Security ---

export const getAdminPassword = async (): Promise<string> => {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'admin_pwd')
            .single();
        
        if (error) throw error;
        if (!data) return 'admin';
        return data.value;
    } catch (err) {
        // Quietly fail to local storage for password to avoid spamming console
        const stored = localStorage.getItem(LS_ADMIN_PWD);
        return stored || 'admin';
    }
};

export const setAdminPassword = async (password: string) => {
    try {
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'admin_pwd', value: password });
        if (error) throw error;
    } catch (err) {
        localStorage.setItem(LS_ADMIN_PWD, password);
    }
};
