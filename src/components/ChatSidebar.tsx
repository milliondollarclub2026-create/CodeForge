import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChatMessage from './ChatMessage';
import VoiceInput from './VoiceInput';
import { Message, SuggestionItem } from '@/types/chat';
import { sendTextMessage, sendVoiceMessage } from '@/lib/chatApi';
import { getChatHistory, saveChatHistory } from '@/lib/chatStorage';
import { processSuggestions } from '@/lib/autoCreateNode';
import { useToast } from '@/hooks/use-toast';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  projectDescription?: string;
  onNodesUpdated?: () => void;
}

export default function ChatSidebar({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  projectDescription,
  onNodesUpdated,
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load chat history on mount and send first question automatically
  useEffect(() => {
    const history = getChatHistory(projectId);
    if (history.length === 0) {
      // Send first question automatically
      const greeting: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I will help you define requirements for "${projectTitle}"${
          projectDescription ? ` - ${projectDescription}` : ''
        }.\n\nLet's start.`,
        timestamp: Date.now(),
      };
      setMessages([greeting]);
      saveChatHistory(projectId, [greeting]);

      // Auto-send first question request after 500ms
      setTimeout(() => {
        handleSendMessage('start');
      }, 500);
    } else {
      setMessages(history);
    }
  }, [projectId, projectTitle, projectDescription]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(projectId, messages);
    }
  }, [messages, projectId]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await sendTextMessage(
        text,
        messages,
        projectTitle,
        projectDescription
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        options: response.options,
        suggestions: response.suggestions,
        timestamp: Date.now(),
      };

      console.log('💬 Received AI response:', {
        hasOptions: !!response.options,
        optionsCount: response.options?.length,
        hasSuggestions: !!response.suggestions,
        suggestionType: response.suggestions?.type,
        suggestionItemCount: response.suggestions?.items?.length
      });

      setMessages((prev) => [...prev, assistantMessage]);

      // Process SUGGESTIONS if present (create/populate nodes)
      if (response.suggestions) {
        console.log('🔵 Processing SUGGESTIONS:', response.suggestions);
        setTimeout(async () => {
          try {
            const { processSuggestions } = await import('@/lib/autoCreateNode');
            await processSuggestions(
              projectId,
              response.suggestions,
              () => {
                console.log('🔄 Triggering onNodesUpdated from ChatSidebar');
                onNodesUpdated?.();
              }
            );
          } catch (error) {
            console.error('❌ Error processing suggestions:', error);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceMessage = async (audioBlob: Blob) => {
    setIsLoading(true);

    try {
      const response = await sendVoiceMessage(
        audioBlob,
        messages,
        projectTitle,
        projectDescription
      );

      // Add user message with transcript
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: response.transcript || 'Voice message',
        timestamp: Date.now(),
      };

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        options: response.options,
        suggestions: response.suggestions,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      // Auto-create nodes when suggestions are provided
      if (response.suggestions && response.suggestions.items.length > 0) {
        setTimeout(async () => {
          try {
            await processSuggestions(projectId, response.suggestions!, () => {
              onNodesUpdated?.();
            });
          } catch (error) {
            console.error('Error auto-processing suggestions:', error);
          }
        }, 500); // Small delay for better UX
      }
    } catch (error) {
      console.error('Voice message error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process voice message. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionClick = (option: string) => {
    handleSendMessage(option);
  };

  const handleMultiOptionSubmit = (options: string[]) => {
    const message = options.join(', ');
    handleSendMessage(message);
  };

  const handleSuggestionAdd = async (suggestion: SuggestionItem) => {
    // Find the message with this suggestion to get the full suggestion group
    const messageWithSuggestion = messages.find(
      (m) =>
        m.suggestions &&
        m.suggestions.items.some((item) => item.title === suggestion.title)
    );

    if (!messageWithSuggestion || !messageWithSuggestion.suggestions) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not find suggestion details',
      });
      return;
    }

    setIsLoading(true);

    try {
      await processSuggestions(
        projectId,
        messageWithSuggestion.suggestions,
        () => {
          // Trigger nodes refresh in parent
          onNodesUpdated?.();
        }
      );
    } catch (error) {
      // Error toast is already shown by processSuggestions
      console.error('Error processing suggestion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[45%] bg-slate-900 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-black">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLatest={index === messages.length - 1}
                onOptionClick={handleOptionClick}
                onMultiOptionSubmit={handleMultiOptionSubmit}
                onSuggestionAdd={handleSuggestionAdd}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex items-center gap-2"
          >
            <VoiceInput onVoiceMessage={handleVoiceMessage} disabled={isLoading} />
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-black border border-slate-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!inputText.trim() || isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
