// Chat message types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  options?: string[];
  suggestions?: SuggestionGroup;
  timestamp: number;
}

// Suggestion system types
export interface SuggestionGroup {
  type: 'features' | 'tech_stack' | 'database' | 'user_flows';
  items: SuggestionItem[];
}

export interface SuggestionItem {
  title: string;
  description: string;
  actionLabel: string;
  metadata?: Record<string, any>; // Type-specific data to add to node
}

// Node suggestion for auto-creation
export interface NodeSuggestion {
  nodeType: 'features' | 'tech_stack' | 'database' | 'user_flows';
  nodeName?: string; // For Database/User Flows (multiple instances)
  suggestions: SuggestionItem[];
}

// Chat API request/response types
export interface ChatTextRequest {
  message: string;
  history: Message[];
  projectId: string;
  projectTitle: string;
  projectDescription?: string;
}

export interface ChatVoiceRequest extends FormData {
  // FormData with: audio (File), history (string), projectId (string), projectTitle (string), projectDescription (string)
}

export interface ChatResponse {
  message: string;
  options?: string[];
  suggestions?: SuggestionGroup;
  transcript?: string; // Only for voice responses
}

// Chat state
export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isRecording: boolean;
  error: string | null;
}
