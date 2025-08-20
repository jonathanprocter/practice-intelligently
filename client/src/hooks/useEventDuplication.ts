import { useState, useCallback } from 'react';
import { CalendarEvent } from '../types/calendar';

export interface DuplicateEvent {
  event1: CalendarEvent;
  event2: CalendarEvent;
  type: 'exact' | 'overlap' | 'similar';
  confidence: number;
}

export function useEventDuplication() {
  const [duplicates, setDuplicates] = useState<DuplicateEvent[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkForDuplicates = useCallback((events: CalendarEvent[]): DuplicateEvent[] => {
    setIsChecking(true);
    const found: DuplicateEvent[] = [];

    try {
      for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
          const event1 = events[i];
          const event2 = events[j];

          // Check for exact duplicates
          if (event1.title === event2.title && 
              event1.startTime === event2.startTime && 
              event1.endTime === event2.endTime) {
            found.push({
              event1,
              event2,
              type: 'exact',
              confidence: 1.0
            });
            continue;
          }

          // Check for time overlaps
          const start1 = new Date(event1.startTime);
          const end1 = new Date(event1.endTime);
          const start2 = new Date(event2.startTime);
          const end2 = new Date(event2.endTime);

          if (start1 < end2 && start2 < end1) {
            found.push({
              event1,
              event2,
              type: 'overlap',
              confidence: 0.8
            });
            continue;
          }

          // Check for similar titles
          const similarity = calculateTitleSimilarity(event1.title, event2.title);
          if (similarity > 0.7) {
            found.push({
              event1,
              event2,
              type: 'similar',
              confidence: similarity
            });
          }
        }
      }

      setDuplicates(found);
      return found;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const calculateTitleSimilarity = (title1: string, title2: string): number => {
    if (!title1 || !title2) return 0;
    
    const clean1 = title1.toLowerCase().trim();
    const clean2 = title2.toLowerCase().trim();
    
    if (clean1 === clean2) return 1.0;
    
    // Simple word-based similarity
    const words1 = clean1.split(/\s+/);
    const words2 = clean2.split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);
    
    return commonWords.length / totalWords;
  };

  const clearDuplicates = useCallback(() => {
    setDuplicates([]);
  }, []);

  return {
    checkForDuplicates,
    duplicates,
    isChecking,
    clearDuplicates,
  };
}