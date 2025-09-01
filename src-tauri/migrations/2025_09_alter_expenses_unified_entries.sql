-- Alter expenses table to support unified entries (expenses, income, adjustments)
ALTER TABLE expenses ADD COLUMN entry_type TEXT NOT NULL DEFAULT 'expense'; -- 'expense'|'income'|'adjustment'
ALTER TABLE expenses ADD COLUMN place TEXT;
ALTER TABLE expenses ADD COLUMN notes TEXT;
ALTER TABLE expenses ADD COLUMN deleted_at TIMESTAMP NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_category_date ON expenses(category_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_not_deleted ON expenses(expense_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_entry_type ON expenses(entry_type);
