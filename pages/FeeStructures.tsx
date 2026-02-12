
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { CourseStructure, FeeHead, FeeFrequency } from '../types';
import { supabase } from '../lib/supabase';

const FeeStructures: React.FC = () => {
  const { state, refreshData } = useContext(AppContext)!;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  if (state.user?.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-[60vh] animate-fade-in">
        <div className="text-center p-12 bg-white rounded-[40px] shadow-2xl border border-slate-100 max-w-md">
           <span className="text-7xl block mb-6 grayscale opacity-20">🔒</span>
           <h2 className="text-2xl font-black text-slate-900">Access Restricted</h2>
           <p className="text-slate-500 mt-4 font-medium leading-relaxed">
             Administrators only.
           </p>
        </div>
      </div>
    );
  }

  const [newCourse, setNewCourse] = useState<Partial<CourseStructure>>({
    courseName: '',
    frequency: 'Semester',
    heads: [],
    totalAmount: 0
  });

  const [newHead, setNewHead] = useState<Partial<FeeHead>>({
    name: '',
    amount: 0,
    type: 'Base'
  });

  const formatCurrency = (val: number) => `₹${Number(val).toLocaleString('en-IN')}`;

  const addHead = () => {
    if (newHead.name && newHead.amount) {
      const head: FeeHead = {
        id: Math.random().toString(36).substr(2, 9),
        name: newHead.name,
        amount: Number(newHead.amount),
        type: newHead.type as any
      };
      const updatedHeads = [...(newCourse.heads || []), head];
      setNewCourse({
        ...newCourse,
        heads: updatedHeads,
        totalAmount: updatedHeads.reduce((sum, h) => sum + h.amount, 0)
      });
      setNewHead({ name: '', amount: 0, type: 'Base' });
    }
  };

  const removeHead = (id: string) => {
    const updatedHeads = (newCourse.heads || []).filter(h => h.id !== id);
    setNewCourse({
      ...newCourse,
      heads: updatedHeads,
      totalAmount: updatedHeads.reduce((sum, h) => sum + h.amount, 0)
    });
  };

  const saveCourse = async () => {
    if (newCourse.courseName && newCourse.heads?.length) {
      try {
        let courseId = editingCourseId;
        
        if (editingCourseId) {
          // Update course
          await supabase.from('courses').update({
            course_name: newCourse.courseName,
            frequency: newCourse.frequency,
            total_amount: newCourse.totalAmount
          }).match({ id: editingCourseId });

          // Delete old heads and re-insert (simpler than syncing)
          await supabase.from('fee_heads').delete().match({ course_id: editingCourseId });
        } else {
          // Insert course
          const { data } = await supabase.from('courses').insert({
            course_name: newCourse.courseName,
            frequency: newCourse.frequency,
            total_amount: newCourse.totalAmount
          }).select().single();
          courseId = data?.id;
        }

        if (courseId) {
          const headsToInsert = newCourse.heads.map(h => ({
            course_id: courseId,
            name: h.name,
            amount: h.amount,
            type: h.type
          }));
          await supabase.from('fee_heads').insert(headsToInsert);
        }

        await refreshData();
        closeModal();
      } catch (err) {
        console.error('Error saving course:', err);
      }
    }
  };

  const deleteCourse = async (id: string) => {
    if (window.confirm("Delete this structure?")) {
      await supabase.from('courses').delete().match({ id });
      await refreshData();
    }
  };

  const openEditModal = (course: CourseStructure) => {
    setEditingCourseId(course.id);
    setNewCourse({
      courseName: course.courseName,
      frequency: course.frequency,
      heads: course.heads,
      totalAmount: course.totalAmount
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCourseId(null);
    setNewCourse({ courseName: '', frequency: 'Semester', heads: [], totalAmount: 0 });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Fee Structures</h2>
          <p className="text-slate-500 font-medium">Standardize billing across all programs</p>
        </div>
        <button
          onClick={() => {
            setEditingCourseId(null);
            setIsModalOpen(true);
          }}
          className="bg-emerald-600 text-white px-7 py-3 rounded-[20px] font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-3"
        >
          <span className="text-lg">➕</span> Create Plan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {state.courses.map((course) => (
          <div key={course.id} className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="p-10 border-b border-slate-50 flex justify-between items-start bg-emerald-50/20 relative">
              <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(course)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-600 shadow-sm border border-slate-100 transition-all">✏️</button>
                <button onClick={() => deleteCourse(course.id)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-sm border border-slate-100 transition-all">🗑️</button>
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-emerald-600 bg-white border border-emerald-100 px-3 py-1.5 rounded-full mb-3 inline-block shadow-sm">
                  {course.frequency} Cycle
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{course.course_name || (course as any).courseName}</h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Package</p>
                <p className="text-3xl font-black text-emerald-600 tracking-tighter">{formatCurrency(course.totalAmount)}</p>
              </div>
            </div>
            <div className="p-10">
              <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-[0.3em]">Fee Heads</h4>
              <ul className="space-y-4">
                {course.heads.map(head => (
                  <li key={head.id} className="flex justify-between items-center bg-[#fdfdfd] p-4.5 rounded-[24px] border border-slate-100 shadow-sm hover:border-emerald-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${head.type === 'Base' ? 'bg-emerald-500' : head.type === 'One-Time' ? 'bg-orange-500' : 'bg-blue-500'} shadow-sm`}></div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{head.name}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{head.type}</p>
                      </div>
                    </div>
                    <p className="font-mono font-black text-slate-700 bg-slate-100/50 px-4 py-1.5 rounded-xl">{formatCurrency(head.amount)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in border border-slate-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-emerald-50/20 sticky top-0 z-10">
              <h3 className="text-2xl font-black text-slate-900">{editingCourseId ? 'Update Plan' : 'New Structure'}</h3>
              <button onClick={closeModal} className="w-12 h-12 rounded-full bg-white border border-slate-300 text-slate-500 hover:text-rose-600 hover:border-rose-400 transition-all shadow-md active:scale-90 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-10 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plan Name</label>
                  <input type="text" value={newCourse.courseName} onChange={(e) => setNewCourse({ ...newCourse, courseName: e.target.value })} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold text-sm" placeholder="e.g. Master of Science" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Installment Frequency</label>
                  <select value={newCourse.frequency} onChange={(e) => setNewCourse({ ...newCourse, frequency: e.target.value as FeeFrequency })} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold text-sm">
                    <option value="Annual">Annual</option>
                    <option value="Semester">Semester</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="bg-emerald-50/30 p-8 rounded-[32px] space-y-6 border border-emerald-100">
                <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] flex items-center gap-3">Add Component</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input type="text" placeholder="Head Name" value={newHead.name} onChange={(e) => setNewHead({ ...newHead, name: e.target.value })} className="p-4 rounded-xl border bg-white shadow-sm font-bold text-xs" />
                  <input type="number" placeholder="Amt ₹" value={newHead.amount || ''} onChange={(e) => setNewHead({ ...newHead, amount: Number(e.target.value) })} className="p-4 rounded-xl border bg-white shadow-sm font-bold text-xs" />
                  <select value={newHead.type} onChange={(e) => setNewHead({ ...newHead, type: e.target.value as any })} className="p-4 rounded-xl border bg-white shadow-sm font-bold text-xs">
                    <option value="Base">Base</option>
                    <option value="One-Time">One-Time</option>
                    <option value="Optional">Optional</option>
                  </select>
                </div>
                <button onClick={addHead} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg">+ APPEND HEAD</button>

                <div className="space-y-3 mt-4">
                  {newCourse.heads?.map(head => (
                    <div key={head.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                      <span className="text-xs font-bold text-slate-700">{head.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-black text-emerald-600">{formatCurrency(head.amount)}</span>
                        <button onClick={() => removeHead(head.id)} className="w-8 h-8 rounded-full bg-rose-50 text-rose-400 hover:text-rose-600 transition-colors">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-slate-900 text-white shrink-0 sticky bottom-0 flex justify-between items-center">
              <div>
                <p className="text-[10px] opacity-50 uppercase font-black tracking-widest mb-1">Estimated Total</p>
                <p className="text-4xl font-black tracking-tighter text-emerald-400">{formatCurrency(newCourse.totalAmount || 0)}</p>
              </div>
              <button onClick={saveCourse} className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-500 hover:text-white transition-all shadow-xl">
                {editingCourseId ? 'Confirm Updates' : 'Confirm Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeStructures;
