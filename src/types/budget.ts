export type EntryType = 'expense' | 'income' | 'adjustment';
export type ColumnId = 'allocated' | 'net' | 'remaining' | 'lastActivity' | 'entries';

export interface CategoryStats {
  categoryId: number;
  budgetId: number;
  name: string;
  allocated: number;
  net: number;
  remaining: number;
  lastActivityAt?: string;
  entriesCount: number;
}

export interface LedgerEntry {
  entryId: number;
  categoryId: number;
  entryType: EntryType;
  what: string;
  where?: string;
  amount: number; // positive
  date: string;   // ISO yyyy-mm-dd
  createdAt: string;
}

export interface NewEntry {
  categoryId: number;
  entryType: EntryType;
  what: string;
  where?: string;
  amount: number;
  date: string;
}

export interface UpdateEntry {
  entryId: number;
  entryType: EntryType;
  what: string;
  where?: string;
  amount: number;
  date: string;
}

export interface BudgetTemplate {
  templateId: number;
  name: string;
  createdAt: string;
}

export interface NewCategory {
  budgetId: number;
  categoryName: string;
  allocatedAmount: number;
}
