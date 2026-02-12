
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
    
    if (userId === ADMIN_ID && password === ADMIN_PWD) {
      const user = { name: 'Super Admin', userId: ADMIN_ID, role: 'Admin' as const };
      localStorage.setItem('edupay_user', JSON.stringify(user));
      setState(prev => ({ ...prev, user }));
      return;
    }

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

    setError('Access Denied: Invalid Credentials');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 dc-gradient opacity-80"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-100/40 rounded-full filter blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-100/40 rounded-full filter blur-3xl"></div>
      
      <div className="w-full max-w-[440px] relative z-10 animate-fade-in">
        <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-white/50">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center mb-8">
               {state.settings.logoUrl ? (
                 <img src={state.settings.logoUrl} className="w-20 h-20 rounded-2xl object-cover shadow-lg border-4 border-slate-50" alt="Institution Logo" />
               ) : (
                 <div className="w-20 h-20 dc-gradient rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg">
                   DC
                 </div>
               )}
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {state.settings.institutionName}
              </h2>
              <div className="pt-4 pb-2 border-t border-slate-100 mt-4">
                <p className="text-[16px] font-black text-emerald-600 tracking-wider">DCfeePay</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                  Digital Communique Private Limited
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200 inline-block">
                Secure Cloud Login
              </span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold text-center animate-pulse">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">User Identification</label>
              <input 
                type="text" 
                required 
                value={userId} 
                onChange={(e) => setUserId(e.target.value)} 
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none font-bold text-slate-800 transition-all placeholder:text-slate-300" 
                placeholder="Enter Staff ID" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Pin</label>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none font-bold text-slate-800 transition-all placeholder:text-slate-300" 
                placeholder="••••" 
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-4.5 dc-gradient text-white rounded-2xl font-black uppercase tracking-[0.15em] text-xs shadow-xl shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.98] transition-all"
            >
              Sign In to Cloud
            </button>
          </form>
          
          <div className="mt-12 text-center border-t border-slate-100 pt-8">
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.25em]">
               Powered by DCfeePay Cloud Engine
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
