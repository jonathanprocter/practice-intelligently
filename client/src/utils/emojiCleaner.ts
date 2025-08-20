export function cleanEmojis(text: string): string {
  if (!text) return '';
  
  // Simple text cleanup - just return the text for now
  return text.trim();
}

export function removeExcessiveEmojis(text: string, maxEmojis: number = 3): string {
  if (!text) return '';
  
  // For now, just return the text - can enhance later
  return text;
}

export function hasEmojis(text: string): boolean {
  if (!text) return false;
  
  // Simple check for common emoji characters
  return /[\u{1F600}-\u{1F64F}]/u.test(text);
}