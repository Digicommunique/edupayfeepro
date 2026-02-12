
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
        supabase.from('settings').select('*'), // Fetch array then pick first safely
        supabase.from('courses').select('*'),
        supabase.from('fee_heads').select('*'),
        supabase.from('students').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('accountants').select('*'),
        supabase.from('notifications').select('*'),
        supabase.from('pending_changes').select('*')
      ]);

      const settings = fetchResults[0].data?.[0];
      const courses = fetchResults[1].data || [];
      const heads = fetchResults[2].data || [];
      const students = fetchResults[3].data || [];
      const payments = fetchResults[4].data || [];
      const accountants = fetchResults[5].data || [];
      const notifications = fetchResults[6].data || [];
      const pendingChanges = fetchResults[7].data || [];

      // Map heads back to courses
      const mappedCourses = courses.map(c => ({
        ...c,
        heads: heads.filter(h => h.course_id === c.id) || []
      })) || [];

      setState(prev => ({
        ...prev,
        settings: settings || prev.settings,
        courses: mappedCourses,
        students: students,
        payments: payments,
        accountants: accountants,
        notifications: notifications,
        pendingChanges: pendingChanges
      }));
    } catch (err) {
      console.error('Error fetching Supabase data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    
    // Auth restoration
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
          <div className="flex-1 flex flex-col min-w-0">
            {state.user ? <Navbar /> : null}
            <main className="p-4 md:p-8 overflow-y-auto animate-fade-in custom-scrollbar">
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
    { path: '/', label: 'Overview', icon: '📊' },
    ...(state.user?.role === 'Admin' ? [{ path: '/structures', label: 'Fee Structures', icon: '💰' }] : []),
    { path: '/students', label: 'Students', icon: '🎓' },
    { path: '/payments', label: 'Collections', icon: '💵' },
    { path: '/reports', label: 'Analytics', icon: '📄' },
  ];

  if (state.user?.role === 'Admin') {
    navItems.push({ path: '/settings', label: 'Settings', icon: '⚙️' });
  }

  return (
    <div className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col no-print h-screen sticky top-0 z-50">
      <div className="p-6 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-3">
          {state.settings.logoUrl ? (
            <img src={state.settings.logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-sm" />
          ) : (
            <div className="w-10 h-10 dc-gradient rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-emerald-500/20">
              DC
            </div>
          )}
          <div className="flex flex-col overflow-hidden">
            <span className="text-lg font-extrabold tracking-tight leading-none text-emerald-600 truncate">
              {state.settings.institutionName.split(' ')[0]}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose">PRO v2.5</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
              location.pathname === item.path
                ? 'sidebar-active shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-6 bg-slate-50/50 border-t border-slate-100">
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center">
          {state.settings.institutionName}
        </p>
      </div>
    </div>
  );
};

const Navbar = () => {
  const { state, setState, logout } = useContext(AppContext)!;
  const unreadCount = state.notifications.filter(n => !n.read).length;

  const clearNotifications = async () => {
    await supabase.from('notifications').update({ read: true }).match({ read: false });
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true }))
    }));
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 no-print sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h1 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
          {window.location.hash.replace('#/', '').replace('-', ' ') || 'DASHBOARD'}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {state.user?.role === 'Admin' && unreadCount > 0 && (
          <div className="relative group">
            <button 
              onClick={clearNotifications}
              className="p-2.5 bg-rose-50 rounded-full text-rose-600 animate-pulse relative"
              title="Fee updates requiring review"
            >
              🔔
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                {unreadCount}
              </span>
            </button>
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none z-50">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Auditing Alerts</h4>
              <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar">
                {state.notifications.filter(n => !n.read).slice().reverse().map(n => (
                  <div key={n.id} className="p-3 bg-slate-50 rounded-xl text-[11px] font-bold text-slate-700 leading-relaxed">
                    {n.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 bg-slate-50 py-1 px-1 rounded-full border border-slate-200 pl-3">
          <div className="text-left hidden sm:block pr-2">
            <p className="text-[11px] font-bold text-slate-800">{state.user?.name}</p>
            <p className="text-[9px] font-semibold text-emerald-600 uppercase tracking-tighter">
              {state.user?.role} Panel
            </p>
          </div>
          <div className="h-8 w-8 dc-gradient rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {state.user?.name.charAt(0)}
          </div>
        </div>
        <button
          onClick={logout}
          className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-500 transition-all border border-transparent hover:border-rose-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default App;
