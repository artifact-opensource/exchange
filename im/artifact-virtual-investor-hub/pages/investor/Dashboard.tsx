import React from 'react';
import { useAuth } from '../../services/authContext';
import { INVESTMENTS_DATA, PROPOSALS_DATA } from '../../services/mockData';
import { TrendingUp, DollarSign, Vote, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StockDashboardWidget } from '../../components/StockDashboardWidget';

export const Dashboard = () => {
  const { user } = useAuth();

  // Calculate totals
  const totalInvestment = INVESTMENTS_DATA.reduce((acc, curr) => acc + curr.amount_usd, 0);
  const activeProposals = PROPOSALS_DATA.filter(p => p.status === 'active').length;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Welcome back, {user?.name.split(' ')[0]}</h2>
          <p className="text-zinc-400">Here's your investment overview for today.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Download Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 text-sm font-medium">Total Invested</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">${totalInvestment.toLocaleString()}</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-emerald-500 flex items-center">
              <ArrowUpRight className="h-3 w-3 mr-1" /> +12.5%
            </span>
            <span className="text-zinc-500 ml-2">vs last quarter</span>
          </div>
        </div>

        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 text-sm font-medium">Equity Value (Est.)</h3>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">$4.2M</p>
           <div className="mt-2 flex items-center text-sm">
            <span className="text-zinc-500">Based on last round valuation</span>
          </div>
        </div>

        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 text-sm font-medium">Active Votes</h3>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Vote className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{activeProposals}</p>
          <div className="mt-2">
            {activeProposals > 0 ? (
               <Link to="/investor/voting" className="text-sm text-purple-400 hover:text-purple-300 font-medium">
                 Action Required &rarr;
               </Link>
            ) : (
              <span className="text-zinc-500 text-sm">All caught up</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StockDashboardWidget />
      </div>

      {/* Recent Activity / Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h3 className="text-white font-semibold">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-950/50 text-zinc-400 uppercase font-medium">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Round</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {INVESTMENTS_DATA.map((inv) => (
                <tr key={inv.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 text-zinc-300">{inv.date}</td>
                  <td className="px-6 py-4 text-white font-medium capitalize">{inv.type}</td>
                  <td className="px-6 py-4 text-zinc-400 capitalize">{inv.round}</td>
                  <td className="px-6 py-4 text-right text-white font-mono">${inv.amount_usd.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
