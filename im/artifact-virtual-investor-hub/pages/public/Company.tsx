import React from 'react';
import { Link } from 'react-router-dom';
import { COMPANY_DATA } from '../../services/repository';
import { Building2, Target, Eye, Users, Shield, MapPin, Globe, ArrowRight } from 'lucide-react';

export const Company = () => {
  const { scrolled } = useOutletContext<{ scrolled: boolean }>();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono">EST. {COMPANY_DATA.founded}</span>
               <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono">{COMPANY_DATA.registration}</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-6">{COMPANY_DATA.name}</h1>
            
            <div className="mb-10">
              <Link 
                to="/login" 
                className="inline-flex items-center px-8 py-4 bg-white hover:bg-zinc-200 text-zinc-900 text-lg font-bold rounded-xl transition-all shadow-xl shadow-teal-500/10 group"
              >
                Access Investor Portal
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="flex flex-col gap-4 text-zinc-400 text-lg">
              <p className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-teal-500" />
                HQ: {COMPANY_DATA.headquarters}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-3 mb-4">
                <Target className="h-6 w-6 text-teal-500" />
                <h2 className="text-xl font-semibold text-white">Mission</h2>
              </div>
              <p className="text-zinc-400">{COMPANY_DATA.mission}</p>
            </div>
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="h-6 w-6 text-teal-500" />
                <h2 className="text-xl font-semibold text-white">Vision</h2>
              </div>
              <p className="text-zinc-400">{COMPANY_DATA.vision}</p>
            </div>
          </div>

          <div>
             <h2 className="text-2xl font-bold text-white mb-6">Organizational Structure</h2>
             <div className="space-y-4">
               {COMPANY_DATA.divisions.map((div) => (
                 <div key={div.code} className="flex items-center p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors group">
                   <div className="h-12 w-12 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-bold text-teal-500 mr-4 border border-zinc-700 group-hover:border-teal-500/50 transition-colors">
                     {div.code}
                   </div>
                   <div>
                     <h3 className="text-white font-medium text-lg">{div.name}</h3>
                     <p className="text-sm text-zinc-500">{div.focus}</p>
                   </div>
                 </div>
               ))}
             </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Compliance & Security</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="flex items-center gap-3 p-4 border border-zinc-800 rounded-lg">
                 <Shield className="h-5 w-5 text-emerald-500" />
                 <div>
                   <p className="text-white font-medium">SECP Registered</p>
                   <p className="text-xs text-zinc-500">Companies Act 2017</p>
                 </div>
               </div>
               <div className="flex items-center gap-3 p-4 border border-zinc-800 rounded-lg">
                 <Shield className="h-5 w-5 text-emerald-500" />
                 <div>
                   <p className="text-white font-medium">100% GRC Compliance</p>
                   <p className="text-xs text-zinc-500">52 Security Controls</p>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24">
            <h3 className="text-lg font-semibold text-white mb-6">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="p-3 bg-zinc-950 rounded-lg text-center">
                  <p className="text-2xl font-bold text-white">{COMPANY_DATA.stats.products}</p>
                  <p className="text-xs text-zinc-500 uppercase">Products</p>
               </div>
               <div className="p-3 bg-zinc-950 rounded-lg text-center">
                  <p className="text-2xl font-bold text-white">{COMPANY_DATA.stats.projects}</p>
                  <p className="text-xs text-zinc-500 uppercase">Projects</p>
               </div>
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-4">Connect</h3>
            <div className="space-y-4">
               <a href={COMPANY_DATA.social.website} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors">
                 <Globe className="h-5 w-5" /> Website
               </a>
               <a href={COMPANY_DATA.social.github} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors">
                 <Users className="h-5 w-5" /> GitHub Organization
               </a>
            </div>

            <div className="mt-8 pt-8 border-t border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Investor Relations</h3>
              <p className="text-zinc-500 text-sm mb-2">For detailed inquiries:</p>
              <a href={`mailto:${COMPANY_DATA.social.email}`} className="text-teal-400 hover:text-teal-300 text-sm font-medium">{COMPANY_DATA.social.email}</a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};