import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Cpu, Globe, ShieldCheck, Database, Zap, LayoutGrid, Flag, Rocket, Server } from 'lucide-react';
import { motion } from 'motion/react';
import { COMPANY_DATA } from '../../services/repository';

export const Home = () => {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-900/50 to-purple-900/50 mix-blend-multiply" />
            <div className="h-full w-full bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-400 text-xs font-medium mb-8">
            <span className="flex h-2 w-2 rounded-full bg-teal-500 mr-2 animate-pulse"></span>
            Vision & Strategy
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8">
            About <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500">Artifact Virtual</span>
          </h1>
          <p className="mt-4 text-xl text-zinc-400 max-w-3xl mx-auto mb-10">
            {COMPANY_DATA.mission} Artifact Virtual builds the AI-native enterprise stack that hyperscalers are too large to specialize in.
          </p>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 bg-zinc-900/50 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Vertical Integration</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">We operate across the entire AI value chain, from physical infrastructure to application layer agents.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-teal-500/50 transition-colors group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Database className="h-24 w-24 text-teal-500" />
               </div>
              <div className="h-12 w-12 rounded-lg bg-teal-500/10 flex items-center justify-center mb-6 group-hover:bg-teal-500/20 transition-colors">
                <Cpu className="h-6 w-6 text-teal-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI Infrastructure</h3>
              <p className="text-zinc-400 mb-4">
                Specialized compute for massive scale vector embeddings.
              </p>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li className="flex items-center"><Zap className="h-3 w-3 mr-2 text-teal-500"/> HEKTOR Vector DB</li>
                <li className="flex items-center"><Zap className="h-3 w-3 mr-2 text-teal-500"/> GPU Cloud & VPS</li>
              </ul>
            </div>
            
            <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-teal-500/50 transition-colors group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <ShieldCheck className="h-24 w-24 text-teal-500" />
               </div>
              <div className="h-12 w-12 rounded-lg bg-teal-500/10 flex items-center justify-center mb-6 group-hover:bg-teal-500/20 transition-colors">
                <LayoutGrid className="h-6 w-6 text-teal-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Enterprise Software</h3>
              <p className="text-zinc-400 mb-4">
                AI-native platforms for operations and finance.
              </p>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li className="flex items-center"><Zap className="h-3 w-3 mr-2 text-teal-500"/> GLADIUS Agent Platform</li>
                <li className="flex items-center"><Zap className="h-3 w-3 mr-2 text-teal-500"/> Artifact ERP</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-teal-500/50 transition-colors group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Globe className="h-24 w-24 text-teal-500" />
               </div>
              <div className="h-12 w-12 rounded-lg bg-teal-500/10 flex items-center justify-center mb-6 group-hover:bg-teal-500/20 transition-colors">
                <Globe className="h-6 w-6 text-teal-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Global Services</h3>
              <p className="text-zinc-400 mb-4">
                Cost-arbitraged specialized AI services from Pakistan.
              </p>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li className="flex items-center"><Zap className="h-3 w-3 mr-2 text-teal-500"/> Managed Hosting</li>
                <li className="flex items-center"><Zap className="h-3 w-3 mr-2 text-teal-500"/> AI/ML Consulting</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Strategic Roadmap */}
      <section className="py-24 relative overflow-hidden">
         <div className="absolute inset-0 z-0">
             <div className="h-full w-full bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
         </div>
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
               <h2 className="text-3xl font-bold text-white mb-4">Strategic Vision</h2>
               <p className="text-zinc-400 max-w-2xl mx-auto">From regional foundation to global singularity. Our roadmap for the next decade.</p>
            </div>

            <div className="relative">
               {/* Connecting Line */}
               <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-800 -translate-y-1/2 hidden md:block"></div>

               <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {/* Phase 1 */}
                  <div className="relative group">
                     <div className="md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 h-4 w-4 bg-zinc-950 border-2 border-teal-500 rounded-full z-20 mb-4 md:mb-0"></div>
                     <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl hover:border-teal-500/30 transition-all h-full flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 mb-4">
                           <Flag className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Foundation</h3>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">2025 - 2026</p>
                        <p className="text-sm text-zinc-400">Establishment of legal frameworks, physical infrastructure, and core technology platforms.</p>
                     </div>
                  </div>

                  {/* Phase 2 */}
                   <div className="relative group">
                     <div className="md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 h-4 w-4 bg-zinc-950 border-2 border-zinc-700 group-hover:border-teal-500 rounded-full z-20 mb-4 md:mb-0 transition-colors"></div>
                     <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl hover:border-teal-500/30 transition-all h-full flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-teal-500 group-hover:bg-teal-500/10 transition-colors mb-4">
                           <Server className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Operational Scale</h3>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">2026 - 2027</p>
                        <p className="text-sm text-zinc-400">Launch of specialized AI hosting services and enterprise software suite in regional markets.</p>
                     </div>
                  </div>

                  {/* Phase 3 */}
                   <div className="relative group">
                     <div className="md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 h-4 w-4 bg-zinc-950 border-2 border-zinc-700 group-hover:border-teal-500 rounded-full z-20 mb-4 md:mb-0 transition-colors"></div>
                     <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl hover:border-teal-500/30 transition-all h-full flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-teal-500 group-hover:bg-teal-500/10 transition-colors mb-4">
                           <Globe className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Global Expansion</h3>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">2027 - 2029</p>
                        <p className="text-sm text-zinc-400">Deployment of global SaaS platform and distributed compute network across US & EU.</p>
                     </div>
                  </div>

                  {/* Phase 4 */}
                   <div className="relative group">
                     <div className="md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 h-4 w-4 bg-zinc-950 border-2 border-zinc-700 group-hover:border-teal-500 rounded-full z-20 mb-4 md:mb-0 transition-colors"></div>
                     <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl hover:border-teal-500/30 transition-all h-full flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-teal-500 group-hover:bg-teal-500/10 transition-colors mb-4">
                           <Rocket className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Market Leadership</h3>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">2030+</p>
                        <p className="text-sm text-zinc-400">Dominance in specialized AI infrastructure and fully autonomous enterprise agents.</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Invest in the Future of Intelligence</h2>
          <p className="text-zinc-400 mb-8">
            Access our private investor portal to view detailed financials (5-year projections), track your portfolio, and participate in governance voting.
          </p>
          <Link to="/login" className="inline-flex items-center text-teal-400 font-semibold hover:text-teal-300 transition-colors">
            Access Investor Portal <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};