// Location utilities for calendar events

export function getLocationDisplay(location?: string): string {
  if (!location) return '';
  
  // Clean and format location for display
  return location.trim();
}

export function getLocationIcon(location?: string): string {
  if (!location) return '';
  
  const loc = location.toLowerCase();
  
  // Return appropriate icon based on location type
  if (loc.includes('office') || loc.includes('clinic')) return '🏢';
  if (loc.includes('home') || loc.includes('remote')) return '🏠';
  if (loc.includes('video') || loc.includes('zoom') || loc.includes('online')) return '💻';
  if (loc.includes('phone') || loc.includes('call')) return '📞';
  if (loc.includes('hospital')) return '🏥';
  if (loc.includes('school')) return '🏫';
  
  return '📍'; // Default location icon
}

export function formatLocationForPDF(location?: string): string {
  if (!location) return '';
  
  // Format location for PDF export - remove special characters
  return location
    .replace(/[^\w\s\-.,()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getLocationTypeColor(location?: string): string {
  if (!location) return 'bg-gray-100 text-gray-700';
  
  const loc = location.toLowerCase();
  
  if (loc.includes('office') || loc.includes('clinic')) return 'bg-blue-100 text-blue-700';
  if (loc.includes('home') || loc.includes('remote')) return 'bg-green-100 text-green-700';
  if (loc.includes('video') || loc.includes('zoom') || loc.includes('online')) return 'bg-purple-100 text-purple-700';
  if (loc.includes('phone') || loc.includes('call')) return 'bg-orange-100 text-orange-700';
  
  return 'bg-gray-100 text-gray-700';
}