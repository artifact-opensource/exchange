import React from 'react';

const REPOS = [
  {
    label: 'GitHub',
    sublabel: 'artifact-opensource',
    href: 'https://github.com/artifact-opensource',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
    accent: 'white/20',
    hoverAccent: 'white/80',
  },
  {
    label: 'HuggingFace',
    sublabel: 'amuzetnoM',
    href: 'https://huggingface.co/amuzetnoM',
    icon: (
      <svg viewBox="0 0 240 240" fill="currentColor" className="w-4 h-4">
        <path d="M222.255 100.5c-9.246 0-15.99 7.585-15.99 16.832 0 9.138 6.754 16.77 15.99 16.77 9.227 0 16.745-7.63 16.745-16.77 0-9.246-7.518-16.832-16.745-16.832zm-148.11 62.96v-6.31c0-15.182.1-33.624-.05-47.3-.14-12.19-5.47-17.64-17.19-18.19V82.5c0-4.8-3.89-8.69-8.69-8.69s-8.69 3.89-8.69 8.69v9.18c-12.07.54-16.9 6.09-16.9 17.94v50.76c0 13.8 1.44 26.8-5.47 38.37-6.09 10.24-16.89 15.23-31.77 15.23-4.8 0-8.69 3.89-8.69 8.69s3.89 8.69 8.69 8.69c18.78 0 33.67-5.97 42.77-17.19 8.19-10.13 8.09-23.69 8.09-38.18l.01-5.57h20.28v6.02c0 14.78 1.29 27.64 8.98 39.02 7.69 11.37 20.03 17.43 37.34 17.43 4.8 0 8.69-3.89 8.69-8.69s-3.89-8.69-8.69-8.69c-14.09 0-24.89-4.99-31.97-15.23-6.92-10.03-7.58-21.68-7.58-36.08zm18.57-54.47c-9.23 0-16.75 7.58-16.75 16.83 0 9.14 6.52 16.77 16.75 16.77 9.23 0 16.74-7.63 16.74-16.77 0-9.25-7.51-16.83-16.74-16.83zm77.83 0c-9.23 0-16.74 7.58-16.74 16.83 0 9.14 6.51 16.77 16.74 16.77 9.24 0 16.74-7.63 16.74-16.77 0-9.25-7.5-16.83-16.74-16.83z"/>
      </svg>
    ),
    accent: 'orange-400/20',
    hoverAccent: 'orange-400/80',
  },
] as const;

export default function RepoButtons() {
  return (
    <div className="w-full mt-6 border-t border-white/10 flex flex-col">
      {REPOS.map((repo, idx) => (
        <a
          key={repo.label}
          href={repo.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group block relative w-full border-b border-white/10 hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between py-8 px-2 gap-6">
            <div className="flex items-center gap-6">
              <span className="text-[10px] md:text-[11px] font-mono text-white/20 font-bold">
                {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
              </span>
              <div className="flex items-center gap-3">
                <div className={`opacity-40 group-hover:opacity-100 transition-opacity text-white ${repo.accent.includes('orange') ? 'group-hover:text-orange-400' : ''}`}>
                  {repo.icon}
                </div>
                <div className="flex flex-col">
                  <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none group-hover:translate-x-2 transition-transform duration-500">
                    {repo.label}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 opacity-30 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/40">{repo.sublabel}</span>
                    <div className="w-1 h-1 rounded-full bg-white/40"></div>
                    <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/40">External</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden lg:flex flex-col items-end gap-1 opacity-5 group-hover:opacity-100 transition-opacity">
              <i className="fa-solid fa-arrow-right-long text-xl -rotate-45"></i>
              <span className="text-[7px] font-mono uppercase font-bold tracking-[0.3em]">Open</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-white/40 group-hover:w-full transition-all duration-700"></div>
        </a>
      ))}
    </div>
  );
}
