
import React, { useState, useContext } from 'react';
import { AppContext } from '../App';

const Login: React.FC = () => {
  const { state, setState } = useContext(AppContext)!;
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const ADMIN_ID = 'admin';
  const ADMIN_PWD = '12345';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check Admin (Hardcoded for simplicity or use a separate admin table)
    if (userId === ADMIN_ID && password === ADMIN_PWD) {
      const user = { name: 'Super Admin', userId: ADMIN_ID, role: 'Admin' as const };
      localStorage.setItem('edupay_user', JSON.stringify(user));
      setState(prev => ({ ...prev, user }));
      return;
    }

    // Check Accountants from state (synced from Supabase)
    const acc = state.accountants.find(a => 
      (a.user_id === userId || (a as any).userId === userId) && 
      a.password === password
    );
    
    if (acc) {
      const user = { name: acc.name, userId: acc.user_id || (acc as any).userId, role: 'Accountant' as const };
      localStorage.setItem('edupay_user', JSON.stringify(user));
      setState(prev => ({ ...prev, user }));
      return;
    }

    setError('Invalid credentials.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc] overflow-hidden relative">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-700"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-[48px] p-10 md:p-14 shadow-2xl border border-slate-100 relative">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center mb-10 relative">
               <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 scale-150"></div>
               {state.settings.logoUrl ? (
                 <img src={state.settings.logoUrl} className="w-20 h-20 rounded-3xl object-cover rotate-6 shadow-2xl relative z-10" />
               ) : (
                 <div className="w-20 h-20 dc-gradient rounded-3xl rotate-6 flex items-center justify-center text-white text-3xl font-black shadow-2xl relative z-10">
                   <span className="-rotate-6">DC</span>
                 </div>
               )}
            </div>
            
            <div className="mb-6">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">{state.settings.institutionName}</h1>
              <div className="flex flex-col items-center gap-1 mt-4">
                <span className="text-[14px] font-black text-emerald-600 tracking-wider">DCfeePay</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Digital Communique Private Limited</span>
              </div>
            </div>
            
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] bg-slate-50 py-2.5 px-6 rounded-full inline-block border border-slate-100">Secure Cloud Login</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold text-center">{error}</div>}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">User ID</label>
              <input type="text" required value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full px-7 py-4.5 rounded-[20px] bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 shadow-inner" placeholder="Enter ID" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Pin</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-7 py-4.5 rounded-[20px] bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 shadow-inner" placeholder="••••" />
            </div>
            <button type="submit" className="w-full py-5 dc-gradient text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl hover:scale-[1.02] transition-all">Sign In</button>
          </form>
          
          <div className="mt-10 text-center">
             <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">
               Powered by DCfeePay Cloud Engine
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
