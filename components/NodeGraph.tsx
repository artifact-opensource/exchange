import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ResearchItem, CATEGORY_COLORS } from '../lib/research-index';

interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  item: ResearchItem;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

interface NodeGraphProps {
  items: ResearchItem[];
  onNodeClick: (item: ResearchItem) => void;
  selectedId?: string | null;
  width?: number;
  height?: number;
}

interface Particle {
  x: number;
  y: number;
  edgeIndex: number;
  progress: number;
  speed: number;
}

const SOURCE_ICONS: Record<string, string> = {
  'IPFS': '◉',
  'HuggingFace': '🤗',
  'GitHub': '⬡',
  'Local': '📄',
  'Enterprise': '🏢',
};

export default function NodeGraph({ items, onNodeClick, selectedId, width: defaultWidth = 900, height: defaultHeight = 600 }: NodeGraphProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const transformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });

  // Responsive sizing: fill parent container instead of fixed pixel canvas
  const [measured, setMeasured] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (r.width > 0 && r.height > 0) {
        setMeasured({ w: Math.floor(r.width), h: Math.floor(r.height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const width = Math.max(280, measured?.w ?? defaultWidth);
  const height = Math.max(240, measured?.h ?? defaultHeight);

  // Re-center existing node positions proportionally when container resizes,
  // so the cluster stays in view (critical on mobile rotation / panel resize).
  const prevDimsRef = useRef<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const prev = prevDimsRef.current;
    if (prev && (prev.w !== width || prev.h !== height) && nodesRef.current.length > 0) {
      const sx = width / prev.w;
      const sy = height / prev.h;
      for (const n of nodesRef.current) {
        n.x *= sx;
        n.y *= sy;
      }
    }
    prevDimsRef.current = { w: width, h: height };
  }, [width, height]);

  // Initialize graph data from items
  useEffect(() => {
    const existingMap = new Map(nodesRef.current.map(n => [n.id, n]));

    const nodes: GraphNode[] = items.map((item, i) => {
      const existing = existingMap.get(item.id);
      if (existing) {
        existing.item = item;
        existing.radius = Math.max(8, Math.min(30, 8 + item.importance / 4));
        return existing;
      }
      const angle = (2 * Math.PI * i) / items.length;
      const baseRadius = 150 + Math.random() * 100;
      return {
        id: item.id,
        x: width / 2 + Math.cos(angle) * baseRadius + (Math.random() - 0.5) * 50,
        y: height / 2 + Math.sin(angle) * baseRadius + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
        radius: Math.max(8, Math.min(30, 8 + item.importance / 4)),
        item,
      };
    });

    // Build edges
    const edges: GraphEdge[] = [];
    const itemMap = new Map(items.map(i => [i.id, i]));
    for (const item of items) {
      for (const relId of item.relatedIds) {
        if (itemMap.has(relId)) {
          edges.push({ source: item.id, target: relId, weight: 1 });
        }
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [items, width, height]);

  // Force simulation + rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let running = true;

    const simulate = () => {
      if (!running) return;

      // Force simulation step
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const centerX = width / 2;
      const centerY = height / 2;

      // Center gravity
      for (const node of nodes) {
        node.vx += (centerX - node.x) * 0.001;
        node.vy += (centerY - node.y) * 0.001;
      }

      // Repulsion between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = nodes[i].radius + nodes[j].radius + 10;
          if (dist < minDist) {
            const force = (minDist - dist) * 0.05;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            nodes[i].vx -= fx;
            nodes[i].vy -= fy;
            nodes[j].vx += fx;
            nodes[j].vy += fy;
          }
        }
      }

      // Attraction along edges
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      for (const edge of edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) continue;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealDist = 120;
        const force = (dist - idealDist) * 0.003;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      }

      // Apply velocity with damping
      for (const node of nodes) {
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx;
        node.y += node.vy;
        // Boundary constraints
        node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
        node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
      }

      // Update particles
      const particles = particlesRef.current;
      if (selectedId && edges.length > 0) {
        // Spawn particles on edges connected to selected
        if (Math.random() < 0.1) {
          const relevantEdges = edges.filter(e => e.source === selectedId || e.target === selectedId);
          if (relevantEdges.length > 0) {
            const edge = relevantEdges[Math.floor(Math.random() * relevantEdges.length)];
            particles.push({
              x: 0, y: 0,
              edgeIndex: edges.indexOf(edge),
              progress: 0,
              speed: 0.01 + Math.random() * 0.02,
            });
          }
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.progress += p.speed;
        if (p.progress >= 1) {
          particles.splice(i, 1);
        }
      }

      // Render
      const transform = transformRef.current;
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.translate(transform.offsetX, transform.offsetY);
      ctx.scale(transform.scale, transform.scale);

      // Draw edges
      for (const edge of edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) continue;

        const isHighlighted = selectedId && (edge.source === selectedId || edge.target === selectedId);

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = isHighlighted ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = isHighlighted ? 2 : 0.5;
        ctx.stroke();
      }

      // Draw particles
      for (const p of particles) {
        const edge = edges[p.edgeIndex];
        if (!edge) continue;
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) continue;
        const px = source.x + (target.x - source.x) * p.progress;
        const py = source.y + (target.y - source.y) * p.progress;

        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fill();
      }

      // Draw nodes
      for (const node of nodes) {
        const color = CATEGORY_COLORS[node.item.category] || '#6B7280';
        const isSelected = node.id === selectedId;
        const isHovered = hoveredNode?.id === node.id;
        const isRelated = selectedId && node.item.relatedIds.includes(selectedId);

        // Glow effect for selected/hovered
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
          const gradient = ctx.createRadialGradient(node.x, node.y, node.radius, node.x, node.y, node.radius + 12);
          gradient.addColorStop(0, color + '60');
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
          node.x - node.radius * 0.3,
          node.y - node.radius * 0.3,
          0,
          node.x,
          node.y,
          node.radius
        );
        grad.addColorStop(0, isSelected || isHovered ? '#ffffff' : color);
        grad.addColorStop(1, isSelected || isHovered ? color : color + '80');
        ctx.fillStyle = grad;
        ctx.fill();

        // Border
        ctx.strokeStyle = isSelected ? '#ffffff' : isRelated ? '#aaaaaa' : color;
        ctx.lineWidth = isSelected ? 3 : isRelated ? 2 : 1;
        ctx.stroke();

        // Label (only for larger nodes or when hovered/selected)
        if (node.radius > 12 || isHovered || isSelected) {
          const label = node.item.title.length > 20
            ? node.item.title.slice(0, 18) + '…'
            : node.item.title;
          ctx.font = `${isHovered || isSelected ? 'bold ' : ''}${Math.max(9, node.radius * 0.5)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, node.x, node.y + node.radius + 12);
        }

        // Source icon
        if (node.radius > 15 || isSelected) {
          const icon = SOURCE_ICONS[node.item.source] || '•';
          ctx.font = `${Math.max(10, node.radius * 0.6)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(icon, node.x, node.y);
        }
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [items, selectedId, hoveredNode, width, height]);

  // Coordinate + hit-test helpers
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const transform = transformRef.current;
    return {
      x: (screenX - transform.offsetX) / transform.scale,
      y: (screenY - transform.offsetY) / transform.scale,
    };
  }, []);

  const findNodeAt = useCallback((worldX: number, worldY: number): GraphNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      if (dx * dx + dy * dy <= node.radius * node.radius) {
        return node;
      }
    }
    return null;
  }, []);

  // Unified pointer interactions: mouse + single-finger pan + two-finger pinch
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const tapStateRef = useRef<{ startX: number; startY: number; lastX: number; lastY: number; moved: boolean; startTime: number } | null>(null);
  const pinchRef = useRef<{ dist: number; scale: number; midX: number; midY: number } | null>(null);

  const getLocalPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const p = getLocalPos(e);
    pointersRef.current.set(e.pointerId, p);
    if (pointersRef.current.size === 1) {
      tapStateRef.current = { startX: p.x, startY: p.y, lastX: p.x, lastY: p.y, moved: false, startTime: Date.now() };
    } else if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale: transformRef.current.scale,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
      tapStateRef.current = null;
    }
  }, [getLocalPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = getLocalPos(e);

    if (!pointersRef.current.has(e.pointerId)) {
      // Pure hover (mouse only, nothing pressed)
      if (e.pointerType === 'mouse') {
        const world = screenToWorld(p.x, p.y);
        const node = findNodeAt(world.x, world.y);
        if (node !== hoveredNode) {
          setHoveredNode(node);
          if (node) setTooltipPos({ x: p.x, y: p.y });
        }
      }
      return;
    }

    pointersRef.current.set(e.pointerId, p);

    // Two-finger pinch zoom around the initial midpoint
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchRef.current.dist > 0) {
        const t = transformRef.current;
        const newScale = Math.max(0.2, Math.min(3, pinchRef.current.scale * (dist / pinchRef.current.dist)));
        t.offsetX = pinchRef.current.midX - (pinchRef.current.midX - t.offsetX) * (newScale / t.scale);
        t.offsetY = pinchRef.current.midY - (pinchRef.current.midY - t.offsetY) * (newScale / t.scale);
        t.scale = newScale;
      }
      return;
    }

    // Single-pointer pan (touch or mouse drag)
    const d = tapStateRef.current;
    if (d) {
      if (!d.moved && Math.hypot(p.x - d.startX, p.y - d.startY) > 6) d.moved = true;
      if (d.moved) {
        transformRef.current.offsetX += p.x - d.lastX;
        transformRef.current.offsetY += p.y - d.lastY;
      }
      d.lastX = p.x;
      d.lastY = p.y;
    }
  }, [hoveredNode, screenToWorld, findNodeAt, getLocalPos]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;

    // Tap (no movement) selects a node — works for touch and mouse
    const d = tapStateRef.current;
    if (d && !d.moved && Date.now() - d.startTime < 600) {
      const world = screenToWorld(d.startX, d.startY);
      const node = findNodeAt(world.x, world.y);
      if (node) onNodeClick(node.item);
    }
    tapStateRef.current = null;
  }, [screenToWorld, findNodeAt, onNodeClick]);

  const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(e.pointerId);
    tapStateRef.current = null;
    setHoveredNode(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const transform = transformRef.current;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.2, Math.min(3, transform.scale * zoomFactor));

    transform.offsetX = mouseX - (mouseX - transform.offsetX) * (newScale / transform.scale);
    transform.offsetY = mouseY - (mouseY - transform.offsetY) * (newScale / transform.scale);
    transform.scale = newScale;
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full h-full min-h-[320px]">
      <canvas
        ref={canvasRef}
        style={{ width, height }}
        className="block max-w-full rounded-lg bg-gray-950 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerLeave}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
      />
      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="absolute pointer-events-none z-10 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl max-w-xs"
          style={{
            left: tooltipPos.x + 15,
            top: tooltipPos.y - 10,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="text-white font-semibold text-sm">{hoveredNode.item.title}</div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[hoveredNode.item.category] }}
            />
            <span className="text-gray-400 text-xs">{hoveredNode.item.category}</span>
            <span className="text-gray-500 text-xs">•</span>
            <span className="text-gray-400 text-xs">{SOURCE_ICONS[hoveredNode.item.source]} {hoveredNode.item.source}</span>
          </div>
          {hoveredNode.item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {hoveredNode.item.tags.slice(0, 4).map(tag => (
                <span key={tag} className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="text-gray-500 text-[10px] mt-1">
            Updated: {new Date(hoveredNode.item.date).toLocaleDateString()}
          </div>
        </div>
      )}
      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          onClick={() => {
            const t = transformRef.current;
            t.scale = Math.min(3, t.scale * 1.2);
          }}
          className="w-8 h-8 bg-gray-800 hover:bg-gray-700 text-white rounded flex items-center justify-center text-lg"
        >
          +
        </button>
        <button
          onClick={() => {
            const t = transformRef.current;
            t.scale = Math.max(0.2, t.scale * 0.8);
          }}
          className="w-8 h-8 bg-gray-800 hover:bg-gray-700 text-white rounded flex items-center justify-center text-lg"
        >
          −
        </button>
        <button
          onClick={() => {
            transformRef.current = { scale: 1, offsetX: 0, offsetY: 0 };
          }}
          className="w-8 h-8 bg-gray-800 hover:bg-gray-700 text-white rounded flex items-center justify-center text-xs"
        >
          ⟲
        </button>
      </div>
    </div>
  );
}
