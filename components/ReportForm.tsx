
import React, { useState } from 'react';
import { DailyReport, Driver, IncomeBreakdown, ExpenseBreakdown } from '../types';
import { Save, ArrowLeft, Clock, Gauge } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ReportFormProps {
  driver: Driver;
  onSubmit: (report: DailyReport) => void;
  onCancel: () => void;
}

// Extracted InputGroup outside to prevent re-renders causing focus loss
const InputGroup = ({ label, value, onChange, prefix = "₹" }: any) => (
  <div className="mb-5">
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    <div className="relative rounded-xl shadow-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <span className="text-gray-400 font-medium">{prefix}</span>
      </div>
      <input
        type="text"
        inputMode="decimal"
        className="block w-full rounded-xl border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 pl-9 py-4 text-gray-900 dark:text-white text-lg font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-gray-300"
        value={value}
        onFocus={(e) => e.target.select()}
        placeholder="0"
        onChange={(e) => {
          const val = e.target.value;
          // Only allow digits and a decimal point for clean numeric input
          if (val === '' || /^[0-9.]*$/.test(val)) {
            onChange(val);
          }
        }}
      />
    </div>
  </div>
);

export const ReportForm: React.FC<ReportFormProps> = ({ driver, onSubmit, onCancel }) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Operational Details
  const [kmsDriven, setKmsDriven] = useState('');
  const [loginTime, setLoginTime] = useState('');
  const [logoutTime, setLogoutTime] = useState('');

  // Use strings for form state to allow free typing
  const [income, setIncome] = useState<any>({
    local: '',
    outstation: '',
    mixed: ''
  });

  const [expenses, setExpenses] = useState<any>({
    fuel: '',
    maintenance: '',
    toll: '',
    other: '',
    salary: '' // Driver Salary input
  });

  const [notes, setNotes] = useState('');

  // Helper to safely parse any string input to a number (removes commas, letters, etc.)
  const getVal = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    // Remove all non-numeric characters except decimal point
    const cleaned = val.toString().replace(/[^0-9.]/g, '');
    // Handle multiple decimal points if user typos (take first part)
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parseFloat(`${parts[0]}.${parts[1]}`) || 0;
    }
    return parseFloat(cleaned) || 0;
  };

  // Auto-calculated totals
  const totalIncome = getVal(income.local) + getVal(income.outstation) + getVal(income.mixed);
  const totalExpenses = getVal(expenses.fuel) + getVal(expenses.maintenance) + getVal(expenses.toll) + getVal(expenses.other) + getVal(expenses.salary);
  
  // Note: expenses.salary is captured but usually driverSalary is tracked separately in data model for clarity.
  // Based on previous requests, we treat it as an expense line item.
  const driverSalary = getVal(expenses.salary);
  
  // Net Profit = Income - (Expenses INCLUDING Salary)
  // Since totalExpenses includes salary now, we just subtract totalExpenses
  const netProfit = totalIncome - totalExpenses;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert form strings back to strict numbers for the data model
    const finalIncome: IncomeBreakdown = {
      local: getVal(income.local),
      outstation: getVal(income.outstation),
      mixed: getVal(income.mixed)
    };

    const finalExpenses: ExpenseBreakdown = {
      fuel: getVal(expenses.fuel),
      maintenance: getVal(expenses.maintenance),
      toll: getVal(expenses.toll),
      other: getVal(expenses.other)
    };

    const newReport: DailyReport = {
      id: uuidv4(),
      driverId: driver.id,
      driverName: driver.name,
      date,
      kmsDriven: getVal(kmsDriven),
      loginTime: loginTime || '00:00',
      logoutTime: logoutTime || '00:00',
      income: finalIncome,
      expenses: finalExpenses,
      totalIncome,
      totalExpenses, // This tracks trip expenses + salary
      driverSalary, // Explicit field for logic
      netProfit,
      notes,
      timestamp: Date.now()
    };
    onSubmit(newReport);
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">New Report</h2>
          <p className="text-slate-500 dark:text-slate-400">Submit daily trip details.</p>
        </div>
        <button onClick={onCancel} className="md:hidden p-2 bg-white dark:bg-slate-800 rounded-full shadow text-slate-600 dark:text-slate-300">
           <ArrowLeft size={20} />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-gray-100 dark:border-slate-700 p-6 md:p-8 transition-colors duration-300">
        <form onSubmit={handleSubmit}>
          {/* Top Meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
             <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Driver</label>
                <div className="font-bold text-slate-800 dark:text-white text-lg">{driver.name}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{driver.vehicle}</div>
             </div>
             <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Report Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 dark:border-slate-600 py-2 px-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-slate-800 font-medium"
                />
             </div>
          </div>

          {/* New Operational Details Section */}
          <div className="mb-8">
             <h3 className="font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2 text-lg pb-2 border-b border-gray-100 dark:border-slate-700">
               <Gauge size={20} className="text-primary dark:text-accent"/>
               Trip Logistics
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Total Kms Driven</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={kmsDriven}
                    onChange={(e) => {
                      if (e.target.value === '' || /^[0-9.]*$/.test(e.target.value)) setKmsDriven(e.target.value)
                    }}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className="block w-full rounded-xl border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 p-3 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-primary outline-none"
                  />
               </div>
               <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Login Time</label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-3.5 text-gray-400"/>
                    <input
                      type="time"
                      value={loginTime}
                      onChange={(e) => setLoginTime(e.target.value)}
                      className="block w-full rounded-xl border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 p-3 pl-10 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Logout Time</label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-3.5 text-gray-400"/>
                    <input
                      type="time"
                      value={logoutTime}
                      onChange={(e) => setLogoutTime(e.target.value)}
                      className="block w-full rounded-xl border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 p-3 pl-10 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Income Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl">
              <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-5 flex items-center gap-2 text-lg pb-2 border-b border-gray-100 dark:border-slate-700">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></span>
                Trip Income
              </h3>
              <InputGroup 
                label="Local Trips" 
                value={income.local} 
                onChange={(val: string) => setIncome({...income, local: val})} 
              />
              <InputGroup 
                label="Outstation Trips" 
                value={income.outstation} 
                onChange={(val: string) => setIncome({...income, outstation: val})} 
              />
               <InputGroup 
                label="Other Income" 
                value={income.mixed} 
                onChange={(val: string) => setIncome({...income, mixed: val})} 
              />
              <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-slate-700 mt-2">
                <span className="font-medium text-gray-500 dark:text-gray-400">Total Income</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">₹{totalIncome.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl">
               <h3 className="font-bold text-rose-700 dark:text-rose-400 mb-5 flex items-center gap-2 text-lg pb-2 border-b border-gray-100 dark:border-slate-700">
                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></span>
                Trip Expenses
              </h3>
               <InputGroup 
                label="Fuel Cost" 
                value={expenses.fuel} 
                onChange={(val: string) => setExpenses({...expenses, fuel: val})} 
              />
               <InputGroup 
                label="Maintenance" 
                value={expenses.maintenance} 
                onChange={(val: string) => setExpenses({...expenses, maintenance: val})} 
              />
               <InputGroup 
                label="Toll Charges" 
                value={expenses.toll} 
                onChange={(val: string) => setExpenses({...expenses, toll: val})} 
              />
               <InputGroup 
                label="Other" 
                value={expenses.other} 
                onChange={(val: string) => setExpenses({...expenses, other: val})} 
              />
               <InputGroup 
                label="Driver Salary / Commission" 
                value={expenses.salary} 
                onChange={(val: string) => setExpenses({...expenses, salary: val})} 
              />
              <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-slate-700 mt-2">
                <span className="font-medium text-gray-500 dark:text-gray-400">Total Expenses</span>
                <span className="text-xl font-bold text-rose-600 dark:text-rose-400">₹{totalExpenses.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Additional Notes</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="block w-full rounded-xl border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 py-3 px-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-gray-400 text-base"
              placeholder="Type freely here about incidents, traffic, or other details..."
            />
          </div>

          <div className="flex flex-col-reverse md:flex-row gap-4 justify-end pt-4 border-t border-gray-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3.5 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold text-white bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all"
            >
              <Save size={18} />
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
