'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { RESEARCH_CATALOG, CATEGORY_LABELS, ResearchCategory } from '@/lib/research-data'
import { initDB, buildFullIndex, search as searchIndex, getRelated, IndexedResearchItem } from '@/lib/research-index'

const CATEGORY_ORDER: ResearchCategory[] = [
  'Transformers/Architecture', 'AI/ML', 'Consciousness/Philosophy',
  'Blockchain/Governance', 'Tokenomics', 'Security', 'Uncategorized',
]

function cleanMarkdown(text: string) {
  let t = text.trim()
  if (t.trimStart().startsWith('---')) {
    const end = t.indexOf('\n---', 3)
    if (end !== -1) t = t.slice(end + 4).trimStart()
  }
  t = t.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n')
  return t
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .trim()
}

/* ── Slide-out paper view ─────────────────────────────────────────────── */
function PaperSlide({ item, onClose }: { item: IndexedResearchItem; onClose: () => void }) {
  const [data, setData] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setData(null); setLoading(true)
    const basename = item.localPath ? item.localPath.split('/').pop() || '' : ''
    const url = basename ? `/papers/consolidated/${basename}` : ''
    if (!url) { setLoading(false); return }
    fetch(url).then(r => r.ok ? r.text() : Promise.reject()).then(t => { setData(t); setLoading(false) }).catch(() => { setData(null); setLoading(false) })
  }, [item.id])

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 z-[60] bg-[#030712]/95 backdrop-blur-md flex flex-col md:ml-auto md:w-[42rem] lg:w-[50rem] md:border-l md:border-white/10 shadow-2xl"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0 bg-[#030712]/90">
        <button onClick={onClose} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors font-mono text-[10px] tracking-widest uppercase group">
          <span className="w-5 h-5 flex items-center justify-center rounded-full border border-white/20 group-hover:border-white/40 transition-colors">←</span>
          Back
        </button>
        <span className="text-[10px] font-mono text-white/20 truncate max-w-[60%]">{item.category || 'Paper'}</span>
      </div>

      {/* Content scroll */}
      <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8">
        <h2 className="text-xl md:text-2xl font-black tracking-tighter text-white leading-tight mb-2">{item.title}</h2>
        <div className="flex items-center gap-3 text-[10px] font-mono text-white/30 mb-4">
          <span>{item.source || 'local'}</span>
          <span>·</span>
          <span>Imp {item.importance}/10</span>
        </div>
        {item.cid && <p className="text-[9px] font-mono text-blue-400/60 break-all mb-3">CID: {item.cid}</p>}

        {Array.isArray(item.tags) && (item.tags as string[]).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-5">
            {(item.tags as string[]).map(t => <span key={t} className="px-2 py-0.5 rounded text-[9px] font-mono text-white/40 bg-white/[0.05] border border-white/[0.08]">{t}</span>)}
          </div>
        )}

        {item.summary && <p className="text-sm text-white/50 mb-5 italic leading-relaxed">{item.summary}</p>}

        <div className="border-t border-white/10 pt-5">
          <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em] mb-3">Full Text</h3>
          {loading ? <p className="font-mono text-xs text-white/30">Loading…</p> : data ? (
            <div className="font-mono text-[11px] md:text-xs text-white/70 leading-loose whitespace-pre-wrap">{cleanMarkdown(data)}</div>
          ) : (
            <p className="text-xs text-white/30 font-mono">Paper content unavailable locally.</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Main portal ─────────────────────────────────────────────────────── */
export default function ResearchPortal() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ResearchCategory | 'all'>('all')
  const [selectedItem, setSelectedItem] = useState<IndexedResearchItem | null>(null)
  const [indexedItems, setIndexedItems] = useState<IndexedResearchItem[]>([])
  const [isIndexing, setIsIndexing] = useState(false)

  useEffect(() => {
    async function init() {
      setIsIndexing(true)
      try { await initDB(); await buildFullIndex(RESEARCH_CATALOG); const all = await searchIndex(''); setIndexedItems(all) }
      catch { setIndexedItems(RESEARCH_CATALOG.map(i => ({ ...i, indexedAt: Date.now(), userTags: [], aiTags: [], semanticScore: i.importance/10, colorCode: 'white', contextLayers: i.context ? [i.context.field, i.context.domain, i.context.specificTopic] : [] }))) }
      setIsIndexing(false)
    }
    init()
  }, [])

  const filteredItems = useMemo(() => {
    let items = indexedItems
    if (selectedCategory !== 'all') items = items.filter(i => i.category === selectedCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase(); const terms = q.split(/\s+/).filter(Boolean)
      items = items.filter(i => terms.every(t => `${i.title} ${i.tags?.join(' ')} ${i.category} ${i.summary}`.toLowerCase().includes(t)))
    }
    return items
  }, [indexedItems, selectedCategory, searchQuery])

  const grouped = useMemo(() => {
    const g: Record<string, IndexedResearchItem[]> = {}
    for (const item of filteredItems) { const cat = item.category || 'Uncategorized'; (g[cat] ||= []).push(item) }
    return g
  }, [filteredItems])

  return (
    <div className="min-h-[100dvh] bg-[#030712] text-white font-sans selection:bg-white selection:text-black">
      {/* Header — not blue, clean dark */}
      <header className="sticky top-0 z-30 bg-[#030712]/90 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
          <div>
            <h1 className="text-sm md:text-base font-black tracking-tighter uppercase text-white leading-none">Research Index</h1>
            <p className="text-[10px] font-mono text-white/30 mt-0.5">{filteredItems.length} papers · {Object.keys(grouped).length} categories</p>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search titles, tags, domains…"
            className="flex-1 bg-white/[0.04] border border-white/10 text-white/90 text-sm font-mono placeholder:text-white/20 px-3 py-2.5 rounded focus:outline-none focus:border-white/40 transition-colors"
          />
        </div>
        <div className="max-w-5xl mx-auto flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-thin">
          <button onClick={() => setSelectedCategory('all')} className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-mono transition-colors ${selectedCategory === 'all' ? 'bg-white text-black font-medium' : 'text-white/40 border border-white/10 hover:text-white/70'}`}>All ({indexedItems.length})</button>
          {CATEGORY_ORDER.map(cat => { const c = indexedItems.filter(i => i.category === cat).length; return c ? <button key={cat} onClick={() => setSelectedCategory(cat)} className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-mono transition-colors ${selectedCategory === cat ? 'bg-white text-black font-medium' : 'text-white/40 border border-white/10 hover:text-white/70'}`}>{CATEGORY_LABELS[cat]?.split('/')[0] || cat} ({c})</button> : null })}
        </div>
      </header>

      {/* Main list — single column, mobile-first */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24">
        {isIndexing && <p className="font-mono text-xs text-white/30 py-12 text-center">Indexing catalog…</p>}
        {Object.entries(grouped).map(([cat, papers]) => (
          <section key={cat} className="mb-10">
            <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-white/40" />
              {CATEGORY_LABELS[cat as ResearchCategory] || cat} · {papers.length}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {papers.map(p => (
                <button key={p.id} onClick={() => setSelectedItem(p)} className="text-left px-4 py-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/20 transition-all group">
                  <p className="text-sm font-semibold text-white/90 leading-snug group-hover:text-white transition-colors">{p.title}</p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-white/35">
                    <span>{p.source || 'local'}</span>
                    <span>·</span><span>Imp {p.importance}/10</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(p.tags || []).slice(0, 3).map(t => <span key={t} className="text-[8px] font-mono text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded">{t}</span>)}
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
        {filteredItems.length === 0 && <p className="font-mono text-sm text-white/20 text-center py-20">No papers match.</p>}
      </main>

      {/* Slide-out paper overlay */}
      <AnimatePresence>
        {selectedItem && <PaperSlide item={selectedItem} onClose={() => setSelectedItem(null)} />}
      </AnimatePresence>
    </div>
  )
}
