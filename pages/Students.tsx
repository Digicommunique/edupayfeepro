
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Student } from '../types';
import { supabase } from '../lib/supabase';

const Students: React.FC = () => {
  const { state, refreshData } = useContext(AppContext)!;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: '',
    parentName: '',
    rollNumber: '',
    courseId: '',
    branch: '',
    semester: '',
    sessionId: state.settings.availableSessions[0] || '2024-25',
    email: '',
    phone: '',
    enrollmentDate: new Date().toISOString().split('T')[0]
  });

  const saveStudent = async () => {
    if (newStudent.name && (newStudent.courseId || (newStudent as any).course_id)) {
      try {
        const payload = {
          name: newStudent.name,
          parent_name: newStudent.parentName || (newStudent as any).parent_name,
          roll_number: newStudent.rollNumber || (newStudent as any).roll_number,
          course_id: newStudent.courseId || (newStudent as any).course_id,
          branch: newStudent.branch,
          semester: newStudent.semester,
          session_id: newStudent.sessionId || (newStudent as any).session_id,
          email: newStudent.email,
          phone: newStudent.phone,
          enrollment_date: newStudent.enrollmentDate || (newStudent as any).enrollment_date
        };

        if (editingStudentId) {
          await supabase.from('students').update(payload).match({ id: editingStudentId });
        } else {
          await supabase.from('students').insert(payload);
        }
        
        await refreshData();
        closeModal();
      } catch (err) {
        console.error('Error saving student:', err);
      }
    }
  };

  const deleteStudent = async (id: string) => {
    if (window.confirm("Permanent Action: Delete record?")) {
      await supabase.from('students').delete().match({ id });
      await refreshData();
    }
  };

  const openEditModal = (s: Student) => {
    setEditingStudentId(s.id);
    setNewStudent({ ...s });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStudentId(null);
    setNewStudent({ name: '', parentName: '', rollNumber: '', courseId: '', branch: '', semester: '', sessionId: state.settings.availableSessions[0] || '2024-25', email: '', phone: '', enrollmentDate: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Student Directory</h2>
          <p className="text-slate-500 font-medium">Manage enrollment and profiles</p>
        </div>
        {state.user?.role === 'Admin' && (
          <button onClick={() => { setEditingStudentId(null); setIsModalOpen(true); }} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2">
            <span>👤</span> Enroll New Student
          </button>
        )}
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Info</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guardian Info</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Course / Branch</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {state.students.map(student => {
              const studentCourseId = student.course_id || (student as any).courseId;
              const course = state.courses.find(c => c.id === studentCourseId);
              return (
                <tr key={student.id} className="hover:bg-emerald-50/20 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 font-bold">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{student.name}</p>
                        <p className="text-xs text-slate-500 font-medium">Roll: {student.roll_number || (student as any).rollNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-semibold text-slate-700">{student.parent_name || (student as any).parentName || '---'}</p>
                    <p className="text-[10px] text-slate-400">{student.phone}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-slate-700">{course?.course_name || course?.courseName || 'Unassigned'}</p>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{student.branch || 'N/A'} - {student.semester || 'N/A'}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {state.user?.role === 'Admin' && (
                        <>
                          <button onClick={() => openEditModal(student)} className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-xl">✏️</button>
                          <button onClick={() => deleteStudent(student.id)} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl">🗑️</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in border border-slate-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-emerald-50/30 sticky top-0 z-10">
              <h3 className="text-2xl font-black text-slate-900">{editingStudentId ? 'Update Student' : 'Enroll New Student'}</h3>
              <button onClick={closeModal} className="w-12 h-12 rounded-full bg-white border border-slate-300 text-slate-500 hover:text-rose-600 hover:border-rose-400 transition-all shadow-md active:scale-90 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-10 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Name</label>
                <input type="text" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} className="w-full px-6 py-4 rounded-[20px] bg-slate-50 border border-slate-100 outline-none font-bold text-slate-900 shadow-inner" placeholder="e.g. Rahul Singh" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Guardian Name</label>
                <input type="text" value={newStudent.parentName || (newStudent as any).parent_name} onChange={(e) => setNewStudent({ ...newStudent, parentName: e.target.value })} className="w-full px-6 py-4 rounded-[20px] bg-slate-50 border border-slate-100 outline-none font-bold text-slate-900 shadow-inner" placeholder="Father's Name" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Program (Course)</label>
                  <select value={newStudent.courseId || (newStudent as any).course_id} onChange={(e) => setNewStudent({ ...newStudent, courseId: e.target.value })} className="w-full px-6 py-4 rounded-[20px] bg-slate-50 border border-slate-100 outline-none font-bold text-slate-900 shadow-inner">
                    <option value="">Select Plan</option>
                    {state.courses.map(c => <option key={c.id} value={c.id}>{c.course_name || (c as any).courseName}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Branch</label>
                  <select value={newStudent.branch} onChange={(e) => setNewStudent({ ...newStudent, branch: e.target.value })} className="w-full px-6 py-4 rounded-[20px] bg-slate-50 border border-slate-100 outline-none font-bold text-slate-900 shadow-inner">
                    <option value="">Select Branch</option>
                    {state.settings.availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Current Semester</label>
                  <select value={newStudent.semester} onChange={(e) => setNewStudent({ ...newStudent, semester: e.target.value })} className="w-full px-6 py-4 rounded-[20px] bg-slate-50 border border-slate-100 outline-none font-bold text-slate-900 shadow-inner">
                    <option value="">Select Sem</option>
                    {state.settings.availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Academic Session</label>
                  <select value={newStudent.sessionId || (newStudent as any).session_id} onChange={(e) => setNewStudent({ ...newStudent, sessionId: e.target.value })} className="w-full px-6 py-4 rounded-[20px] bg-slate-50 border border-slate-100 outline-none font-bold text-slate-900 shadow-inner">
                    {state.settings.availableSessions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Roll Number / ID</label>
                  <input type="text" value={newStudent.rollNumber || (newStudent as any).roll_number} onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })} className="w-full px-6 py-4 rounded-[20px] bg-slate-50 border border-slate-100 outline-none font-bold text-slate-900 shadow-inner" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Primary Phone</label>
                  <input type="text" value={newStudent.phone} onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })} className="w-full px-6 py-4 rounded-[20px] bg-slate-50 border border-slate-100 outline-none font-bold text-slate-900 shadow-inner" />
                </div>
              </div>

              <div className="pt-6">
                <button onClick={saveStudent} className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/30 hover:bg-emerald-700 transition-all">
                  {editingStudentId ? 'Commit Record Update' : 'Grant Admission'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
