import React from 'react';
import { FINANCIAL_DATA } from '../../services/repository';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';

export const Analytics = () => {
  return (
    <div className="space-y-12">
       <div className="flex justify-between items-end border-b border-zinc-800 pb-6">
         <div>
            <h2 className="text-2xl font-bold text-white">Business Intelligence</h2>
            <p className="text-zinc-400">Confidential financial projections and market analysis.</p>
         </div>
         <span className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 text-xs rounded-full animate-pulse font-medium tracking-wider">
           CONFIDENTIAL: INTERNAL
         </span>
       </div>

       {/* Financial Projections */}
       <section>
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-semibold text-white">5-Year Revenue Projections (USD Millions)</h3>
          </div>
          <div className="h-[400px] bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-900/5 to-purple-900/5 pointer-events-none" />
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={FINANCIAL_DATA.projections} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBull" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="year" stroke="#71717a" tick={{fill: '#a1a1aa'}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#71717a" tick={{fill: '#a1a1aa'}} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}M`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                    itemStyle={{ color: '#e4e4e7' }}
                    cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
                  <Area type="monotone" dataKey="revenue_bull" stroke="#14b8a6" strokeWidth={2} fillOpacity={1} fill="url(#colorBull)" name="Bull Case" activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="revenue_base" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorBase)" name="Base Case" activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="revenue_bear" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" fill="transparent" name="Bear Case" />
               </AreaChart>
            </ResponsiveContainer>
          </div>
       </section>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Market Analysis */}
          <section className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 flex flex-col shadow-lg">
             <h3 className="text-lg font-semibold text-white mb-6">Market Opportunity (TAM/SAM/SOM)</h3>
             <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={FINANCIAL_DATA.market} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                      <XAxis type="number" stroke="#71717a" hide />
                      <YAxis dataKey="name" type="category" stroke="#e4e4e7" width={140} tick={{fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                        cursor={{fill: '#27272a'}}
                        formatter={(value: number) => [`$${value.toLocaleString()}M`, 'Value']}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                        {FINANCIAL_DATA.market.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
             </div>
             <div className="mt-4 pt-4 border-t border-zinc-800">
               <div className="flex justify-between text-xs text-zinc-500">
                 <span>TAM: Global AI Infra</span>
                 <span className="text-teal-500 font-mono">$135.8B</span>
               </div>
               <div className="flex justify-between text-xs text-zinc-500 mt-1">
                 <span>SAM: Target Segments</span>
                 <span className="text-teal-600 font-mono">$10B</span>
               </div>
               <div className="flex justify-between text-xs text-zinc-500 mt-1">
                 <span>SOM: Obtainable (Y5)</span>
                 <span className="text-teal-700 font-mono">$250M</span>
               </div>
             </div>
          </section>

          {/* Use of Funds */}
          <section className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 flex flex-col shadow-lg">
             <h3 className="text-lg font-semibold text-white mb-6">Pre-Seed Use of Funds</h3>
             <div className="flex-1 min-h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                        data={FINANCIAL_DATA.useOfFunds}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {FINANCIAL_DATA.useOfFunds.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                   </PieChart>
                </ResponsiveContainer>
             </div>
             <p className="text-center text-xs text-zinc-500 mt-2">Total Round Size: $500K - $1M</p>
          </section>
       </div>

       {/* Key Metrics Table */}
       <section>
         <h3 className="text-xl font-semibold text-white mb-4">Financial Benchmarks</h3>
         <div className="overflow-x-auto bg-zinc-900 rounded-xl border border-zinc-800 shadow-lg">
           <table className="w-full text-sm text-left">
             <thead className="bg-zinc-950 text-zinc-400 uppercase font-medium text-xs tracking-wider">
               <tr>
                 <th className="px-6 py-4">Metric</th>
                 <th className="px-6 py-4">Year 1 (2026)</th>
                 <th className="px-6 py-4">Year 3 (2028)</th>
                 <th className="px-6 py-4">Year 5 (2030)</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-800">
               <tr className="hover:bg-zinc-800/30 transition-colors">
                 <td className="px-6 py-4 font-medium text-white">Gross Margin</td>
                 <td className="px-6 py-4 text-zinc-300">70-83%</td>
                 <td className="px-6 py-4 text-zinc-300">80-85%</td>
                 <td className="px-6 py-4 text-emerald-400 font-medium">82-85%</td>
               </tr>
               <tr className="hover:bg-zinc-800/30 transition-colors">
                 <td className="px-6 py-4 font-medium text-white">EBITDA Margin</td>
                 <td className="px-6 py-4 text-zinc-300">22-37%</td>
                 <td className="px-6 py-4 text-zinc-300">46-51%</td>
                 <td className="px-6 py-4 text-emerald-400 font-medium">53-63%</td>
               </tr>
               <tr className="hover:bg-zinc-800/30 transition-colors">
                 <td className="px-6 py-4 font-medium text-white">Headcount</td>
                 <td className="px-6 py-4 text-zinc-300">19-30</td>
                 <td className="px-6 py-4 text-zinc-300">73-132</td>
                 <td className="px-6 py-4 text-zinc-300">255-500</td>
               </tr>
               <tr className="hover:bg-zinc-800/30 transition-colors">
                 <td className="px-6 py-4 font-medium text-white">LTV/CAC Ratio</td>
                 <td className="px-6 py-4 text-zinc-300">10-40x</td>
                 <td className="px-6 py-4 text-zinc-300">15-50x</td>
                 <td className="px-6 py-4 text-emerald-400 font-medium">20-65x</td>
               </tr>
             </tbody>
           </table>
         </div>
       </section>
    </div>
  );
};