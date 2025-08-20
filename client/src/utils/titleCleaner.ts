export function cleanTitle(title: string): string {
  if (!title) return '';
  
  // Remove common unwanted characters and patterns
  let cleanedTitle = title
    .replace(/^\W+/, '') // Remove leading non-word characters
    .replace(/\W+$/, '') // Remove trailing non-word characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();

  // Remove specific patterns that might be in calendar titles
  cleanedTitle = cleanedTitle
    .replace(/^(Re:|Fwd:|FW:|RE:)/i, '') // Remove email prefixes
    .replace(/\(.*?\)/g, '') // Remove content in parentheses
    .replace(/\[.*?\]/g, '') // Remove content in brackets
    .trim();

  return cleanedTitle;
}

export function sanitizeTitle(title: string): string {
  if (!title) return '';
  
  return title
    .replace(/[<>]/g, '') // Remove potential HTML injection characters
    .replace(/javascript:/gi, '') // Remove potential script injection
    .replace(/on\w+=/gi, '') // Remove potential event handlers
    .trim();
}