import { useEffect } from 'react';

interface KeyboardShortcuts {
  [key: string]: () => void;
}

/**
 * Hook for handling global keyboard shortcuts
 * @param shortcuts Object mapping key combinations to handler functions
 * @example
 * useKeyboardShortcuts({
 *   'ctrl+a': () => setIsChatOpen(prev => !prev),
 *   'cmd+a': () => setIsChatOpen(prev => !prev),
 * })
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Build key combination string
      const keys: string[] = [];

      if (event.ctrlKey) keys.push('ctrl');
      if (event.metaKey) keys.push('cmd');
      if (event.altKey) keys.push('alt');
      if (event.shiftKey) keys.push('shift');

      // Add the actual key (lowercase)
      keys.push(event.key.toLowerCase());

      const combination = keys.join('+');

      // Check if this combination has a handler
      const handler = shortcuts[combination];

      if (handler) {
        // Prevent default browser behavior
        event.preventDefault();
        event.stopPropagation();

        // Execute the handler
        handler();
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}
