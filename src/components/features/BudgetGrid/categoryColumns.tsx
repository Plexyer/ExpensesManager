import React from 'react';
import { CategoryStats, ColumnId } from '../../../types/budget';

export interface GridColumn {
  id: ColumnId;
  label: string;
  align?: 'left' | 'right' | 'center';
  render: (c: CategoryStats) => React.ReactNode;
  sortKey?: (c: CategoryStats) => number | string;
}

// Utility functions for formatting
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Never';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid';
  }
};

export const ALL_COLUMNS: GridColumn[] = [
  { 
    id: 'allocated', 
    label: 'Allocated', 
    align: 'right', 
    render: (c) => <span className="font-medium text-blue-600">{formatMoney(c.allocated)}</span>, 
    sortKey: (c) => c.allocated 
  },
  { 
    id: 'net', 
    label: 'Net (±)', 
    align: 'right', 
    render: (c) => (
      <span className={c.net >= 0 ? 'text-green-600' : 'text-red-600'}>
        {formatMoney(c.net)}
      </span>
    ), 
    sortKey: (c) => c.net 
  },
  { 
    id: 'remaining', 
    label: 'Remaining', 
    align: 'right', 
    render: (c) => (
      <span className={c.remaining >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
        {formatMoney(c.remaining)}
      </span>
    ), 
    sortKey: (c) => c.remaining 
  },
  { 
    id: 'lastActivity', 
    label: 'Last Activity', 
    render: (c) => (
      <span className="text-slate-600 text-sm">
        {formatDate(c.lastActivityAt)}
      </span>
    ), 
    sortKey: (c) => c.lastActivityAt ?? '' 
  },
  { 
    id: 'entries', 
    label: '# Entries', 
    align: 'right', 
    render: (c) => (
      <span className="text-slate-700 font-mono text-sm">
        {c.entriesCount}
      </span>
    ), 
    sortKey: (c) => c.entriesCount 
  },
];

export const COLUMN_PRESETS: Record<string, ColumnId[]> = {
  Basic: ['allocated', 'remaining', 'lastActivity'],
  Detailed: ['allocated', 'net', 'remaining', 'entries', 'lastActivity'],
  'Savings Focus': ['allocated', 'remaining'],
  'Full View': ['allocated', 'net', 'remaining', 'lastActivity', 'entries'],
};
