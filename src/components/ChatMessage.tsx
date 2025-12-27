import { useState } from 'react';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface ChatMessageProps {
  message: Message;
  isLatest: boolean;
  onOptionClick?: (option: string) => void;
  onMultiOptionSubmit?: (options: string[]) => void;
  onSuggestionAdd?: (suggestion: any) => void;
}

export default function ChatMessage({
  message,
  isLatest,
  onOptionClick,
  onMultiOptionSubmit,
  onSuggestionAdd,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const handleCheckboxChange = (option: string, checked: boolean) => {
    if (checked) {
      setSelectedOptions((prev) => [...prev, option]);
    } else {
      setSelectedOptions((prev) => prev.filter((o) => o !== option));
    }
  };

  const handleSubmitMultiSelect = () => {
    if (selectedOptions.length > 0) {
      const response = selectedOptions.join(', ');
      onMultiOptionSubmit?.(selectedOptions);
      setSelectedOptions([]);
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message Bubble - Clean, soft rounded */}
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? 'bg-muted text-foreground border-2 border-primary'
              : 'bg-muted text-foreground'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Multi-Select Options (only for latest AI message) - Clean cards */}
        {!isUser && isLatest && message.options && message.options.length >= 4 && (
          <div className="mt-3 bg-muted/50 border border-border rounded-2xl p-4">
            <div className="text-xs text-muted-foreground mb-3 font-medium">
              Select all that apply:
            </div>
            <div className="space-y-2">
              {message.options.map((option, index) => (
                <label
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent cursor-pointer transition-colors group"
                >
                  <Checkbox
                    checked={selectedOptions.includes(option)}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(option, checked as boolean)
                    }
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className="text-sm text-foreground flex-1">
                    {option}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <Button
                onClick={handleSubmitMultiSelect}
                disabled={selectedOptions.length === 0}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Submit {selectedOptions.length > 0 && `(${selectedOptions.length} selected)`}
              </Button>
            </div>
          </div>
        )}

        {/* NO SUGGESTION CARDS - Suggestions are handled automatically in background */}

        {/* Timestamp - Subtle */}
        <div
          className={`mt-1.5 text-xs text-muted-foreground ${isUser ? 'text-right' : 'text-left'}`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
