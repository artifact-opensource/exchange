import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: number;
  metadata?: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
  value: number;
}

interface NetworkChartProps {
  onNodeClick?: (node: Node) => void;
}

const NetworkChart: React.FC<NetworkChartProps> = ({ onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<{ node: Node, x: number, y: number } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = 400;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    const nodes: Node[] = [
      { id: "Core", group: 1, metadata: "Main infrastructure orchestrator" },
      { id: "Node A", group: 2, metadata: "Data processing layer" },
      { id: "Node B", group: 2, metadata: "Neural integration point" },
      { id: "Node C", group: 2, metadata: "Blockchain verifier" },
      { id: "Node D", group: 3, metadata: "Compute node" },
      { id: "Node E", group: 3, metadata: "Storage layer" },
      { id: "Node F", group: 4, metadata: "Client interfacing API" },
      { id: "Node G", group: 4, metadata: "Load balancer" },
      { id: "Node H", group: 5, metadata: "Analytics engine" }
    ];

    const links: Link[] = [
      { source: "Core", target: "Node A", value: 1 },
      { source: "Core", target: "Node B", value: 1 },
      { source: "Core", target: "Node C", value: 1 },
      { source: "Node A", target: "Node D", value: 1 },
      { source: "Node B", target: "Node E", value: 1 },
      { source: "Node C", target: "Node F", value: 1 },
      { source: "Node D", target: "Node G", value: 1 },
      { source: "Node E", target: "Node H", value: 1 },
      { source: "Node F", target: "Core", value: 1 },
      { source: "Node G", target: "Node C", value: 1 },
      { source: "Node H", target: "Node A", value: 1 }
    ];

    const svg = d3.select(svgRef.current)
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);
      
    svg.on("click", () => {
      setSelectedNode(null);
    });

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(60))
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(25));

    const link = svg.append("g")
      .attr("stroke", "rgba(255,255,255,0.2)")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value));

    const nodeGroup = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    nodeGroup.append("circle")
      .attr("r", d => d.id === "Core" ? 6 : 4)
      .attr("fill", d => d.id === "Core" ? "#fff" : "rgba(255,255,255,0.5)")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .attr("class", "transition-all duration-200 cursor-pointer");

    nodeGroup.append("text")
      .text(d => d.id)
      .attr("x", 8)
      .attr("y", "0.31em")
      .attr("font-size", 10)
      .attr("font-family", "monospace")
      .attr("fill", "rgba(255,255,255,0.7)")
      .attr("class", "transition-all duration-200 cursor-pointer");

    // Hover interactions
    const linkedByIndex: Record<string, boolean> = {};
    links.forEach(d => {
      linkedByIndex[`${(d.source as Node).id},${(d.target as Node).id}`] = true;
    });

    function isConnected(a: Node, b: Node) {
      return linkedByIndex[`${a.id},${b.id}`] || linkedByIndex[`${b.id},${a.id}`] || a.id === b.id;
    }

    nodeGroup
      .on("mouseover", (event, d: Node) => {
        nodeGroup.selectAll("circle").attr("opacity", (o: any) => isConnected(d, o) ? 1 : 0.2);
        nodeGroup.selectAll("text").attr("opacity", (o: any) => isConnected(d, o) ? 1 : 0.2);
        link
          .attr("stroke-opacity", (o: any) => (o.source.id === d.id || o.target.id === d.id ? 1 : 0.1))
          .attr("stroke", (o: any) => (o.source.id === d.id || o.target.id === d.id ? "#10b981" : "rgba(255,255,255,0.2)"));
      })
      .on("mouseout", () => {
        nodeGroup.selectAll("circle").attr("opacity", 1);
        nodeGroup.selectAll("text").attr("opacity", 1);
        link
          .attr("stroke-opacity", 0.6)
          .attr("stroke", "rgba(255,255,255,0.2)");
      })
      .on("click", (event, d: Node) => {
        event.stopPropagation();
        const [x, y] = d3.pointer(event, svgRef.current);
        setSelectedNode({ node: d, x, y });
        if (onNodeClick) {
          onNodeClick(d);
        }
      });

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x!)
        .attr("y1", d => (d.source as Node).y!)
        .attr("x2", d => (d.target as Node).x!)
        .attr("y2", d => (d.target as Node).y!);

      nodeGroup
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, []);

  return (
    <div className="relative w-full h-[400px] border border-white/10 rounded-sm bg-black/20 flex items-center justify-center overflow-hidden">
      <svg ref={svgRef} className="w-full h-full" />
      
      {selectedNode && (
        <div 
          className="absolute z-10 p-3 bg-black/90 border border-white/20 rounded shadow-lg pointer-events-none backdrop-blur-sm min-w-[150px]"
          style={{
            left: Math.min(selectedNode.x + 15, (svgRef.current?.clientWidth || 0) - 160),
            top: Math.min(selectedNode.y + 15, 300)
          }}
        >
          <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest mb-1">
            {selectedNode.node.id}
          </div>
          <div className="text-xs text-white/70">
            {selectedNode.node.metadata || "No metadata available"}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkChart;
