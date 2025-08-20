export interface LocationDisplayInfo {
  display: string;
  type: 'in-person' | 'telehealth' | 'phone' | 'unknown';
}

export function getLocationDisplay(location: string): LocationDisplayInfo {
  if (!location || location.trim() === '') {
    return {
      display: '',
      type: 'unknown'
    };
  }

  const cleanLocation = location.trim().toLowerCase();

  // Check for telehealth indicators
  if (cleanLocation.includes('zoom') || 
      cleanLocation.includes('telehealth') || 
      cleanLocation.includes('video') ||
      cleanLocation.includes('online') ||
      cleanLocation.includes('virtual')) {
    return {
      display: 'Telehealth',
      type: 'telehealth'
    };
  }

  // Check for phone indicators
  if (cleanLocation.includes('phone') || 
      cleanLocation.includes('call') ||
      cleanLocation.includes('tel:')) {
    return {
      display: 'Phone Session',
      type: 'phone'
    };
  }

  // Default to in-person with original location text
  return {
    display: location,
    type: 'in-person'
  };
}

export function getOfficeLocationByDay(day: Date): string {
  // Simple office location logic - could be enhanced based on business rules
  const dayOfWeek = day.getDay();
  
  // Example: Different office locations on different days
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'Weekend - Remote Available';
  }
  
  return 'Main Office';
}

export function getCalendarLocationDisplay(location?: string): string {
  if (!location) return '';
  
  const locationInfo = getLocationDisplay(location);
  return locationInfo.display;
}