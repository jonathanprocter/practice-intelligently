// Text cleaning utilities for therapy session titles and notes
export function cleanEventTitle(title: string): string {
  if (!title) return '';
  
  // Remove emojis and special characters that might cause issues - using simpler approach
  const cleaned = title
    .replace(/[^\w\s\-.,!?()]/g, '') // Keep only alphanumeric, whitespace, and basic punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  return cleaned || 'Untitled Session';
}

export function cleanSessionNotes(notes: string): string {
  if (!notes) return '';
  
  // Clean and format session notes for PDF export
  return notes
    .replace(/[^\w\s\-.,!?():\n]/g, '') // Keep basic characters and line breaks
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function formatClientName(name: string): string {
  if (!name) return 'Unknown Client';
  
  // Split name and capitalize first letter of each part
  const parts = name.trim().split(/\s+/);
  const formatted = parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
  
  return formatted;
}

export function sanitizeForPDF(text: string): string {
  if (!text) return '';
  
  // Remove or replace characters that cause PDF generation issues
  return text
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
    .replace(/\t/g, ' ') // Replace tabs with spaces
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')
    .trim();
}