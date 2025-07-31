export interface LocationInfo {
  display: string;
  type: 'in-person' | 'telehealth' | 'phone' | 'home-visit' | 'group';
  address?: string;
  room?: string;
  platform?: string;
}

export function getLocationDisplay(location?: string | LocationInfo): string {
  if (!location) return 'Location TBD';
  
  if (typeof location === 'string') {
    return location;
  }
  
  const { display, type, address, room, platform } = location;
  
  switch (type) {
    case 'telehealth':
      return platform ? `${display} (${platform})` : `${display} (Telehealth)`;
    case 'phone':
      return `${display} (Phone Session)`;
    case 'home-visit':
      return address ? `${display} - ${address}` : `${display} (Home Visit)`;
    case 'group':
      return room ? `${display} - ${room}` : `${display} (Group)`;
    case 'in-person':
    default:
      return room ? `${display} - ${room}` : display;
  }
}

export function getLocationIcon(location?: string | LocationInfo): string {
  if (!location) return '📍';
  
  if (typeof location === 'string') {
    // Simple string location - default to in-person
    return '🏢';
  }
  
  const { type } = location;
  
  switch (type) {
    case 'telehealth':
      return '💻';
    case 'phone':
      return '📱';
    case 'home-visit':
      return '🏠';
    case 'group':
      return '👥';
    case 'in-person':
    default:
      return '🏢';
  }
}

export function parseLocationString(locationStr: string): LocationInfo {
  const lower = locationStr.toLowerCase();
  
  if (lower.includes('telehealth') || lower.includes('video') || lower.includes('zoom') || lower.includes('teams')) {
    return {
      display: locationStr,
      type: 'telehealth',
      platform: extractPlatform(locationStr)
    };
  }
  
  if (lower.includes('phone') || lower.includes('call')) {
    return {
      display: locationStr,
      type: 'phone'
    };
  }
  
  if (lower.includes('home') || lower.includes('visit')) {
    return {
      display: locationStr,
      type: 'home-visit'
    };
  }
  
  if (lower.includes('group') || lower.includes('therapy group')) {
    return {
      display: locationStr,
      type: 'group'
    };
  }
  
  // Default to in-person
  return {
    display: locationStr,
    type: 'in-person'
  };
}

function extractPlatform(locationStr: string): string | undefined {
  const lower = locationStr.toLowerCase();
  
  if (lower.includes('zoom')) return 'Zoom';
  if (lower.includes('teams')) return 'Teams';
  if (lower.includes('meet')) return 'Google Meet';
  if (lower.includes('webex')) return 'WebEx';
  if (lower.includes('skype')) return 'Skype';
  
  return undefined;
}

export function formatLocationForExport(location?: string | LocationInfo): string {
  if (!location) return '';
  
  const display = getLocationDisplay(location);
  const icon = getLocationIcon(location);
  
  return `${icon} ${display}`;
}