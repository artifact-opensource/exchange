import React, { useEffect, useState } from 'react';
import { GitHubRepo } from '../types';
import { fetchRepoDetails } from '../services/githubService';
import ProjectView from './ProjectView';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Database, GitBranch, Radio, RefreshCw } from 'lucide-react';

interface ProjectCatalogueProps { repoPaths: string[]; accentColor?: string; }

const ProjectCatalogue: React.FC<ProjectCatalogueProps> = ({ repoPaths, accentColor = '#ffffff' }) => {
  const [repos, setRepos] = useState<(GitHubRepo & { isFallback?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<{ path: string; details: GitHubRepo | null } | null>(null);
  const [syncVersion, setSyncVersion] = useState(0);

  const loadRepos = async () => {
    const normalized = [...new Set(repoPaths.map((path) => path.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').split('?')[0].split('/').slice(0, 2).join('/')).filter((path) => path.includes('/')))].slice(0, 12);
    setLoading(true);
    const results = await Promise.all(normalized.map(async (path) => {
      const detail = await fetchRepoDetails(path);
      if (detail) return detail;
      const repoName = path.split('/')[1] || path;
      return { id: `offline-${path}`, name: repoName, description: 'Repository manifest is temporarily unavailable. Retry sync to reconnect this node.', html_url: `https://github.com/${path}`, stargazers_count: 0, language: 'SYNC_PENDING', isFallback: true, full_name: path } as any;
    }));
    setRepos(results); setLoading(false);
  };

  useEffect(() => { loadRepos(); }, [repoPaths, syncVersion]);

  return <section className="ml-catalogue relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/45 p-4 md:p-8">
    <div className="ml-art" aria-hidden="true"><div className="ml-art-orbit orbit-one" /><div className="ml-art-orbit orbit-two" /><div className="ml-art-core" /><div className="ml-art-label">ARTIFACT / ML</div></div>
    <div className="relative z-10 mb-8 flex flex-col justify-between gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.32em] text-cyan-100/60"><Radio size={12} className="animate-pulse" /> live intelligence layer</div><h2 className="max-w-xl text-3xl font-semibold tracking-[-0.06em] text-white md:text-5xl">Machine intelligence, made inspectable.</h2><p className="mt-3 max-w-lg font-mono text-[10px] uppercase leading-6 tracking-[0.16em] text-white/40">A living catalogue of the research, models, and public experiments behind the Artifact network.</p></div><button onClick={() => setSyncVersion((v) => v + 1)} className="inline-flex items-center gap-2 self-start rounded-full border border-cyan-200/20 bg-cyan-100/5 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-100/75 transition hover:bg-cyan-100/15"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> {loading ? 'syncing' : 'refresh nodes'}</button></div>
    <div className="relative z-10 mb-5 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35"><Database size={13} /> {loading ? 'establishing github relay' : `${repos.length} nodes resolved`}<span className="ml-auto text-emerald-200/60">PAT relay active</span></div>
    {loading ? <div className="flex min-h-52 items-center justify-center"><div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-100/50"><RefreshCw size={15} className="animate-spin" /> resolving repository manifests</div></div> : <div className="relative z-10 grid gap-3 md:grid-cols-2">{repos.length ? repos.map((repo, index) => <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} key={repo.id || index} onClick={() => setSelectedRepo({ path: repo.full_name || repoPaths[index], details: repo.isFallback ? null : repo })} className="group flex min-h-44 flex-col justify-between rounded-2xl border border-white/10 bg-black/30 p-5 text-left transition duration-500 hover:-translate-y-1 hover:border-cyan-200/30 hover:bg-cyan-100/[0.06]"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-white/35"><GitBranch size={13} /> {repo.isFallback ? 'relay pending' : 'verified node'}</div><ArrowUpRight size={16} className="text-white/25 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-cyan-100" /></div><div><h3 className="mt-7 break-words text-2xl font-semibold tracking-[-0.05em] text-white">{repo.name}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-white/45">{repo.description}</p></div><div className="mt-5 flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.18em] text-white/30"><span>{repo.language || 'artifact'}</span><span className="size-1 rounded-full bg-cyan-200/60" /><span>{repo.stargazers_count || 0} signals</span></div></motion.button>) : <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-10 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">No active ML nodes in this sector</div>}</div>}
    <AnimatePresence>{selectedRepo && <ProjectView repoPath={selectedRepo.path} repoDetails={selectedRepo.details} accentColor={accentColor} onClose={() => setSelectedRepo(null)} />}</AnimatePresence>
  </section>;
};
export default ProjectCatalogue;
