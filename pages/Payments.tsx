
import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { Payment, AppNotification, PendingChange } from '../types';
import { supabase } from '../lib/supabase';

const Payments: React.FC = () => {
  const { state, refreshData } = useContext(AppContext)!;
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
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
        const conflictingStudent = state.students.find(s => s.id === existingPayment.student_id);
        const alertMsg = `🚫 DUPLICATE TRANSACTION! ID (${newPayment.transactionId}) used for ${conflictingStudent?.name || 'another record'}.`;
        setError(alertMsg);
        return;
      }
    }

    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    try {
      if (editingPaymentId) {
        const oldPayment = state.payments.find(p => p.id === editingPaymentId)!;
        
        if (state.user?.role === 'Accountant') {
          // Request approval
          const { data: req } = await supabase.from('pending_changes').insert({
            payment_id: oldPayment.id,
            requested_by: state.user.userId,
            old_data: oldPayment,
            new_data: { ...oldPayment, ...newPayment },
            status: 'Pending'
          }).select().single();

          await supabase.from('notifications').insert({
            message: `Edit Request: ${state.user.name} for bill ${oldPayment.receipt_number || (oldPayment as any).receiptNumber}.`,
            type: 'Alert'
          });
          
          setSuccess("Approval request submitted.");
        } else {
          // Admin direct update
          await supabase.from('payments').update({
            amount: Number(newPayment.amount),
            payment_method: newPayment.paymentMethod || (newPayment as any).payment_method,
            transaction_id: newPayment.transactionId || (newPayment as any).transaction_id,
            upi_id: newPayment.upiId || (newPayment as any).upi_id,
            is_edited: true,
            edited_by: state.user?.userId
          }).match({ id: editingPaymentId });
          setSuccess("Updated successfully.");
        }
      } else {
        // New record
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
      console.error('Error saving payment:', err);
      setError("Database error. Check unique constraints.");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
    setSuccess(null);
    setEditingPaymentId(null);
    setNewPayment({ studentId: '', amount: 0, paymentMethod: 'UPI', date: new Date().toISOString().split('T')[0], feeHeadIds: [], upiId: '', transactionId: '', bankAccount: '', sessionId: '' });
  };

  const approveChange = async (change: any) => {
    const paymentId = change.payment_id || change.paymentId;
    await supabase.from('payments').update({
      ...change.new_data,
      is_edited: true,
      edited_by: change.requested_by
    }).match({ id: paymentId });
    await supabase.from('pending_changes').delete().match({ id: change.id });
    await refreshData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Collections & Approvals</h2>
          <p className="text-slate-500 font-medium">Audit-ready cloud management</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setEditingPaymentId(null); setIsModalOpen(true); }} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2">
            <span>💵</span> New Collection
          </button>
        </div>
      </div>

      <div className="flex gap-2 no-print">
         <button onClick={() => setActiveTab('all')} className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border'}`}>All Payments</button>
         {state.user?.role === 'Admin' && <button onClick={() => setActiveTab('pending')} className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'pending' ? 'bg-rose-600 text-white' : 'bg-white text-slate-400 border'}`}>Pending ({state.pendingChanges.length})</button>}
      </div>

      {activeTab === 'all' ? (
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden no-print overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Info</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {state.payments.slice().reverse().map(payment => {
                const student = state.students.find(s => s.id === payment.student_id);
                return (
                  <tr key={payment.id} className="hover:bg-emerald-50/20">
                    <td className="px-8 py-5">
                      <span className="font-mono text-sm text-slate-900 font-black">{payment.receipt_number || (payment as any).receiptNumber}</span>
                      <p className="text-[9px] text-slate-400 mt-1">{payment.date}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-900">{student?.name || 'Unknown'}</p>
                      <p className="text-[10px] text-emerald-600 font-black uppercase">{payment.session_id || (payment as any).sessionId}</p>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-emerald-600">{formatCurrency(payment.amount)}</td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => setSelectedPayment(payment)} className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase">BILL 🖨️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4 no-print">
          {state.pendingChanges.map(change => {
            const student = state.students.find(s => s.id === change.old_data?.student_id || (change.old_data as any).studentId);
            return (
              <div key={change.id} className="bg-white p-8 rounded-[32px] border border-rose-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1">
                  <h4 className="text-xl font-black text-slate-900">{student?.name}</h4>
                  <p className="text-xs text-slate-500">Proposed: {formatCurrency(change.new_data?.amount)}</p>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => supabase.from('pending_changes').delete().match({ id: change.id }).then(refreshData)} className="px-6 py-3 bg-slate-100 rounded-2xl">Reject</button>
                   <button onClick={() => approveChange(change)} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl">Approve</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPayment && (
        <div className="print-only p-4">
           {/* Legacy receipt layout */}
           <div className="max-w-[800px] mx-auto border-2 border-slate-900 p-8 relative">
              <h1 className="text-4xl text-center font-black mb-10">{state.settings.institutionName}</h1>
              <div className="flex justify-between border-b-2 border-slate-900 pb-4 mb-4">
                <span>Receipt No: {selectedPayment.receipt_number || (selectedPayment as any).receiptNumber}</span>
                <span>Date: {selectedPayment.date}</span>
              </div>
              <div className="space-y-4 text-xl">
                 <p>Student: <b>{state.students.find(s => s.id === selectedPayment.student_id)?.name}</b></p>
                 <p>Amount: <b>{formatCurrency(selectedPayment.amount)}</b></p>
                 <p>Method: <b>{selectedPayment.payment_method || (selectedPayment as any).paymentMethod}</b></p>
                 <p>Session: <b>{selectedPayment.session_id || (selectedPayment as any).sessionId}</b></p>
              </div>
              <div className="mt-20 text-right font-black italic">Authorized Signatory</div>
              <button onClick={() => setSelectedPayment(null)} className="no-print absolute top-0 right-0 p-4 text-rose-500">CLOSE</button>
              <script>{'window.print();'}</script>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[95vh]">
             <div className="p-8 border-b-2 border-slate-200 flex justify-between items-center bg-emerald-50/50 shrink-0 sticky top-0 z-20">
              <h3 className="text-2xl font-black text-slate-900">{editingPaymentId ? 'Edit' : 'New Collection'}</h3>
              <button onClick={closeModal} className="w-12 h-12 rounded-full flex items-center justify-center bg-white border-2 border-slate-400 text-slate-700 hover:text-rose-600 transition-all shadow-md active:scale-90">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 md:p-10 space-y-7 overflow-y-auto flex-1 custom-scrollbar">
              {error && <div className="bg-rose-50 text-rose-600 p-4 rounded-3xl text-xs font-black uppercase border-2 border-rose-200">{error}</div>}
              {success && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-3xl text-xs font-black uppercase border-2 border-emerald-200">{success}</div>}

              <div className="space-y-2">
                <label className="text-[12px] font-black text-slate-600 uppercase tracking-widest ml-2">Target Student</label>
                <select value={newPayment.studentId} onChange={(e) => setNewPayment({ ...newPayment, studentId: e.target.value })} className="w-full px-6 py-4.5 rounded-[22px] bg-slate-50 border-2 border-slate-300 font-bold outline-none focus:border-emerald-600 transition-all">
                  <option value="">Select Student...</option>
                  {state.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-slate-600 uppercase tracking-widest ml-2">Amount (₹)</label>
                  <input type="number" value={newPayment.amount || ''} onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })} className="w-full px-6 py-4.5 rounded-[22px] bg-slate-50 border-2 border-slate-300 font-black text-xl text-emerald-700 outline-none focus:border-emerald-600" />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-slate-600 uppercase tracking-widest ml-2">Session</label>
                  <input type="text" readOnly value={newPayment.sessionId} className="w-full px-6 py-4.5 rounded-[22px] bg-slate-100 border-2 border-slate-300 font-bold" />
                </div>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-slate-600 uppercase tracking-widest ml-2">Payment Mode</label>
                  <select value={newPayment.paymentMethod} onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })} className="w-full px-6 py-4.5 rounded-[22px] bg-slate-50 border-2 border-slate-300 font-bold">
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-slate-600 uppercase tracking-widest ml-2">Transaction ID / UTR</label>
                  <input type="text" value={newPayment.transactionId} onChange={(e) => setNewPayment({ ...newPayment, transactionId: e.target.value })} className="w-full px-6 py-4.5 rounded-[22px] bg-slate-50 border-2 border-slate-300 font-bold" />
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-100 border-t-2 border-slate-200 shrink-0 sticky bottom-0 flex gap-4">
              <button onClick={closeModal} className="flex-1 py-5 bg-white border-2 border-slate-400 text-slate-800 rounded-[24px] font-black uppercase text-xs active:scale-95">CANCEL</button>
              <button onClick={savePayment} className="flex-[2] py-5 bg-[#059669] text-white rounded-[24px] font-black uppercase text-xs shadow-2xl shadow-emerald-700/30 hover:bg-[#047857] active:scale-95 transition-all">RECORD PAYMENT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
