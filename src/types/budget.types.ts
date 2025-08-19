export interface BudgetTemplate {
  templateId: number;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface BudgetCategory {
  categoryId: number;
  templateId: number;
  name: string;
  allocationType?: string;
  formula?: string;
}


