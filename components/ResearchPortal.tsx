'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { RESEARCH_CATALOG, CATEGORY_COLORS, CATEGORY_LABELS, ResearchCategory, ResearchItem } from '@/lib/research-data'
import { initDB, buildFullIndex, search as searchIndex, getRelated, getContextPathway, IndexedResearchItem } from '@/lib/research-index'
import SemanticLinkView from './SemanticLinkView'
import ResearchBrowser from './ResearchBrowser'
import { Search, X, Loader2, ExternalLink, Database, Beaker, Cpu, Shield, Clock, Layers, Network, Brain, Globe } from 'lucide-react'

const CATEGORY_ICONS: Record<React.ReactNode, React.ReactNode> = {
  // Not used directly but kept for reference
}

const CATEGORY_ORDER: ResearchCategory[] = [
  'Transformers/Architecture',
  'AI/ML',
  'Consciousness/Philosophy',
  'Blockchain/Governance',
  'Tokenomics',
  'Security',
  'Uncategorized',
]

// Short display names for filter chips (CATEGORY_LABELS are long-form)
const CATEGORY_SHORT: Partial<Record<ResearchCategory, string>> = {
  'AI/ML': 'AI/ML',
  'Blockchain/Governance': 'Blockchain',
  'Transformers/Architecture': 'Transformers',
  'Consciousness/Philosophy': 'Consciousness',
  'Tokenomics': 'Tokenomics',
  'Security': 'Security',
  'Uncategorized': 'Other',
}

