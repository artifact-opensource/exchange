'use client';

import React, { useMemo } from 'react';
import { IndexedResearchItem } from '@/lib/research-index';
import { CATEGORY_LABELS } from '@/lib/research-data';

interface SemanticLinkViewProps {
  items: IndexedResearchItem[];
  onNodeClick: (item: IndexedResearchItem) => void;
  selectedId?: string | null;
}

/* Clean, professional semantic-link layout — no graphics, pure typography */
export default function SemanticLinkView({ items, onNodeClick, selectedId }: SemanticLinkViewProps) {
  const groups = useMemo(() => {
    const map: Record<string, IndexedResearchItem[]> = {};
    for (const item of items) {
      const cat = item.category || 'Uncategorized';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    }
    return map;
  }, [items]);

  return (
    <div className="w-full h-full overflow-y-auto px-4 sm:px-6 py-5 bg-[#030712]">
      {/* Header */}
      <div className="mb-6 border-b border-white/10 pb-4">
        <h2 className="text-base font-mono font-bold text-white tracking-wide">RESEARCH INDEX · {items.length} PAPERS</h2>
        <p className="text-[11px] text-white/40 font-mono mt-1">Semantically categorized · linked by source, CID, and domain</p>
      </div>

      {/* Groups */}
      <div className="space-y-8">
        {Object.entries(groups).map(([category, papers]) => (
          <section key={category}>
            <div className="flex items-baseline gap-3 mb-3">
              <h3 className="text-sm font-mono font-bold text-white/90 tracking-widest">{CATEGORY_LABELS[category as any] || category}</h3>
              <span className="text-[10px] text-white/30 font-mono">{papers.length}</span>
            </div>
            <div className="border-l border-white/10 pl-3 space-y-2">
              {papers.map(paper => {
                const isSelected = paper.id === selectedId;
                return (
                  <button
                    key={paper.id}
                    onClick={() => onNodeClick(paper)}
                    className={`w-full text-left px-3 py-2.5 rounded transition-colors ${
                      isSelected ? 'bg-white/[0.07] border border-white/10' : 'hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-medium text-white/90 leading-snug truncate">{paper.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-white/35 font-mono">
                          <span className="uppercase tracking-wide">{paper.source || 'local'}</span>
                          {paper.cid && <span className="text-blue-400/60 truncate max-w-[120px]">IPFS</span>}
                          <span>· {paper.importance || '-'}/10</span>
                        </div>
                      </div>
                      {isSelected && <span className="text-[9px] text-emerald-400 font-mono shrink-0">SELECTED</span>}
                    </div>
                    {/* Semantic tags */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {paper.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/40 font-mono border border-white/[0.06]">{tag}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
