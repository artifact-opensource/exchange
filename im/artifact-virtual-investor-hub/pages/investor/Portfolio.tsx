import React from 'react';
import { INVESTMENTS_DATA } from '../../services/mockData';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export const Portfolio = () => {
  const data = INVESTMENTS_DATA.map(inv => ({
    name: inv.round,
    value: inv.amount_usd
  }));
  const COLORS = ['#14b8a6', '#0f766e', '#0d9488'];

  return (
    <div className="space-y-8">
        <div>
            <h2 className="text-2xl font-bold text-white">Investment Portfolio</h2>
            <p className="text-zinc-400">Your holdings and allocation.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Allocation by Round</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} />
                    </PieChart>
                </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Certificates</h3>
              <div className="space-y-3">
                 <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <div>
                        <p className="text-white font-medium">SAFE Agreement - Pre-Seed</p>
                        <p className="text-zinc-500 text-xs">Signed Jan 15, 2026</p>
                    </div>
                    <button className="text-sm text-teal-400 hover:underline">View PDF</button>
                 </div>
                 <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <div>
                        <p className="text-white font-medium">Token Warrant - Seed</p>
                        <p className="text-zinc-500 text-xs">Signed Mar 10, 2026</p>
                    </div>
                    <button className="text-sm text-teal-400 hover:underline">View PDF</button>
                 </div>
              </div>
           </div>
        </div>
    </div>
  );
};
