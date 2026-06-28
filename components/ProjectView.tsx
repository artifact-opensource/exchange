import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Code, Folder, File, ArrowLeft, ExternalLink, Cpu, Globe, Database } from 'lucide-react';
import { GitHubRepo, GitHubContent } from '../types';
import { fetchRepoContents } from '../services/githubService';
import { simulateRepoStructure } from '../services/geminiService';

interface ProjectViewProps {
  repoPath: string;
  repoDetails: GitHubRepo | null;
  accentColor: string;
  onClose: () => void;
}

export default function ProjectView({ repoPath, repoDetails, accentColor, onClose }: ProjectViewProps) {
  const [contents, setContents] = useState<GitHubContent[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const loadContents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchRepoContents(repoPath, currentPath);
        if (data.length === 0 && currentPath === '') {
          // If no contents and we're at root, it's likely an error (unless repo is truly empty)
          // But our fetchRepoContents returns [] on error too
          setError("REPOS_OFFLINE: Connection to node lost or permission denied.");
        }
        setContents(data);
      } catch (err) {
        setError("NODE_FAILURE: Failed to synchronize with remote repository.");
      } finally {
        setIsLoading(false);
      }
    };
    loadContents();
  }, [repoPath, currentPath]);

  const handleFolderClick = (path: string) => {
    setCurrentPath(path);
  };

  const goBack = () => {
    if (currentPath === '') return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    setError(null);
    const mockData = await simulateRepoStructure(repoPath.split('/')[1], repoDetails?.description || "A technical infrastructure project.");
    if (mockData && mockData.length > 0) {
      setContents(mockData);
      setError(null);
    } else {
      setError("SIMULATION_FAILED: Neural bridge unstable.");
    }
    setIsSimulating(false);
  };

  const modalContent = (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 pointer-events-none"
    >
      <div className="w-full h-full max-w-6xl bg-[#080808]/95 border border-white/10 backdrop-blur-3xl rounded-xl overflow-hidden flex flex-col pointer-events-auto shadow-[0_0_100px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <header className="p-4 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02] gap-4">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/50 hover:text-white shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-lg md:text-2xl font-bold tracking-tight text-white uppercase italic truncate">
                {repoDetails?.name || repoPath.split('/')[1]}
              </h2>
              <p className="text-[10px] md:text-xs font-mono text-white/30 uppercase tracking-widest mt-1 truncate">
                SYSTEM_NODE // {repoPath}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-3 shrink-0">
            <a 
              href={repoDetails?.html_url} 
              target="_blank" 
              rel="noreferrer"
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/50 hover:text-white"
            >
              <Code className="w-5 h-5" />
            </a>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row">
          {/* Metadata Panel */}
          <div className="w-full md:w-80 p-4 md:p-8 border-b md:border-b-0 md:border-r border-white/5 space-y-6 md:space-y-8 bg-black/20 shrink-0 md:overflow-y-auto">
            <div>
              <h3 className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] mb-4">Description</h3>
              <p className="text-sm text-white/60 leading-relaxed font-light">
                {repoDetails?.description || "Initializing architectural overview... No metadata provided in repository manifest."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <h4 className="text-[9px] font-mono text-white/20 uppercase tracking-wider">Language</h4>
                <p className="text-xs font-bold text-white/80">{repoDetails?.language || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-[9px] font-mono text-white/20 uppercase tracking-wider">Stars</h4>
                <p className="text-xs font-bold text-white/80">{repoDetails?.stargazers_count || 0}</p>
              </div>
            </div>

            <div className="pt-8">
              <h3 className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] mb-4">Neural Analysis</h3>
              <div className="space-y-3">
                {[
                  { icon: Cpu, label: "Core Processing", value: "98.4%" },
                  { icon: Globe, label: "Global Sync", value: "Active" },
                  { icon: Database, label: "Ledger State", value: "Immutable" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className="w-3 h-3 text-white/40" />
                      <span className="text-[10px] text-white/40 uppercase">{item.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/80">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Explorer Panel */}
          <div className="flex-1 flex flex-col bg-[#050505] min-h-[400px] md:min-h-0 shrink-0 md:shrink">
            <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-mono text-white/40 overflow-x-auto whitespace-nowrap scrollbar-hide flex-1">
                <span className="hover:text-white cursor-pointer shrink-0" onClick={() => setCurrentPath('')}>root</span>
                {currentPath.split('/').filter(p => p).map((part, i, arr) => (
                  <React.Fragment key={i}>
                    <span className="shrink-0">/</span>
                    <span 
                      className="hover:text-white cursor-pointer shrink-0"
                      onClick={() => handleFolderClick(arr.slice(0, i + 1).join('/'))}
                    >
                      {part}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              {currentPath !== '' && (
                <button 
                  onClick={goBack}
                  className="text-[10px] font-mono text-white/20 hover:text-white transition-colors shrink-0"
                >
                  UP_DIR [..]
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin"></div>
                </div>
              ) : error ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 border border-white/10 flex items-center justify-center mb-6 opacity-20">
                    <Code className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-mono text-white/40 uppercase tracking-[0.2em] mb-2">Sync Error</h4>
                  <p className="text-xs text-white/20 font-mono mb-8 max-w-md uppercase leading-relaxed">
                    {error}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => {
                        setCurrentPath('');
                      }}
                      className="px-6 py-2 border border-white/10 text-[10px] font-mono text-white/40 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest"
                    >
                      Retry_Link
                    </button>
                    <button 
                      onClick={handleSimulate}
                      disabled={isSimulating}
                      className="px-6 py-2 bg-white/5 border border-white/20 text-[10px] font-mono text-white hover:bg-white/10 transition-all uppercase tracking-widest flex items-center gap-2"
                    >
                      {isSimulating ? (
                        <>
                          <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin"></div>
                          Simulating...
                        </>
                      ) : (
                        <>
                          <Cpu className="w-3 h-3" />
                          Simulate_Node [AI]
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {contents.map((item, i) => (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => item.type === 'dir' ? handleFolderClick(item.path) : null}
                      className={`group flex items-center gap-3 p-3 rounded hover:bg-white/[0.03] transition-all ${item.type === 'dir' ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
                    >
                      {item.type === 'dir' ? (
                        <Folder className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                      ) : (
                        <File className="w-4 h-4 text-white/20" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/80 truncate font-mono tracking-tight group-hover:text-white transition-colors">
                          {item.name}
                        </p>
                        <p className="text-[8px] font-mono text-white/10 uppercase tracking-widest mt-0.5">
                          {item.type === 'dir' ? 'DIR_NODE' : `FILE_SPEC // ${(item.size / 1024).toFixed(1)} KB`}
                        </p>
                      </div>
                      {item.download_url && (
                        <a 
                          href={item.download_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded transition-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3 text-white/40" />
                        </a>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <footer className="px-6 py-3 border-t border-white/5 bg-black/40 flex justify-between items-center">
          <div className="flex items-center gap-4 text-[9px] font-mono text-white/20 uppercase tracking-[0.2em]">
            <p>SYNC_STATUS: ENCRYPTED</p>
            <p className="hidden md:block">NODE_ID: {Math.random().toString(16).slice(2, 10).toUpperCase()}</p>
          </div>
          <div className="text-[9px] font-mono text-white/20 italic">
            v2.4.0-STABLE
          </div>
        </footer>
      </div>
    </motion.div>
  );

  return createPortal(modalContent, document.body);
}