export default function ResearchPortal() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ResearchCategory | 'all'>('all')
  const [selectedItem, setSelectedItem] = useState<IndexedResearchItem | null>(null)
  const [relatedItems, setRelatedItems] = useState<IndexedResearchItem[]>([])
  const [contextPath, setContextPath] = useState<IndexedResearchItem[]>([])
  const [indexedItems, setIndexedItems] = useState<IndexedResearchItem[]>([])
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexReady, setIndexReady] = useState(false)
  const [view, setView] = useState<'graph' | 'list'>('graph')
  const [browserUrl, setBrowserUrl] = useState<string | null>(null)

  // Initialize and build index
  useEffect(() => {
    async function init() {
      setIsIndexing(true)
      try {
        await initDB()
        await buildFullIndex(RESEARCH_CATALOG)
        setIndexReady(true)
        // Load all items for display
        const all = await searchIndex('')
        setIndexedItems(all)
      } catch (e) {
        console.error('Failed to build research index:', e)
        // Fallback to catalog data
        setIndexedItems(RESEARCH_CATALOG.map(item => ({
          ...item,
          indexedAt: Date.now(),
          userTags: [],
          aiTags: [],
          semanticScore: item.importance / 10,
          colorCode: CATEGORY_COLORS[item.category],
          contextLayers: item.context
            ? [item.context.field, item.context.domain, item.context.specificTopic]
            : [],
          searchableText: `${item.title} ${item.summary} ${item.tags.join(' ')}`.toLowerCase(),
        })))
      }
      setIsIndexing(false)
    }
    init()
  }, [])

  // Filter items
  const filteredItems = useMemo(() => {
    let items = indexedItems
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const terms = q.split(/\s+/).filter(t => t.length > 1)
      items = items.filter(item => {
        const text = `${item.title} ${item.tags.join(' ')} ${item.category} ${item.summary} ${item.source}`.toLowerCase()
        return terms.every(t => text.includes(t))
      })
    }
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory)
    }
    return items
  }, [indexedItems, searchQuery, selectedCategory])

  // Handle node click
  const handleNodeClick = useCallback(async (item: IndexedResearchItem) => {
    setSelectedItem(item)
    const related = await getRelated(item.id)
    setRelatedItems(related)
    const pathway = await getContextPathway(item.id)
    setContextPath(pathway)
  }, [])

  // Stats
  const stats = useMemo(() => {
    const bySource: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    indexedItems.forEach(item => {
      bySource[item.source] = (bySource[item.source] || 0) + 1
      byCategory[item.category] = (byCategory[item.category] || 0) + 1
    })
    return { bySource, byCategory, total: indexedItems.length }
  }, [indexedItems])

  if (isIndexing) {
    return (
      <div className="w-full h-[80vh] flex flex-col items-center justify-center gap-6">
        <Loader2 className="h-12 w-12 text-white/40 animate-spin" />
        <p className="font-mono text-sm text-white/40">Indexing research database...</p>
        <p className="font-mono text-xs text-white/20">{indexedItems.length} items indexed</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Control Bar */}
      <div className="sticky top-0 z-20 bg-[#030303]/95 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-0 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              placeholder="Search research... (multi-term: 'transformer attention')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 sm:h-auto pl-10 pr-10 py-2.5 rounded-lg border border-white/10 bg-white/5 text-base sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1">
                <X className="h-4 w-4 text-white/40 hover:text-white" />
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-white/40">
            <span className="flex items-center gap-1"><Database className="h-3 w-3" /> {stats.total} items</span>
            <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {Object.keys(stats.byCategory).length} categories</span>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button
              onClick={() => setView('graph')}
              className={`px-3 py-1.5 text-xs font-mono ${view === 'graph' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
            >
              <Network className="h-3 w-3 inline mr-1" /> Graph
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-xs font-mono ${view === 'list' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
            >
              <Layers className="h-3 w-3 inline mr-1" /> List
            </button>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
              selectedCategory === 'all'
                ? 'bg-white text-black'
                : 'border border-white/10 text-white/50 hover:text-white'
            }`}
          >
            All ({stats.total})
          </button>
          {CATEGORY_ORDER.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
                selectedCategory === cat
                  ? 'text-black'
                  : 'border border-white/10 text-white/50 hover:text-white'
              }`}
              style={selectedCategory === cat ? { backgroundColor: CATEGORY_COLORS[cat] } : {}}
            >
              {CATEGORY_SHORT[cat] ?? CATEGORY_LABELS[cat] ?? cat} ({stats.byCategory[cat] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-160px)] min-h-0">
        {/* Graph / List view */}
        <div className="flex-1 min-w-0 min-h-[420px] lg:min-h-0">
          {view === 'graph' ? (
            <SemanticLinkView
              items={filteredItems}
              onNodeClick={handleNodeClick}
              selectedId={selectedItem?.id}
            />
          ) : (
            <div className="h-full overflow-y-auto px-4 sm:px-6 py-4 space-y-2">
              {filteredItems.map(item => (
                <ListItem key={item.id} item={item} onClick={() => handleNodeClick(item)} />
              ))}
              {filteredItems.length === 0 && (
                <p className="text-center text-white/30 font-mono text-sm py-12">No items match your search</p>
              )}
            </div>
          )}
        </div>

        {/* Detail sidebar — slide-over on mobile, static panel on desktop */}
        {selectedItem && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/60 lg:hidden"
              onClick={() => setSelectedItem(null)}
            />
            <div className="fixed right-0 top-0 z-40 h-full w-[88%] max-w-sm border-l border-white/10 bg-[#050505] overflow-y-auto p-5 space-y-4 lg:static lg:z-auto lg:w-96 lg:max-w-none lg:h-auto lg:bg-white/[0.02] lg:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedItem.colorCode }}
                  />
                  <span className="text-[10px] font-mono text-white/40 uppercase">
                    {CATEGORY_LABELS[selectedItem.category]}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white leading-tight">{selectedItem.title}</h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-white/10 rounded">
                <X className="h-4 w-4 text-white/40" />
              </button>
            </div>

            {/* Meta */}
            <div className="space-y-2 text-xs font-mono text-white/50">
              <div className="flex justify-between">
                <span>Source</span>
                <span className="text-white/80">{selectedItem.source}</span>
              </div>
              <div className="flex justify-between">
                <span>Date</span>
                <span className="text-white/80">{selectedItem.date}</span>
              </div>
              <div className="flex justify-between">
                <span>Importance</span>
                <span className="text-white/80">{selectedItem.importance}/10</span>
              </div>
              <div className="flex justify-between">
                <span>Semantic Score</span>
                <span className="text-white/80">{(selectedItem.semanticScore * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Summary */}
            <p className="text-sm text-white/70 leading-relaxed">{selectedItem.summary}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {selectedItem.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-white/60 border border-white/10">
                  {tag}
                </span>
              ))}
            </div>

            {/* Context path */}
            <div className="border-t border-white/10 pt-4">
              <h4 className="text-xs font-mono text-white/40 uppercase mb-2">Context Pathway</h4>
              <div className="flex items-center gap-1 text-xs font-mono overflow-x-auto">
                {selectedItem.contextLayers.map((layer, i) => (
                  <React.Fragment key={i}>
                    <span className="text-white/60 whitespace-nowrap">{layer}</span>
                    {i < selectedItem.contextLayers.length - 1 && (
                      <span className="text-white/20">/</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Links */}
            <div className="border-t border-white/10 pt-4 space-y-2">
              {selectedItem.cid && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setBrowserUrl(`https://ipfs.io/ipfs/${selectedItem.cid}`)}
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 w-full text-left"
                  >
                    <Globe className="h-3 w-3 shrink-0" />
                    <span className="truncate font-mono">IPFS: {selectedItem.cid.slice(0, 20)}…</span>
                  </button>
                  <span className="text-[9px] font-mono text-white/25 px-1">{selectedItem.cid}</span>
                </div>
              )}
              {selectedItem.hfModel && (
                <button
                  onClick={() => setBrowserUrl(`https://huggingface.co/${selectedItem.hfModel}`)}
                  className="flex items-center gap-2 text-xs text-yellow-400 hover:text-yellow-300 w-full text-left"
                >
                  <Globe className="h-3 w-3" /> Open in Browser: HuggingFace {selectedItem.hfModel}
                </button>
              )}
              {selectedItem.localPath && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Database className="h-3 w-3 shrink-0" />
                    <span className="truncate font-mono text-[10px]">Local path</span>
                  </div>
                  <span className="text-[9px] font-mono text-white/25 px-1 break-all leading-relaxed">{selectedItem.localPath}</span>
                </div>
              )}
            </div>

            {/* Related items */}
            {relatedItems.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <h4 className="text-xs font-mono text-white/40 uppercase mb-2">Related ({relatedItems.length})</h4>
                <div className="space-y-1">
                  {relatedItems.slice(0, 8).map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleNodeClick(item)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.colorCode }} />
                        <span className="text-xs text-white/80 truncate">{item.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            </div>
          </>
        )}
      </div>

      {/* Ava's Research Browser */}
      {browserUrl && (
        <ResearchBrowser
          url={browserUrl}
          onClose={() => setBrowserUrl(null)}
        />
      )}
    </div>
  )
}

function ListItem({ item, onClick }: { item: IndexedResearchItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-lg border border-white/5 hover:border-white/20 hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: item.colorCode }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-white truncate">{item.title}</h4>
            <span className="text-[9px] font-mono text-white/30 uppercase shrink-0">{item.source}</span>
          </div>
          <p className="text-xs text-white/50 line-clamp-2">{item.summary}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-mono text-white/30">{item.date}</span>
            <span className="text-[10px] font-mono text-white/20">|</span>
            <span className="text-[10px] font-mono text-white/30">{item.tags.slice(0, 3).join(', ')}</span>
            <span className="text-[10px] font-mono text-white/20">|</span>
            <span className="text-[10px] font-mono text-white/30">Score: {(item.semanticScore * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </button>
  )
}
