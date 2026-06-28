import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PieChart, 
  BarChart3, 
  Vote, 
  FileText, 
  LogOut, 
  Hexagon,
  User,
  Bell,
  Map,
  Settings
} from 'lucide-react';
import { useAuth } from '../services/authContext';
import { StockTicker } from './StockTicker';
import { SettingsModal } from './SettingsModal';
import { OnboardingHelper } from './OnboardingHelper';

export const InvestorLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/investor/dashboard', icon: LayoutDashboard },
    { name: 'Portfolio', path: '/investor/portfolio', icon: PieChart },
    { name: 'Analytics', path: '/investor/analytics', icon: BarChart3 },
    { name: 'Roadmap', path: '/investor/roadmap', icon: Map },
    { name: 'Voting', path: '/investor/voting', icon: Vote },
    { name: 'Documents', path: '/investor/documents', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col fixed h-full z-20 hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800">
           <Link to="/" className="flex items-center gap-2">
             <Hexagon className="h-6 w-6 text-teal-500" />
             <span className="font-bold text-lg text-zinc-100">Investor<span className="text-teal-500">Hub</span></span>
           </Link>
        </div>

        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                id={`nav-${item.name.toLowerCase()}`}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-zinc-800">
          <div 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex-1 flex justify-center items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button 
              onClick={handleLogout}
              className="flex-1 flex justify-center items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-white capitalize">
             {location.pathname.split('/').pop()}
          </h1>
          <div className="flex items-center gap-4">
             <div className="hidden md:block">
               <StockTicker />
             </div>
             <button onClick={() => setIsSettingsOpen(true)} className="relative p-2 text-zinc-400 hover:text-white transition-colors">
               <Settings className="h-5 w-5" />
             </button>
             <button className="relative p-2 text-zinc-400 hover:text-white transition-colors">
               <Bell className="h-5 w-5" />
               <span className="absolute top-2 right-2 h-2 w-2 bg-teal-500 rounded-full"></span>
             </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-zinc-950/50">
          <Outlet />
        </main>
      </div>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <OnboardingHelper />
    </div>
  );
};