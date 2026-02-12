
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';

const Reports: React.FC = () => {
  const { state } = useContext(AppContext)!;
  const [reportType, setReportType] = useState<'collection' | 'ledger'>('collection');
  const [matchingQuery, setMatchingQuery] = useState('');

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;
  
  const studentFinancials = state.students.map(student => {
    const course = state.courses.find(c => c.id === student.courseId);
    const totalPaid = state.payments
      .filter(p => p.studentId === student.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const balance = (course?.totalAmount || 0) - totalPaid;
    return { ...student, courseName: course?.courseName, totalReceivable: course?.totalAmount || 0, totalPaid, balance };
  });

  const filteredPayments = state.payments.filter(p => {
    if (!matchingQuery) return true;
    const q = matchingQuery.toLowerCase();
    const student = state.students.find(s => s.id === p.studentId);
    return (
      p.transactionId?.toLowerCase().includes(q) ||
      p.upiId?.toLowerCase().includes(q) ||
      p.bankAccount?.toLowerCase().includes(q) ||
      student?.name.toLowerCase().includes(q) ||
      p.receiptNumber.toLowerCase().includes(q)
    );
  });

  const sendDueReminder = (f: any) => {
    if (!f.phone) {
      alert("No phone found.");
      return;
    }
    const cleanPhone = f.phone.replace(/[^0-9]/g, '');
    const msg = `*PENDING FEE REMINDER*\n\nDear ${f.name},\nThis is a friendly reminder that you have a pending fee balance of *${formatCurrency(f.balance)}* for the ${f.courseName} program (Session: ${f.sessionId}) at ${state.settings.institutionName}.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-8 no-print">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Audit & Collections</h2>
          <p className="text-slate-500 font-medium">Global financial visibility and transaction matching</p>
        </div>
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button onClick={() => setReportType('collection')} className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${reportType === 'collection' ? 'sidebar-active shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Collections</button>
          <button onClick={() => setReportType('ledger')} className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${reportType === 'ledger' ? 'sidebar-active shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Ledger / Dues</button>
        </div>
      </div>

      {reportType === 'collection' && (
        <div className="bg-emerald-50/50 p-6 rounded-[32px] border border-emerald-100 flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 w-full">
            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1 mb-2 block">Match Bank Statement (Txn ID / UPI / Student)</label>
            <div className="relative">
              <input 
                type="text" 
                value={matchingQuery} 
                onChange={(e) => setMatchingQuery(e.target.value)}
                placeholder="Search UTR, Transaction ID, UPI ID..."
                className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl border border-emerald-200 outline-none font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-100 text-center min-w-[150px]">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Matches Found</p>
            <p className="text-2xl font-black text-emerald-600">{filteredPayments.length}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        {reportType === 'collection' ? (
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Voucher & Session</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Student</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Bank Reference (Txn ID)</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPayments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="text-sm font-mono font-bold text-slate-900">{p.receiptNumber}</p>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">{p.sessionId}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-slate-800">{state.students.find(s => s.id === p.studentId)?.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{p.paymentMethod}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-mono font-black text-slate-600">{p.transactionId || '---'}</p>
                      {p.upiId && <p className="text-[9px] text-slate-400 font-mono">UPI: {p.upiId}</p>}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-black text-emerald-600 text-right">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Student Info</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Total Fee</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Paid</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Balance</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {studentFinancials.map(f => (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-slate-900">{f.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{f.courseName} | {f.sessionId}</p>
                  </td>
                  <td className="px-8 py-5 text-right font-bold text-slate-600">{formatCurrency(f.totalReceivable)}</td>
                  <td className="px-8 py-5 text-right font-bold text-emerald-600">{formatCurrency(f.totalPaid)}</td>
                  <td className={`px-8 py-5 text-right font-black ${f.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(f.balance)}</td>
                  <td className="px-8 py-5 text-right">
                    {f.balance > 0 && (
                      <button onClick={() => sendDueReminder(f)} className="px-4 py-2 bg-rose-50 text-rose-600 text-[10px] font-black rounded-xl hover:bg-rose-100 transition-all uppercase tracking-widest">
                        Notify 💬
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(reportType === 'collection' ? filteredPayments.length : studentFinancials.length) === 0 && (
           <div className="text-center py-20 bg-slate-50/50">
            <p className="text-4xl mb-3 opacity-20">🔍</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No matching records found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
