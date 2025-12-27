import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Send, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const [showResetDialog, setShowResetDialog] = useState(false);
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

  const handleResetChat = () => {
    // Clear messages
    setMessages([]);
    // Clear localStorage
    saveChatHistory(projectId, []);
    setShowResetDialog(false);

    // Send first question again
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

    setTimeout(() => {
      handleSendMessage('start');
    }, 500);

    toast({
      title: 'Chat Reset',
      description: 'Starting fresh conversation.',
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Sidebar - No backdrop, canvas stays visible, 30% width */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[30%] bg-card/95 backdrop-blur-sm border-l border-border shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Top-right controls - Clean minimal buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowResetDialog(true)}
            className="h-8 w-8 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
            title="Reset conversation"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
            title="Collapse chat"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages Area - Clean, no header */}
        <div className="flex-1 overflow-y-auto px-4 py-6 pt-16">
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
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Clean ChatGPT-style */}
        <div className="px-4 pb-6 pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="relative"
          >
            <div className="flex items-center gap-2 bg-muted rounded-3xl border border-border shadow-sm focus-within:border-primary/50 focus-within:shadow-md transition-all">
              <VoiceInput onVoiceMessage={handleVoiceMessage} disabled={isLoading} />
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message..."
                disabled={isLoading}
                className="flex-1 px-4 py-3.5 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none disabled:opacity-50"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputText.trim() || isLoading}
                className="mr-1.5 h-9 w-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-30 disabled:hover:bg-primary transition-all"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all messages and start a fresh conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetChat}
              className="bg-primary hover:bg-primary/90"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
