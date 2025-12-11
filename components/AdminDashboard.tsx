
import React, { useState } from 'react';
import { DailyReport, Driver } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { Download, Filter, Search, Loader2, CalendarRange, TrendingUp, TrendingDown, Edit2, X, Save, Trash2, Clock, Gauge, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as storageService from '../services/storageService';

interface AdminDashboardProps {
  reports: DailyReport[];
  drivers: Driver[];
  onUpdateReports: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ reports, drivers, onUpdateReports }) => {
  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('month'); // Default to This Month
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Edit State - Use 'any' to allow string updates during edit
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
  const filteredReports = reports.filter(r => {
    // 1. Driver Filter
    if (filterDriver !== 'all' && r.driverId !== filterDriver) return false;

    // 2. Date Filter
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

  // Aggregates
  const totalIncome = filteredReports.reduce((acc, r) => acc + r.totalIncome, 0);
  const totalTripExpenses = filteredReports.reduce((acc, r) => acc + r.totalExpenses, 0);
  const totalSalary = filteredReports.reduce((acc, r) => acc + (r.driverSalary || 0), 0);
  
  // Refined Calculation
  const rawFuel = filteredReports.reduce((acc, r) => acc + r.expenses.fuel, 0);
  const rawMaint = filteredReports.reduce((acc, r) => acc + r.expenses.maintenance, 0);
  const rawToll = filteredReports.reduce((acc, r) => acc + r.expenses.toll, 0);
  const rawOther = filteredReports.reduce((acc, r) => acc + r.expenses.other, 0);
  
  const calculatedTripExpensesOnly = rawFuel + rawMaint + rawToll + rawOther;
  const calculatedNetProfit = totalIncome - calculatedTripExpensesOnly - totalSalary;

  // Chart Data Preparation
  const trendData = [...filteredReports]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-14)
    .map(r => ({
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Profit: r.netProfit,
      Income: r.totalIncome
    }));

  const expenseBreakdown = filteredReports.reduce((acc, r) => ({
    Fuel: acc.Fuel + r.expenses.fuel,
    Maintenance: acc.Maintenance + r.expenses.maintenance,
    Toll: acc.Toll + r.expenses.toll,
    Other: acc.Other + r.expenses.other,
    Salary: acc.Salary + (r.driverSalary || 0)
  }), { Fuel: 0, Maintenance: 0, Toll: 0, Other: 0, Salary: 0 });

  const pieData = Object.entries(expenseBreakdown).map(([name, value]) => ({ name, value }));
  // Palette #2F0058 Colors: 
  // #EF4444 (Red), #BDB2CE (Dusty Lavender), #2F0058 (Night Plum), #D3D1EB (Silver Cloud), #E4D9EE (Rose Veil)
  const COLORS = ['#EF4444', '#BDB2CE', '#2F0058', '#D3D1EB', '#E4D9EE'];

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
    // Total Expenses in the object usually implies all money out
    const newTotalExpenses = expFuel + expMaint + expToll + expOther + salary;
    
    // Net Profit = Income - (Fuel+Maint+Toll+Other+Salary)
    const newNetProfit = newTotalIncome - newTotalExpenses;

    const updated: DailyReport = {
        ...editingReport,
        income: { local: incLocal, outstation: incOut, mixed: incMixed },
        expenses: { fuel: expFuel, maintenance: expMaint, toll: expToll, other: expOther },
        driverSalary: salary,
        totalIncome: newTotalIncome,
        totalExpenses: newTotalExpenses, 
        netProfit: newNetProfit
    };

    storageService.saveReport(updated);
    onUpdateReports(); // Notify parent to refresh state
    setEditingReport(null);
  };

  const handleDeleteReport = (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this report? This action cannot be undone.")) {
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

  const handleGeneratePDF = (action: 'download' | 'print') => {
    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // White Theme Colors for Print
      const colors = {
        text: [0, 0, 0] as [number, number, number],         // Pure Black
        lightGray: [245, 245, 245] as [number, number, number], // Very Light Gray
        headerGray: [230, 230, 230] as [number, number, number], // Light Gray
        primary: [0, 0, 0] as [number, number, number],      // Black Headers
      };

      // == Header Section ==
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("TRUSTYYELLOWCAB - STATEMENT", 105, 15, { align: 'center' });

      // Left: Company Info
      doc.setFontSize(10);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFont("helvetica", "bold");
      doc.text("COMPANY:", 14, 30);
      doc.setFont("helvetica", "normal");
      doc.text("Trustyyellowcabs -Taxi services", 14, 35);
      doc.text("Coimbatore, Tamil Nadu", 14, 40);
      doc.text("641007", 14, 45);

      // Right: Report Meta
      const driverName = filterDriver === 'all' ? 'All Drivers' : drivers.find(d => d.id === filterDriver)?.name || 'Unknown';
      let periodLabel = 'All Time';
      if (dateFilter === 'today') periodLabel = 'Today';
      else if (dateFilter === 'week') periodLabel = 'Last 7 Days';
      else if (dateFilter === 'month') periodLabel = 'This Month';
      else if (dateFilter === 'year') periodLabel = 'This Year';
      else if (dateFilter === 'custom') periodLabel = `${customStart} to ${customEnd}`;

      doc.setFont("helvetica", "bold");
      doc.text("REPORT DETAILS:", 196, 30, { align: 'right' });
      doc.setFont("helvetica", "normal");
      doc.text(`Driver: ${driverName}`, 196, 35, { align: 'right' });
      doc.text(`Period: ${periodLabel}`, 196, 40, { align: 'right' });
      doc.text(`Date Prepared: ${new Date().toLocaleDateString('en-IN')}`, 196, 45, { align: 'right' });

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(14, 50, 196, 50);

      // == Summary Statement Table ==
      const incomeLocal = filteredReports.reduce((s, r) => s + r.income.local, 0);
      const incomeOutstation = filteredReports.reduce((s, r) => s + r.income.outstation, 0);
      const incomeOther = filteredReports.reduce((s, r) => s + r.income.mixed, 0);
      
      const expFuel = filteredReports.reduce((s, r) => s + r.expenses.fuel, 0);
      const expMaint = filteredReports.reduce((s, r) => s + r.expenses.maintenance, 0);
      const expOther = filteredReports.reduce((s, r) => s + r.expenses.toll + r.expenses.other, 0);
      const expSalary = filteredReports.reduce((s, r) => s + (r.driverSalary || 0), 0);

      const totalOpsExpenses = expFuel + expMaint + expOther + expSalary;

      const summaryBody: any[] = [
        [{ content: 'REVENUE', colSpan: 2, styles: { fontStyle: 'bold', fillColor: colors.lightGray } }],
        ['Local Trip Income', `Rs. ${incomeLocal.toLocaleString('en-IN')}`],
        ['Outstation Trip Income', `Rs. ${incomeOutstation.toLocaleString('en-IN')}`],
        ['Other Income', `Rs. ${incomeOther.toLocaleString('en-IN')}`],
        [{ content: 'TOTAL REVENUE', styles: { fontStyle: 'bold' } }, { content: `Rs. ${totalIncome.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold' } }],
        
        [{ content: 'OPERATING EXPENSES', colSpan: 2, styles: { fontStyle: 'bold', fillColor: colors.lightGray } }],
        ['Fuel Costs', `Rs. ${expFuel.toLocaleString('en-IN')}`],
        ['Maintenance & Repairs', `Rs. ${expMaint.toLocaleString('en-IN')}`],
        ['Tolls & Other', `Rs. ${expOther.toLocaleString('en-IN')}`],
        ['Driver Salary/Commission', `Rs. ${expSalary.toLocaleString('en-IN')}`],
        [{ content: 'TOTAL EXPENSES', styles: { fontStyle: 'bold' } }, { content: `Rs. ${totalOpsExpenses.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold' } }],
        
        [{ content: 'NET PROFIT', styles: { fontStyle: 'bold', fontSize: 11, fillColor: colors.headerGray } }, { content: `Rs. ${calculatedNetProfit.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fontSize: 11, fillColor: colors.headerGray } }]
      ];

      autoTable(doc, {
        body: summaryBody,
        startY: 55,
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 3,
          textColor: colors.text,
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 140 },
          1: { cellWidth: 'auto', halign: 'right' }
        },
      });

      // == Detailed Log Table ==
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("DETAILED TRANSACTION LOG", 14, finalY);

      const tableColumn = [
        "DATE", "DRIVER", "LOGS", "REVENUE", "EXPENSE", "SALARY", "PROFIT"
      ];

      const tableRows = filteredReports.map(report => [
        new Date(report.date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'}),
        report.driverName.split(' ')[0],
        `${report.kmsDriven || 0}km\n${formatTime(report.loginTime)} - ${formatTime(report.logoutTime)}`,
        report.totalIncome.toLocaleString('en-IN'),
        // Calculate raw trip expenses (without salary) for cleaner view
        (report.expenses.fuel + report.expenses.maintenance + report.expenses.toll + report.expenses.other).toLocaleString('en-IN'),
        (report.driverSalary || 0).toLocaleString('en-IN'),
        report.netProfit.toLocaleString('en-IN')
      ]);

      const footerRow = [
        "TOTAL", "", "",
        totalIncome.toLocaleString('en-IN'),
        calculatedTripExpensesOnly.toLocaleString('en-IN'),
        totalSalary.toLocaleString('en-IN'),
        calculatedNetProfit.toLocaleString('en-IN')
      ];

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        foot: [footerRow],
        startY: finalY + 5,
        theme: 'plain',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: colors.text,
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        headStyles: {
          fillColor: [240, 240, 240], // Light Gray Header
          textColor: [0, 0, 0],       // Black Text
          fontStyle: 'bold',
          halign: 'right',
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        footStyles: {
          fillColor: [240, 240, 240], // Light Gray Footer
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'right',
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'left' },
          2: { halign: 'left' }, // Logs
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: function(data) {
          if (data.section === 'head' && data.column.index < 3) {
            data.cell.styles.halign = 'left';
          }
        }
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Trusty Yellow Cab - Internal Financial Document", 14, 285);
        doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
      }

      if (action === 'download') {
        const fileName = `PL_Statement_${periodLabel.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
        doc.save(fileName);
      } else {
        // Print Logic
        doc.autoPrint();
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }

    } catch (error) {
      console.error("PDF Gen Error:", error);
      alert("Failed to generate PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const StatBox = ({ label, value, color, icon: Icon }: any) => (
    <div className={`bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-soft border border-accent dark:border-primary/20 flex items-center justify-between transition-colors duration-300`}>
      <div>
        <p className="text-sm font-semibold text-secondary dark:text-accent mb-1">{label}</p>
        <p className={`text-3xl font-bold tracking-tight ${color}`}>{value}</p>
      </div>
      {Icon && (
        <div className={`p-4 rounded-xl ${color.replace('text-', 'bg-').replace('600', '50').replace('900', '100')} dark:bg-opacity-20 opacity-80`}>
          <Icon size={24} className={color} />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 pb-12 relative">
        {/* Edit Modal */}
        {editingReport && (
            <div className="fixed inset-0 z-50 bg-primary/20 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in border border-lavender dark:border-primary/30">
                    <div className="p-6 border-b border-lavender dark:border-primary/20 flex justify-between items-center bg-background/50 dark:bg-dark-bg/50">
                        <h3 className="text-lg font-bold text-primary dark:text-white">Edit Report</h3>
                        <button onClick={() => setEditingReport(null)} className="p-2 bg-white dark:bg-primary/20 rounded-full text-secondary hover:text-primary dark:text-accent dark:hover:text-white transition-colors shadow-sm">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleUpdateReport} className="p-6 max-h-[80vh] overflow-y-auto">
                        <div className="space-y-6">
                            <div className="p-4 bg-lavender/30 dark:bg-primary/10 rounded-xl border border-lavender dark:border-primary/30 mb-4">
                                <p className="text-sm font-bold text-primary dark:text-white mb-3">Driver: {editingReport.driverName}</p>
                                <div>
                                    <label className="block text-xs font-bold text-secondary dark:text-accent uppercase mb-1">Report Date</label>
                                    <input 
                                        type="date"
                                        className="w-full bg-white dark:bg-dark-bg border border-accent dark:border-primary/40 rounded-lg p-2 text-primary dark:text-white font-medium focus:ring-primary outline-none"
                                        value={editingReport.date}
                                        onChange={(e) => setEditingReport({...editingReport, date: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Logistics */}
                             <div>
                                <h4 className="text-xs font-bold text-secondary dark:text-accent uppercase mb-3 flex items-center gap-2">
                                    <Gauge size={14}/> Trip Logistics
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-secondary dark:text-accent/80 mb-1">Kms Driven</label>
                                        <input 
                                            type="text" inputMode="decimal"
                                            className="w-full border border-accent dark:border-primary/40 dark:bg-dark-bg dark:text-white rounded-lg p-2 text-primary" 
                                            value={editingReport.kmsDriven || ''}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'logistics', 'kmsDriven')} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-secondary dark:text-accent/80 mb-1">Login Time</label>
                                        <input 
                                            type="time"
                                            className="w-full border border-accent dark:border-primary/40 dark:bg-dark-bg dark:text-white rounded-lg p-2 text-primary" 
                                            value={editingReport.loginTime || ''}
                                            onChange={e => handleEditValChange(e.target.value, 'logistics', 'loginTime')} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-secondary dark:text-accent/80 mb-1">Logout Time</label>
                                        <input 
                                            type="time"
                                            className="w-full border border-accent dark:border-primary/40 dark:bg-dark-bg dark:text-white rounded-lg p-2 text-primary" 
                                            value={editingReport.logoutTime || ''}
                                            onChange={e => handleEditValChange(e.target.value, 'logistics', 'logoutTime')} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Income */}
                            <div>
                                <h4 className="text-xs font-bold text-secondary dark:text-accent uppercase mb-3 flex items-center gap-2">
                                  <TrendingUp size={14}/> Income Details
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-secondary dark:text-accent/80 mb-1">Local</label>
                                        <input 
                                            type="text" inputMode="decimal"
                                            className="w-full border border-accent dark:border-primary/40 dark:bg-dark-bg dark:text-white rounded-lg p-2 text-primary" 
                                            value={editingReport.income.local}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'income', 'local')} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-secondary dark:text-accent/80 mb-1">Outstation</label>
                                        <input 
                                            type="text" inputMode="decimal" 
                                            className="w-full border border-accent dark:border-primary/40 dark:bg-dark-bg dark:text-white rounded-lg p-2 text-primary" 
                                            value={editingReport.income.outstation}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'income', 'outstation')} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-secondary dark:text-accent/80 mb-1">Other</label>
                                        <input 
                                            type="text" inputMode="decimal"
                                            className="w-full border border-accent dark:border-primary/40 dark:bg-dark-bg dark:text-white rounded-lg p-2 text-primary" 
                                            value={editingReport.income.mixed}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'income', 'mixed')} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Expenses */}
                            <div>
                                <h4 className="text-xs font-bold text-secondary dark:text-accent uppercase mb-3 flex items-center gap-2">
                                  <TrendingDown size={14}/> Trip Expenses
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-secondary dark:text-accent/80 mb-1">Fuel</label>
                                        <input 
                                            type="text" inputMode="decimal"
                                            className="w-full border border-accent dark:border-primary/40 dark:bg-dark-bg dark:text-white rounded-lg p-2 text-primary" 
                                            value={editingReport.expenses.fuel}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'expenses', 'fuel')} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-secondary dark:text-accent/80 mb-1">Maintenance</label>
                                        <input 
                                            type="text" inputMode="decimal"
                                            className="w-full border border-accent dark:border-primary/40 dark:bg-dark-bg dark:text-white rounded-lg p-2 text-primary" 
                                            value={editingReport.expenses.maintenance}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'expenses', 'maintenance')} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-secondary dark:text-accent/80 mb-1">Toll</label>
                                        <input 
                                            type="text" inputMode="decimal"
                                            className="w-full border border-accent dark:border-primary/40 dark:bg-dark-bg dark:text-white rounded-lg p-2 text-primary" 
                                            value={editingReport.expenses.toll}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'expenses', 'toll')} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-secondary dark:text-accent/80 mb-1">Other</label>
                                        <input 
                                            type="text" inputMode="decimal"
                                            className="w-full border border-accent dark:border-primary/40 dark:bg-dark-bg dark:text-white rounded-lg p-2 text-primary" 
                                            value={editingReport.expenses.other}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => handleEditValChange(e.target.value, 'expenses', 'other')} 
                                        />
                                    </div>
                                </div>
                            </div>

                             {/* Salary */}
                             <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                <label className="block text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-2">Driver Salary / Commission</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-emerald-600 dark:text-emerald-400">₹</span>
                                    <input 
                                        type="text" inputMode="decimal"
                                        className="w-full border-emerald-200 dark:border-emerald-800 dark:bg-dark-bg dark:text-white rounded-lg p-2 pl-8 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-emerald-900 font-bold" 
                                        value={editingReport.driverSalary}
                                        onFocus={(e) => e.target.select()}
                                        onChange={e => handleEditValChange(e.target.value, 'salary', '')} 
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                    <div className="p-6 border-t border-lavender dark:border-primary/20 bg-background/50 dark:bg-dark-bg/50 flex justify-between gap-3">
                        <button type="button" onClick={() => handleDeleteReport(editingReport.id)} className="px-5 py-2.5 text-sm font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/30 flex items-center gap-2">
                            <Trash2 size={16} />
                            Delete
                        </button>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setEditingReport(null)} className="px-5 py-2.5 text-sm font-medium text-secondary dark:text-accent bg-white dark:bg-primary/20 border border-accent dark:border-primary/40 rounded-xl hover:bg-lavender dark:hover:bg-primary/30">Cancel</button>
                            <button type="button" onClick={handleUpdateReport} className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-xl flex items-center gap-2">
                                <Save size={16} />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary dark:text-white tracking-tight">Admin Dashboard</h2>
          <p className="text-secondary dark:text-accent mt-1">Analytics and financial overview.</p>
        </div>
        
        {/* Actions Buttons */}
        <div className="flex w-full md:w-auto gap-3">
          <button 
            onClick={() => handleGeneratePDF('print')}
            disabled={isGeneratingPdf}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-secondary/10 text-secondary dark:text-white border border-secondary/20 rounded-xl hover:bg-secondary/20 transition-all font-medium active:scale-95"
          >
            <Printer size={18} />
            {isGeneratingPdf ? "..." : "Print"}
          </button>
          <button 
            onClick={() => handleGeneratePDF('download')}
            disabled={isGeneratingPdf}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 active:scale-95 font-medium"
          >
            {isGeneratingPdf ? <Loader2 size={18} className="animate-spin"/> : <Download size={18} />}
            {isGeneratingPdf ? "Generating..." : "Download"}
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl shadow-soft border border-accent dark:border-primary/20 flex flex-col lg:flex-row gap-4 lg:items-center justify-between transition-colors duration-300">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full">
          <div className="flex items-center gap-2 text-secondary/60 dark:text-accent/60 font-medium">
            <Filter size={18} />
            <span className="text-sm">Filters:</span>
          </div>
          
          <select 
            value={filterDriver}
            onChange={(e) => setFilterDriver(e.target.value)}
            className="w-full md:w-auto bg-background dark:bg-dark-bg border border-accent dark:border-primary/40 text-primary dark:text-white text-sm rounded-xl focus:ring-primary focus:border-primary p-2.5 outline-none font-medium"
          >
            <option value="all">All Drivers</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.vehicle})</option>
            ))}
          </select>

          <div className="w-full md:w-auto flex items-center gap-2">
            <div className="relative w-full">
               <CalendarRange size={16} className="absolute left-3 top-3 text-secondary/60 dark:text-accent/60" />
               <select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full bg-background dark:bg-dark-bg border border-accent dark:border-primary/40 text-primary dark:text-white text-sm rounded-xl focus:ring-primary focus:border-primary p-2.5 pl-9 outline-none font-medium appearance-none"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
            </div>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 animate-fade-in w-full md:w-auto">
              <input 
                type="date" 
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full bg-background dark:bg-dark-bg border border-accent dark:border-primary/40 text-primary dark:text-white text-sm rounded-xl p-2.5 outline-none"
              />
              <span className="text-secondary/60 dark:text-accent/60 font-medium">-</span>
              <input 
                type="date" 
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full bg-background dark:bg-dark-bg border border-accent dark:border-primary/40 text-primary dark:text-white text-sm rounded-xl p-2.5 outline-none"
              />
            </div>
          )}
        </div>
        
        <div className="text-sm text-secondary dark:text-accent font-medium whitespace-nowrap">
           {filteredReports.length} Records
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatBox label="Total Revenue" value={`₹${totalIncome.toLocaleString('en-IN')}`} color="text-primary dark:text-white" />
        <StatBox label="Total Expenses" value={`₹${calculatedTripExpensesOnly.toLocaleString('en-IN')}`} color="text-rose-600" icon={TrendingDown} />
        <StatBox label="Net Profit" value={`₹${calculatedNetProfit.toLocaleString('en-IN')}`} color={calculatedNetProfit >= 0 ? "text-emerald-600" : "text-rose-600"} icon={TrendingUp} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-soft border border-accent dark:border-primary/20 flex flex-col transition-colors duration-300">
          <h3 className="font-bold text-primary dark:text-white mb-6 text-lg">Financial Trend</h3>
          <div className="flex-1 min-h-[300px]">
             {trendData.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-secondary/40">No data available</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4D9EE" />
                    <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6D5B8E'}} tickLine={false} axisLine={false} dy={10} />
                    <YAxis tick={{fontSize: 12, fill: '#6D5B8E'}} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Income" stroke="#2F0058" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                    <Line type="monotone" dataKey="Profit" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
             )}
          </div>
        </div>

        {/* Expense Pie Chart */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-soft border border-accent dark:border-primary/20 flex flex-col transition-colors duration-300">
          <h3 className="font-bold text-primary dark:text-white mb-6 text-lg">Expense Distribution</h3>
          <div className="flex-1 min-h-[300px]">
             {pieData.every(d => d.value === 0) ? (
                 <div className="h-full flex items-center justify-center text-secondary/40">No expense data</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={4}
                    dataKey="value"
                    >
                    {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                    />
                    <Legend iconType="circle" />
                </PieChart>
                </ResponsiveContainer>
             )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-soft border border-accent dark:border-primary/20 overflow-hidden flex flex-col transition-colors duration-300">
        <div className="p-6 border-b border-lavender dark:border-primary/20 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-background/50 dark:bg-dark-bg/50">
          <h3 className="font-bold text-primary dark:text-white text-lg">Detailed Report Log</h3>
          <div className="relative hidden md:block w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/50" size={18} />
            <input 
              type="text" 
              placeholder="Search in view..." 
              className="w-full pl-10 pr-4 py-2 border border-accent dark:border-primary/40 bg-white dark:bg-dark-bg rounded-xl text-sm focus:ring-primary focus:border-primary outline-none transition-all dark:text-white placeholder:text-secondary/40"
            />
          </div>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-secondary dark:text-accent uppercase bg-lavender dark:bg-primary/20 font-semibold">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Driver</th>
                <th className="px-6 py-4">Logs</th>
                <th className="px-6 py-4 text-right">Income</th>
                <th className="px-6 py-4 text-right">Trip Exp</th>
                <th className="px-6 py-4 text-right">Salary</th>
                <th className="px-6 py-4 text-right">Profit</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lavender/50 dark:divide-primary/20">
              {filteredReports.length === 0 ? (
                <tr>
                   <td colSpan={8} className="px-6 py-12 text-center text-secondary/50">
                     No records found for the selected filters.
                   </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="bg-white dark:bg-dark-surface hover:bg-lavender-light dark:hover:bg-primary/10 transition-colors">
                    <td className="px-6 py-4 font-medium text-primary dark:text-white whitespace-nowrap">{report.date}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-primary dark:text-white">{report.driverName}</div>
                      <div className="text-xs text-secondary/80 dark:text-accent">{drivers.find(d => d.id === report.driverId)?.vehicle}</div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col gap-1">
                         <div className="flex items-center gap-1.5 text-xs text-secondary dark:text-accent">
                            <Gauge size={12} className="text-primary dark:text-white"/>
                            {report.kmsDriven ? `${report.kmsDriven}km` : '-'}
                         </div>
                         <div className="flex items-center gap-1.5 text-xs text-secondary dark:text-accent">
                            <Clock size={12} className="text-primary dark:text-white"/>
                            {formatTime(report.loginTime)} - {formatTime(report.logoutTime)}
                         </div>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400 font-bold">₹{report.totalIncome.toLocaleString('en-IN')}</td>
                    {/* Display Raw Trip Expenses to avoid double counting salary if it was added as an expense */}
                    <td className="px-6 py-4 text-right text-rose-500 dark:text-rose-400 font-medium">₹{(report.expenses.fuel + report.expenses.maintenance + report.expenses.toll + report.expenses.other).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right text-secondary dark:text-accent font-semibold">₹{(report.driverSalary || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-black text-primary dark:text-white">₹{report.netProfit.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setEditingReport(report)} className="p-2 text-primary dark:text-white hover:bg-lavender dark:hover:bg-primary/20 rounded-lg transition-colors" title="Edit Report">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteReport(report.id)} className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Delete Report">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
