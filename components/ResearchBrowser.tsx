import React, { useState, useCallback } from 'react';
import { X, ExternalLink, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';

interface ResearchBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  url?: string;
  contentType?: 'ipfs' | 'huggingface' | 'github' | 'pdf' | 'html' | 'image' | 'video';
  content?: string;
}

export default function ResearchBrowser({
  isOpen,
  onClose,
  title = 'Research Browser',
  url: initialUrl,
  contentType = 'html',
  content,
}: ResearchBrowserProps) {
  const [currentUrl, setCurrentUrl] = useState(initialUrl || '');
  const [history, setHistory] = useState<string[]>(initialUrl ? [initialUrl] : []);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useCallback((url: string) => {
    setIsLoading(true);
    setCurrentUrl(url);
    const newHistory = [...history.slice(0, historyIndex + 1), url];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setTimeout(() => setIsLoading(false), 500);
  }, [history, historyIndex]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentUrl(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentUrl(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const detectContentType = (url: string): 'ipfs' | 'huggingface' | 'github' | 'pdf' | 'html' | 'image' | 'video' => {
    if (url.includes('ipfs.io') || url.startsWith('ipfs://')) return 'ipfs';
    if (url.includes('huggingface.co')) return 'huggingface';
    if (url.includes('github.com') || url.includes('raw.githubusercontent')) return 'github';
    if (url.endsWith('.pdf')) return 'pdf';
    if (/\.(png|jpg|jpeg|gif|webp|svg)/.test(url)) return 'image';
    if (/\.(mp4|webm|ogg)/.test(url)) return 'video';
    return 'html';
  };

  const getDisplayUrl = (url: string): string => {
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    return url;
  };

  const renderContent = () => {
    if (!currentUrl && !content) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-4">🔍</div>
            <p>Enter a URL to browse research content</p>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin text-gray-400">
            <RefreshCw size={32} />
          </div>
        </div>
      );
    }

    const type = contentType || detectContentType(currentUrl);
    const displayUrl = getDisplayUrl(currentUrl);

    switch (type) {
      case 'pdf':
        return (
          <iframe
            src={`${displayUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full border-0"
            title={title}
          />
        );

      case 'image':
        return (
          <div className="flex items-center justify-center h-full bg-black/50">
            <img
              src={displayUrl}
              alt={title}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        );

      case 'video':
        return (
          <div className="flex items-center justify-center h-full">
            <video controls className="max-w-full max-h-full" src={displayUrl}>
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'ipfs':
      case 'huggingface':
      case 'github':
      case 'html':
      default:
        if (content) {
          return (
            <div className="p-6 overflow-auto h-full">
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed font-mono">
                  {content}
                </pre>
              </div>
            </div>
          );
        }
        return (
          <iframe
            src={displayUrl}
            className="w-full h-full border-0"
            title={title}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[90vw] h-[85vh] bg-gray-900 rounded-xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden">
        {/* Header / URL Bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-900/95">
          {/* Window controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
            />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={goBack}
              disabled={historyIndex <= 0}
              className="p-1 rounded hover:bg-gray-800 disabled:opacity-30 text-gray-400"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={goForward}
              disabled={historyIndex >= history.length - 1}
              className="p-1 rounded hover:bg-gray-800 disabled:opacity-30 text-gray-400"
            >
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate(currentUrl)}
              className="p-1 rounded hover:bg-gray-800 text-gray-400"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* URL Bar */}
          <div className="flex-1 flex items-center bg-gray-800 rounded-lg px-3 py-1.5 mx-2">
            {currentUrl && (
              <span className="text-xs text-gray-500 mr-2 uppercase">
                {detectContentType(currentUrl)}
              </span>
            )}
            <input
              type="text"
              value={currentUrl}
              onChange={(e) => setCurrentUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(currentUrl);
              }}
              placeholder="Enter IPFS CID, HF model URL, GitHub link..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
            />
          </div>

          {/* Title */}
          <span className="text-gray-400 text-xs truncate max-w-48">{title}</span>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {currentUrl && (
              <a
                href={getDisplayUrl(currentUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <ExternalLink size={14} />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-gray-950">
          {renderContent()}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-gray-800 bg-gray-900/95 text-[10px] text-gray-500">
          <span>{currentUrl ? getDisplayUrl(currentUrl).slice(0, 80) : 'Ready'}</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Ava Browser v1.0
          </span>
        </div>
      </div>
    </div>
  );
}
