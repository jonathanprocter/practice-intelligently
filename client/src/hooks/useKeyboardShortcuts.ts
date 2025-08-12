import { useEffect, useCallback, useRef } from 'react';

type ShortcutHandler = () => void;
type Shortcuts = Record<string, ShortcutHandler>;

interface KeyboardShortcutOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
  enabled?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: Shortcuts,
  options: KeyboardShortcutOptions = {}
) {
  const { 
    preventDefault = true, 
    stopPropagation = true, 
    enabled = true 
  } = options;

  const handlersRef = useRef<Shortcuts>(shortcuts);

  // Update handlers ref when shortcuts change
  useEffect(() => {
    handlersRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    // Build shortcut string
    const parts: string[] = [];
    if (event.metaKey || event.ctrlKey) parts.push('cmd');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');

    // Get the key
    const key = event.key.toLowerCase();
    if (key === ' ') {
      parts.push('space');
    } else if (key === 'escape') {
      parts.push('esc');
    } else if (key === 'enter') {
      parts.push('enter');
    } else if (key === 'arrowup') {
      parts.push('up');
    } else if (key === 'arrowdown') {
      parts.push('down');
    } else if (key === 'arrowleft') {
      parts.push('left');
    } else if (key === 'arrowright') {
      parts.push('right');
    } else if (key.length === 1) {
      parts.push(key);
    }

    const shortcut = parts.join('+');
    const handler = handlersRef.current[shortcut];

    if (handler) {
      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();
      handler();
    }
  }, [enabled, preventDefault, stopPropagation]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  // Return a function to programmatically trigger shortcuts
  return useCallback((shortcut: string) => {
    const handler = handlersRef.current[shortcut];
    if (handler) handler();
  }, []);
}