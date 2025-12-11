
export enum UserRole {
  ADMIN = 'ADMIN',
  DRIVER = 'DRIVER'
}

export interface Driver {
  id: string;
  name: string;
  vehicle: string;
  pin: string; // Simplified login for demo
  dailySalary?: number; // Optional now, as we removed the fixed base rate management
}

export interface IncomeBreakdown {
  local: number;
  outstation: number;
  mixed: number;
}

export interface ExpenseBreakdown {
  fuel: number;
  maintenance: number;
  toll: number;
  other: number;
}

export interface DailyReport {
  id: string;
  driverId: string;
  driverName: string;
  date: string; // YYYY-MM-DD
  
  // New Fields
  kmsDriven: number;
  loginTime: string; // HH:MM format
  logoutTime: string; // HH:MM format

  income: IncomeBreakdown;
  expenses: ExpenseBreakdown;
  totalIncome: number;
  totalExpenses: number;
  driverSalary: number; // The salary/commission for this specific day
  netProfit: number;
  notes?: string;
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  vehicle?: string;
}
