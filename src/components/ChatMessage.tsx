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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message Bubble */}
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-100'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Multi-Select Options (only for latest AI message) */}
        {!isUser && isLatest && message.options && message.options.length >= 4 && (
          <div className="mt-3 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-zinc-400 mb-3 font-medium">
              Select all that apply:
            </div>
            <div className="space-y-2.5">
              {message.options.map((option, index) => (
                <label
                  key={index}
                  className="flex items-center gap-3 p-2.5 rounded-md hover:bg-zinc-800/50 cursor-pointer transition-colors group"
                >
                  <Checkbox
                    checked={selectedOptions.includes(option)}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(option, checked as boolean)
                    }
                    className="border-zinc-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                  <span className="text-sm text-zinc-200 group-hover:text-white flex-1">
                    {option}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800">
              <Button
                onClick={handleSubmitMultiSelect}
                disabled={selectedOptions.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit {selectedOptions.length > 0 && `(${selectedOptions.length} selected)`}
              </Button>
            </div>
          </div>
        )}

        {/* NO SUGGESTION CARDS - Suggestions are handled automatically in background */}

        {/* Timestamp */}
        <div
          className={`mt-1 text-xs text-zinc-500 ${isUser ? 'text-right' : 'text-left'}`}
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
