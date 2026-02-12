
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AppState, UserRole } from './types';
import { INITIAL_STATE } from './constants';
import { supabase } from './lib/supabase';
import Dashboard from './pages/Dashboard';
import FeeStructures from './pages/FeeStructures';
import Students from './pages/Students';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Login from './pages/Login';
import SettingsPage from './pages/Settings';

interface AppContextType {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  refreshData: () => Promise<void>;
  logout: () => void;
}

export const AppContext = createContext<AppContextType | null>(null);

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const fetchResults = await Promise.all([
        supabase.from('settings').select('*'),
        supabase.from('courses').select('*'),
        supabase.from('fee_heads').select('*'),
        supabase.from('students').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('accountants').select('*'),
        supabase.from('notifications').select('*'),
        supabase.from('pending_changes').select('*')
      ]);

      const rawSettings = fetchResults[0].data?.[0];
      const rawCourses = fetchResults[1].data || [];
      const rawHeads = fetchResults[2].data || [];
      const rawStudents = fetchResults[3].data || [];
      const rawPayments = fetchResults[4].data || [];
      const accountants = fetchResults[5].data || [];
      const notifications = fetchResults[6].data || [];
      const pendingChanges = fetchResults[7].data || [];

      const settings = rawSettings ? {
        ...rawSettings,
        institutionName: rawSettings.institution_name || rawSettings.institutionName || 'Institution',
        logoUrl: rawSettings.logo_url || rawSettings.logoUrl,
        contactNumber: rawSettings.contact_number || rawSettings.contactNumber,
        availableBranches: rawSettings.available_branches || rawSettings.availableBranches || [],
        availableSemesters: rawSettings.available_semesters || rawSettings.availableSemesters || [],
        availableSessions: rawSettings.available_sessions || rawSettings.availableSessions || [],
        address: rawSettings.address || ''
      } : INITIAL_STATE.settings;

      const courses = rawCourses.map(c => ({
        ...c,
        courseName: c.course_name || c.courseName,
        totalAmount: c.total_amount || c.totalAmount,
        heads: rawHeads
          .filter(h => h.course_id === c.id)
          .map(h => ({ ...h, courseId: h.course_id })) || []
      })) || [];

      const students = rawStudents.map(s => ({
        ...s,
        courseId: s.course_id || s.courseId,
        parentName: s.parent_name || s.parentName,
        rollNumber: s.roll_number || s.rollNumber,
        sessionId: s.session_id || s.sessionId,
        enrollmentDate: s.enrollment_date || s.enrollmentDate
      })) || [];

      const payments = rawPayments.map(p => ({
        ...p,
        studentId: p.student_id || p.studentId,
        paymentMethod: p.payment_method || p.paymentMethod,
        receiptNumber: p.receipt_number || p.receiptNumber,
        sessionId: p.session_id || p.sessionId,
        transactionId: p.transaction_id || p.transactionId,
        upiId: p.upi_id || p.upiId,
      })) || [];

      setState(prev => ({
        ...prev,
        settings,
        courses,
        students,
        payments,
        accountants,
        notifications,
        pendingChanges
      }));
    } catch (err) {
      console.error('Error fetching Supabase data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const savedUser = localStorage.getItem('edupay_user');
    if (savedUser) {
      setState(prev => ({ ...prev, user: JSON.parse(savedUser) }));
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('edupay_user');
    setState(prev => ({ ...prev, user: null }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Syncing with Cloud Database...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ state, setState, refreshData, logout }}>
      <HashRouter>
        <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
          {state.user ? <Sidebar /> : null}
          <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
            {state.user ? <Navbar /> : null}
            <main className="p-4 md:p-8 overflow-y-auto animate-fade-in custom-scrollbar flex-1">
              <Routes>
                {!state.user ? (
                  <Route path="*" element={<Login />} />
                ) : (
                  <>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/structures" element={<FeeStructures />} />
                    <Route path="/students" element={<Students />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </>
                )}
              </Routes>
            </main>
          </div>
        </div>
      </HashRouter>
    </AppContext.Provider>
  );
};

const Sidebar = () => {
  const { state } = useContext(AppContext)!;
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    ...(state.user?.role === 'Admin' ? [{ path: '/structures', label: 'Fee Plans', icon: '💰' }] : []),
    { path: '/students', label: 'Students', icon: '🎓' },
    { path: '/payments', label: 'Payments', icon: '💵' },
    { path: '/reports', label: 'Reports', icon: '📄' },
  ];

  if (state.user?.role === 'Admin') {
    navItems.push({ path: '/settings', label: 'Settings', icon: '⚙️' });
  }

  const displayName = (state.settings?.institutionName || 'Institution').split(' ')[0];

  return (
    <div className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col no-print h-screen sticky top-0 z-50 shadow-sm">
      <div className="p-6 border-b border-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          {state.settings.logoUrl ? (
            <img src={state.settings.logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-sm" />
          ) : (
            <div className="w-12 h-12 dc-gradient rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
              DC
            </div>
          )}
          <div className="text-center">
            <span className="text-sm font-extrabold tracking-tight text-slate-800 block truncate w-48">
              {state.settings.institutionName}
            </span>
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5 block">EduPay Cloud</span>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-[13px] ${
              location.pathname === item.path
                ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-6 bg-slate-50 border-t border-slate-100">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Version</p>
          <p className="text-[11px] font-black text-emerald-600">EduPay PRO 2.5</p>
        </div>
      </div>
    </div>
  );
};

const Navbar = () => {
  const { state, logout } = useContext(AppContext)!;

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 no-print sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="bg-slate-100 px-4 py-2 rounded-2xl border border-slate-200">
          <h1 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
            {window.location.hash.replace('#/', '').replace('-', ' ') || 'OVERVIEW'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-black text-slate-900">{state.user?.name}</p>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
              {state.user?.role} Access
            </p>
          </div>
          <div className="h-11 w-11 dc-gradient rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg">
            {state.user?.name.charAt(0)}
          </div>
        </div>

        <button
          onClick={logout}
          className="p-3 bg-rose-50 hover:bg-rose-100 rounded-2xl text-rose-500 transition-all border border-rose-100 active:scale-95"
          title="Sign Out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default App;
