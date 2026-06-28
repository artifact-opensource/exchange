import React, { useEffect, useState } from 'react';
import { GitHubRepo } from '../types';
import { fetchTrendingRepositories } from '../services/githubService';

const GitHubFeed: React.FC = () => {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchTrendingRepositories(); 
      setRepos(data);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        <span className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-widest">Accessing Network Nodes...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {repos.length > 0 ? (
        repos.map((repo) => (
          <a 
            key={repo.id}
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative bg-white/[0.02] border border-white/5 p-5 rounded-lg transition-all hover:bg-white/[0.05] hover:border-cyan-500/30 hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 group-hover:text-cyan-400 transition-all">
              <i className="fa-brands fa-github text-xl"></i>
            </div>
            
            <div className="space-y-2 text-left">
              <h3 className="text-white/90 font-mono font-bold tracking-tight text-base group-hover:text-cyan-400 transition-colors truncate uppercase">
                {repo.name}
              </h3>
              <p className="text-white/30 text-[11px] font-mono line-clamp-2 min-h-[2.5rem] leading-relaxed">
                {repo.description || "NO_DATA_DESCRIPTION_MISSING"}
              </p>
              
              <div className="flex items-center gap-4 pt-2 text-[9px] font-mono uppercase tracking-widest font-bold text-white/20">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/50"></span>
                  {repo.language || 'DATA'}
                </span>
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-star text-amber-500/50"></i>
                  {repo.stargazers_count.toLocaleString()}
                </span>
              </div>
            </div>
            
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          </a>
        ))
      ) : (
        <div className="col-span-full text-center py-12 text-white/20 font-mono text-xs uppercase tracking-widest italic">
          [!] NO_TRENDING_ARTIFACTS_FOUND_IN_SECTOR
        </div>
      )}
    </div>
  );
};

export default GitHubFeed;