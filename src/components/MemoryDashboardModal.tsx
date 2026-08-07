import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Tag, 
  Clock, 
  Calendar, 
  X, 
  Check, 
  User, 
  Heart, 
  Users, 
  Target, 
  FolderGit2, 
  Briefcase, 
  GraduationCap, 
  Sparkles, 
  Bookmark,
  ShieldAlert,
  SlidersHorizontal,
  Flame,
  LayoutGrid
} from 'lucide-react';
import { SanaMemory, MemoryCategory, MemoryImportance, MemoryCandidate } from '../types';
import { createMemory, updateMemory, deleteMemory } from '../services/memoryService';

interface MemoryDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: SanaMemory[];
}

const CATEGORY_ITEMS: { key: 'All' | MemoryCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'All', label: 'All Memories', icon: <LayoutGrid size={16} />, color: 'text-cyan-400' },
  { key: 'Identity', label: 'Identity', icon: <User size={16} />, color: 'text-amber-400' },
  { key: 'Preferences', label: 'Preferences', icon: <Heart size={16} />, color: 'text-rose-400' },
  { key: 'Relationships', label: 'Relationships', icon: <Users size={16} />, color: 'text-purple-400' },
  { key: 'Goals', label: 'Goals', icon: <Target size={16} />, color: 'text-emerald-400' },
  { key: 'Projects', label: 'Projects', icon: <FolderGit2 size={16} />, color: 'text-blue-400' },
  { key: 'Work', label: 'Work', icon: <Briefcase size={16} />, color: 'text-orange-400' },
  { key: 'Education', label: 'Education', icon: <GraduationCap size={16} />, color: 'text-indigo-400' },
  { key: 'Interests', label: 'Interests', icon: <Sparkles size={16} />, color: 'text-pink-400' },
  { key: 'Custom', label: 'Custom Memory', icon: <Bookmark size={16} />, color: 'text-teal-400' }
];

