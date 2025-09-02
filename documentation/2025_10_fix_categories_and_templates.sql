-- Migration: Fix categories and templates system
-- Date: 2025-09-02
-- Purpose: Create proper global categories and budget templates tables

-- Create global categories table
CREATE TABLE IF NOT EXISTS global_categories (
    global_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create budget templates table
CREATE TABLE IF NOT EXISTS budget_templates (
    template_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create template categories junction table
CREATE TABLE IF NOT EXISTS template_categories (
    template_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    global_category_id INTEGER NOT NULL,
    allocated_amount REAL NOT NULL DEFAULT 0.0,
    category_type TEXT NOT NULL DEFAULT 'expense', -- 'expense' or 'savings'
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES budget_templates(template_id) ON DELETE CASCADE,
    FOREIGN KEY (global_category_id) REFERENCES global_categories(global_category_id) ON DELETE CASCADE
);

-- Add template_id column to monthly_budgets if it doesn't exist
ALTER TABLE MonthlyBudgets ADD COLUMN template_id INTEGER REFERENCES budget_templates(template_id);

-- Add global_category_id column to budget_categories if it doesn't exist  
ALTER TABLE budget_categories ADD COLUMN global_category_id INTEGER REFERENCES global_categories(global_category_id);

-- Add category_type column to budget_categories if it doesn't exist
ALTER TABLE budget_categories ADD COLUMN category_type TEXT DEFAULT 'expense';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_template_categories_template_id ON template_categories(template_id);
CREATE INDEX IF NOT EXISTS idx_template_categories_global_category_id ON template_categories(global_category_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_global_category_id ON budget_categories(global_category_id);
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_template_id ON MonthlyBudgets(template_id);

-- Insert default global categories
INSERT OR IGNORE INTO global_categories (name, description) VALUES 
    ('Food & Dining', 'Groceries, restaurants, and food expenses'),
    ('Transportation', 'Gas, public transport, car maintenance'),
    ('Housing', 'Rent, mortgage, utilities, home maintenance'),
    ('Healthcare', 'Medical expenses, insurance, medications'),
    ('Entertainment', 'Movies, games, hobbies, subscriptions'),
    ('Shopping', 'Clothing, personal items, general shopping'),
    ('Education', 'Books, courses, training, school supplies'),
    ('Savings', 'Emergency fund, retirement, investments'),
    ('Insurance', 'Life, health, car, home insurance'),
    ('Debt Payment', 'Credit cards, loans, other debt payments');

PRAGMA foreign_keys = ON;
