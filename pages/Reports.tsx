
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';

const Reports: React.FC = () => {
  const { state } = useContext(AppContext)!;
  const [reportType, setReportType] = useState<'collection' | 'ledger'>('collection');
  const [matchingQuery, setMatchingQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const formatCurrency = (val: number) => `₹${Number(val).toLocaleString('en-IN')}`;
  
  const studentFinancials = useMemo(() => {
    return state.students.map(student => {
      const studentCourseId = student.course_id || (student as any).courseId;
      const course = state.courses.find(c => c.id === studentCourseId);
      
      // Filter payments by date if selected
      const totalPaid = state.payments
        .filter(p => {
          const isStudent = p.student_id === student.id || (p as any).studentId === student.id;
          if (!isStudent) return false;
          
          if (startDate && p.date < startDate) return false;
          if (endDate && p.date > endDate) return false;
          
          return true;
        })
        .reduce((sum, p) => sum + Number(p.amount), 0);
        
      const courseTotal = (course?.total_amount || course?.totalAmount || 0);
      const balance = courseTotal - totalPaid;
      const name = course?.course_name || (course as any)?.courseName || 'N/A';
      
      return { 
        ...student, 
        courseName: name, 
        totalReceivable: courseTotal, 
        totalPaid, 
        balance 
      };
    }).filter(f => {
      if (!matchingQuery) return true;
      const q = matchingQuery.toLowerCase();
      return f.name.toLowerCase().includes(q) || f.courseName.toLowerCase().includes(q) || (f.roll_number || (f as any).rollNumber || '').toLowerCase().includes(q);
    });
  }, [state.students, state.payments, state.courses, matchingQuery, startDate, endDate]);

  const filteredPayments = useMemo(() => {
    return state.payments.filter(p => {
      // Date filtering
      if (startDate && p.date < startDate) return false;
      if (endDate && p.date > endDate) return false;

      // Text query filtering
      if (!matchingQuery) return true;
      const q = matchingQuery.toLowerCase();
      const student = state.students.find(s => s.id === (p.student_id || (p as any).studentId));
      return (
        (p.transaction_id || (p as any).transactionId || '').toLowerCase().includes(q) ||
        (p.upi_id || (p as any).upiId || '').toLowerCase().includes(q) ||
        (p.bank_account || (p as any).bankAccount || '').toLowerCase().includes(q) ||
        student?.name.toLowerCase().includes(q) ||
        (p.receipt_number || (p as any).receiptNumber || '').toLowerCase().includes(q)
      );
    });
  }, [state.payments, state.students, matchingQuery, startDate, endDate]);

  const exportToExcel = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    const filename = `${reportType}_Report_${new Date().toISOString().split('T')[0]}.csv`;

    if (reportType === 'collection') {
      headers = ["Receipt", "Date", "Student", "Session", "Method", "Txn ID", "Amount"];
      rows = filteredPayments.map(p => {
        const student = state.students.find(s => s.id === (p.student_id || (p as any).studentId));
        return [
          p.receipt_number || (p as any).receiptNumber,
          p.date,
          student?.name || 'Unknown',
          p.session_id || (p as any).sessionId,
          p.payment_method || (p as any).paymentMethod,
          p.transaction_id || (p as any).transactionId || '---',
          p.amount.toString()
        ];
      });
    } else {
      headers = ["Student Name", "Roll No", "Course", "Session", "Total Fee", "Paid", "Balance"];
      rows = studentFinancials.map(f => [
        f.name,
        f.roll_number || (f as any).rollNumber || '---',
        f.courseName,
        f.session_id || (f as any).sessionId,
        f.totalReceivable.toString(),
        f.totalPaid.toString(),
        f.balance.toString()
      ]);
    }

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerPrint = () => {
    window.print();
  };

  const sendDueReminder = (f: any) => {
    if (!f.phone) {
      alert("No phone found for reminder.");
      return;
    }
    const cleanPhone = f.phone.replace(/[^0-9]/g, '');
    const msg = `*PENDING FEE REMINDER*\n\nDear ${f.name},\nThis is a friendly reminder that you have a pending fee balance of *${formatCurrency(f.balance)}* for the ${f.courseName} program (Session: ${f.session_id || (f as any).sessionId}) at ${state.settings.institutionName}.\n\nPlease clear the dues at the earliest.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const clearFilters = () => {
    setMatchingQuery('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-8 no-print pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Financial Intelligence</h2>
          <p className="text-slate-500 font-medium">Global collections tracking and student ledger auditing</p>
        </div>
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => { setReportType('collection'); clearFilters(); }} 
            className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${reportType === 'collection' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Collections
          </button>
          <button 
            onClick={() => { setReportType('ledger'); clearFilters(); }} 
            className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${reportType === 'ledger' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Ledger / Dues
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col xl:flex-row gap-8 items-end">
          {/* Main Search */}
          <div className="flex-1 w-full space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
              {reportType === 'collection' ? 'Search UTR / Student / Receipt' : 'Search Student / Roll No'}
            </label>
            <div className="relative group">
              <input 
                type="text" 
                value={matchingQuery} 
                onChange={(e) => setMatchingQuery(e.target.value)}
                placeholder={reportType === 'collection' ? "Enter bank reference or student name..." : "Enter name or roll number..."}
                className="w-full pl-12 pr-6 py-4.5 bg-slate-50 rounded-2xl border border-slate-200 outline-none font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white shadow-inner transition-all"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl filter grayscale opacity-50">🔍</span>
            </div>
          </div>

          {/* Date Filters */}
          <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
            <div className="flex-1 sm:w-44 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">From Date</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all shadow-inner"
              />
            </div>
            <div className="flex-1 sm:w-44 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">To Date</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Result Count and Actions */}
          <div className="flex gap-4 w-full xl:w-auto">
            <div className="bg-emerald-50 px-6 py-4 rounded-2xl border border-emerald-100 flex flex-col justify-center min-w-[120px] text-center">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Results</p>
              <p className="text-2xl font-black text-emerald-700 tracking-tighter">
                {reportType === 'collection' ? filteredPayments.length : studentFinancials.length}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={exportToExcel}
                className="flex items-center gap-3 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
              >
                📊 Excel
              </button>
              <button 
                onClick={triggerPrint}
                className="flex items-center gap-3 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
              >
                🖨️ PDF
              </button>
            </div>
          </div>
        </div>

        {(matchingQuery || startDate || endDate) && (
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button 
              onClick={clearFilters}
              className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          {reportType === 'collection' ? (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Receipt / Date</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Student Payer</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Bank Ref (UTR/Txn)</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPayments.map(p => {
                  const student = state.students.find(s => s.id === (p.student_id || (p as any).studentId));
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="text-sm font-mono font-black text-slate-900">{p.receipt_number || (p as any).receiptNumber}</p>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">{p.date}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-slate-800">{student?.name || 'Unknown student'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{p.session_id || (p as any).sessionId} | {p.payment_method || (p as any).paymentMethod}</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-mono font-black text-slate-600 tracking-tight">{p.transaction_id || (p as any).transactionId || 'Cloud-Direct'}</p>
                          {(p.upi_id || (p as any).upiId) && <p className="text-[9px] text-slate-400 font-mono italic">UPI ID: {p.upi_id || (p as any).upiId}</p>}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-base font-black text-emerald-600 text-right">{formatCurrency(p.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Student Information</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Target Fee</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Paid in Period</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Balance Due</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {studentFinancials.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-slate-900">{f.name}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{f.courseName} • {f.session_id || (f as any).sessionId}</p>
                    </td>
                    <td className="px-8 py-5 text-right font-bold text-slate-500">{formatCurrency(f.totalReceivable)}</td>
                    <td className="px-8 py-5 text-right font-bold text-emerald-600">{formatCurrency(f.totalPaid)}</td>
                    <td className={`px-8 py-5 text-right font-black ${f.balance > 0 ? 'text-rose-600 text-lg' : 'text-emerald-600'}`}>
                      {formatCurrency(f.balance)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {f.balance > 0 ? (
                        <button 
                          onClick={() => sendDueReminder(f)} 
                          className="px-5 py-2.5 bg-rose-50 text-rose-600 text-[10px] font-black rounded-xl hover:bg-rose-100 transition-all uppercase tracking-widest border border-rose-100 active:scale-95 shadow-sm"
                        >
                          Remind 📱
                        </button>
                      ) : (
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 uppercase tracking-widest">Cleared</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(reportType === 'collection' ? filteredPayments.length : studentFinancials.length) === 0 && (
             <div className="text-center py-28 bg-slate-50/20">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 grayscale opacity-20">🔍</div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">No matches found for the selected period</p>
            </div>
          )}
        </div>
      </div>

      {/* High-Fidelity Report Print Template */}
      <div className="print-only p-12 bg-white min-h-screen">
         <div className="text-center mb-12 border-b-8 border-slate-900 pb-10">
            <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">{state.settings.institutionName}</h1>
            <p className="text-2xl font-bold text-slate-600 mb-2 uppercase tracking-widest">Official Financial Audit Report</p>
            <p className="text-lg text-slate-500">{state.settings.address}</p>
            {startDate && endDate && (
              <p className="text-base font-black uppercase text-emerald-600 mt-4 tracking-widest">Period: {startDate} to {endDate}</p>
            )}
         </div>

         <div className="flex justify-between items-end mb-10 bg-slate-900 text-white p-8 rounded-3xl">
            <div>
               <p className="text-xs font-black uppercase tracking-[0.3em] opacity-60 mb-2">Scope of Report</p>
               <h3 className="text-3xl font-black uppercase">{reportType === 'collection' ? 'Collection Ledger' : 'Student Dues Ledger'}</h3>
            </div>
            <div className="text-right">
               <p className="text-xs font-black uppercase tracking-widest opacity-60">Generated On</p>
               <p className="text-xl font-bold">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
         </div>

         <div className="border-2 border-slate-900 overflow-hidden rounded-xl">
            {reportType === 'collection' ? (
              <table className="w-full text-left">
                <thead className="bg-slate-100 border-b-2 border-slate-900">
                  <tr>
                    <th className="p-4 text-xs font-black uppercase tracking-widest">Receipt</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest">Payer Name</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-right">Amt (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100">
                  {filteredPayments.map(p => {
                     const student = state.students.find(s => s.id === (p.student_id || (p as any).studentId));
                     return (
                      <tr key={p.id}>
                        <td className="p-4 font-mono text-sm">{p.receipt_number || (p as any).receiptNumber}<br/><span className="text-[10px] text-slate-400">{p.date}</span></td>
                        <td className="p-4 font-bold">{student?.name}</td>
                        <td className="p-4 text-right font-black">{p.amount.toLocaleString('en-IN')}</td>
                      </tr>
                     );
                  })}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black">
                   <tr>
                     <td colSpan={2} className="p-6 text-xl uppercase text-right">Net Collection Total</td>
                     <td className="p-6 text-xl text-right">₹{filteredPayments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString('en-IN')}</td>
                   </tr>
                </tfoot>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-100 border-b-2 border-slate-900">
                  <tr>
                    <th className="p-4 text-xs font-black uppercase tracking-widest">Student</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-right">Target</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-right">Paid</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-right">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100">
                   {studentFinancials.map(f => (
                    <tr key={f.id}>
                      <td className="p-4"><p className="font-bold">{f.name}</p><p className="text-[9px] uppercase font-black text-slate-400">{f.courseName}</p></td>
                      <td className="p-4 text-right">{f.totalReceivable.toLocaleString('en-IN')}</td>
                      <td className="p-4 text-right font-bold text-emerald-600">{f.totalPaid.toLocaleString('en-IN')}</td>
                      <td className="p-4 text-right font-black text-rose-600">{f.balance.toLocaleString('en-IN')}</td>
                    </tr>
                   ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black">
                   <tr>
                     <td colSpan={3} className="p-6 text-xl uppercase text-right">Total Period Dues</td>
                     <td className="p-6 text-xl text-right">₹{studentFinancials.reduce((s, f) => s + f.balance, 0).toLocaleString('en-IN')}</td>
                   </tr>
                </tfoot>
              </table>
            )}
         </div>

         <div className="mt-20 flex justify-between pt-10 border-t border-slate-200">
            <div className="text-center">
               <div className="w-48 h-10 border-b-2 border-slate-900 mb-2"></div>
               <p className="text-[10px] font-black uppercase tracking-widest">Auditor Signature</p>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">EduPay PRO Platform</p>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Generated by {state.user?.name}</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Reports;
