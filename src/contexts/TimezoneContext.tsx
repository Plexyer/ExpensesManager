import React, { createContext, useContext, useState, useEffect } from 'react';

interface TimezoneContextType {
  timezone: string;
  setTimezone: (timezone: string) => void;
  formatDateInTimezone: (dateString: string) => { date: string; time: string } | { date: string; time: string };
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export const useTimezone = () => {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
};

interface TimezoneProviderProps {
  children: React.ReactNode;
}

export const TimezoneProvider: React.FC<TimezoneProviderProps> = ({ children }) => {
  // Default to user's system timezone
  const [timezone, setTimezone] = useState<string>(() => {
    const saved = localStorage.getItem('app-timezone');
    if (saved) {
      console.log('🕐 Using saved timezone:', saved);
      return saved;
    }
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('🕐 Using system timezone:', systemTimezone);
    return systemTimezone;
  });

  useEffect(() => {
    localStorage.setItem('app-timezone', timezone);
  }, [timezone]);

  const formatDateInTimezone = (dateString: string) => {
    try {
      // Database timestamps are in UTC but without timezone suffix
      // We need to explicitly treat them as UTC
      let date: Date;
      
      if (dateString.includes('T') || dateString.includes('Z')) {
        // Already has timezone info
        date = new Date(dateString);
      } else {
        // No timezone info, treat as UTC by adding 'Z'
        date = new Date(dateString + 'Z');
      }
      
      if (isNaN(date.getTime())) {
        console.error("Invalid date string:", dateString);
        return { date: "Invalid Date", time: "Invalid Time" };
      }

      console.log(`🕒 Converting timestamp "${dateString}" to timezone "${timezone}":`, {
        utcTime: date.toISOString(),
        localTime: date.toLocaleString('en-US', { timeZone: timezone })
      });

      return {
        date: date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: timezone
        }),
        time: date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: timezone
        })
      };
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return { date: "Invalid Date", time: "Invalid Time" };
    }
  };

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, formatDateInTimezone }}>
      {children}
    </TimezoneContext.Provider>
  );
};

// Common timezones list
export const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
  { value: 'Europe/Vienna', label: 'Vienna (CET/CEST)' },
  { value: 'Europe/Zurich', label: 'Zurich (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Kolkata', label: 'Mumbai/Delhi (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' }
];
