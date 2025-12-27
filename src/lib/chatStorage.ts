import { Message } from '@/types/chat';

const CHAT_STORAGE_KEY_PREFIX = 'codeforge_chat_';

/**
 * Get chat history for a specific project from localStorage
 */
export function getChatHistory(projectId: string): Message[] {
  try {
    const key = `${CHAT_STORAGE_KEY_PREFIX}${projectId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return [];

    const messages = JSON.parse(stored) as Message[];
    return messages;
  } catch (error) {
    console.error('Failed to load chat history:', error);
    return [];
  }
}

/**
 * Save chat history for a specific project to localStorage
 */
export function saveChatHistory(projectId: string, messages: Message[]): void {
  try {
    const key = `${CHAT_STORAGE_KEY_PREFIX}${projectId}`;
    localStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
}

/**
 * Clear chat history for a specific project
 */
export function clearChatHistory(projectId: string): void {
  try {
    const key = `${CHAT_STORAGE_KEY_PREFIX}${projectId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear chat history:', error);
  }
}
