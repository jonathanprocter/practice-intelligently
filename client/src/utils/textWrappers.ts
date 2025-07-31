// Text wrapping utilities for calendar display

export function wrapText(text: string, maxLength: number): string[] {
  if (!text || text.length <= maxLength) {
    return [text || ''];
  }

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export function truncateWithEllipsis(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

export function wrapTextForCalendarEvent(title: string, maxLength: number = 15): string {
  if (!title) return '';
  
  const wrapped = wrapText(title, maxLength);
  return wrapped[0] || title; // Return first line only for calendar events
}

export function formatEventText(event: CalendarEvent): string {
  const title = cleanEventTitle(event.title);
  const wrapped = wrapTextForCalendarEvent(title, 12);
  return wrapped;
}

function cleanEventTitle(title: string): string {
  if (!title) return '';
  
  return title
    .replace(/[^\w\s\-.,!?()]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Untitled Session';
}