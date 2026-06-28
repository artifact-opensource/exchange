import React, { useState } from 'react';
import { X, User, Mail, Bell, Settings2, Shield, Save } from 'lucide-react';
import { useAuth } from '../services/authContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');
  
  // Form State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  
  const [notifyMarketing, setNotifyMarketing] = useState(false);
  const [notifyVoting, setNotifyVoting] = useState(true);
  const [notifyPortfolio, setNotifyPortfolio] = useState(true);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate save functionality
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Box */}
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-zinc-400" />
            User Settings
          </h2>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Sidebar Tabs */}
          <div className="w-full md:w-48 bg-zinc-950/80 border-r border-zinc-800 p-4 space-y-1 overflow-y-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'profile' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <User className="h-4 w-4" /> Profile
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'notifications' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Bell className="h-4 w-4" /> Notifications
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'security' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Shield className="h-4 w-4" /> Security
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSave} className="p-6">
              
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">Profile Information</h3>
                    <p className="text-sm text-zinc-400">Update your personal details and how you appear on the platform.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-2">
                       <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 border border-zinc-700">
                         <User className="h-8 w-8" />
                       </div>
                       <button type="button" className="text-sm text-teal-400 hover:text-teal-300 font-medium">Change Avatar</button>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Full Name</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Email Address</label>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    
                    <div className="pt-4 space-y-1.5">
                      <label className="text-sm font-medium text-zinc-300">Investor Type</label>
                      <input 
                        type="text" 
                        disabled
                        value={user?.type || 'Standard'}
                        className="w-full bg-zinc-950/50 border border-zinc-900 rounded-lg px-4 py-2.5 text-zinc-500 cursor-not-allowed"
                      />
                      <p className="text-xs text-zinc-500">Contact your relationship manager to update your investor designation.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">Notification Preferences</h3>
                    <p className="text-sm text-zinc-400">Choose what updates you want to receive.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="flex items-start gap-4 p-4 rounded-lg border border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors">
                      <div className="flex h-5 items-center">
                        <input
                          type="checkbox"
                          checked={notifyVoting}
                          onChange={(e) => setNotifyVoting(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-teal-500 focus:ring-teal-500/20"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-200">Governance & Voting</span>
                        <span className="text-sm text-zinc-500">Get notified when new proposals are active or closing soon.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-4 p-4 rounded-lg border border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors">
                      <div className="flex h-5 items-center">
                        <input
                          type="checkbox"
                          checked={notifyPortfolio}
                          onChange={(e) => setNotifyPortfolio(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-teal-500 focus:ring-teal-500/20"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-200">Portfolio Updates</span>
                        <span className="text-sm text-zinc-500">Alerts regarding distributions, valuation changes, and new documents.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-4 p-4 rounded-lg border border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors">
                      <div className="flex h-5 items-center">
                        <input
                          type="checkbox"
                          checked={notifyMarketing}
                          onChange={(e) => setNotifyMarketing(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-teal-500 focus:ring-teal-500/20"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-200">Company News</span>
                        <span className="text-sm text-zinc-500">Quarterly reports, press releases, and general company updates.</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">Security Settings</h3>
                    <p className="text-sm text-zinc-400">Manage your password and authentication methods.</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-zinc-200">Password</p>
                       <p className="text-xs text-zinc-500 mt-1">Last changed 3 months ago</p>
                     </div>
                     <button type="button" className="px-3 py-1.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors">
                       Update
                     </button>
                  </div>

                  <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-zinc-200">Two-Factor Authentication</p>
                       <p className="text-xs text-zinc-500 mt-1">Enhance security by requiring an authentication code.</p>
                     </div>
                     <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                       Enabled
                     </span>
                  </div>
                </div>
              )}

              {/* Action Footer */}
              <div className="mt-8 pt-5 border-t border-zinc-800 flex items-center justify-end gap-3">
                 <button 
                   type="button" 
                   onClick={onClose}
                   className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   type="submit"
                   className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                 >
                   <Save className="h-4 w-4" />
                   Save Changes
                 </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
