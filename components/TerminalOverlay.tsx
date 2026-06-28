import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X } from 'lucide-react';

interface TerminalOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "fs_read",
      description: "Read the contents of a file",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "fs_write",
      description: "Write content to a file",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "shell_exec",
      description: "Execute a shell command",
      parameters: {
        type: "object",
        properties: { command: { type: "string" } },
        required: ["command"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_fetch",
      description: "Fetch HTML content from a URL",
      parameters: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_document",
      description: "Open a research document in the UI",
      parameters: {
        type: "object",
        properties: { 
          nodeId: { type: "string", description: "The ID or Title of the document" },
          meta: { type: "string", description: "Optional metadata label" }
        },
        required: ["nodeId"]
      }
    }
  }
];

const TerminalOverlay: React.FC<TerminalOverlayProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'You are AVA, an AI assistant operating within the Artifact Network terminal. You have access to local filesystem (read/write), shell execution, web search, web fetch, and you can open documents in the user interface (open_document). Be concise, professional, and execute commands efficiently.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const executeToolCall = async (toolCall: any) => {
    if (!toolCall || !toolCall.function) return JSON.stringify({ error: "Invalid tool call format" });
    const { name, arguments: argsString } = toolCall.function;
    
    let args: any = {};
    try {
      args = typeof argsString === 'string' ? JSON.parse(argsString) : (argsString || {});
    } catch(e) {
      return JSON.stringify({ error: "Failed to parse tool arguments" });
    }

    try {
      if (name === "open_document") {
        window.dispatchEvent(new CustomEvent("OPEN_DOCUMENT", { detail: { nodeId: args.nodeId, meta: args.meta } }));
        return JSON.stringify({ success: true, message: `Document '${args.nodeId}' opened in UI.` });
      } else if (name === "fs_read") {
        const res = await fetch("/api/fs/read", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(args) });
        return JSON.stringify(await res.json());
      } else if (name === "fs_write") {
        const res = await fetch("/api/fs/write", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(args) });
        return JSON.stringify(await res.json());
      } else if (name === "shell_exec") {
        const res = await fetch("/api/shell/exec", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(args) });
        return JSON.stringify(await res.json());
      } else if (name === "web_search") {
        const res = await fetch("/api/web/search", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(args) });
        return JSON.stringify(await res.json());
      } else if (name === "web_fetch") {
        const res = await fetch("/api/web/fetch", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(args) });
        return JSON.stringify(await res.json());
      }
    } catch (e: any) {
      return JSON.stringify({ error: e.message });
    }
    return JSON.stringify({ error: "Unknown tool" });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const newMessages = [...messages, { role: 'user', content: input } as Message];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      let currentMessages = [...newMessages];
      let continueLoop = true;
      
      while (continueLoop) {
        const res = await fetch('/api/openrouter/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "openrouter/free",
            messages: currentMessages.map(m => ({
              role: m.role,
              content: m.content,
              name: m.name,
              tool_calls: m.tool_calls,
              tool_call_id: m.tool_call_id
            })),
            tools: TOOLS
          })
        });
        
        const responseMessage = await res.json();
        
        if (!res.ok || responseMessage.error) {
          throw new Error(responseMessage.error?.message || responseMessage.error || "Failed to fetch from OpenRouter");
        }

        currentMessages.push(responseMessage);
        setMessages([...currentMessages]);

        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
          for (const toolCall of responseMessage.tool_calls) {
            const toolResult = await executeToolCall(toolCall);
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: toolResult
            });
          }
          setMessages([...currentMessages]);
        } else {
          continueLoop = false;
        }
      }
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message || 'Connection failed.'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#030303]/95 backdrop-blur-md p-4">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative w-full h-full max-w-5xl md:h-[85vh] bg-[#030303] flex flex-col rounded-none">
        {/* Terminal Header */}
        <div className="flex items-center justify-between p-6">
          <span className="text-indigo-500 font-mono text-sm tracking-[0.4em] uppercase">
            AVA
          </span>
          <button
            onClick={onClose}
            className="text-indigo-900 hover:text-indigo-400 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto p-6 md:p-8 font-mono text-sm"
          ref={scrollRef}
        >
          {messages
            .filter((m) => m.role !== "system")
            .map((msg, i) => (
              <div
                key={i}
                className={`mb-10 ${
                  msg.role === "user"
                    ? "text-blue-500"
                    : msg.role === "tool"
                    ? "text-indigo-900 text-xs"
                    : "text-indigo-400"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="opacity-50 mt-1 select-none">
                    {msg.role === "user"
                      ? "USR"
                      : msg.role === "tool"
                      ? "SYS"
                      : "AVA"}
                  </span>
                  <div className="flex-1">
                    {msg.role === "tool" ? (
                      <div className="p-4 bg-black">
                        [Tool]: {msg.content?.slice(0, 200)}
                        {msg.content && msg.content.length > 200 ? "..." : ""}
                      </div>
                    ) : msg.tool_calls ? (
                      <div className="space-y-4">
                        {msg.content && (
                          <ReactMarkdown className="prose prose-invert prose-sm max-w-none prose-a:text-indigo-300">
                            {msg.content}
                          </ReactMarkdown>
                        )}
                        {msg.tool_calls.map((tc, idx) => (
                          <div
                            key={idx}
                            className="bg-black text-indigo-800 p-4 text-xs uppercase tracking-widest break-all"
                          >
                            EXEC: {tc.function?.name}(
                            {typeof tc.function?.arguments === "string"
                              ? tc.function.arguments
                              : JSON.stringify(tc.function?.arguments || {})}
                            )
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ReactMarkdown 
                        className={`prose prose-invert prose-sm max-w-none 
                          ${msg.role === "user" 
                            ? "prose-p:text-blue-500 prose-headings:text-blue-500 prose-a:text-blue-300" 
                            : "prose-p:text-indigo-400 prose-headings:text-indigo-400 prose-a:text-indigo-300"} 
                          prose-pre:bg-black prose-pre:rounded-none prose-code:text-indigo-300`}
                      >
                        {msg.content || ""}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              </div>
            ))}
          {isLoading && (
            <div className="flex items-center gap-4 text-indigo-600 mt-6">
              <span className="animate-pulse">AVA</span>
              <span className="text-xs uppercase tracking-widest">
                THINKING...
              </span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-[#030303]">
          <div className="flex items-center gap-4">
            <span className="text-blue-600 font-mono text-sm">USR</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="TYPE COMMAND..."
              className="flex-1 bg-transparent border-none outline-none text-blue-500 font-mono text-sm placeholder:text-blue-900 uppercase"
              autoFocus
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalOverlay;
