import React from 'react';

interface Calendar {
  id: string;
  name: string;
  color: string;
}

interface CalendarLegendProps {
  filters: {
    simplepractice: boolean;
    google: boolean;
    personal: boolean;
  };
  onFilterChange: (filters: { simplepractice: boolean; google: boolean; personal: boolean }) => void;
}

export const CalendarLegend = ({ filters, onFilterChange }: CalendarLegendProps) => {
  const handleFilterToggle = (filterType: 'simplepractice' | 'google' | 'personal') => {
    onFilterChange({
      ...filters,
      [filterType]: !filters[filterType]
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="simplepractice"
          checked={filters.simplepractice}
          onChange={() => handleFilterToggle('simplepractice')}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="simplepractice" className="flex items-center space-x-2 text-sm">
          <div className="w-3 h-3 bg-blue-50 border-2 border-blue-500" style={{borderLeft: '4px solid #6495ED'}}></div>
          <span className="text-blue-700 font-medium">SimplePractice</span>
        </label>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="google"
          checked={filters.google}
          onChange={() => handleFilterToggle('google')}
          className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
        />
        <label htmlFor="google" className="flex items-center space-x-2 text-sm">
          <div className="w-3 h-3 bg-white border-2 border-green-500 border-dashed"></div>
          <span className="text-green-700 font-medium">Google Calendar</span>
        </label>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="personal"
          checked={filters.personal}
          onChange={() => handleFilterToggle('personal')}
          className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
        />
        <label htmlFor="personal" className="flex items-center space-x-2 text-sm">
          <div className="w-3 h-3 bg-yellow-500 border-2 border-yellow-600"></div>
          <span className="text-yellow-700 font-medium">Holidays</span>
        </label>
      </div>
    </div>
  );
};