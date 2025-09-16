export const cleanEmoji = (text: string) => text.replace(/[^\x00-\x7F]/g, '');
