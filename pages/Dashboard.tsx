
import React, { useContext } from 'react';
import { AppContext } from '../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Fixing "Module has no default export" error and completing the truncated file
const Dashboard: React.FC = () => {
  const { state } = useContext(AppContext)!;

  const totalCollected = state.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalReceivable = state.students.reduce((sum, s) => {
    const courseId = s.course_id || (s as any).courseId;
    const course = state.courses.find(c => c.id === courseId);
    return sum + Number(course?.total_amount || course?.totalAmount || 0);
  }, 0);
  const pendingFees = totalReceivable - totalCollected;

  const formatCurrency = (val: number) => `₹${Number(val).toLocaleString('en-IN')}`;

  const stats = [
    { label: 'Revenue', value: formatCurrency(totalReceivable), icon: '📈' },
    { label: 'Received', value: formatCurrency(totalCollected), icon: '💰' },
    { label: 'Outstanding', value: formatCurrency(pendingFees), icon: '⏳' },
    { label: 'Students', value: state.students.length.toString(), icon: '🎓' },
  ];

  const chartData = state.courses.map(course => {
    const collected = state.payments
      .filter(p => {
        const student = state.students.find(s => s.id === (p.student_id || (p as any).studentId));
        const sCourseId = student?.course_id || (student as any)?.courseId;
        return sCourseId === course.id;
      })
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const name = course.course_name || (course as any).courseName || 'Unnamed';
    return { name: name.length > 10 ? name.substring(0, 10) + '..' : name, collected };
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-emerald-50 rounded-full -mr-24 -mt-24 z-0 opacity-50"></div>
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">Overview</h2>
          <p className="text-xs md:text-sm text-slate-500 font-medium">{state.settings.institutionName}</p>
        </div>
        <div className="relative z-10">
          <div className="bg-emerald-500 text-white px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> System Live
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm group hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex justify-between items-start mb-3 md:mb-4">
              <span className="text-xl md:text-2xl p-1.5 md:p-2 bg-slate-50 rounded-lg md:rounded-xl">{stat.icon}</span>
              <span className="text-[8px] md:text-[10px] font-black text-emerald-500 bg-emerald-50 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md uppercase tracking-wider hidden sm:block">Sync</span>
            </div>
            <p className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{stat.label}</p>
            <p className="text-sm md:text-2xl font-black tracking-tight text-slate-900 truncate">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-200 shadow-sm">
          <h3 className="text-base md:text-lg font-bold text-slate-800 mb-6 md:mb-10">Collections by Course</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Bar dataKey="collected" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-200 shadow-sm">
           <h3 className="text-base md:text-lg font-bold text-slate-800 mb-6">Recent Activity</h3>
           <div className="space-y-4">
              {state.payments.slice(-5).reverse().map(p => {
                const student = state.students.find(s => s.id === (p.student_id || (p as any).studentId));
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
                      {student?.name?.charAt(0) || 'P'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{student?.name || 'Payment'}</p>
                      <p className="text-[10px] text-slate-400">{p.date}</p>
                    </div>
                    <p className="text-xs font-black text-emerald-600">+{formatCurrency(p.amount)}</p>
                  </div>
                );
              })}
              {state.payments.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No recent transactions</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
