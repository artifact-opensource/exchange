'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { RESEARCH_CATALOG, CATEGORY_LABELS, CATEGORY_COLORS, ResearchCategory } from '@/lib/research-data'
import { initDB, buildFullIndex, search as searchIndex, getRelated, IndexedResearchItem } from '@/lib/research-index'
import MorphX from './MorphX'

/* Simple file icon component */
function FileIcon({ color = '#fff' }: { color?: string }) {
  return (
    <svg width="32" height="36" viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="28" height="32" rx="3" fill={color} opacity="0.07" stroke={color} strokeWidth="1" />
      <path d="M8 8h14v2H8V8zm0 4h14v2H8v-2zm0 4h10v2H8v-2z" stroke={color} strokeWidth="1" opacity="0.5" fill="none" />
      <path d="M20 4v5h5" stroke={color} strokeWidth="1" opacity="0.25" />
    </svg>
  )
}

/* Slide-over paper viewer with built-in markdown editor */
function PaperOverlay({ item, related, onClose }: { item: IndexedResearchItem; related: IndexedResearchItem[]; onClose: () => void }) {
  const [content, setContent] = useState<string | null>(null)
  const [edited, setEdited] = useState<string>('')
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setContent(null); setEdited(''); setMode('view'); setLoading(true)
    const basename = item.localPath ? item.localPath.split('/').pop() || '' : ''
    // If no local file: show hash-linked reference for segregated IPFS-only papers
    if (!basename) {
      setContent(null); setLoading(false); return
    }
    fetch(`/papers/consolidated/${basename}`).then(r => r.ok ? r.text() : Promise.reject()).then(t => { setContent(t); setLoading(false) }).catch(() => { setContent('Not available locally.'); setLoading(false) })
  }, [item.id])

  const downloadMd = () => {
    const blob = new Blob([edited || content || ''], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = (item.localPath?.split('/').pop() || 'paper.md')
    a.click()
  }

  return (
    <motion.div initial={{ x: '-100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '-100%', opacity: 0, transition: { duration: 0.3, ease: [0.4,0,0.2,1] } }}transition={{ duration: 0.35, ease: [0.23,1,0.32,1] }}
      className="fixed inset-0 z-[201] md:inset-y-0 md:left-0 md:right-auto md:w-[46rem] flex flex-col border-r border-white/20 shadow-2xl overflow-hidden bg-black/85 backdrop-blur-xl backdrop-saturate-150">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/15 shrink-0 bg-black/40">
        <div className="flex items-center gap-3">
          <MorphX onClick={onClose} />
          <span className="font-mono text-[10px] tracking-widest uppercase text-white/50">Close</span>
        </div>
        <div className="relative z-[130] flex items-center gap-1 font-mono text-[9px]">
          <button onClick={() => setMode('view')} className={`px-2 py-1 border ${mode === 'view' ? 'border-white text-white' : 'border-white/15 text-white/40 hover:text-white/70'}`}>View</button>
          <button onClick={() => { setMode('edit'); setEdited(content || '') }} className={`px-2 py-1 border ${mode === 'edit' ? 'border-white text-white' : 'border-white/15 text-white/40 hover:text-white/70'}`}>Edit</button>
          <button onClick={downloadMd} className="px-2 py-1 border border-white/15 text-white/40 hover:text-white/70">Save</button>
        </div>
      </div>
      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8 bg-gradient-to-b from-white/[0.02] to-transparent">
        <h2 className="text-xl md:text-2xl font-black tracking-tighter text-white leading-tight mb-2">{item.title}</h2>
        <div className="flex gap-3 text-[10px] font-mono text-white/35 mb-3">
          <span>{item.source || 'local'}</span>
          <span>·</span><span>Imp {item.importance}/10</span>
        </div>
        {item.cid && <p className="text-[9px] font-mono text-white/40 break-all mb-4">CID: {item.cid}</p>}
        {item.tags && Array.isArray(item.tags) && (item.tags as string[]).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-5">
            {(item.tags as string[]).map(t => <span key={t} className="px-2 py-0.5 text-[9px] font-mono text-white/50 bg-white/[0.05] border border-white/10">{t}</span>)}
          </div>
        )}
        {item.summary && <p className="text-sm text-white/60 mb-5 italic">{item.summary}</p>}
        <div className="border-t border-white/15 pt-5">
          {mode === 'edit' ? (
            <textarea value={edited} onChange={e => setEdited(e.target.value)} spellCheck={false}
              className="w-full min-h-[60vh] bg-black/40 border border-white/15 text-white/80 font-mono text-[11px] md:text-xs leading-loose p-3 focus:outline-none focus:border-white/30 resize-y" />
          ) : (
            <>
              <h3 className="text-[10px] font-mono text-white/35 uppercase tracking-[0.3em] mb-3">Paper</h3>
              {loading ? <p className="text-xs text-white/35 font-mono">Loading…</p>
                : !item.localPath ? (
                  // Segregated: IPFS / hash-linked — show CID reference with external link
                  <div className="border border-white/15 bg-white/[0.02] p-4 font-mono text-[11px]">
                    <div className="flex items-center gap-2 text-white/50 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                      <span className="uppercase tracking-widest text-[9px]">Segregated · IPFS Reference</span>
                    </div>
                    {item.cid ? (
                      <a
                        href={`https://ipfs.io/ipfs/${item.cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-cyan-400 hover:text-cyan-300 break-all leading-relaxed"
                      >
                        ipfs://{item.cid}
                      </a>
                    ) : (
                      <p className="text-white/40 italic">No CID hash on record.</p>
                    )}
                    <p className="text-white/30 text-[10px] mt-2">Click to open via IPFS gateway</p>
                  </div>
                ) : (
                  <pre className="font-mono text-[11px] md:text-xs text-white/75 leading-loose whitespace-pre-wrap">{content}</pre>
                )
              }
            </>
          )}
        </div>
        {related.length > 0 && mode === 'view' && (
          <div className="mt-8 pt-5 border-t border-white/15">
            <h4 className="text-[10px] font-mono text-white/35 uppercase tracking-[0.3em] mb-3">Related</h4>
            <div className="space-y-2">
              {related.slice(0, 4).map(r => (
                <p key={r.id} className="px-3 py-2 bg-white/[0.03] border border-white/10 text-xs font-medium text-white/70 truncate">{r.title}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function Library() {
  const [cat, setCat] = useState<string | null>(null)
  const [items, setItems] = useState<IndexedResearchItem[]>([])
  const [selected, setSelected] = useState<IndexedResearchItem | null>(null)
  const [related, setRelated] = useState<IndexedResearchItem[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const onScroll = () => setSelected(null);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); setSelected(null); };
  }, [])

  // Lock body scroll when overlay is open (prevents horizontal snap scroll from triggering)
  useEffect(() => {
    if (selected) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selected])

  useEffect(() => {
    async function init() { try { await initDB(); await buildFullIndex(RESEARCH_CATALOG); const all = await searchIndex(''); setItems(all) } catch { setItems(RESEARCH_CATALOG.map(i => ({ ...i, indexedAt: Date.now(), userTags: [], aiTags: [], semanticScore: i.importance/10, colorCode: 'white', contextLayers: i.context ? [i.context.field, i.context.domain, i.context.specificTopic] : [] }))) } }
    init()
  }, [])

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category || 'Uncategorized'))
    const order = ['Transformers/Architecture','AI/ML','Consciousness/Philosophy','Blockchain/Governance','Tokenomics','Security','Uncategorized']
    return Array.from(cats).sort((a,b) => order.indexOf(a as any) - order.indexOf(b as any))
  }, [items])

  const papersInCat = (c: string) => items.filter(i => (i.category || 'Uncategorized') === c)

  const openPaper = async (item: IndexedResearchItem) => {
    setSelected(item)
    try { const rel = await getRelated(item.id); setRelated(rel) } catch { setRelated([]) }
  }

  const closePaper = () => setSelected(null)

  const filteredPapers = useMemo(() => {
    if (!cat) return []
    let list = papersInCat(cat)
    if (search.trim()) { const s = search.toLowerCase(); list = list.filter(i => `${i.title} ${i.tags?.join(' ')}`.toLowerCase().includes(s)) }
    return list
  }, [cat, items, search])

  return (
    <div className="min-h-[100dvh] bg-black text-white font-sans selection:bg-white selection:text-black">
      {/* Library header */}
      <header className="sticky top-0 z-30 bg-black border-b border-white/15 px-5 md:px-10 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3 mb-3">
          <h1 className="text-sm font-black tracking-tighter uppercase text-white">Library</h1>
          <span className="font-mono text-[9px] text-white/30">/ file manager</span>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter papers…" className="w-full max-w-md bg-white/[0.04] border border-white/10 text-white/80 text-xs font-mono placeholder:text-white/25 px-3 py-2   focus:outline-none focus:border-white/30" />
      </header>

      <main className="max-w-6xl mx-auto px-5 md:px-10 py-8 pb-24">
        {/* Top-level: folder icons for categories */}
        {!cat && (
          <div>
            <p className="text-[10px] font-mono text-white/20 tracking-[0.3em] uppercase mb-6">Browse by category</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map(c => {
                const count = papersInCat(c).length
                const label = c === 'Transformers/Architecture' ? 'AI / Arch' : c === 'Consciousness/Philosophy' ? 'Consciousness' : c === 'Blockchain/Governance' ? 'Governance' : c === 'Security' ? 'Security' : c === 'AI/ML' ? 'AI / ML' : c === 'Tokenomics' ? 'Tokenomics' : 'Other'
                const color = CATEGORY_COLORS[c as ResearchCategory] || '#888'
                return (
                  <button key={c} onClick={() => { setCat(c); setSearch('') }} className="group text-left p-5  bg-white/[0.02] border border-white/[0.06] hover:border-white/25 hover:bg-white/[0.05] transition-all">
                    <FileIcon color={color} />
                    <h3 className="text-sm font-bold text-white/90 mt-3">{label}</h3>
                    <p className="text-[10px] font-mono text-white/30">{count} papers</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Second-level: card grid of papers in selected category */}
        {cat && (
          <div className="space-y-6">
            <button onClick={() => { setCat(null); setSearch('') }} className="text-[10px] font-mono text-white/40 hover:text-white/70 transition-colors">← Back to categories</button>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl md:text-2xl font-black tracking-tighter text-white">{cat}</h2>
              <span className="font-mono text-[9px] text-white/30">{filteredPapers.length} papers</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPapers.map(p => (
                <button key={p.id} onClick={() => openPaper(p)} className="text-left px-5 py-4  bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/25 transition-all group">
                  <h3 className="text-sm font-semibold text-white/90 leading-snug group-hover:text-white transition-colors line-clamp-2">{p.title}</h3>
                  <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-white/30">
                    <span>{p.source || 'local'}</span>
                    <span>·</span><span>Imp {p.importance}/10</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(p.tags || []).slice(0, 3).map(t => <span key={t} className="text-[8px] font-mono text-white/30 bg-white/[0.04] px-1.5 py-0.5  ">{t}</span>)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Slide overlay */}
      <AnimatePresence>
        {selected && <PaperOverlay item={selected} related={related} onClose={closePaper} />}
      </AnimatePresence>
    </div>
  )
}
