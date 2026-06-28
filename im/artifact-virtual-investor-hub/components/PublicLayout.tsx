import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Hexagon, Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../services/authContext';
import { StockTicker } from './StockTicker';

export const PublicLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const isActive = (path: string) => location.pathname === path ? 'text-teal-400' : 'text-zinc-400 hover:text-white';

  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <Hexagon className="h-8 w-8 text-teal-500 group-hover:rotate-90 transition-transform duration-500" />
                <span className="font-bold text-xl tracking-tight text-white">ARTIFACT<span className="text-zinc-500">VIRTUAL</span></span>
              </Link>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <Link to="/" className={`${isActive('/')} px-3 py-2 rounded-md text-sm font-medium transition-colors`}>Company</Link>
                <Link to="/about" className={`${isActive('/about')} px-3 py-2 rounded-md text-sm font-medium transition-colors`}>About</Link>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <StockTicker />
              {isAuthenticated ? (
                 <Link to="/investor/dashboard" className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                    Portal <ArrowRight className="w-4 h-4"/>
                 </Link>
              ) : (
                <Link 
                  to="/login" 
                  className="bg-white hover:bg-zinc-200 text-zinc-900 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Investor Login
                </Link>
              )}
            </div>

            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-zinc-900 border-b border-zinc-800">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-zinc-800">Company</Link>
              <Link to="/about" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-zinc-400 hover:text-white hover:bg-zinc-800">About</Link>
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="block mt-4 px-3 py-2 rounded-md text-base font-medium bg-teal-600 text-white text-center">Investor Portal</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Hexagon className="h-6 w-6 text-zinc-600" />
                <span className="font-bold text-lg text-zinc-300">Artifact Virtual</span>
              </div>
              <p className="text-zinc-500 text-sm max-w-md">
                Building AI infrastructure for the next generation of intelligent systems. 
                Secure, scalable, and decentralized.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Platform</h3>
              <ul className="space-y-3">
                <li><Link to="/company" className="text-zinc-600 hover:text-teal-500 text-sm">Technology</Link></li>
                <li><Link to="/company" className="text-zinc-600 hover:text-teal-500 text-sm">Roadmap</Link></li>
                <li><Link to="/login" className="text-zinc-600 hover:text-teal-500 text-sm">Investor Portal</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Connect</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-zinc-600 hover:text-teal-500 text-sm">Twitter / X</a></li>
                <li><a href="#" className="text-zinc-600 hover:text-teal-500 text-sm">LinkedIn</a></li>
                <li><a href="#" className="text-zinc-600 hover:text-teal-500 text-sm">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-zinc-900 flex justify-between items-center">
            <p className="text-zinc-700 text-sm">&copy; 2026 Artifact Virtual (SMC-Private) Limited. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

