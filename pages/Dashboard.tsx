
import React, { useContext } from 'react';
import { AppContext } from '../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
    { label: 'Estimated Revenue', value: formatCurrency(totalReceivable), icon: '📈' },
    { label: 'Collection Received', value: formatCurrency(totalCollected), icon: '💰' },
    { label: 'Outstanding Balance', value: formatCurrency(pendingFees), icon: '⏳' },
    { label: 'Student Count', value: state.students.length.toString(), icon: '🎓' },
  ];

  const chartData = state.courses.map(course => {
    const collected = state.payments
      .filter(p => {
        const student = state.students.find(s => s.id === p.student_id);
        const sCourseId = student?.course_id || (student as any)?.courseId;
        return sCourseId === course.id;
      })
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const name = course.course_name || (course as any).courseName;
    return { name: name.length > 12 ? name.substring(0, 12) + '..' : name, collected };
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 z-0 opacity-50"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-1">Financial Overview</h2>
          <p className="text-slate-500 font-medium">{state.settings.institutionName} System</p>
        </div>
        <div className="relative z-10 flex gap-2">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> System Live
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl p-2 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">{stat.icon}</span>
              <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-wider">Cloud Sync</span>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
            <p className="text-2xl font-black tracking-tight text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-10 flex items-center gap-3">
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span> Collections Per Course
          </h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', shadow: 'none' }} />
                <Bar dataKey="collected" radius={[8, 8, 8, 8]} barSize={40}>
                  {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ec4899'][index % 4]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-slate-800">Recent Transactions</h3>
          </div>
          <div className="space-y-4">
            {state.payments.slice(-5).reverse().map((payment, i) => {
              const student = state.students.find(s => s.id === payment.student_id);
              return (
                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl group border border-transparent hover:border-emerald-100 hover:bg-white transition-all">
                  <div className="h-11 w-11 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-emerald-600 font-bold">
                    {student?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{student?.name || 'Deleted Student'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{payment.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600">+{formatCurrency(payment.amount)}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{payment.payment_method || (payment as any).paymentMethod}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
