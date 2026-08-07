import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Bookmark, 
  BookmarkCheck, 
  Copy, 
  Check, 
  ExternalLink, 
  Send, 
  Trash2, 
  Download, 
  Search, 
  X, 
  Sparkles,
  BookOpen,
  Link2
} from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onToggleSave: (id: string) => void;
  onClearHistory: () => void;
  onSendMessage?: (text: string) => void;
  isConnected: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  messages,
  onToggleSave,
  onClearHistory,
  onSendMessage,
  isConnected
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !onSendMessage) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const exportNotes = () => {
    const listToExport = activeTab === 'saved' 
      ? messages.filter(m => m.isSaved) 
      : messages;

    if (listToExport.length === 0) return;

    const exportText = listToExport
      .map(m => `[${m.timestamp}] ${m.isModel ? 'SANA' : 'User'}:\n${m.text}\n`)
      .join('\n---\n\n');

    const blob = new Blob([exportText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SANA_${activeTab === 'saved' ? 'Saved_Notes' : 'Chat_History'}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper to highlight and turn links into clickable anchors
  const renderMessageContent = (text: string) => {
    const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
    const urlRegex = /(https?:\/\/[^\s\)]+|www\.[^\s\)]+)/g;

    const processTextWithLinks = (rawText: string) => {
      const tokens: React.ReactNode[] = [];
      let lastIdx = 0;

      const mdMatches = Array.from(rawText.matchAll(markdownLinkRegex));
      
      if (mdMatches.length > 0) {
        mdMatches.forEach((match, i) => {
          const matchStart = match.index!;
          if (matchStart > lastIdx) {
            tokens.push(rawText.substring(lastIdx, matchStart));
          }
          const label = match[1];
          const url = match[2];
          tokens.push(
            <a
              key={`md_${i}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-orange-300 underline underline-offset-2 hover:text-orange-200 bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 rounded-md transition-all my-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Link2 size={13} className="text-orange-400" />
              <span>{label}</span>
              <ExternalLink size={12} className="opacity-70" />
            </a>
          );
          lastIdx = matchStart + match[0].length;
        });

        if (lastIdx < rawText.length) {
          tokens.push(rawText.substring(lastIdx));
        }
        return tokens;
      }

      const parts = rawText.split(urlRegex);
      return parts.map((part, index) => {
        if (part.match(urlRegex)) {
          const href = part.startsWith('www.') ? `https://${part}` : part;
          return (
            <a
              key={`url_${index}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-orange-300 underline underline-offset-2 hover:text-orange-200 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded transition-colors my-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Link2 size={12} />
              <span className="truncate max-w-[240px]">{part}</span>
              <ExternalLink size={12} className="opacity-70 flex-shrink-0" />
            </a>
          );
        }
        return part;
      });
    };

    return (
      <div className="space-y-2 leading-relaxed break-words text-xs sm:text-sm">
        <p className="whitespace-pre-wrap">{processTextWithLinks(text)}</p>
      </div>
    );
  };

  const filteredMessages = messages.filter(m => {
    const matchesTab = activeTab === 'all' || (activeTab === 'saved' && m.isSaved);
    const matchesSearch = !searchQuery || m.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const savedCount = messages.filter(m => m.isSaved).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md z-[190]"
      />
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-slate-950/98 backdrop-blur-2xl border-l border-white/15 z-[200] flex flex-col shadow-2xl"
      >
        {/* Panel Header */}
        <div className="p-5 border-b border-white/10 flex flex-col gap-4 bg-white/5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                <Sparkles size={18} className="text-orange-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight">Mentorship Log & Notes</h2>
                <p className="text-[11px] text-white/50">Recorded transcript & saved course links</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={exportNotes}
                  className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Export / Download Notes"
                >
                  <Download size={18} />
                </button>
              )}
              {messages.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="p-2 text-white/40 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors"
                  title="Clear Log"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 rounded-xl transition-all text-xs font-bold flex items-center gap-1 border border-orange-500/40 min-h-[38px] active:scale-95 shadow-md"
                title="Close Notes & Chat"
              >
                <X size={18} className="text-orange-400" />
                <span>বন্ধ করুন</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <MessageSquare size={14} />
              <span>Live Chat ({messages.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'saved'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Bookmark size={14} />
              <span>Saved Notes ({savedCount})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder={activeTab === 'saved' ? "Search saved notes & links..." : "Search messages..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Message Feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/30">
              <BookOpen size={40} className="mb-3 stroke-1 text-white/20" />
              <p className="text-sm font-medium text-white/60">
                {activeTab === 'saved' 
                  ? "No saved notes or links yet." 
                  : "No messages recorded yet."}
              </p>
              <p className="text-xs text-white/40 max-w-xs mt-1">
                {activeTab === 'saved' 
                  ? "Click the bookmark icon on any message or course response to save it here." 
                  : "Start a conversation with SANA by speaking or typing below!"}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col gap-1 ${msg.isModel ? 'items-start' : 'items-end'}`}
              >
                <div className="flex items-center gap-2 text-[10px] text-white/40 px-1">
                  <span>{msg.isModel ? 'SANA' : 'You'}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`group relative max-w-[90%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed border transition-all ${
                    msg.isModel
                      ? 'bg-white/5 text-white/90 border-white/10 shadow-sm'
                      : 'bg-orange-500/20 text-orange-100 border-orange-500/30'
                  }`}
                >
                  {renderMessageContent(msg.text)}

                  {/* Actions Bar */}
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-3 text-[11px] text-white/50">
                    <button
                      onClick={() => onToggleSave(msg.id)}
                      className={`flex items-center gap-1.5 transition-colors ${
                        msg.isSaved 
                          ? 'text-orange-400 font-medium' 
                          : 'hover:text-white'
                      }`}
                      title={msg.isSaved ? "Remove from saved notes" : "Save note/link"}
                    >
                      {msg.isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      <span>{msg.isSaved ? 'Saved' : 'Save Note'}</span>
                    </button>

                    <button
                      onClick={() => copyToClipboard(msg.id, msg.text)}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                      title="Copy text"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={14} className="text-green-400" />
                          <span className="text-green-400 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Text Input Footer */}
        <div className="p-3 border-t border-white/10 bg-black/40">
          <form onSubmit={handleSend} className="flex gap-2 items-center">
            <input
              type="text"
              placeholder={isConnected ? "Type a question or paste a link..." : "Connect voice to chat with SANA..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={!isConnected}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50 disabled:opacity-40 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || !isConnected}
              className="p-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-40 disabled:hover:bg-orange-500 transition-colors flex items-center justify-center shadow-lg"
              title="Send text to SANA"
            >
              <Send size={16} />
            </button>
          </form>
          {!isConnected && (
            <p className="text-[10px] text-white/30 text-center mt-2">
              💡 Tip: Click the power button to connect voice session and enable chat.
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
