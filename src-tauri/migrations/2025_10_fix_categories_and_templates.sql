-- First, fix the expense table column name issue
-- Drop and recreate with correct column name
DROP TABLE IF EXISTS expenses;

CREATE TABLE expenses (
    expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    entry_type TEXT NOT NULL DEFAULT 'expense', -- 'expense'|'income'|'adjustment'
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL, -- Fixed: was expense_date
    place TEXT,
    notes TEXT,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES budget_categories(category_id) ON DELETE CASCADE
);

-- Create a global categories table for category management
CREATE TABLE IF NOT EXISTS global_categories (
  global_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recreate budget_templates with better structure
DROP TABLE IF EXISTS template_categories;
DROP TABLE IF EXISTS budget_templates;

CREATE TABLE IF NOT EXISTS budget_templates (
  template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template categories link templates to global categories with amounts
CREATE TABLE IF NOT EXISTS template_categories (
  template_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  global_category_id INTEGER NOT NULL,
  allocated_amount DECIMAL(10,2) DEFAULT 0,
  category_type TEXT NOT NULL DEFAULT 'expense', -- 'expense' for spending, 'savings' for saving goals
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES budget_templates(template_id) ON DELETE CASCADE,
  FOREIGN KEY (global_category_id) REFERENCES global_categories(global_category_id) ON DELETE CASCADE,
  UNIQUE(template_id, global_category_id)
);

-- Add template_id to monthly_budgets to link budgets to templates
ALTER TABLE monthly_budgets ADD COLUMN template_id INTEGER REFERENCES budget_templates(template_id);

-- Recreate budget_categories to be generated from templates
DROP TABLE IF EXISTS budget_categories;

CREATE TABLE IF NOT EXISTS budget_categories (
  category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER NOT NULL,
  global_category_id INTEGER NOT NULL,
  category_name TEXT NOT NULL,
  allocated_amount DECIMAL(10,2) DEFAULT 0,
  category_type TEXT NOT NULL DEFAULT 'expense',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (budget_id) REFERENCES monthly_budgets(budget_id) ON DELETE CASCADE,
  FOREIGN KEY (global_category_id) REFERENCES global_categories(global_category_id) ON DELETE CASCADE,
  UNIQUE(budget_id, global_category_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_categories_template_id ON template_categories(template_id);
CREATE INDEX IF NOT EXISTS idx_template_categories_sort_order ON template_categories(template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_budget_categories_budget_id ON budget_categories(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_global_category ON budget_categories(global_category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_date ON expenses(category_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_not_deleted ON expenses(expense_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_entry_type ON expenses(entry_type);

-- Insert some default global categories
INSERT OR IGNORE INTO global_categories (name, description) VALUES
  ('Rent/Mortgage', 'Monthly housing payment'),
  ('Groceries', 'Food and household items'),
  ('Transportation', 'Gas, car payments, public transport'),
  ('Utilities', 'Electricity, water, internet, phone'),
  ('Entertainment', 'Movies, dining out, hobbies'),
  ('Healthcare', 'Medical expenses, insurance'),
  ('Emergency Fund', 'Emergency savings goal'),
  ('Vacation Fund', 'Travel savings goal');
