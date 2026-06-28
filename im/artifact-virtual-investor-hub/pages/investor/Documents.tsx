import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { DOCUMENTS } from '../../services/repository';
import { FileText, Clock, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export const Documents = () => {
  const [selectedDocId, setSelectedDocId] = useState(DOCUMENTS[0].id);
  const activeDoc = DOCUMENTS.find(d => d.id === selectedDocId) || DOCUMENTS[0];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
      {/* Sidebar List */}
      <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-4">
         <div>
            <h2 className="text-2xl font-bold text-white">Documents</h2>
            <p className="text-zinc-400 text-sm">Confidential investor materials.</p>
         </div>
         <div className="flex-1 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl p-2 space-y-1">
            {DOCUMENTS.map(doc => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={clsx(
                  "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                  selectedDocId === doc.id 
                    ? "bg-teal-500/10 border border-teal-500/20 text-white" 
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                )}
              >
                <div className={clsx("p-2 rounded-md", selectedDocId === doc.id ? "bg-teal-500 text-black" : "bg-zinc-800 text-zinc-500")}>
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.title}</p>
                  <p className="text-xs opacity-60 flex items-center gap-1">
                     <Clock className="h-3 w-3" /> {doc.lastUpdated}
                  </p>
                </div>
                {selectedDocId === doc.id && <ChevronRight className="h-4 w-4 text-teal-500" />}
              </button>
            ))}
         </div>
      </div>

      {/* Document Viewer */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
         <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 flex justify-between items-center">
             <h3 className="font-semibold text-white">{activeDoc.filename}</h3>
             <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">{activeDoc.category}</span>
         </div>
         <div className="flex-1 overflow-y-auto p-8 custom-markdown">
            <Markdown 
              className="prose prose-invert prose-zinc max-w-none 
              prose-headings:text-white prose-headings:font-bold 
              prose-h1:text-3xl prose-h1:mb-6 prose-h1:border-b prose-h1:border-zinc-800 prose-h1:pb-4
              prose-h2:text-xl prose-h2:text-teal-400 prose-h2:mt-8
              prose-table:border-collapse prose-table:w-full prose-table:text-sm prose-table:my-8
              prose-th:bg-zinc-800 prose-th:p-3 prose-th:text-left prose-th:text-white
              prose-td:border-b prose-td:border-zinc-800 prose-td:p-3 prose-td:text-zinc-300
              prose-hr:border-zinc-800
              prose-strong:text-white
              "
            >
              {activeDoc.content}
            </Markdown>
         </div>
      </div>
    </div>
  );
};
