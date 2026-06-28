import React from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, X } from 'lucide-react';
import { motion } from 'motion/react';

interface NodeMarkdownViewerProps {
  nodeId: string;
  metadata: string;
  onClose: () => void;
}

const NodeMarkdownViewer: React.FC<NodeMarkdownViewerProps> = ({ nodeId, metadata, onClose }) => {
  const [content, setContent] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // If a node is an IPFS directory node or similar, we fetch the live content
    fetch('/api/ipfs/index')
      .then(res => res.text())
      .then(text => {
        const header = `# Node Specifications: ${nodeId}\n\n## Overview\n${metadata}\n\n`;
        setContent(header + text);
        setLoading(false);
      })
      .catch(err => {
        setContent(`# Node Specifications: ${nodeId}\n\n## Overview\n${metadata}\n\n> **Error**: Failed to connect to IPFS gateway.`);
        setLoading(false);
      });
  }, [nodeId, metadata]);

  const modalContent = (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 pointer-events-auto bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full max-w-4xl bg-black border border-white/10 shadow-[0_0_50px_rgba(0,150,255,0.1)] rounded-none flex flex-col relative"
      >
        {/* Tech decorative border corners */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500 z-10 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500 z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-500 z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500 z-10 pointer-events-none"></div>

        {/* Header */}
        <header className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-[#050505] shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/10 transition-colors text-white/50 hover:text-white shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex flex-col">
              <h2 className="text-sm font-bold font-mono tracking-widest text-cyan-400 uppercase truncate">
                {nodeId}
              </h2>
              <p className="text-[9px] font-mono text-white/40 uppercase tracking-[0.2em] mt-0.5 truncate flex items-center gap-2">
                <span>VIEWING_DOCUMENT</span>
                <span className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse"></span>
                <span>{metadata}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/10 transition-colors text-white/50 hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 bg-[#020202] relative" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
          <div className="max-w-none mx-auto prose prose-invert prose-sm md:prose-base 
            prose-p:text-white/70 prose-p:leading-relaxed prose-p:font-sans
            prose-headings:font-mono prose-headings:text-cyan-400 prose-headings:uppercase prose-headings:tracking-widest prose-headings:font-bold
            prose-h1:text-xl prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-4 prose-h1:mb-8
            prose-h2:text-sm prose-h2:mt-8
            prose-h3:text-xs prose-h3:text-emerald-400
            prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline hover:prose-a:text-cyan-300
            prose-strong:text-white prose-strong:font-bold
            prose-code:text-emerald-300 prose-code:font-mono prose-code:bg-emerald-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm
            prose-pre:bg-[#050505] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-none prose-pre:p-4
            prose-blockquote:border-l-2 prose-blockquote:border-cyan-500 prose-blockquote:bg-cyan-500/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-white/60
            prose-ul:text-white/70 prose-li:marker:text-cyan-500">
            {loading ? (
              <div className="flex items-center space-x-3 text-cyan-400 font-mono text-xs uppercase tracking-widest mt-4">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>Establishing uplink... fetching {nodeId}...</span>
              </div>
            ) : (
              <ReactMarkdown>{content}</ReactMarkdown>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default NodeMarkdownViewer;
