import React, { useState } from 'react';
import { INVESTOR_ROADMAP_DATA } from '../../services/repository';
import { ChevronDown, ChevronUp, CheckCircle2, Circle, Clock, GitCommit, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export const Roadmap = () => {
  const [expandedId, setExpandedId] = useState<string | null>(INVESTOR_ROADMAP_DATA[0].id);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'in-progress': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-zinc-500 bg-zinc-800/50 border-zinc-700';
    }
  };

  const getCategoryColor = (category: string) => {
    switch(category) {
        case 'Regulatory': return 'text-blue-400';
        case 'Product': return 'text-purple-400';
        case 'Infrastructure': return 'text-orange-400';
        default: return 'text-zinc-400';
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Execution Roadmap</h2>
        <p className="text-zinc-400">Detailed milestones, task dependencies, and quarterly goals.</p>
      </div>

      <div className="space-y-4">
        {INVESTOR_ROADMAP_DATA.map((milestone) => {
          const isExpanded = expandedId === milestone.id;
          const statusStyle = getStatusColor(milestone.status);

          return (
            <div 
                key={milestone.id} 
                className={clsx(
                    "bg-zinc-900 rounded-xl border transition-all duration-300 overflow-hidden",
                    isExpanded ? "border-teal-500/30 shadow-lg shadow-teal-900/10" : "border-zinc-800 hover:border-zinc-700"
                )}
            >
              <button 
                onClick={() => toggleExpand(milestone.id)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <div className="flex items-center gap-6">
                    <div className={clsx(
                        "flex flex-col items-center justify-center h-14 w-14 rounded-lg border text-xs font-bold font-mono",
                        isExpanded ? "bg-teal-500 text-black border-teal-400" : "bg-zinc-950 text-zinc-500 border-zinc-800"
                    )}>
                        <span className="opacity-80">{milestone.quarter.split(' ')[0]}</span>
                        <span>{milestone.quarter.split(' ')[1]}</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className={clsx("text-lg font-semibold", isExpanded ? "text-white" : "text-zinc-200")}>
                                {milestone.title}
                            </h3>
                            <span className={clsx("px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border", statusStyle)}>
                                {milestone.status}
                            </span>
                        </div>
                        <p className="text-sm text-zinc-400">{milestone.description}</p>
                    </div>
                </div>
                {isExpanded ? <ChevronUp className="h-5 w-5 text-zinc-500" /> : <ChevronDown className="h-5 w-5 text-zinc-500" />}
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 pt-0 border-t border-zinc-800/50 bg-zinc-950/30">
                   <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Tasks */}
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center">
                                <GitCommit className="h-4 w-4 mr-2" /> Critical Tasks
                            </h4>
                            <div className="space-y-3">
                                {milestone.tasks.map(task => (
                                    <div key={task.id} className="flex items-start gap-3 p-3 bg-zinc-900/80 rounded-lg border border-zinc-800">
                                        {task.status === 'completed' ? (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                        ) : task.status === 'in-progress' ? (
                                            <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                        ) : (
                                            <Circle className="h-5 w-5 text-zinc-600 flex-shrink-0" />
                                        )}
                                        <span className={clsx("text-sm", task.status === 'completed' ? "text-zinc-500 line-through" : "text-zinc-300")}>
                                            {task.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Category</h4>
                                <span className={clsx("text-sm font-medium", getCategoryColor(milestone.category))}>
                                    {milestone.category}
                                </span>
                            </div>
                            
                            <div>
                                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" /> Dependencies
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {milestone.dependencies.map((dep, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs rounded border border-zinc-700">
                                            {dep}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};