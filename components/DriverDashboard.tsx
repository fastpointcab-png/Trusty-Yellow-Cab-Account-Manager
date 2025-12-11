
import React, { useState } from 'react';
import { Driver, DailyReport } from '../types';
import { TrendingDown, IndianRupee, Calendar, AlertCircle, Banknote, CalendarRange, Edit2, Trash2, X, Save, Clock, Gauge } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as storageService from '../services/storageService';

interface DriverDashboardProps {
  driver: Driver;
  reports: DailyReport[];
  onUpdateReports: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ driver, reports, onUpdateReports }) => {
  const [dateFilter, setDateFilter] = useState<string>('month'); // Default to This Month
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Edit State
  const [editingReport, setEditingReport] = useState<any | null>(null);

  // Helper for 12-hour time format
  const formatTime = (time: string) => {
    if (!time) return '--';
    const [h, m] = time.split(':');
    let hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${m} ${ampm}`;
  };

  // Filter Logic
  const myReports = reports.filter(r => {
    if (r.driverId !== driver.id) return false;

    const reportDate = new Date(r.date);
    const today = new Date();
    
    // Reset hours for accurate comparison
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const rTime = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate()).getTime();

    if (dateFilter === 'today') {
      return rTime === current;
    }
    if (dateFilter === 'week') {
      const sevenDaysAgo = current - (7 * 24 * 60 * 60 * 1000);
      return rTime >= sevenDaysAgo;
    }
    if (dateFilter === 'month') {
      return reportDate.getMonth() === today.getMonth() && reportDate.getFullYear() === today.getFullYear();
    }
    if (dateFilter === 'year') {
      return reportDate.getFullYear() === today.getFullYear();
    }
    if (dateFilter === 'custom') {
      if (!customStart || !customEnd) return true;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
      return rTime >= startTime && rTime <= endTime;
    }

    return true; // 'all'
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const totalIncome = myReports.reduce((sum, r) => sum + r.totalIncome, 0);
  const totalExpenses = myReports.reduce((sum, r) => sum + r.totalExpenses, 0);
  
  // Calculate Salary dynamically from the reports
  const totalSalary = myReports.reduce((sum, r) => sum + (r.driverSalary || 0), 0);

  // Data for chart - Reverse order for timeline left-to-right
  const chartData = [...myReports].reverse().map(r => ({
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    income: r.totalIncome,
    expense: r.totalExpenses
  }));

  const getVal = (val: any) => {
      const str = val ? val.toString() : '';
      const cleaned = str.replace(/[^0-9.]/g, '');
      return parseFloat(cleaned) || 0;
  };

  const handleUpdateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;

    // Recalculate totals with safe parsing
    const incLocal = getVal(editingReport.income.local);
    const incOut = getVal(editingReport.income.outstation);
    const incMixed = getVal(editingReport.income.mixed);
    
    const expFuel = getVal(editingReport.expenses.fuel);
    const expMaint = getVal(editingReport.expenses.maintenance);
    const expToll = getVal(editingReport.expenses.toll);
    const expOther = getVal(editingReport.expenses.other);

    const salary = getVal(editingReport.driverSalary);

    const newTotalIncome = incLocal + incOut + incMixed;
    const newTotalTripExpenses = expFuel + expMaint + expToll + expOther + salary;
    
    // Net Profit = Income - Trip Expenses - Salary
    const newNetProfit = newTotalIncome - newTotalTripExpenses;

    const updated: DailyReport = {
        ...editingReport,
        income: { local: incLocal, outstation: incOut, mixed: incMixed },
        expenses: { fuel: expFuel, maintenance: expMaint, toll: expToll, other: expOther },
        driverSalary: salary,
        totalIncome: newTotalIncome,
        totalExpenses: newTotalTripExpenses,
        netProfit: newNetProfit
    };

    storageService.saveReport(updated);
    onUpdateReports(); // Notify parent to refresh state
    setEditingReport(null);
  };

  const handleDeleteReport = (id: string) => {
    if (window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
        storageService.deleteReport(id);
        onUpdateReports();
        if (editingReport && editingReport.id === id) {
            setEditingReport(null);
        }
    }
  };

  const handleEditValChange = (val: string, category: string, field: string) => {
       if (category === 'income') {
           setEditingReport({...editingReport, income: {...editingReport.income, [field]: val}});
       } else if (category === 'expenses') {
           setEditingReport({...editingReport, expenses: {...editingReport.expenses, [field]: val}});
       } else if (category === 'salary') {
           setEditingReport({...editingReport, driverSalary: val});
       } else if (category === 'logistics') {
           setEditingReport({...editingReport, [field]: val});
       }
  };

  const StatCard = ({ title, value, icon: Icon, color, bg }: any) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-soft border border-white dark:border-slate-700 flex items-center justify-between group hover:border-accent dark:hover:border-slate-600 transition-colors duration-300">
      <div>
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">₹{value.toLocaleString('en-IN')}</p>
      </div>
      <div className={`p-4 rounded-xl ${bg} dark:bg-opacity-20 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={24} className={`${color}`} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 relative">
       {/* Edit Modal */}
       {editingReport && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in border border-white dark:border-slate-700">
                    <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-background/50 dark:bg-slate-800/50">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Edit My Report</h3>
                        <button onClick={() => setEditingReport(null)} className="p-2 bg-white dark:bg-slate-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shadow-sm">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleUpdateReport} className="p-6 max-h-[80vh] overflow-y-auto">
                        <div className="space-y-6">
                            <div className="p-4 bg-lavender-light dark:bg-slate-700/50 rounded-xl border border-lavender/30 dark:border-slate-600 mb-4">
                                <label className="block text-xs font-bold text-primary dark:text-lavender uppercase mb-1">Date</label>
                                <input
                                    type="date"
                                    className="w-full bg-white dark:bg-slate-900 border border-lavender dark:border-slate-600 rounded-lg p-2 text-primary dark:text-white font-medium focus:ring-accent outline-none"
                                    value={editingReport.date}
                                    onChange={(e) => setEditingReport({...editingReport, date: e.target.value})}
                                />
                            </div>

                             {/* Logistics */}
                             <div>
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-2">
                                    <Gauge size={14}/> Trip Logistics
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Kms Driven</label>
                                        <input 
                                            type="text" inputMode="decimal"
                                            className="w-full border dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg p-2" 
                                            value={editingReport.kmsDriven || ''}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'logistics', 'kmsDriven')} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Login Time</label>
                                        <input 
                                            type="time"
                                            className="w-full border dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg p-2" 
                                            value={editingReport.loginTime || ''}
                                            onChange={e => handleEditValChange(e.target.value, 'logistics', 'loginTime')} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Logout Time</label>
                                        <input 
                                            type="time"
                                            className="w-full border dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg p-2" 
                                            value={editingReport.logoutTime || ''}
                                            onChange={e => handleEditValChange(e.target.value, 'logistics', 'logoutTime')} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Income */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Trip Income</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Local</label>
                                        <input 
                                            type="text" inputMode="decimal"
                                            className="w-full border dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg p-2" 
                                            value={editingReport.income.local}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'income', 'local')} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Outstation</label>
                                        <input 
                                            type="text" inputMode="decimal" 
                                            className="w-full border dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg p-2" 
                                            value={editingReport.income.outstation}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'income', 'outstation')} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Other</label>
                                        <input 
                                            type="text" inputMode="decimal"
                                            className="w-full border dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg p-2" 
                                            value={editingReport.income.mixed}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'income', 'mixed')} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Expenses */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Trip Expenses</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Fuel</label>
                                        <input 
                                            type="text" inputMode="decimal"
                                            className="w-full border dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg p-2" 
                                            value={editingReport.expenses.fuel}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'expenses', 'fuel')} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Maintenance</label>
                                        <input 
                                            type="text" inputMode="decimal"
                                            className="w-full border dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg p-2" 
                                            value={editingReport.expenses.maintenance}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'expenses', 'maintenance')} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Toll</label>
                                        <input 
                                            type="text" inputMode="decimal"
                                            className="w-full border dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg p-2" 
                                            value={editingReport.expenses.toll}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'expenses', 'toll')} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Other</label>
                                        <input 
                                            type="text" inputMode="decimal"
                                            className="w-full border dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg p-2" 
                                            value={editingReport.expenses.other}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'expenses', 'other')} 
                                        />
                                    </div>
                                </div>
                            </div>

                             {/* Salary */}
                             <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                <label className="block text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-2">My Salary / Commission</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-emerald-600 dark:text-emerald-400">₹</span>
                                    <input 
                                        type="text" inputMode="decimal"
                                        className="w-full border-emerald-200 dark:border-emerald-800 dark:bg-slate-900 dark:text-white rounded-lg p-2 pl-8 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-emerald-900 font-bold" 
                                        value={editingReport.driverSalary}
                                        onFocus={(e) => e.target.select()}
                                        onChange={e => handleEditValChange(e.target.value, 'salary', '')} 
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                    <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-between gap-3">
                         <button type="button" onClick={() => handleDeleteReport(editingReport.id)} className="px-5 py-2.5 text-sm font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/30 flex items-center gap-2">
                            <Trash2 size={16} />
                            Delete
                        </button>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setEditingReport(null)} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600">Cancel</button>
                            <button type="button" onClick={handleUpdateReport} className="px-5 py-2.5 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary-hover flex items-center gap-2">
                                <Save size={16} />
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary dark:text-white tracking-tight">Overview</h2>
          <p className="text-secondary dark:text-accent mt-1">Welcome back, {driver.name.split(' ')[0]}.</p>
        </div>

        {/* Date Filters */}
        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-soft border border-white dark:border-slate-700 flex flex-col md:flex-row gap-2 w-full md:w-auto transition-colors duration-300">
             <div className="relative">
               <CalendarRange size={16} className="absolute left-3 top-3 text-gray-400" />
               <select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full bg-background dark:bg-slate-900 border border-lavender dark:border-slate-600 text-slate-700 dark:text-white text-sm rounded-lg focus:ring-accent focus:border-accent p-2.5 pl-9 outline-none font-medium appearance-none"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
            </div>

            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 animate-fade-in w-full md:w-auto">
                <input 
                  type="date" 
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full bg-background dark:bg-slate-900 border border-lavender dark:border-slate-600 text-slate-700 dark:text-white text-sm rounded-lg p-2.5 outline-none"
                />
                <span className="text-gray-300 font-medium">-</span>
                <input 
                  type="date" 
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full bg-background dark:bg-slate-900 border border-lavender dark:border-slate-600 text-slate-700 dark:text-white text-sm rounded-lg p-2.5 outline-none"
                />
              </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <StatCard title="Trip Income" value={totalIncome} icon={IndianRupee} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Trip Expenses" value={totalExpenses} icon={TrendingDown} color="text-rose-600" bg="bg-red-50" />
        <StatCard 
          title="Earned Salary" 
          value={totalSalary} 
          icon={Banknote} 
          color="text-emerald-600" 
          bg="bg-emerald-50" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent History Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-white dark:border-slate-700 overflow-hidden flex flex-col transition-colors duration-300">
          <div className="p-6 border-b border-gray-50 dark:border-slate-700 flex justify-between items-center bg-background/50 dark:bg-slate-800/50">
             <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
               <Calendar size={20} className="text-primary dark:text-accent"/>
               Trip Log
             </h3>
             <span className="text-xs font-semibold text-primary dark:text-secondary bg-lavender-light dark:bg-slate-700 px-2 py-1 rounded">
               {myReports.length} Reports
             </span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-lavender-light dark:bg-slate-800/80 font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Logs</th>
                  <th className="px-6 py-4">Income</th>
                  <th className="px-6 py-4">Expense</th>
                  <th className="px-6 py-4">Salary Earned</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {myReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center flex flex-col items-center justify-center text-gray-400">
                      <AlertCircle size={32} className="mb-2 opacity-20"/>
                      No reports found for this period.
                    </td>
                  </tr>
                ) : (
                  myReports.map((report) => (
                    <tr key={report.id} className="bg-white dark:bg-slate-800 hover:bg-background dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">{report.date}</td>
                      <td className="px-6 py-4">
                         <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                              <Gauge size={12} className="text-primary dark:text-accent"/>
                              {report.kmsDriven ? `${report.kmsDriven}km` : '-'}
                           </div>
                           <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                              <Clock size={12} className="text-primary dark:text-accent"/>
                              {formatTime(report.loginTime)} - {formatTime(report.logoutTime)}
                           </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-medium">+₹{report.totalIncome}</td>
                      <td className="px-6 py-4 text-red-500 dark:text-red-400 font-medium">-₹{report.totalExpenses}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-semibold">
                         ₹{report.driverSalary || 0}
                      </td>
                      <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                        <button 
                            onClick={() => setEditingReport(report)}
                            className="p-2 text-primary dark:text-accent bg-lavender-light dark:bg-slate-700 hover:bg-lavender dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onClick={() => handleDeleteReport(report.id)}
                            className="p-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mini Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-white dark:border-slate-700 p-6 flex flex-col transition-colors duration-300">
          <h3 className="font-bold text-slate-800 dark:text-white mb-6 text-lg">Income vs Expense</h3>
          <div className="flex-1 min-h-[250px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{top: 5, right: 5, left: -20, bottom: 0}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{fontSize: 11, fill: '#94A3B8'}} tickLine={false} axisLine={false} dy={10} />
                  <YAxis tick={{fontSize: 11, fill: '#94A3B8'}} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      backgroundColor: '#2F0058',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} name="Income" />
                  <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} name="Expense" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data to display</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
