-- Create the budget_categories table expected by CategoryGrid
-- This is the simplified structure that CategoryGrid component expects
CREATE TABLE IF NOT EXISTS budget_categories (
  category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER NOT NULL,
  category_name TEXT NOT NULL,
  allocated_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (budget_id) REFERENCES monthly_budgets(budget_id) ON DELETE CASCADE
);

-- Also create the expenses table with the expected structure for unified entries
-- Rename the old expenses table first if it exists with different structure
DROP TABLE IF EXISTS expenses;

CREATE TABLE expenses (
    expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    entry_type TEXT NOT NULL DEFAULT 'expense', -- 'expense'|'income'|'adjustment'
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    place TEXT,
    notes TEXT,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES budget_categories(category_id) ON DELETE CASCADE
);

-- Also create monthly_budgets table if it doesn't exist with correct structure
CREATE TABLE IF NOT EXISTS monthly_budgets (
    budget_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    income_amount DECIMAL(10,2) DEFAULT 0,
    finished_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT -- For compatibility
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_categories_budget_id ON budget_categories(budget_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_date ON expenses(category_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_not_deleted ON expenses(expense_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_entry_type ON expenses(entry_type);
