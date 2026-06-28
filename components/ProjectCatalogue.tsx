import React, { useEffect, useState } from 'react';
import { GitHubRepo } from '../types';
import { fetchRepoDetails } from '../services/githubService';
import ProjectView from './ProjectView';
import { AnimatePresence } from 'motion/react';

interface ProjectCatalogueProps {
  repoPaths: string[];
  accentColor?: string;
}

const ProjectCatalogue: React.FC<ProjectCatalogueProps> = ({ repoPaths, accentColor = '#ffffff' }) => {
  const [repos, setRepos] = useState<(GitHubRepo & { isFallback?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<{ path: string, details: GitHubRepo | null } | null>(null);

  useEffect(() => {
    const loadRepos = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(repoPaths.map(async (path) => {
          const detail = await fetchRepoDetails(path);
          if (detail) return detail;
          
          const repoName = path.split('/')[1] || path;
          return {
            id: Math.random(),
            name: repoName,
            description: "CONNECTION_INTERRUPTED: Repository manifest unavailable. Node may be restricted or offline.",
            html_url: `https://github.com/${path}`,
            stargazers_count: 0,
            language: "SYNC_OFFLINE",
            isFallback: true,
            full_name: path
          } as any;
        }));
        
        setRepos(results);
      } catch (e) {
        console.error("Catalogue sync failed", e);
      }
      setLoading(false);
    };
    loadRepos();
  }, [repoPaths]);

  if (loading) {
    return (
      <div className="flex items-center gap-4 py-12 md:py-20">
        <div className="w-8 h-[1px] bg-white/20 animate-pulse"></div>
        <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest animate-pulse">SYNCING_NETWORK_NODES...</span>
      </div>
    );
  }

  return (
    <div className="w-full mt-6 border-t border-white/10">
      <AnimatePresence>
        {selectedRepo && (
          <ProjectView 
            repoPath={selectedRepo.path}
            repoDetails={selectedRepo.details}
            accentColor={accentColor}
            onClose={() => setSelectedRepo(null)}
          />
        )}
      </AnimatePresence>

      {repos.length > 0 ? repos.map((repo, idx) => (
        <div 
          key={repo.id || idx}
          onClick={() => setSelectedRepo({ path: repo.full_name || repoPaths[idx], details: repo.isFallback ? null : repo })}
          className="group block relative w-full border-b border-white/10 hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between py-8 md:py-12 px-2 md:px-0 gap-6">
            <div className="flex items-center gap-6 md:gap-16">
              <span className="text-[10px] md:text-[11px] font-mono text-white/20 font-bold">
                {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-3 min-w-0">
                  <h3 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none group-hover:translate-x-2 md:group-hover:translate-x-4 transition-transform duration-500 break-all">
                    {repo.name}
                  </h3>
                  {repo.isFallback && (
                    <span className="text-[7px] border border-white/20 text-white/40 px-1 py-0.5 rounded font-mono uppercase tracking-tighter shrink-0">
                      Limited
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 opacity-30 group-hover:opacity-100 transition-opacity">
                   <span className="text-[8px] font-mono uppercase tracking-[0.2em]">{repo.language || 'ARTIFACT'}</span>
                   <div className="w-1 h-1 rounded-full bg-white/40"></div>
                   <span className="text-[8px] font-mono uppercase tracking-[0.2em]">{repo.stargazers_count} NODES</span>
                </div>
              </div>
            </div>

            <div className="md:max-w-sm lg:max-w-md">
              <p className="text-[10px] md:text-[11px] font-medium uppercase tracking-tight text-white/30 leading-snug group-hover:text-white/70 transition-colors">
                {repo.description || "Technical documentation for this node is currently encrypted or pending public clearance."}
              </p>
            </div>

            <div className="hidden lg:flex flex-col items-end gap-1 opacity-5 group-hover:opacity-100 transition-opacity">
               <i className="fa-solid fa-arrow-right-long text-xl -rotate-45"></i>
               <span className="text-[7px] font-mono uppercase font-bold tracking-[0.3em]">EXPLORE</span>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-white/40 group-hover:w-full transition-all duration-700"></div>
        </div>
      )) : (
        <div className="py-20 text-center">
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest italic">
            [!] NO_ACTIVE_NODES_IN_SECTOR
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectCatalogue;
