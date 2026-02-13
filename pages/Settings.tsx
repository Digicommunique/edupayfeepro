
import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { Accountant, AppSettings } from '../types';
import { supabase } from '../lib/supabase';

const SettingsPage: React.FC = () => {
  const { state, refreshData } = useContext(AppContext)!;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [newAccountant, setNewAccountant] = useState<Partial<Accountant>>({ name: '', userId: '', password: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'academic' | 'staff'>('profile');

  // Local state for profile fields to ensure no typing lag
  const [localProfile, setLocalProfile] = useState({
    institutionName: '',
    address: '',
    contactNumber: ''
  });

  // Sync local profile state when global state loads
  useEffect(() => {
    if (state.settings) {
      setLocalProfile({
        institutionName: state.settings.institutionName || '',
        address: state.settings.address || '',
        contactNumber: state.settings.contactNumber || ''
      });
    }
  }, [state.settings]);

  const updateSettings = async (field: keyof AppSettings, value: any) => {
    try {
      const dbField = field === 'institutionName' ? 'institution_name' : 
                      field === 'contactNumber' ? 'contact_number' :
                      field === 'logoUrl' ? 'logo_url' :
                      field === 'availableBranches' ? 'available_branches' :
                      field === 'availableSemesters' ? 'available_semesters' :
                      field === 'availableSessions' ? 'available_sessions' : field;
      
      const settingsId = (state.settings as any).id;
      if (!settingsId) throw new Error("Settings record ID missing");

      await supabase.from('settings').update({ [dbField]: value }).match({ id: settingsId });
      await refreshData();
    } catch (err) {
      console.error('Error updating settings:', err);
      alert("Failed to sync change to cloud.");
    }
  };

  const saveProfileChanges = async () => {
    setIsProfileSaving(true);
    try {
      const settingsId = (state.settings as any).id;
      if (!settingsId) throw new Error("Settings record ID missing");

      const { error } = await supabase.from('settings').update({
        institution_name: localProfile.institutionName,
        address: localProfile.address,
        contact_number: localProfile.contactNumber
      }).match({ id: settingsId });

      if (error) throw error;
      
      await refreshData();
      alert("Profile updated successfully!");
    } catch (err) {
      console.error('Error saving profile:', err);
      alert("Failed to save profile changes.");
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("Image is too large. Please select an image under 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateSettings('logoUrl', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddModal = () => {
    setEditingStaffId(null);
    setNewAccountant({ name: '', userId: '', password: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (acc: Accountant) => {
    setEditingStaffId(acc.id);
    setNewAccountant({ 
        name: acc.name, 
        userId: acc.user_id || acc.userId, 
        password: acc.password 
    });
    setIsModalOpen(true);
  };

  const saveAccountant = async () => {
    const targetUserId = newAccountant.userId || newAccountant.user_id;
    if (newAccountant.name && targetUserId && newAccountant.password) {
      setIsSaving(true);
      try {
        const payload = {
            name: newAccountant.name,
            user_id: targetUserId.trim(),
            password: newAccountant.password.trim()
        };

        if (editingStaffId) {
            await supabase.from('accountants').update(payload).match({ id: editingStaffId });
        } else {
            await supabase.from('accountants').insert(payload);
        }

        await refreshData();
        setIsModalOpen(false);
        setNewAccountant({ name: '', userId: '', password: '' });
      } catch (err: any) {
        console.error('Detailed Save Error:', err);
        alert(`Failed to save staff: ${err.message || 'Unknown Error'}. Ensure Login ID is unique.`);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const deleteAccountant = async (id: string) => {
    if (window.confirm("CRITICAL: Revoke all access for this staff member?")) {
      try {
        await supabase.from('accountants').delete().match({ id });
        await refreshData();
      } catch (err) {
        console.error('Error revoking staff:', err);
      }
    }
  };

  if (state.user?.role !== 'Admin') return <div className="p-20 text-center font-black text-rose-500 uppercase tracking-widest">Access Denied</div>;

  return (
    <div className="space-y-10 animate-fade-in max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">System Control</h2>
          <p className="text-slate-500 font-medium">Manage institution profile, staff, and masters</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button onClick={() => setActiveTab('profile')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'profile' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Profile</button>
          <button onClick={() => setActiveTab('academic')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'academic' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Masters</button>
          <button onClick={() => setActiveTab('staff')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'staff' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Staff</button>
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white p-6 md:p-12 rounded-[40px] border border-slate-200 shadow-sm space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
              <span className="w-2.5 h-10 bg-emerald-500 rounded-full"></span> Institution Identity
            </h3>
            <button 
              onClick={saveProfileChanges}
              disabled={isProfileSaving}
              className={`px-8 py-4 ${isProfileSaving ? 'bg-slate-200 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-500/20'} rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-3 active:scale-95`}
            >
              {isProfileSaving ? (
                <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              ) : '💾'} Save Profile Changes
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Official Logo</label>
                <div className="flex items-center gap-8">
                  <div className="relative group shrink-0">
                    <div className="w-32 h-32 rounded-[32px] bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-emerald-500 shadow-inner">
                      {state.settings.logoUrl ? (
                        <img src={state.settings.logoUrl} className="w-full h-full object-cover" alt="Logo Preview" />
                      ) : (
                        <span className="text-4xl grayscale opacity-20">🏫</span>
                      )}
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-slate-900/60 text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-center p-4 backdrop-blur-sm rounded-[32px]">Change Image</button>
                  </div>
                  <div className="space-y-3">
                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-100 transition-colors">Choose New Logo</button>
                  </div>
                </div>
              </div>
              <div className="space-y-2 pt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Institution Name</label>
                <input 
                  type="text" 
                  value={localProfile.institutionName} 
                  onChange={(e) => setLocalProfile({...localProfile, institutionName: e.target.value})} 
                  className="w-full px-6 py-4.5 bg-slate-50 rounded-[22px] border-2 border-slate-200 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-800 transition-all shadow-sm"
                  placeholder="Official Name"
                />
              </div>
            </div>
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Registered Address</label>
                <textarea 
                  value={localProfile.address} 
                  onChange={(e) => setLocalProfile({...localProfile, address: e.target.value})} 
                  className="w-full px-6 py-4.5 bg-slate-50 rounded-[22px] border-2 border-slate-200 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-800 h-40 transition-all resize-none shadow-inner"
                  placeholder="Postal Address"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Primary Contact Number</label>
                <input 
                  type="text" 
                  value={localProfile.contactNumber} 
                  onChange={(e) => setLocalProfile({...localProfile, contactNumber: e.target.value})} 
                  className="w-full px-6 py-4.5 bg-slate-50 rounded-[22px] border-2 border-slate-200 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-800 transition-all shadow-sm"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'academic' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AcademicManager title="Branches" items={state.settings.availableBranches} onAdd={(v) => updateSettings('availableBranches', [...state.settings.availableBranches, v])} onRemove={(v) => updateSettings('availableBranches', state.settings.availableBranches.filter(i => i !== v))} icon="🏢" />
          <AcademicManager title="Semesters" items={state.settings.availableSemesters} onAdd={(v) => updateSettings('availableSemesters', [...state.settings.availableSemesters, v])} onRemove={(v) => updateSettings('availableSemesters', state.settings.availableSemesters.filter(i => i !== v))} icon="🗓️" />
          <AcademicManager title="Sessions" items={state.settings.availableSessions} onAdd={(v) => updateSettings('availableSessions', [...state.settings.availableSessions, v])} onRemove={(v) => updateSettings('availableSessions', state.settings.availableSessions.filter(i => i !== v))} icon="⏳" />
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="bg-white p-6 md:p-12 rounded-[40px] border border-slate-200 shadow-sm space-y-10">
          <div className="flex justify-between items-center">
             <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
               <span className="w-2.5 h-10 bg-emerald-500 rounded-full"></span> Staff Control
             </h3>
             <button onClick={openAddModal} className="px-8 py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Grant Staff Access</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {state.accountants.map(acc => (
              <div key={acc.id} className="flex justify-between items-center p-8 bg-slate-50 rounded-[32px] border-2 border-slate-100 group hover:border-emerald-500/30 transition-all shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-emerald-600 font-bold shadow-md border border-slate-200 text-xl">
                    {acc.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900 leading-tight">{acc.name}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white border px-2 py-1 rounded-lg">ID: {acc.user_id || acc.userId}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => openEditModal(acc)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100">✏️</button>
                    <button onClick={() => deleteAccountant(acc.id)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-md overflow-hidden shadow-2xl animate-fade-in border-2 border-white">
             <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-emerald-50/40">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingStaffId ? 'Update Credentials' : 'New Staff Access'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center bg-white border text-slate-500 hover:text-rose-600 transition-all font-bold">✕</button>
            </div>
            <div className="p-10 space-y-6">
               <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Staff Member Name</label>
                 <input type="text" placeholder="Full Legal Name" value={newAccountant.name} onChange={(e) => setNewAccountant({...newAccountant, name: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 outline-none font-bold text-sm focus:border-emerald-500 focus:bg-white transition-all" />
               </div>
               <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">System Login ID</label>
                 <input type="text" placeholder="Unique Username" value={newAccountant.userId || newAccountant.user_id} onChange={(e) => setNewAccountant({...newAccountant, userId: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 outline-none font-bold text-sm focus:border-emerald-500 focus:bg-white transition-all" />
               </div>
               <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Staff Access Password</label>
                 <input type="text" placeholder="Pin code" value={newAccountant.password} onChange={(e) => setNewAccountant({...newAccountant, password: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 outline-none font-bold text-sm focus:border-emerald-500 focus:bg-white transition-all" />
               </div>
               <button 
                onClick={saveAccountant} 
                disabled={isSaving}
                className={`w-full py-5 ${isSaving ? 'bg-slate-400' : 'bg-emerald-600'} text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all mt-4 flex items-center justify-center gap-3`}
               >
                 {isSaving ? 'Syncing...' : 'Commit Credentials'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AcademicManager: React.FC<{
  title: string;
  items: string[];
  onAdd: (val: string) => void;
  onRemove: (val: string) => void;
  icon: string;
}> = ({ title, items, onAdd, onRemove, icon }) => {
  const [val, setVal] = useState('');
  const handleAdd = () => { if (val.trim()) { onAdd(val.trim()); setVal(''); } };
  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6 flex flex-col h-[500px]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="text-lg font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
          <span className="text-xl bg-slate-50 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm">{icon}</span>
          {title}
        </h3>
        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
        {items.map(item => (
          <div key={item} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
            <span className="text-sm font-bold text-slate-700">{item}</span>
            <button onClick={() => onRemove(item)} className="text-slate-300 hover:text-rose-500 transition-colors">✕</button>
          </div>
        ))}
      </div>
      <div className="pt-4 space-y-3">
        <input type="text" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder={`Add ${title}...`} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none" />
        <button onClick={handleAdd} className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-all">Add Item</button>
      </div>
    </div>
  );
};

export default SettingsPage;
