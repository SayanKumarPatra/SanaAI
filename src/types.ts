export interface ChatMessage {
  id: string;
  text: string;
  isModel: boolean;
  timestamp: string;
  isSaved?: boolean;
}

export type AppStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

export type MemoryCategory = 
  | 'Identity'
  | 'Preferences'
  | 'Relationships'
  | 'Goals'
  | 'Projects'
  | 'Work'
  | 'Education'
  | 'Interests'
  | 'Custom';

export type MemoryImportance = 'High' | 'Medium' | 'Low';

export interface SanaMemory {
  id: string;
  title: string;
  content: string;
  category: MemoryCategory;
  createdDate: string;
  updatedDate: string;
  lastUsed: string;
  importance: MemoryImportance;
  tags: string[];
}

export interface MemoryCandidate {
  title: string;
  content: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  tags: string[];
}