export function MemoryDashboardModal({ isOpen, onClose, memories }: MemoryDashboardModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'All' | MemoryCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [importanceFilter, setImportanceFilter] = useState<'All' | MemoryImportance>('All');

  // Modal State for Adding / Editing
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<SanaMemory | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<MemoryCategory>('Identity');
  const [formImportance, setFormImportance] = useState<MemoryImportance>('Medium');
  const [formTags, setFormTags] = useState('');

  // Delete Confirm ID
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter Memories
  const filteredMemories = useMemo(() => {
    return memories.filter((mem) => {
      const matchCategory = selectedCategory === 'All' || mem.category === selectedCategory;
      const matchImportance = importanceFilter === 'All' || mem.importance === importanceFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        mem.title.toLowerCase().includes(q) ||
        mem.content.toLowerCase().includes(q) ||
        mem.category.toLowerCase().includes(q) ||
        mem.tags.some((t) => t.toLowerCase().includes(q));

      return matchCategory && matchImportance && matchSearch;
    });
  }, [memories, selectedCategory, importanceFilter, searchQuery]);

  // Counts by Category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: memories.length };
    memories.forEach((mem) => {
      counts[mem.category] = (counts[mem.category] || 0) + 1;
    });
    return counts;
  }, [memories]);

  if (!isOpen) return null;

  // Open Editor for Creating
  const handleOpenCreate = () => {
    setEditingMemory(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory(selectedCategory === 'All' ? 'Identity' : selectedCategory);
    setFormImportance('Medium');
    setFormTags('');
    setIsEditorOpen(true);
  };

  // Open Editor for Modifying
  const handleOpenEdit = (mem: SanaMemory) => {
    setEditingMemory(mem);
    setFormTitle(mem.title);
    setFormContent(mem.content);
    setFormCategory(mem.category);
    setFormImportance(mem.importance);
    setFormTags(mem.tags.join(', '));
    setIsEditorOpen(true);
  };

  // Save Memory (Create or Update)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    const tagsArr = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const candidate: MemoryCandidate = {
      title: formTitle,
      content: formContent,
      category: formCategory,
      importance: formImportance,
      tags: tagsArr
    };

    if (editingMemory) {
      await updateMemory(editingMemory.id, candidate);
    } else {
      await createMemory(candidate);
    }

    setIsEditorOpen(false);
  };

  // Delete Memory
  const handleDelete = async (id: string) => {
    await deleteMemory(id);
    setDeletingId(null);
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return 'Recent';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-5xl h-[88vh] bg-slate-950 border border-slate-800/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
        >
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 text-orange-400">
                <Brain size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>SANA AI Memory Bank</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30">
                    {memories.length} Saved
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Manage personal facts and preferences remembered by SANA for personalized conversations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCreate}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-1.5"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add Memory</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
                title="Close Dashboard"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body Content Layout: Sidebar + Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Category Sidebar */}
            <div className="w-48 sm:w-60 bg-slate-900/40 border-r border-slate-800/80 p-3 overflow-y-auto space-y-1 shrink-0 hidden sm:block">
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Categories
              </div>

              {CATEGORY_ITEMS.map((item) => {
                const count = categoryCounts[item.key] || 0;
                const isSelected = selectedCategory === item.key;

                return (
                  <button
                    key={item.key}
                    onClick={() => setSelectedCategory(item.key)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-orange-500/15 border border-orange-500/40 text-orange-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={item.color}>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {count > 0 && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                          isSelected ? 'bg-orange-500/30 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Main Grid View */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950/60">
              {/* Mobile Category Dropdown & Filter Bar */}
              <div className="p-3 sm:p-4 border-b border-slate-800/80 bg-slate-900/30 space-y-3 shrink-0">
                {/* Mobile Category Select */}
                <div className="block sm:hidden">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none"
                  >
                    {CATEGORY_ITEMS.map((item) => (
                      <option key={item.key} value={item.key} className="bg-slate-900">
                        {item.label} ({categoryCounts[item.key] || 0})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search and Importance Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  {/* Search Bar */}
                  <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search memory titles, tags, content..."
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Importance Filter */}
                  <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto">
                    <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Priority:</span>
                    {(['All', 'High', 'Medium', 'Low'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setImportanceFilter(lvl)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                          importanceFilter === lvl
                            ? 'bg-slate-800 border border-slate-700 text-amber-300 font-semibold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Memories List / Cards Grid */}
              <div className="flex-1 p-4 overflow-y-auto min-h-0">
                {filteredMemories.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                      <Brain size={28} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300">No memories found</h4>
                      <p className="text-xs text-slate-500 max-w-xs mt-1">
                        {searchQuery
                          ? 'Try adjusting your search query or filters.'
                          : 'SANA hasn\'t saved any memories under this category yet. Click "Add Memory" to add one manually.'}
                      </p>
                    </div>
                    {!searchQuery && (
                      <button
                        onClick={handleOpenCreate}
                        className="px-4 py-2 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-semibold hover:bg-orange-500/30 transition-all"
                      >
                        Create First Memory
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredMemories.map((mem) => {
                      const catItem = CATEGORY_ITEMS.find((c) => c.key === mem.category);

                      return (
                        <div
                          key={mem.id}
                          className="group relative bg-slate-900/70 border border-slate-800/80 hover:border-orange-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-orange-500/5"
                        >
                          {/* Top Row */}
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              {/* Category Badge */}
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-semibold text-slate-300">
                                <span className={catItem?.color || 'text-cyan-400'}>
                                  {catItem?.icon || <Bookmark size={12} />}
                                </span>
                                <span>{mem.category}</span>
                              </div>

                              {/* Importance & Actions */}
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                    mem.importance === 'High'
                                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                      : mem.importance === 'Medium'
                                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {mem.importance}
                                </span>

                                <button
                                  onClick={() => handleOpenEdit(mem)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                  title="Edit Memory"
                                >
                                  <Edit3 size={14} />
                                </button>

                                <button
                                  onClick={() => setDeletingId(mem.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                  title="Delete Memory"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Title */}
                            <h3 className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors mb-1.5">
                              {mem.title}
                            </h3>

                            {/* Content */}
                            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40 mb-3 whitespace-pre-wrap">
                              {mem.content}
                            </p>
                          </div>

                          {/* Bottom Metadata */}
                          <div className="space-y-2 pt-2 border-t border-slate-800/60">
                            {/* Tags */}
                            {mem.tags && mem.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {mem.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="px-2 py-0.5 rounded-md bg-slate-950 text-[10px] text-slate-400 font-mono border border-slate-800"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Timestamps */}
                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                              <span className="flex items-center gap-1">
                                <Calendar size={10} />
                                Created: {formatDate(mem.createdDate)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                Recalled: {formatDate(mem.lastUsed)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Editor Modal for Adding / Editing */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Brain size={18} className="text-orange-400" />
                <span>{editingMemory ? 'Edit Saved Memory' : 'Add New Memory'}</span>
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px] tracking-wider">
                  Memory Title
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Preferred Programming Language"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px] tracking-wider">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MemoryCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-orange-500"
                  >
                    {CATEGORY_ITEMS.filter((c) => c.key !== 'All').map((c) => (
                      <option key={c.key} value={c.key} className="bg-slate-900">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px] tracking-wider">
                    Importance
                  </label>
                  <select
                    value={formImportance}
                    onChange={(e) => setFormImportance(e.target.value as MemoryImportance)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="High" className="bg-slate-900">High</option>
                    <option value="Medium" className="bg-slate-900">Medium</option>
                    <option value="Low" className="bg-slate-900">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px] tracking-wider">
                  Memory Details
                </label>
                <textarea
                  rows={3}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Describe the fact, preference or goal..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px] tracking-wider">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="e.g. react, typescript, preference"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-medium hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold shadow-lg shadow-orange-500/20"
                >
                  Save Memory
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-white space-y-3"
          >
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
              <ShieldAlert size={20} />
              <span>Delete Memory?</span>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete this memory? SANA will no longer recall this fact in future chats.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
