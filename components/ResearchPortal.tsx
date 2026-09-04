'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { RESEARCH_CATALOG, CATEGORY_COLORS, CATEGORY_LABELS, ResearchCategory } from '@/lib/research-data'
import { initDB, buildFullIndex, search as searchIndex, getRelated, getContextPathway, IndexedResearchItem } from '@/lib/research-index'

const CATEGORY_ORDER: ResearchCategory[] = [
  'Transformers/Architecture',
  'AI/ML',
  'Consciousness/Philosophy',
  'Blockchain/Governance',
  'Tokenomics',
  'Security',
  'Uncategorized',
]

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function stripFrontmatter(text: string): string {
  if (text.trimStart().startsWith('---')) {
    const end = text.indexOf('\n---', 3)
    if (end !== -1) return text.slice(end + 4).trimStart()
  }
  return text
}

function cleanMarkdown(text: string): string {
  let t = stripFrontmatter(text)
  t = t.replace(/\r\n/g, '\n')
  t = t.replace(/\n{3,}/g, '\n\n')
  return t.trim()
}

function renderPlainText(md: string): string {
  return cleanMarkdown(md)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/^---$/gm, '')
    .replace(/\|[^\n]+\|/gm, '')
    .trim()
}

/* ── Paper viewer (no external deps, no crash) ───────────────────────────── */
function PaperViewer({ item }: { item: IndexedResearchItem }) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setContent(null)
    setError(null)
    if (!item.localPath) {
      setError('No local file for this paper.')
      return
    }
    // Derive public URL from basename (files live in repo public/papers/consolidated/)
    const basename = item.localPath ? item.localPath.split('/').pop() || '' : ''
    const url = basename ? `/papers/consolidated/${basename}` : ''
    if (!url) { setError('No public path.'); return }
    setLoading(true)
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then(t => { setContent(renderPlainText(t)); setLoading(false) })
      .catch(e => {
        setError(`Could not load paper: ${e.message}`)
        setLoading(false)
      })
  }, [item.localPath, item.id])

  return (
    <div className="text-sm text-white/80 leading-relaxed font-mono whitespace-pre-wrap">
      {/* Source block */}
      <div className="border-b border-white/10 pb-4 mb-4">
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
          {item.category ? CATEGORY_LABELS[item.category] || item.category : 'Research'}
        </p>
        <h2 className="text-lg font-semibold text-white leading-tight">{item.title}</h2>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/35">
          <span>{item.source || 'local'}</span>
          <span>·</span>
          <span>{item.date || '2024'}</span>
          <span>·</span>
          <span>importance {item.importance}/10</span>
        </div>
        {item.cid && (
          <p className="mt-1.5 text-[9px] text-blue-400/60 font-mono break-all">CID: {item.cid}</p>
        )}
      </div>

      {/* Summary */}
      {item.summary && (
        <p className="text-white/50 mb-4 italic">{item.summary}</p>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {item.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded text-[9px] font-mono text-white/40 border border-white/10 bg-white/[0.02]">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Paper content */}
      {loading && <p className="text-white/30 text-xs font-mono">Loading paper…</p>}
      {error && <p className="text-red-400/60 text-xs font-mono">{error}</p>}
      {content && (
        <div className="border-t border-white/10 pt-4">
          <p className="text-[10px] text-white/20 uppercase tracking-widest mb-3">Full Text</p>
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            {content}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main portal ────────────────────────────────────────────────────────── */
export default function ResearchPortal() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ResearchCategory | 'all'>('all')
  const [selectedItem, setSelectedItem] = useState<IndexedResearchItem | null>(null)
  const [relatedItems, setRelatedItems] = useState<IndexedResearchItem[]>([])
  const [indexedItems, setIndexedItems] = useState<IndexedResearchItem[]>([])
  const [isIndexing, setIsIndexing] = useState(false)

  useEffect(() => {
    async function init() {
      setIsIndexing(true)
      try {
        await initDB()
        await buildFullIndex(RESEARCH_CATALOG)
        const all = await searchIndex('')
        setIndexedItems(all)
      } catch {
        setIndexedItems(RESEARCH_CATALOG.map(item => ({
          ...item,
          indexedAt: Date.now(),
          userTags: [],
          aiTags: [],
          semanticScore: item.importance / 10,
          colorCode: CATEGORY_COLORS[item.category],
          contextLayers: item.context ? [item.context.field, item.context.domain, item.context.specificTopic] : [],
        })))
      }
      setIsIndexing(false)
    }
    init()
  }, [])

  const handleNodeClick = useCallback(async (item: IndexedResearchItem) => {
    setSelectedItem(item)
    const related = await getRelated(item.id)
    setRelatedItems(related)
  }, [])

  const filteredItems = useMemo(() => {
    let items = indexedItems
    if (selectedCategory !== 'all') items = items.filter(i => i.category === selectedCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const terms = q.split(/\s+/).filter(Boolean)
      items = items.filter(i =>
        terms.every(t =>
          `${i.title} ${i.tags?.join(' ')} ${i.category} ${i.summary}`.toLowerCase().includes(t)
        )
      )
    }
    return items
  }, [indexedItems, selectedCategory, searchQuery])

  const grouped = useMemo(() => {
    const g: Record<string, IndexedResearchItem[]> = {}
    for (const item of filteredItems) {
      const cat = item.category || 'Uncategorized'
      if (!g[cat]) g[cat] = []
      g[cat].push(item)
    }
    return g
  }, [filteredItems])

  if (isIndexing) {
    return (
      <div className="flex items-center justify-center h-64 text-white/30 font-mono text-sm">
        Indexing research catalog…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header + search + filters ───────────────────────────────────── */}
      <div className="shrink-0 border-b border-white/10 bg-[#030712]">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-mono font-bold text-white/80 tracking-widest uppercase">
                Research Index
              </h2>
              <p className="text-[10px] text-white/30 font-mono mt-0.5">
                {filteredItems.length} papers · {Object.keys(grouped).length} categories
              </p>
            </div>
          </div>
          {/* Search */}
          <div className="mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search titles, tags, domains…"
              className="w-full bg-white/[0.04] border border-white/10 text-white/80 text-xs font-mono placeholder:text-white/25 px-3 py-2 rounded focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          {/* Category filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`shrink-0 px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-white text-black font-medium'
                  : 'text-white/40 hover:text-white/70 border border-white/10'
              }`}
            >
              All ({indexedItems.length})
            </button>
            {CATEGORY_ORDER.map(cat => {
              const count = indexedItems.filter(i => i.category === cat).length
              if (!count) return null
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
                    selectedCategory === cat
                      ? 'bg-white text-black font-medium'
                      : 'text-white/40 hover:text-white/70 border border-white/10'
                  }`}
                >
                  {CATEGORY_LABELS[cat]?.split('/')[0] || cat} ({count})
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Body: list + paper panel ───────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: paper list */}
        <div className="flex-1 overflow-y-auto border-r border-white/10">
          <div className="px-4 py-3 space-y-5">
            {Object.entries(grouped).map(([cat, papers]) => (
              <section key={cat}>
                <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2">
                  {CATEGORY_LABELS[cat as ResearchCategory] || cat} · {papers.length}
                </h3>
                <div className="space-y-1">
                  {papers.map(paper => {
                    const isSelected = selectedItem?.id === paper.id
                    return (
                      <button
                        key={paper.id}
                        onClick={() => handleNodeClick(paper)}
                        className={`w-full text-left px-3 py-2.5 rounded transition-colors ${
                          isSelected
                            ? 'bg-white/[0.06] border border-white/20'
                            : 'hover:bg-white/[0.02] border border-transparent'
                        }`}
                      >
                        <p className="text-[12px] font-medium text-white/85 leading-snug line-clamp-1">
                          {paper.title}
                        </p>
                        <p className="text-[10px] text-white/35 font-mono mt-0.5 truncate">
                          {paper.source || 'local'} · {paper.date || ''} · imp {paper.importance}/10
                        </p>
                        {paper.tags && paper.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="inline-block mr-1 mt-1 px-1.5 py-0.5 rounded text-[8px] font-mono text-white/30 bg-white/[0.03] border border-white/[0.06]">
                            {tag}
                          </span>
                        ))}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
            {filteredItems.length === 0 && (
              <p className="text-center text-white/25 font-mono text-xs py-12">No papers match.</p>
            )}
          </div>
        </div>

        {/* Right: paper detail */}
        <div className="w-96 shrink-0 overflow-y-auto">
          {selectedItem ? (
            <div className="p-5">
              <PaperViewer item={selectedItem} />

              {/* Related */}
              {relatedItems.length > 0 && (
                <div className="mt-6 border-t border-white/10 pt-4">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Related</p>
                  <div className="space-y-1">
                    {relatedItems.slice(0, 5).map(r => (
                      <button
                        key={r.id}
                        onClick={() => handleNodeClick(r)}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-white/[0.03] transition-colors"
                      >
                        <p className="text-[11px] text-white/60 leading-snug line-clamp-1">{r.title}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Close */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-[10px] text-white/30 font-mono hover:text-white/60 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <p className="text-white/20 font-mono text-xs">Select a paper to read</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
