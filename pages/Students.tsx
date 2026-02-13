
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { Student } from '../types';
import { supabase } from '../lib/supabase';

const Students: React.FC = () => {
  const { state, refreshData } = useContext(AppContext)!;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterSem, setFilterSem] = useState('');

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

  // Filtered Students Logic
  const filteredStudents = useMemo(() => {
    return state.students.filter(s => {
      const studentCourseId = s.course_id || (s as any).courseId;
      const matchesSearch = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.roll_number || (s as any).rollNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery);
      
      const matchesCourse = !filterCourse || studentCourseId === filterCourse;
      const matchesBranch = !filterBranch || s.branch === filterBranch;
      const matchesSem = !filterSem || s.semester === filterSem;

      return matchesSearch && matchesCourse && matchesBranch && matchesSem;
    });
  }, [state.students, searchQuery, filterCourse, filterBranch, filterSem]);

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
    if (window.confirm("Permanent Action: Delete student record?")) {
      await supabase.from('students').delete().match({ id });
      await refreshData();
    }
  };

  const openEditModal = (s: Student) => {
    setEditingStudentId(s.id);
    setNewStudent({ 
      ...s,
      courseId: s.course_id || (s as any).courseId,
      parentName: s.parent_name || (s as any).parentName,
      rollNumber: s.roll_number || (s as any).rollNumber,
      sessionId: s.session_id || (s as any).sessionId,
      enrollmentDate: s.enrollment_date || (s as any).enrollmentDate
    });
    setIsModalOpen(true);
  };

  const openViewModal = (s: Student) => {
    setSelectedStudent(s);
    setIsViewModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsViewModalOpen(false);
    setEditingStudentId(null);
    setSelectedStudent(null);
    setNewStudent({ name: '', parentName: '', rollNumber: '', courseId: '', branch: '', semester: '', sessionId: state.settings.availableSessions[0] || '2024-25', email: '', phone: '', enrollmentDate: new Date().toISOString().split('T')[0] });
  };

  // Export to Excel (CSV)
  const exportToExcel = () => {
    const headers = ["Name", "Roll No", "Course", "Branch", "Sem", "Phone", "Guardian", "Enroll Date"];
    const rows = filteredStudents.map(s => {
      const courseId = s.course_id || (s as any).courseId;
      const course = state.courses.find(c => c.id === courseId);
      return [
        s.name,
        s.roll_number || (s as any).rollNumber,
        course?.course_name || (course as any)?.courseName || 'N/A',
        s.branch || '',
        s.semester || '',
        s.phone,
        s.parent_name || (s as any).parentName,
        s.enrollment_date || (s as any).enrollmentDate
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Student_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printStudentList = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Student Directory</h2>
          <p className="text-slate-500 font-medium">Manage enrollment and student profiles</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={exportToExcel}
            className="bg-white text-slate-700 px-5 py-3 rounded-2xl font-bold border border-slate-200 shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
          >
            <span>📊</span> Export Excel
          </button>
          <button 
            onClick={printStudentList}
            className="bg-white text-slate-700 px-5 py-3 rounded-2xl font-bold border border-slate-200 shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
          >
            <span>🖨️</span> PDF Report
          </button>
          {state.user?.role === 'Admin' && (
            <button 
              onClick={() => { setEditingStudentId(null); setIsModalOpen(true); }} 
              className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-emerald-500/20 flex items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95"
            >
              <span className="text-lg">👤</span> Enroll New
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm no-print space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search by name, roll no or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium text-sm"
            />
          </div>
          <select 
            value={filterCourse} 
            onChange={(e) => setFilterCourse(e.target.value)}
            className="py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-sm"
          >
            <option value="">All Programs</option>
            {state.courses.map(c => <option key={c.id} value={c.id}>{c.course_name || (c as any).courseName}</option>)}
          </select>
          <select 
            value={filterBranch} 
            onChange={(e) => setFilterBranch(e.target.value)}
            className="py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-sm"
          >
            <option value="">All Branches</option>
            {state.settings.availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select 
            value={filterSem} 
            onChange={(e) => setFilterSem(e.target.value)}
            className="py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-sm"
          >
            <option value="">All Semesters</option>
            {state.settings.availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        
        {/* Active Filter Info */}
        {(searchQuery || filterCourse || filterBranch || filterSem) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
             <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">
               Found {filteredStudents.length} Students Matching Filters
             </p>
             <button 
              onClick={() => { setSearchQuery(''); setFilterCourse(''); setFilterBranch(''); setFilterSem(''); }}
              className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
             >
               Clear All Filters
             </button>
          </div>
        )}
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Info</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guardian Info</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Program & Cohort</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStudents.map(student => {
                const studentCourseId = student.course_id || (student as any).courseId;
                const course = state.courses.find(c => c.id === studentCourseId);
                return (
                  <tr key={student.id} className="hover:bg-emerald-50/10 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 font-black text-lg border border-emerald-100 shadow-sm">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{student.name}</p>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Roll: {student.roll_number || (student as any).rollNumber || '---'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-slate-700">{student.parent_name || (student as any).parentName || '---'}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{student.phone}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-slate-800 leading-tight mb-1">{course?.course_name || (course as any)?.courseName || 'Unassigned'}</p>
                      <div className="flex gap-2">
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase tracking-wider">
                          {student.branch || 'NA'}
                        </span>
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 uppercase tracking-wider">
                          Sem {student.semester || 'NA'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right no-print">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openViewModal(student)} 
                          className="p-2.5 bg-slate-50 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-slate-100"
                          title="View Profile"
                        >
                          👁️
                        </button>
                        {state.user?.role === 'Admin' && (
                          <>
                            <button 
                              onClick={() => openEditModal(student)} 
                              className="p-2.5 bg-slate-50 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-slate-100"
                              title="Edit Record"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => deleteStudent(student.id)} 
                              className="p-2.5 bg-slate-50 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-100"
                              title="Delete Record"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="py-20 text-center bg-slate-50/30">
              <div className="text-4xl mb-4 opacity-20">👤</div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No records found matching filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Print Only Profile View */}
      {selectedStudent && (
        <div className="print-only p-10 bg-white">
           <div className="text-center mb-10 pb-8 border-b-4 border-slate-900">
             <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">{state.settings.institutionName}</h1>
             <p className="text-lg font-bold text-slate-600">{state.settings.address}</p>
           </div>
           
           <div className="flex justify-between items-start mb-12">
             <div className="space-y-4">
               <h2 className="text-3xl font-black text-slate-900">{selectedStudent.name}</h2>
               <p className="text-xl font-bold bg-slate-100 px-4 py-2 rounded-xl inline-block">
                 ROLL NO: {selectedStudent.roll_number || (selectedStudent as any).rollNumber}
               </p>
             </div>
             <div className="w-32 h-32 bg-slate-200 rounded-3xl border-4 border-white shadow-lg flex items-center justify-center text-4xl font-black text-slate-400">
                {selectedStudent.name.charAt(0)}
             </div>
           </div>

           <div className="grid grid-cols-2 gap-10">
             <div className="space-y-6">
               <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 border-b-2 border-emerald-100 pb-2">Academic Profile</h3>
               <div className="space-y-3">
                 <p className="text-lg"><b>Program:</b> {state.courses.find(c => c.id === (selectedStudent.course_id || (selectedStudent as any).courseId))?.course_name || 'N/A'}</p>
                 <p className="text-lg"><b>Branch:</b> {selectedStudent.branch || 'N/A'}</p>
                 <p className="text-lg"><b>Semester:</b> {selectedStudent.semester || 'N/A'}</p>
                 <p className="text-lg"><b>Session:</b> {selectedStudent.session_id || (selectedStudent as any).sessionId || 'N/A'}</p>
               </div>
             </div>
             <div className="space-y-6">
               <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 border-b-2 border-emerald-100 pb-2">Personal & Contact</h3>
               <div className="space-y-3">
                 <p className="text-lg"><b>Guardian:</b> {selectedStudent.parent_name || (selectedStudent as any).parentName || 'N/A'}</p>
                 <p className="text-lg"><b>Phone:</b> {selectedStudent.phone || 'N/A'}</p>
                 <p className="text-lg"><b>Email:</b> {selectedStudent.email || 'N/A'}</p>
                 <p className="text-lg"><b>Enrollment:</b> {selectedStudent.enrollment_date || (selectedStudent as any).enrollmentDate || 'N/A'}</p>
               </div>
             </div>
           </div>

           <div className="mt-20 pt-10 border-t-2 border-slate-200 flex justify-between">
              <div className="text-center">
                <div className="w-48 border-b border-slate-900 mb-2"></div>
                <p className="text-xs font-black uppercase">Registrar Signature</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 italic">Generated via EduPay Cloud Portal v2.5</p>
              </div>
           </div>
        </div>
      )}

      {/* View Details Modal */}
      {isViewModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in border border-slate-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-emerald-50/30">
              <h3 className="text-2xl font-black text-slate-900">Student Profile</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()}
                  className="px-6 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50 active:scale-95 transition-all"
                >
                  PRINT PROFILE
                </button>
                <button 
                  onClick={closeModal} 
                  className="w-10 h-10 rounded-full bg-white border border-slate-300 text-slate-500 hover:text-rose-600 hover:border-rose-400 transition-all flex items-center justify-center shadow-sm"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-10 space-y-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Profile Card */}
              <div className="flex items-center gap-8 p-8 bg-slate-900 rounded-[32px] text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full -mr-16 -mt-16 opacity-20"></div>
                <div className="w-24 h-24 bg-white/10 rounded-[32px] border-2 border-white/20 flex items-center justify-center text-4xl font-black relative z-10">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div className="relative z-10 flex-1">
                  <h4 className="text-3xl font-black tracking-tight">{selectedStudent.name}</h4>
                  <div className="flex gap-4 mt-2">
                    <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
                      ID: {selectedStudent.roll_number || (selectedStudent as any).rollNumber || 'TBA'}
                    </span>
                    <span className="text-[10px] font-black uppercase bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30">
                      {selectedStudent.session_id || (selectedStudent as any).sessionId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2">Academic Details</h5>
                    <div className="space-y-4">
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Enrolled Program</p>
                          <p className="text-sm font-bold text-slate-800">
                             {state.courses.find(c => c.id === (selectedStudent.course_id || (selectedStudent as any).courseId))?.course_name || 'N/A'}
                          </p>
                       </div>
                       <div className="flex gap-10">
                          <div>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Branch</p>
                             <p className="text-sm font-bold text-slate-800">{selectedStudent.branch || 'Unassigned'}</p>
                          </div>
                          <div>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Sem</p>
                             <p className="text-sm font-bold text-slate-800">{selectedStudent.semester || 'I'}</p>
                          </div>
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Enrollment Date</p>
                          <p className="text-sm font-bold text-slate-800">{selectedStudent.enrollment_date || (selectedStudent as any).enrollmentDate || '---'}</p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2">Guardian & Contact</h5>
                    <div className="space-y-4">
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Guardian Name</p>
                          <p className="text-sm font-bold text-slate-800">{selectedStudent.parent_name || (selectedStudent as any).parentName || '---'}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Phone</p>
                          <p className="text-sm font-bold text-emerald-600 underline underline-offset-4">{selectedStudent.phone}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                          <p className="text-sm font-bold text-slate-800 truncate">{selectedStudent.email || 'not-provided@edu.in'}</p>
                       </div>
                    </div>
                 </div>
              </div>
              
              {/* Financial Status Summary */}
              <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Financial Ledger Preview</h5>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">LATEST DATA</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white p-5 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Paid</p>
                      <p className="text-xl font-black text-emerald-600">
                        ₹{state.payments.filter(p => p.student_id === selectedStudent.id).reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                      </p>
                   </div>
                   <div className="bg-white p-5 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Recent Date</p>
                      <p className="text-xl font-black text-slate-800">
                        {state.payments.filter(p => p.student_id === selectedStudent.id).slice(-1)[0]?.date || 'None'}
                      </p>
                   </div>
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-white border-t border-slate-100 flex gap-4 shrink-0">
               {state.user?.role === 'Admin' && (
                 <button 
                  onClick={() => { setIsViewModalOpen(false); openEditModal(selectedStudent); }}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                 >
                   Edit Record
                 </button>
               )}
               <button 
                onClick={closeModal}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 active:scale-95 transition-all"
               >
                 Close Profile
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Modal (Add/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in border border-slate-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-emerald-50/30 sticky top-0 z-10">
              <h3 className="text-2xl font-black text-slate-900">{editingStudentId ? 'Update Record' : 'Enroll New Student'}</h3>
              <button onClick={closeModal} className="w-12 h-12 rounded-full bg-white border border-slate-300 text-slate-500 hover:text-rose-600 hover:border-rose-400 transition-all shadow-md active:scale-90 flex items-center justify-center">
                ✕
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
