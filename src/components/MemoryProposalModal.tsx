import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Check, X, Tag, Sparkles, AlertCircle } from 'lucide-react';
import { MemoryCandidate, MemoryCategory, MemoryImportance } from '../types';

interface MemoryProposalModalProps {
  candidate: MemoryCandidate | null;
  onSave: (candidate: MemoryCandidate) => void;
  onDiscard: () => void;
}

const CATEGORIES: MemoryCategory[] = [
  'Identity',
  'Preferences',
  'Relationships',
  'Goals',
  'Projects',
  'Work',
  'Education',
  'Interests',
  'Custom'
];

export function MemoryProposalModal({ candidate, onSave, onDiscard }: MemoryProposalModalProps) {
  const [formData, setFormData] = useState<MemoryCandidate | null>(candidate);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setFormData(candidate);
    if (candidate?.tags) {
      setTagInput(candidate.tags.join(', '));
    }
  }, [candidate]);

  if (!candidate || !formData) return null;

  const handleSave = () => {
    const tagsArr = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      ...formData,
      tags: tagsArr.length > 0 ? tagsArr : formData.tags
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white overflow-hidden"
        >
          {/* Header Gradient */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-500" />

          {/* Top Info Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                <Brain size={22} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <span>SANA Memory Suggestion</span>
                  <Sparkles size={14} className="text-amber-400" />
                </h3>
                <p className="text-[11px] text-slate-400">
                  Should SANA save this information to recall in future conversations?
                </p>
              </div>
            </div>

            <button
              onClick={onDiscard}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Discard"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Fields */}
          <div className="mt-4 space-y-3.5 text-xs">
            {/* Title */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px] tracking-wider">
                Memory Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60"
                placeholder="Title..."
              />
            </div>

            {/* Category & Importance */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px] tracking-wider">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as MemoryCategory })}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500/60"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-900 text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px] tracking-wider">
                  Importance
                </label>
                <select
                  value={formData.importance}
                  onChange={(e) => setFormData({ ...formData, importance: e.target.value as MemoryImportance })}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500/60"
                >
                  <option value="High" className="bg-slate-900 text-white">High</option>
                  <option value="Medium" className="bg-slate-900 text-white">Medium</option>
                  <option value="Low" className="bg-slate-900 text-white">Low</option>
                </select>
              </div>
            </div>

            {/* Memory Content */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px] tracking-wider">
                Memory Content
              </label>
              <textarea
                rows={3}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60 resize-none"
                placeholder="Detail content..."
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px] tracking-wider flex items-center gap-1">
                <Tag size={12} className="text-orange-400" />
                <span>Tags (comma separated)</span>
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60"
                placeholder="e.g. personal, preferred, identity"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={onDiscard}
              className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 font-medium text-xs transition-colors flex items-center gap-1.5"
            >
              <X size={14} />
              <span>Discard</span>
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Check size={16} />
              <span>Save Memory</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
