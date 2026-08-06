export interface ChatMessage {
  id: string;
  text: string;
  isModel: boolean;
  timestamp: string;
  isSaved?: boolean;
}

export type AppStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';
