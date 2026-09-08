import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, BrainCircuit, ChevronDown, CircleDot, Command, FileText, Loader2, X, Zap } from 'lucide-react';

interface TerminalOverlayProps { isOpen: boolean; onClose: () => void; }
interface Message { role: 'user' | 'assistant' | 'system' | 'tool'; content: string | null; tool_calls?: any[]; tool_call_id?: string; name?: string; }

const TOOLS = [
  { type: 'function', function: { name: 'fs_read', description: 'Read a file or list a directory from the Artifact content repo.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'fs_write', description: 'Create or update a file in the Artifact content repo.', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' }, message: { type: 'string' } }, required: ['path', 'content'] } } },
  { type: 'function', function: { name: 'js_eval', description: 'Evaluate JavaScript for computation.', parameters: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] } } },
  { type: 'function', function: { name: 'web_search', description: 'Search the web.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'web_fetch', description: 'Fetch HTML content from a URL.', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } } },
  { type: 'function', function: { name: 'github_read', description: 'Read a file or directory from GitHub.', parameters: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, path: { type: 'string' } }, required: ['owner', 'repo'] } } },
  { type: 'function', function: { name: 'open_document', description: 'Open a research document in the interface.', parameters: { type: 'object', properties: { nodeId: { type: 'string' }, meta: { type: 'string' } }, required: ['nodeId'] } } },
];

const systemPrompt = 'You are AVA, the Artifact Virtual Assistant. Be concise, precise, and honest. Use tools when they are useful. Never claim to have run a shell command. The user is working inside Artifact Exchange, a research and investment operating system.';

