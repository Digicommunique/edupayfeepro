
import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { Payment } from '../types';
import { supabase } from '../lib/supabase';

const Payments: React.FC = () => {
  const { state, refreshData } = useContext(AppContext)!;
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({
    studentId: '',
    amount: 0,
    paymentMethod: 'UPI',
    date: new Date().toISOString().split('T')[0],
    feeHeadIds: [],
    upiId: '',
    transactionId: '',
    bankAccount: '',
    sessionId: ''
  });

  useEffect(() => {
    if (newPayment.studentId && !editingPaymentId) {
      const student = state.students.find(s => s.id === newPayment.studentId);
      const studentSessionId = student?.session_id || (student as any)?.sessionId;
      if (studentSessionId) {
        setNewPayment(prev => ({ ...prev, sessionId: studentSessionId }));
      }
    }
  }, [newPayment.studentId, state.students, editingPaymentId]);

  const formatCurrency = (val: number) => `₹${Number(val).toLocaleString('en-IN')}`;

  const shareOnWhatsApp = (p: Payment) => {
    const student = state.students.find(s => s.id === (p.student_id || (p as any).studentId));
    if (!student?.phone) {
      alert("No student phone number found.");
      return;
    }
    const cleanPhone = student.phone.replace(/[^0-9]/g, '');
    const msg = `*FEE PAYMENT RECEIPT*\n\n*Institution:* ${state.settings.institutionName}\n*Receipt No:* ${p.receipt_number || (p as any).receiptNumber}\n*Student:* ${student.name}\n*Amount:* ${formatCurrency(p.amount)}\n*Date:* ${p.date}\n*Method:* ${p.payment_method || (p as any).paymentMethod}\n*Txn ID:* ${p.transaction_id || (p as any).transactionId || 'N/A'}\n\nThank you for your payment! - _Sent via EduPay Cloud_`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const exportHistoryToExcel = () => {
    const headers = ["Receipt No", "Date", "Student", "Roll No", "Method", "Txn ID", "Amount"];
    const rows = state.payments.map(p => {
      const student = state.students.find(s => s.id === (p.student_id || (p as any).studentId));
      return [
        p.receipt_number || (p as any).receiptNumber,
        p.date,
        student?.name || 'Unknown',
        student?.roll_number || (student as any)?.rollNumber || '---',
        p.payment_method || (p as any).paymentMethod,
        p.transaction_id || (p as any).transactionId || '---',
        p.amount.toString()
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Payment_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const savePayment = async () => {
    setError(null);
    setSuccess(null);
    if (!newPayment.studentId || !newPayment.amount) {
      setError("Select student & amount.");
      return;
    }
    const normalizedTxnId = newPayment.transactionId?.trim().toLowerCase();
    if (normalizedTxnId) {
      const existingPayment = state.payments.find(p => 
        p.id !== editingPaymentId && 
        p.transaction_id?.trim().toLowerCase() === normalizedTxnId
      );
      if (existingPayment) {
        const conflictingStudent = state.students.find(s => s.id === (existingPayment.student_id || (existingPayment as any).studentId));
        setError(`🚫 DUPLICATE TRANSACTION! ID (${newPayment.transactionId}) used for ${conflictingStudent?.name || 'another record'}.`);
        return;
      }
    }
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    try {
      if (editingPaymentId) {
        if (state.user?.role === 'Accountant') {
          const oldPayment = state.payments.find(p => p.id === editingPaymentId)!;
          await supabase.from('pending_changes').insert({
            payment_id: oldPayment.id,
            requested_by: state.user.userId,
            old_data: oldPayment,
            new_data: { ...oldPayment, ...newPayment },
            status: 'Pending'
          });
          setSuccess("Approval request submitted.");
        } else {
          await supabase.from('payments').update({
            amount: Number(newPayment.amount),
            payment_method: newPayment.paymentMethod,
            transaction_id: newPayment.transactionId,
            upi_id: newPayment.upiId,
            is_edited: true,
            edited_by: state.user?.userId
          }).match({ id: editingPaymentId });
          setSuccess("Updated successfully.");
        }
      } else {
        const receiptNumber = 'DC-' + (1000 + state.payments.length);
        await supabase.from('payments').insert({
          student_id: newPayment.studentId,
          amount: Number(newPayment.amount),
          date: newPayment.date,
          time: currentTime,
          payment_method: newPayment.paymentMethod,
          receipt_number: receiptNumber,
          upi_id: newPayment.upiId,
          transaction_id: newPayment.transactionId,
          session_id: newPayment.sessionId,
          collected_by: state.user?.userId
        });
        setSuccess("Payment recorded.");
      }
      await refreshData();
      setTimeout(closeModal, 1000);
    } catch (err) {
      setError("Database error. Check connectivity.");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsReceiptModalOpen(false);
    setError(null);
    setSuccess(null);
    setEditingPaymentId(null);
    setSelectedPayment(null);
    setNewPayment({ studentId: '', amount: 0, paymentMethod: 'UPI', date: new Date().toISOString().split('T')[0], feeHeadIds: [], upiId: '', transactionId: '', bankAccount: '', sessionId: '' });
  };

  const openReceipt = (p: Payment) => {
    setSelectedPayment(p);
    setIsReceiptModalOpen(true);
  };

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Financial Collections</h2>
          <p className="text-slate-500 font-medium">Verified cloud-stored transaction ledger</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportHistoryToExcel}
            className="bg-white text-slate-700 px-6 py-3 rounded-2xl font-bold border border-slate-200 shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
          >
            <span>📊</span> Export Excel
          </button>
          <button onClick={() => { setEditingPaymentId(null); setIsModalOpen(true); }} className="bg-emerald-600 text-white px-7 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20 flex items-center gap-3 hover:bg-emerald-700 active:scale-95 transition-all">
            <span className="text-lg">💵</span> New Payment
          </button>
        </div>
      </div>

      <div className="flex gap-2 no-print">
         <button onClick={() => setActiveTab('all')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>History</button>
         {state.user?.role === 'Admin' && <button onClick={() => setActiveTab('pending')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'pending' ? 'bg-rose-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>Pending ({state.pendingChanges.length})</button>}
      </div>

      {activeTab === 'all' ? (
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden no-print">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt / Date</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Information</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method / Txn</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {state.payments.slice().reverse().map(payment => {
                  const student = state.students.find(s => s.id === (payment.student_id || (payment as any).studentId));
                  return (
                    <tr key={payment.id} className="hover:bg-emerald-50/10 transition-colors">
                      <td className="px-8 py-5">
                        <span className="font-mono text-sm text-slate-900 font-black">{payment.receipt_number || (payment as any).receiptNumber}</span>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">{payment.date}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-800">{student?.name || '---'}</p>
                        <p className="text-[9px] text-emerald-600 font-black uppercase tracking-wider">{payment.session_id || (payment as any).sessionId}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-bold text-slate-600 uppercase">{payment.payment_method || (payment as any).paymentMethod}</p>
                        <p className="text-[9px] font-mono text-slate-400 truncate w-32">{payment.transaction_id || (payment as any).transactionId || '---'}</p>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-emerald-600 text-lg">{formatCurrency(payment.amount)}</td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => shareOnWhatsApp(payment)} 
                            className="p-2.5 bg-white text-slate-400 hover:text-emerald-500 border border-slate-100 rounded-xl transition-all active:scale-95"
                            title="Share on WhatsApp"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.6-2.8-23.5-8.7-44.7-27.6-16.5-14.7-27.6-32.8-30.8-38.4-3.2-5.6-.3-8.6 2.5-11.4 2.5-2.5 5.6-6.5 8.3-9.7 2.8-3.3 3.7-5.6 5.6-9.3 1.9-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.5 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.5 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
                          </button>
                          <button onClick={() => openReceipt(payment)} className="bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95">
                            BILL 🖨️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Printer Modal (Digital Preview) */}
      {isReceiptModalOpen && selectedPayment && (() => {
        const student = state.students.find(s => s.id === (selectedPayment.student_id || (selectedPayment as any).studentId));
        const course = state.courses.find(c => c.id === (student?.course_id || (student as any)?.courseId));
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 no-print">
            <div className="bg-white rounded-[40px] w-full max-w-xl overflow-hidden shadow-2xl animate-fade-in border border-slate-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50/30">
                <h3 className="text-xl font-black text-slate-900">Receipt Viewer</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => shareOnWhatsApp(selectedPayment)}
                    className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center hover:bg-emerald-100 transition-all shadow-sm active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.6-2.8-23.5-8.7-44.7-27.6-16.5-14.7-27.6-32.8-30.8-38.4-3.2-5.6-.3-8.6 2.5-11.4 2.5-2.5 5.6-6.5 8.3-9.7 2.8-3.3 3.7-5.6 5.6-9.3 1.9-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.5 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.5 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
                  </button>
                  <button 
                    onClick={triggerPrint}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all shadow-lg"
                  >
                    PRINT RECEIPT
                  </button>
                  <button onClick={closeModal} className="w-10 h-10 rounded-full bg-white border border-slate-300 text-slate-500 flex items-center justify-center hover:text-rose-500 transition-all">✕</button>
                </div>
              </div>
              
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 <div className="text-center border-b border-slate-100 pb-6">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1">{state.settings.institutionName}</h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">{state.settings.address}</p>
                    <p className="text-[9px] font-black text-slate-500 mt-1 uppercase">Contact: {state.settings.contactNumber}</p>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-6 text-[11px]">
                    <div className="space-y-3">
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Receipt No</p>
                          <p className="font-mono font-black text-slate-900">{selectedPayment.receipt_number || (selectedPayment as any).receiptNumber}</p>
                       </div>
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Student Name</p>
                          <p className="font-bold text-slate-800">{student?.name || '---'}</p>
                       </div>
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Father's Name</p>
                          <p className="font-bold text-slate-800">{student?.parent_name || (student as any)?.parentName || '---'}</p>
                       </div>
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Course / Program</p>
                          <p className="font-bold text-slate-800">{course?.course_name || (course as any)?.courseName || '---'}</p>
                       </div>
                    </div>
                    <div className="text-right space-y-3">
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Payment Date</p>
                          <p className="font-bold text-slate-800">{selectedPayment.date}</p>
                       </div>
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Roll No</p>
                          <p className="font-bold text-slate-800">{student?.roll_number || (student as any)?.rollNumber || '---'}</p>
                       </div>
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Session / Sem / Branch</p>
                          <p className="font-bold text-slate-800">{selectedPayment.session_id || (selectedPayment as any).sessionId} | {student?.semester || '---'} | {student?.branch || '---'}</p>
                       </div>
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Transaction Ref</p>
                          <p className="font-mono text-slate-500 font-bold truncate">{selectedPayment.transaction_id || (selectedPayment as any).transactionId || 'CASH'}</p>
                       </div>
                    </div>
                 </div>

                 <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 flex justify-between items-center">
                    <div>
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Fee Paid</p>
                       <p className="text-3xl font-black text-emerald-600 tracking-tighter">{formatCurrency(selectedPayment.amount)}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                       <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black">CLEARED</span>
                    </div>
                 </div>
              </div>

              <div className="p-6 bg-slate-900 text-white flex justify-between items-center text-[9px] font-black tracking-widest uppercase">
                 <span>Official Cloud Ledger Receipt</span>
                 <span className="opacity-50">Auth Signature Req.</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Formal Official Receipt Print Template (Hidden in UI, Visible for window.print()) */}
      {selectedPayment && (() => {
        const student = state.students.find(s => s.id === (selectedPayment.student_id || (selectedPayment as any).studentId));
        const course = state.courses.find(c => c.id === (student?.course_id || (student as any)?.courseId));
        return (
          <div className="print-only bg-white p-12 text-slate-900 leading-normal">
            <div className="border-[4px] border-slate-900 p-10 min-h-[900px] flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-start mb-10 border-b-[4px] border-slate-900 pb-6">
                <div>
                  <h1 className="text-5xl font-black uppercase tracking-tighter mb-1">{state.settings.institutionName}</h1>
                  <p className="text-base font-bold text-slate-700">{state.settings.address}</p>
                  <p className="text-sm font-bold text-slate-500">Phone: {state.settings.contactNumber}</p>
                </div>
                <div className="text-right">
                  <div className="bg-slate-900 text-white px-6 py-2.5 inline-block font-black uppercase tracking-widest text-sm mb-4">Official Payment Voucher</div>
                  <p className="text-sm font-bold uppercase text-slate-400">Date: <span className="text-slate-900 font-black ml-2">{selectedPayment.date}</span></p>
                </div>
              </div>

              {/* Receipt Body */}
              <div className="flex justify-between mb-12">
                <div>
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Receipt Number</p>
                  <p className="text-2xl font-black">{selectedPayment.receipt_number || (selectedPayment as any).receiptNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Academic Session</p>
                  <p className="text-2xl font-black uppercase">{selectedPayment.session_id || (selectedPayment as any).sessionId}</p>
                </div>
              </div>

              <div className="flex-1 space-y-12">
                {/* Student Info Section */}
                <div className="space-y-6">
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest border-b-2 border-slate-100 pb-2">Student Particulars</p>
                  <div className="grid grid-cols-2 gap-y-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student Name</p>
                      <p className="text-2xl font-black">{student?.name || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Father's Name</p>
                      <p className="text-xl font-bold">{student?.parent_name || (student as any)?.parentName || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Roll Number</p>
                      <p className="text-xl font-bold">{student?.roll_number || (student as any)?.rollNumber || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Course / Program</p>
                      <p className="text-xl font-bold">{course?.course_name || (course as any)?.courseName || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Semester & Branch</p>
                      <p className="text-xl font-bold">{student?.semester || '---'} / {student?.branch || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Method</p>
                      <p className="text-xl font-bold uppercase">{selectedPayment.payment_method || (selectedPayment as any).paymentMethod}</p>
                    </div>
                  </div>
                </div>

                {/* Transaction Info Section */}
                <div className="space-y-6">
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest border-b-2 border-slate-100 pb-2">Transaction Details</p>
                  <table className="w-full text-left">
                    <thead className="border-b-2 border-slate-900">
                      <tr>
                        <th className="py-4 text-base font-black uppercase tracking-widest">Description</th>
                        <th className="py-4 text-right text-base font-black uppercase tracking-widest">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-8 text-xl font-bold text-slate-700">Consolidated Academic Fee Installment</td>
                        <td className="py-8 text-right text-3xl font-black">{formatCurrency(selectedPayment.amount)}</td>
                      </tr>
                      <tr>
                        <td className="py-4 text-sm font-mono text-slate-500">Transaction ID / Reference No: {selectedPayment.transaction_id || (selectedPayment as any).transactionId || 'CLOUD-GEN-VOUCHER'}</td>
                        <td></td>
                      </tr>
                    </tbody>
                    <tfoot className="border-t-[4px] border-slate-900">
                      <tr>
                        <td className="py-10 text-2xl font-black uppercase">Grand Total Received</td>
                        <td className="py-10 text-right text-5xl font-black">{formatCurrency(selectedPayment.amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Footer / Signature */}
                <div className="grid grid-cols-2 gap-10 pt-16">
                  <div className="bg-slate-50 p-6 border-l-8 border-slate-900 flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Cloud Verification</p>
                    <p className="text-sm font-bold text-slate-600 italic leading-relaxed">This receipt is a digitally signed document verified by EduPay Cloud Systems.</p>
                  </div>
                  <div className="flex flex-col justify-end items-end space-y-3">
                    <div className="w-64 border-b-4 border-slate-900"></div>
                    <div className="text-right">
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">Authorized Signatory</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Official Seal Required</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legal Footer */}
              <div className="mt-20 pt-10 border-t border-slate-100 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-300">EduPay PRO Platform - Version 2.5.8 • Digital Communique Private Limited</p>
              </div>
            </div>
          </div>
        );
      })()}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[95vh]">
             <div className="p-8 border-b-2 border-slate-100 flex justify-between items-center bg-emerald-50/50 shrink-0 sticky top-0 z-20">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingPaymentId ? 'Modify Record' : 'Fee Collection'}</h3>
              <button onClick={closeModal} className="w-12 h-12 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-rose-600 transition-all shadow-md active:scale-90">
                ✕
              </button>
            </div>
            <div className="p-8 md:p-10 space-y-7 overflow-y-auto flex-1 custom-scrollbar">
              {error && <div className="bg-rose-50 text-rose-600 p-5 rounded-2xl text-[10px] font-black uppercase border border-rose-100 leading-relaxed shadow-sm">{error}</div>}
              {success && <div className="bg-emerald-50 text-emerald-700 p-5 rounded-2xl text-[10px] font-black uppercase border border-emerald-100 shadow-sm">{success}</div>}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Student Directory</label>
                <select value={newPayment.studentId} onChange={(e) => setNewPayment({ ...newPayment, studentId: e.target.value })} className="w-full px-6 py-4.5 rounded-[22px] bg-slate-50 border border-slate-200 font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner">
                  <option value="">Search student...</option>
                  {state.students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.roll_number || (s as any).rollNumber})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Amount (₹)</label>
                  <input type="number" value={newPayment.amount || ''} onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })} className="w-full px-6 py-4.5 rounded-[22px] bg-slate-50 border border-slate-200 font-black text-2xl text-emerald-600 outline-none shadow-inner" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Academic Term</label>
                  <input type="text" readOnly value={newPayment.sessionId} className="w-full px-6 py-4.5 rounded-[22px] bg-slate-100 border border-slate-200 font-bold text-slate-500" />
                </div>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Payment Mode</label>
                  <select value={newPayment.paymentMethod} onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })} className="w-full px-6 py-4.5 rounded-[22px] bg-slate-50 border border-slate-200 font-bold shadow-inner">
                    <option value="UPI">UPI Digital</option>
                    <option value="Cash">Physical Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Transaction ID</label>
                  <input type="text" value={newPayment.transactionId} onChange={(e) => setNewPayment({ ...newPayment, transactionId: e.target.value })} className="w-full px-6 py-4.5 rounded-[22px] bg-slate-50 border border-slate-200 font-mono font-bold uppercase shadow-inner" placeholder="Optional for Cash" />
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 shrink-0 flex gap-4">
              <button onClick={closeModal} className="flex-1 py-5 bg-white border border-slate-300 text-slate-600 rounded-[24px] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">DISCARD</button>
              <button onClick={savePayment} className="flex-[2] py-5 bg-emerald-600 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all">SAVE PAYMENT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
