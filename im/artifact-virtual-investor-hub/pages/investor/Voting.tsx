import React, { useState, useEffect, useMemo } from 'react';
import { PROPOSALS_DATA } from '../../services/mockData';
import { Clock, AlertCircle, Check, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useAuth } from '../../services/authContext';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

export const Voting = () => {
  const { user } = useAuth();
  // Local state to simulate casting a vote
  const [votedProposals, setVotedProposals] = useState<Record<string, string>>({});
  
  // Simulated real-time overall vote counts
  const [liveVotes, setLiveVotes] = useState<Record<string, Record<string, number>>>({});

  // Initialize and simulate live running votes
  useEffect(() => {
    const initialVotes: Record<string, Record<string, number>> = {};
    
    PROPOSALS_DATA.forEach(p => {
      initialVotes[p.id] = {};
      p.options.forEach(opt => {
         // calculate base votes from mock data
         const base = p.votes.filter(v => v.optionId === opt.id).reduce((acc, v) => acc + v.weight, 0);
         // add some random base line for realism if empty
         initialVotes[p.id][opt.id] = base + (p.status === 'active' ? Math.floor(Math.random() * 50000) + 10000 : 0);
      });
    });
    setLiveVotes(initialVotes);

    // Simulate real-time vote streaming intervals
    const interval = setInterval(() => {
       setLiveVotes(prev => {
         const next = { ...prev };
         PROPOSALS_DATA.forEach(p => {
           if (p.status === 'active') {
             next[p.id] = { ...next[p.id] };
             // pick a random option to increment
             const randomOpt = p.options[Math.floor(Math.random() * p.options.length)].id;
             next[p.id][randomOpt] += Math.floor(Math.random() * 500) + 100;
           }
         });
         return next;
       });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleVote = (proposalId: string, optionId: string) => {
    setVotedProposals(prev => ({
      ...prev,
      [proposalId]: optionId
    }));
    
    // Add user's voting weight to live votes instantly
    if (user?.voting_weight) {
      setLiveVotes(prev => ({
        ...prev,
        [proposalId]: {
          ...prev[proposalId],
          [optionId]: (prev[proposalId]?.[optionId] || 0) + user.voting_weight
        }
      }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Governance Proposals</h2>
        <p className="text-zinc-400">Vote on strategic decisions and key resolutions.</p>
      </div>

      <div className="space-y-6">
        {PROPOSALS_DATA.map((proposal) => {
          const userVote = votedProposals[proposal.id];
          const currentProposalVotes = liveVotes[proposal.id] || {};
          const totalVotesSimulated = Object.values(currentProposalVotes).reduce((a, b) => a + b, 0);
          
          // Format data for chart
          const chartData = proposal.options.map(opt => ({
             name: opt.label,
             votes: currentProposalVotes[opt.id] || 0,
             percentage: totalVotesSimulated > 0 
                ? ((currentProposalVotes[opt.id] || 0) / totalVotesSimulated * 100).toFixed(1)
                : 0
          }));
          
          return (
            <div key={proposal.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="p-6 border-b border-zinc-800">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div className="space-y-1 w-full md:w-2/3">
                    <div className="flex items-center gap-2">
                       <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 capitalize">
                         {proposal.category.replace('_', ' ')}
                       </span>
                       {proposal.status === 'active' && (
                         <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                           <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                           Active
                         </span>
                       )}
                    </div>
                    <h3 className="text-xl font-semibold text-white mt-1">{proposal.title}</h3>
                  </div>
                  <div className="flex items-center text-sm text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-md border border-zinc-800 whitespace-nowrap">
                    <Clock className="h-4 w-4 mr-2" />
                    Ends: {new Date(proposal.voting_closes).toLocaleDateString()}
                  </div>
                </div>
                <p className="text-zinc-300 leading-relaxed mb-6">
                  {proposal.description}
                </p>
                
                {/* Real-time Voting Visualization Container */}
                <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-lg p-5 mb-4">
                   <div className="flex items-center justify-between mb-4">
                     <h4 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-teal-400" />
                        Live Voting Progress
                     </h4>
                     <span className="text-xs text-zinc-500 font-mono flex items-center">
                        Total Cast: {totalVotesSimulated.toLocaleString()}
                     </span>
                   </div>
                   
                   <div className="h-40 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                         <XAxis type="number" hide />
                         <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                         <Tooltip 
                            cursor={{ fill: '#27272a', opacity: 0.4 }}
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '0.5rem' }}
                            formatter={(value: number) => [value.toLocaleString(), 'Votes']}
                         />
                         <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={24}>
                           {chartData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Bar>
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                   
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                     {chartData.map((opt, i) => (
                        <div key={opt.name} className="flex flex-col">
                           <div className="flex items-center gap-1.5 mb-1">
                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                             <span className="text-xs text-zinc-400 truncate">{opt.name}</span>
                           </div>
                           <span className="text-sm font-semibold text-zinc-200">{opt.percentage}%</span>
                        </div>
                     ))}
                   </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
                   <div className="flex items-center">
                     <AlertCircle className="h-4 w-4 mr-2" />
                     Quorum required: {(proposal.quorum_required * 100)}%
                   </div>
                </div>
              </div>

              {proposal.status === 'active' && (
                <div className="bg-zinc-950 p-6">
                  {userVote ? (
                    <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-lg p-4 flex items-center justify-center text-emerald-400">
                       <Check className="h-5 w-5 mr-2" />
                       You cast {user?.voting_weight?.toLocaleString() || 0} votes for: <span className="font-bold ml-1">{proposal.options.find(o => o.id === userVote)?.label}</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-zinc-400 mb-2">Cast your vote (Weight: {user?.voting_weight?.toLocaleString() || 0}):</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {proposal.options.map((option, index) => (
                          <button
                            key={option.id}
                            onClick={() => handleVote(proposal.id, option.id)}
                            className="flex flex-col items-center justify-center p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-all group text-center"
                            style={{ 
                              borderTopWidth: '3px',
                              borderTopColor: COLORS[index % COLORS.length] 
                            }}
                          >
                            <span className="text-zinc-300 group-hover:text-white font-medium mb-1">{option.label}</span>
                            <span className="text-xs text-zinc-600 group-hover:text-zinc-400">Select Option</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