const TerminalOverlay: React.FC<TerminalOverlayProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([{ role: 'system', content: systemPrompt }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, activeTool]);

  const executeToolCall = async (toolCall: any) => {
    const name = toolCall?.function?.name;
    let args: any = {};
    try { args = typeof toolCall?.function?.arguments === 'string' ? JSON.parse(toolCall.function.arguments) : (toolCall?.function?.arguments || {}); } catch { return JSON.stringify({ error: 'Invalid tool arguments' }); }
    setActiveTool(name || 'tool');
    try {
      if (name === 'open_document') { window.dispatchEvent(new CustomEvent('OPEN_DOCUMENT', { detail: args })); return JSON.stringify({ success: true }); }
      const routes: Record<string, string> = { fs_read: '/api/ava/read', fs_write: '/api/ava/write', js_eval: '/api/ava/eval', web_search: '/api/web/search', web_fetch: '/api/web/fetch' };
      if (name === 'github_read') {
        const response = await fetch(`/api/github/contents/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}?path=${encodeURIComponent(args.path || '')}`);
        return JSON.stringify(await response.json());
      }
      const route = routes[name];
      if (!route) return JSON.stringify({ error: 'Unknown tool' });
      const response = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(name === 'js_eval' ? { code: args.code } : args) });
      return JSON.stringify(await response.json());
    } catch (error: any) { return JSON.stringify({ error: error.message || 'Tool failed' }); }
    finally { setActiveTool(null); }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const next = [...messages, { role: 'user' as const, content: input.trim() }]; setMessages(next); setInput(''); setIsLoading(true);
    try {
      let current = next; let looping = true;
      while (looping) {
        const response = await fetch('/api/openrouter/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'openrouter/free', messages: current.map(({ role, content, name, tool_calls, tool_call_id }) => ({ role, content, name, tool_calls, tool_call_id })), tools: TOOLS }) });
        const result = await response.json();
        if (!response.ok || result.error) throw new Error(result.error?.message || result.error || 'AVA connection failed');
        current = [...current, result]; setMessages(current);
        if (result.tool_calls?.length) { for (const call of result.tool_calls) current = [...current, { role: 'tool', tool_call_id: call.id, name: call.function.name, content: await executeToolCall(call) }]; setMessages(current); }
        else looping = false;
      }
    } catch (error: any) { setMessages((current) => [...current, { role: 'assistant', content: `Connection interrupted: ${error.message || 'try again.'}` }]); }
    finally { setIsLoading(false); }
  };

  if (!isOpen) return null;
  return <div className="ava-shell fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-8" role="dialog" aria-modal="true" aria-label="AVA terminal">
    <button className="absolute inset-0 ava-backdrop" onClick={onClose} aria-label="Close AVA" />
    <section className="ava-panel relative flex h-[min(780px,calc(100dvh-24px))] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-cyan-300/20">
      <div className="ava-hud absolute inset-x-0 top-0 h-24 pointer-events-none" />
      <header className="relative flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-8 md:py-5">
        <div className="flex items-center gap-3"><div className="ava-mark"><BrainCircuit size={19} /></div><div><p className="font-mono text-[10px] uppercase tracking-[0.38em] text-cyan-100">AVA / terminal</p><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Artifact virtual assistant · connected</p></div></div>
        <div className="flex items-center gap-3"><span className="hidden rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-200/75 md:inline-flex"><CircleDot size={10} className="mr-2" /> live context</span><button onClick={onClose} className="rounded-full border border-white/10 p-2 text-white/50 transition hover:border-cyan-200/40 hover:text-white" aria-label="Close terminal"><X size={17} /></button></div>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 md:px-10 md:py-8">
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.filter((m) => m.role !== 'system').map((message, index) => <article key={index} className={`ava-message ${message.role === 'user' ? 'ava-user' : message.role === 'tool' ? 'ava-tool' : 'ava-assistant'}`}><div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.28em] text-white/35"><span>{message.role === 'user' ? 'you' : message.role === 'tool' ? `tool / ${message.name || 'execution'}` : 'ava'}</span>{message.role === 'assistant' && <Zap size={11} className="text-cyan-200/70" />}</div>{message.role === 'tool' ? <div className="font-mono text-[10px] leading-relaxed text-cyan-100/60">{message.content?.slice(0, 300)}{message.content && message.content.length > 300 ? '…' : ''}</div> : <div className="prose prose-invert prose-sm max-w-none prose-p:leading-7 prose-p:text-white/75 prose-headings:text-white prose-a:text-white prose-code:text-white"><ReactMarkdown>{message.content || ''}</ReactMarkdown></div>}</article>)}
            {isLoading && <div className="ava-thinking"><Loader2 size={15} className="animate-spin" /><span>AVA is mapping the next move</span></div>}
          </div>
        </div>
        {showTrace && <aside className="hidden w-64 border-l border-white/10 bg-white/[0.02] p-5 lg:block"><div className="mb-6 flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">execution trace</span><button onClick={() => setShowTrace(false)} className="text-white/30 hover:text-white" aria-label="Hide execution trace"><ChevronDown size={15} /></button></div><div className="flex flex-col gap-3">{activeTool ? <div className="ava-trace-bubble active"><Loader2 size={14} className="animate-spin" /><span>{activeTool}<small>running now</small></span></div> : <><div className="ava-trace-bubble"><BrainCircuit size={14} /><span>reasoning<small>ready for context</small></span></div><div className="ava-trace-bubble"><FileText size={14} /><span>repo context<small>artifact / exchange</small></span></div></>}</div></aside>}
      </div>
      <footer className="relative border-t border-white/10 p-4 md:p-6"><div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-cyan-200/15 bg-black/30 px-4 py-3 shadow-[0_0_40px_rgba(34,211,238,0.06)]"><Command size={16} className="shrink-0 text-cyan-200/60" /><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) handleSend(); }} placeholder="Ask AVA about the network..." className="min-w-0 flex-1 bg-transparent font-mono text-xs text-white outline-none placeholder:text-white/25" autoFocus /><button onClick={handleSend} disabled={isLoading || !input.trim()} className="rounded-xl bg-cyan-200/90 p-2 text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30" aria-label="Send message"><ArrowUp size={16} /></button></div></footer>
    </section>
  </div>;
};
export default TerminalOverlay;
