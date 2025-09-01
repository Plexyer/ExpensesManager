-- Budget templates system
CREATE TABLE IF NOT EXISTS budget_templates (
  template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS template_categories (
  template_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  category_name TEXT NOT NULL,
  allocated_amount DECIMAL(10,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES budget_templates(template_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_categories_template_id ON template_categories(template_id);
CREATE INDEX IF NOT EXISTS idx_template_categories_sort_order ON template_categories(template_id, sort_order);
