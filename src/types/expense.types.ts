export interface Expense {
  expenseId: number;
  allocationId: number;
  amount: number;
  description: string;
  date: string;
  location?: string | null;
}


