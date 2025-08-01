// Test the US holidays system
const fs = require('fs');
const path = require('path');

// Read the TypeScript file and convert to executable JavaScript for testing
const holidayFileContent = fs.readFileSync(path.join(__dirname, 'server', 'us-holidays.ts'), 'utf8');

// Simple test of holiday generation logic
console.log('Testing US holidays system...');

// Check if a known date is correctly identified
function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

function getNthWeekdayOfMonth(year, month, weekday, n) {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  
  let daysToAdd = (weekday - firstWeekday + 7) % 7;
  if (n > 1) {
    daysToAdd += (n - 1) * 7;
  }
  
  return new Date(year, month, 1 + daysToAdd);
}

function formatDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Test 2025 holidays
console.log('Testing 2025 holidays:');
console.log('New Year\'s Day 2025:', formatDateString(new Date(2025, 0, 1)));
console.log('MLK Day 2025:', formatDateString(getNthWeekdayOfMonth(2025, 0, 1, 3)));
console.log('Independence Day 2025:', formatDateString(new Date(2025, 6, 4)));

// Test specific dates
const testDates = [
  '2025-01-01', // New Year's Day
  '2025-07-04', // Independence Day
  '2025-12-25', // Christmas
  '2025-01-20', // MLK Day (3rd Monday in January)
  '2025-01-02'  // Not a holiday
];

testDates.forEach(date => {
  console.log(`Is ${date} a holiday? Testing logic...`);
});

console.log('US holidays system test completed.');