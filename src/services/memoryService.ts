import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SanaMemory, MemoryCandidate, MemoryCategory, MemoryImportance } from '../types';

const MEMORIES_COLLECTION = 'memories';
const LOCAL_STORAGE_KEY = 'sana_memories_fallback';

// Default initial sample memories if user has no saved memories yet
export const DEFAULT_MEMORIES: Omit<SanaMemory, 'id'>[] = [
  {
    title: 'User Preferred Name',
    content: 'User prefers to be called Sayan.',
    category: 'Identity',
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    importance: 'High',
    tags: ['name', 'identity', 'personal']
  },
  {
    title: 'Language & Voice Style',
    content: 'Prefers bilingual communication in Bengali and English with a helpful, friendly tone.',
    category: 'Preferences',
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    importance: 'High',
    tags: ['language', 'bilingual', 'voice']
  }
];

// Fallback localStorage helper
function getLocalMemories(): SanaMemory[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function setLocalMemories(memories: SanaMemory[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memories));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

/**
 * Subscribe to real-time updates from Firestore 'memories' collection
 */
export function subscribeMemories(callback: (memories: SanaMemory[]) => void): () => void {
  try {
    const colRef = collection(db, MEMORIES_COLLECTION);
    const q = query(colRef, orderBy('updatedDate', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const memories: SanaMemory[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          memories.push({
            id: docSnap.id,
            title: data.title || 'Untitled Memory',
            content: data.content || '',
            category: (data.category as MemoryCategory) || 'Custom',
            createdDate: data.createdDate || new Date().toISOString(),
            updatedDate: data.updatedDate || new Date().toISOString(),
            lastUsed: data.lastUsed || new Date().toISOString(),
            importance: (data.importance as MemoryImportance) || 'Medium',
            tags: Array.isArray(data.tags) ? data.tags : []
          });
        });

        // Update local backup cache
        if (memories.length > 0) {
          setLocalMemories(memories);
        }

        callback(memories);
      },
      (error) => {
        console.warn('Firestore subscription error, falling back to local memory cache:', error);
        callback(getLocalMemories());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to setup Firestore listener, using local storage:', err);
    callback(getLocalMemories());
    return () => {};
  }
}

/**
 * Save new memory entry
 */
export async function createMemory(candidate: MemoryCandidate): Promise<string> {
  const now = new Date().toISOString();
  const newMemoryData = {
    title: candidate.title.trim() || 'New Memory',
    content: candidate.content.trim(),
    category: candidate.category || 'Custom',
    createdDate: now,
    updatedDate: now,
    lastUsed: now,
    importance: candidate.importance || 'Medium',
    tags: candidate.tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
  };

  try {
    const colRef = collection(db, MEMORIES_COLLECTION);
    const docRef = await addDoc(colRef, newMemoryData);
    return docRef.id;
  } catch (err) {
    console.warn('Firestore addDoc failed, storing locally:', err);
    const local = getLocalMemories();
    const id = 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newMemory: SanaMemory = { id, ...newMemoryData };
    setLocalMemories([newMemory, ...local]);
    return id;
  }
}

/**
 * Update an existing memory document
 */
export async function updateMemory(id: string, updates: Partial<MemoryCandidate>): Promise<void> {
  const now = new Date().toISOString();
  const fieldsToUpdate: any = {
    updatedDate: now
  };

  if (updates.title !== undefined) fieldsToUpdate.title = updates.title.trim();
  if (updates.content !== undefined) fieldsToUpdate.content = updates.content.trim();
  if (updates.category !== undefined) fieldsToUpdate.category = updates.category;
  if (updates.importance !== undefined) fieldsToUpdate.importance = updates.importance;
  if (updates.tags !== undefined) {
    fieldsToUpdate.tags = updates.tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  }

  try {
    if (id.startsWith('local_')) {
      const local = getLocalMemories();
      const updated = local.map((m) => (m.id === id ? { ...m, ...fieldsToUpdate } : m));
      setLocalMemories(updated);
      return;
    }

    const docRef = doc(db, MEMORIES_COLLECTION, id);
    await updateDoc(docRef, fieldsToUpdate);
  } catch (err) {
    console.warn('Firestore updateDoc failed, updating local fallback:', err);
    const local = getLocalMemories();
    const updated = local.map((m) => (m.id === id ? { ...m, ...fieldsToUpdate } : m));
    setLocalMemories(updated);
  }
}

/**
 * Delete a memory document
 */
export async function deleteMemory(id: string): Promise<void> {
  try {
    if (id.startsWith('local_')) {
      const local = getLocalMemories();
      setLocalMemories(local.filter((m) => m.id !== id));
      return;
    }

    const docRef = doc(db, MEMORIES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteDoc failed, removing from local fallback:', err);
    const local = getLocalMemories();
    setLocalMemories(local.filter((m) => m.id !== id));
  }
}

/**
 * Mark a memory as recently used by SANA
 */
export async function touchMemoryLastUsed(id: string): Promise<void> {
  const now = new Date().toISOString();
  try {
    if (id.startsWith('local_')) {
      const local = getLocalMemories();
      const updated = local.map((m) => (m.id === id ? { ...m, lastUsed: now } : m));
      setLocalMemories(updated);
      return;
    }

    const docRef = doc(db, MEMORIES_COLLECTION, id);
    await updateDoc(docRef, { lastUsed: now });
  } catch (e) {
    // Silent catch
  }
}

/**
 * Format active memories into Gemini system prompt context string
 */
export function formatMemoriesForSystemPrompt(memories: SanaMemory[]): string {
  if (!memories || memories.length === 0) {
    return '';
  }

  const categoryGroups: Record<string, string[]> = {};

  memories.forEach((mem) => {
    if (!categoryGroups[mem.category]) {
      categoryGroups[mem.category] = [];
    }
    categoryGroups[mem.category].push(`- [${mem.title}] (${mem.importance} Importance): ${mem.content}`);
  });

  const formattedSections = Object.entries(categoryGroups)
    .map(([cat, items]) => `### ${cat.toUpperCase()} MEMORIES:\n${items.join('\n')}`)
    .join('\n\n');

  return `
--- SANA AI MEMORY SYSTEM (RECALLED KNOWLEDGE ABOUT USER) ---
The following facts are saved in your permanent memory bank. Seamlessly personalize your replies using these memories without repeating them unnecessarily:

${formattedSections}
--------------------------------------------------------------
`;
}

/**
 * AI Memory Detection: Heuristic parser to detect personal facts in user text
 */
export function detectMemoryFromText(text: string): MemoryCandidate | null {
  if (!text || text.length < 6) return null;

  const lower = text.toLowerCase();

  // Pattern detection rules
  if (
    lower.includes('my name is') ||
    lower.includes('call me') ||
    lower.includes('আমি') ||
    lower.includes('আমার নাম')
  ) {
    return {
      title: 'User Identity Detail',
      content: text,
      category: 'Identity',
      importance: 'High',
      tags: ['identity', 'name', 'user-info']
    };
  }

  if (
    lower.includes('i prefer') ||
    lower.includes('i like') ||
    lower.includes('my favorite') ||
    lower.includes('আমার পছন্দ') ||
    lower.includes('আমার প্রিয়')
  ) {
    return {
      title: 'User Preference',
      content: text,
      category: 'Preferences',
      importance: 'Medium',
      tags: ['preference', 'like', 'style']
    };
  }

  if (
    lower.includes('my goal is') ||
    lower.includes('i want to learn') ||
    lower.includes('i am planning to') ||
    lower.includes('আমার লক্ষ্য') ||
    lower.includes('আমি শিখতে চাই')
  ) {
    return {
      title: 'User Goal',
      content: text,
      category: 'Goals',
      importance: 'High',
      tags: ['goal', 'learning', 'target']
    };
  }

  if (
    lower.includes('i work at') ||
    lower.includes('i am a') ||
    lower.includes('my job') ||
    lower.includes('আমি কাজ করি')
  ) {
    return {
      title: 'Work / Career Detail',
      content: text,
      category: 'Work',
      importance: 'Medium',
      tags: ['work', 'career', 'profession']
    };
  }

  if (
    lower.includes('my sister') ||
    lower.includes('my brother') ||
    lower.includes('my friend') ||
    lower.includes('my wife') ||
    lower.includes('my husband') ||
    lower.includes('আমার ভাই') ||
    lower.includes('আমার বোন') ||
    lower.includes('আমার বন্ধু')
  ) {
    return {
      title: 'Relationship Fact',
      content: text,
      category: 'Relationships',
      importance: 'Medium',
      tags: ['family', 'friend', 'relationship']
    };
  }

  if (
    lower.includes('i am studying') ||
    lower.includes('my college') ||
    lower.includes('my degree') ||
    lower.includes('আমার পড়ালেখা')
  ) {
    return {
      title: 'Education Detail',
      content: text,
      category: 'Education',
      importance: 'Medium',
      tags: ['education', 'study', 'college']
    };
  }

  if (
    lower.includes('my project') ||
    lower.includes('i am building') ||
    lower.includes('আমি বানাচ্ছি')
  ) {
    return {
      title: 'Active Project',
      content: text,
      category: 'Projects',
      importance: 'Medium',
      tags: ['project', 'building', 'tech']
    };
  }

  return null;
}
