# ExpensesManager - Software Specification Document

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Core Features](#core-features)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [State Management](#state-management)
9. [Development Workflow](#development-workflow)
10. [File Structure](#file-structure)
11. [Configuration](#configuration)
12. [Future Considerations](#future-considerations)

## Project Overview

**ExpensesManager** is a desktop application for managing personal finances through monthly budgets. Built with a Rust backend and React frontend using the Tauri framework, it provides a native desktop experience with modern web technologies.

### Key Objectives
- Create monthly budgets with income and expense categories
- Track expenses against budget allocations
- Maintain detailed change history for all budget modifications
- Provide timezone-aware date/time handling
- Offer a clean, intuitive user interface

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: Redux Toolkit
- **Routing**: React Router DOM

### Backend
- **Framework**: Tauri (Rust)
- **Database**: SQLite
- **ORM**: rusqlite (direct SQL queries)
- **Serialization**: serde

### Desktop Framework
- **Tauri**: Provides native desktop wrapper for web technologies
- **Platform Support**: Windows, macOS, Linux

## Architecture

### Application Architecture
```
┌─────────────────┐
│   React Frontend │
│   (TypeScript)   │
├─────────────────┤
│   Tauri Bridge   │
├─────────────────┤
│   Rust Backend   │
│   (Commands)     │
├─────────────────┤
│   SQLite DB      │
└─────────────────┘
```

### Communication Pattern
- Frontend communicates with backend through Tauri's `invoke` API
- All database operations are handled by Rust backend commands
- Frontend uses Redux for state management and caching
- Real-time updates through component refresh mechanisms

## Core Features

### 1. Budget Management
- **Create Monthly Budgets**: Set up budgets for specific months/years
- **Budget Status Tracking**: Track if budget is "In Progress" or "Finished"
- **Budget Lifecycle**: Finish budgets and reopen them for editing
- **Multiple Budget Views**: List view and detailed budget view
- **Budget Sorting**: Sort by date, creation date, finished date, alphabetically
- **Last Finished Tracking**: Shows the most recent date a budget was finished

### 2. Income & Expense Tracking
- **Income Management**: Set monthly income amounts
- **Expense Categories**: Create and manage spending categories
- **Expense Recording**: Add individual expenses to categories
- **Budget Usage Tracking**: Monitor remaining budget vs. spent amounts

### 3. Change History System
- **Complete Audit Trail**: Every budget modification is logged
- **Action Types**: Status changes (Finished Budget, Reopened Budget), title edits, budget modifications
- **Timestamp Tracking**: All changes include precise timestamps with timezone conversion
- **Change Details**: Old value, new value, and descriptive notes
- **Action Display**: Clear action names like "Finished Budget", "Reopened Budget", "Edited Title"
- **Expandable History**: Show recent changes with option to expand full history

### 4. Timezone Support
- **User Timezone Selection**: 19 common timezones available in settings
- **Timezone-Aware Display**: All dates/times shown in user's selected timezone
- **Automatic Conversion**: Database UTC times converted to local timezone
- **Settings Persistence**: Timezone preference saved to localStorage
- **Live Time Preview**: Shows current time in selected timezone

### 5. User Interface Features
- **Responsive Design**: Tailwind CSS for consistent styling
- **Interactive Components**: Hover effects, loading states, animations
- **Data Visualization**: Progress bars, summary cards, status indicators
- **Navigation**: Sidebar navigation with React Router
- **Search & Sorting**: Budget list sorting and filtering capabilities
- **Modal Interfaces**: Clean modals for budget creation and editing

## Database Schema

### Tables

#### `monthly_budgets`
```sql
CREATE TABLE monthly_budgets (
    budget_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    income_amount DECIMAL(10,2) DEFAULT 0,
    finished_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `budget_change_history`
```sql
CREATE TABLE budget_change_history (
    change_id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL,
    change_type TEXT NOT NULL, -- 'status_change', 'title_change', 'field_change', 'creation'
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    change_description TEXT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES monthly_budgets(budget_id)
);
```

#### `budget_categories`
```sql
CREATE TABLE budget_categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL,
    category_name TEXT NOT NULL,
    allocated_amount DECIMAL(10,2) DEFAULT 0,
    spent_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES monthly_budgets(budget_id)
);
```

#### `expenses`
```sql
CREATE TABLE expenses (
    expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES budget_categories(category_id)
);
```

## API Endpoints (Tauri Commands)

### Budget Management
- `list_monthly_budgets` - Get all budgets with sorting options
- `get_monthly_budget` - Get specific budget details
- `create_monthly_budget` - Create new budget
- `update_monthly_budget` - Update existing budget
- `delete_monthly_budget` - Delete budget
- `finish_monthly_budget` - Mark budget as finished (logs to change history)
- `unfinish_monthly_budget` - Reopen finished budget (logs to change history)

### Change History
- `get_budget_change_history` - Get change history for budget (ordered by most recent)
- `log_budget_change` - Record a new change (internal use)

### Categories & Expenses
- `add_budget_category` - Add expense category to budget
- `get_budget_categories` - Get all categories for budget
- `add_expense` - Add expense to category
- `get_expenses` - Get all expenses for category

## Frontend Components

### Core Layout Components
- `App.tsx` - Main application wrapper with routing and timezone provider
- `Layout.tsx` - Main layout with sidebar and content area
- `Sidebar.tsx` - Navigation sidebar

### Budget Components
- `BudgetGrid/BudgetList.tsx` - Budget overview cards with last finished dates
- `BudgetGrid/BudgetDetail.tsx` - Detailed budget view with finish/unfinish functionality
- `BudgetGrid/BudgetChangeHistory.tsx` - Change history table with timezone-aware dates
- `BudgetGrid/CreateBudgetModal.tsx` - Budget creation modal

### Settings Components
- `Settings/Settings.tsx` - Settings page with timezone selector dropdown

### Context Providers
- `TimezoneContext.tsx` - Global timezone state and formatting functions

### Shared Components
- `ui/` - Reusable UI components (buttons, inputs, etc.)

## State Management

### Redux Store Structure
```typescript
interface RootState {
  budgets: {
    budgets: Budget[];
    currentBudget: Budget | null;
    loading: boolean;
    error: string | null;
  };
  ui: {
    sidebarCollapsed: boolean;
    theme: 'light' | 'dark';
  };
}
```

### Redux Slices
- `budgetSlice.ts` - Budget state management
- `uiSlice.ts` - UI state management

### Context State
- `TimezoneContext` - Global timezone selection and date formatting

## Development Workflow

### Prerequisites
- Node.js (v16+)
- Rust (latest stable)
- Tauri CLI

### Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm run tauri dev

# Build application
npm run tauri build

# Run tests
npm test
```

### Development Process
1. Frontend development with hot reload
2. Rust backend compilation on changes
3. SQLite database automatically created
4. Real-time debugging through browser dev tools

## File Structure

```
ExpensesManager/
├── src/                          # Frontend React code
│   ├── components/
│   │   ├── features/
│   │   │   ├── BudgetGrid/
│   │   │   │   ├── BudgetList.tsx
│   │   │   │   ├── BudgetDetail.tsx
│   │   │   │   ├── BudgetChangeHistory.tsx
│   │   │   │   └── CreateBudgetModal.tsx
│   │   │   └── Settings/
│   │   │       └── Settings.tsx
│   │   ├── layout/
│   │   └── ui/
│   ├── contexts/
│   │   └── TimezoneContext.tsx
│   ├── services/
│   │   └── budgetService.ts
│   ├── store/
│   │   ├── slices/
│   │   │   ├── budgetSlice.ts
│   │   │   └── uiSlice.ts
│   │   └── store.ts
│   ├── types/
│   └── utils/
├── src-tauri/                    # Rust backend code
│   ├── src/
│   │   ├── modules/
│   │   │   ├── commands/
│   │   │   │   └── budget.rs
│   │   │   ├── database/
│   │   │   └── models/
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── documentation/                # Project documentation
│   └── specification.md         # This file
├── public/                       # Static assets
├── package.json
└── README.md
```

## Configuration

### Tauri Configuration
- **Window Settings**: Minimum size, title, icon
- **Security**: CSP settings, allowed origins
- **Build Settings**: Bundle identifier, version
- **Permissions**: File system, database access

### Environment Variables
- Development vs. production database paths
- Debug logging levels
- API endpoints configuration

## Current Feature Status

### Fully Implemented ✅
- **Budget CRUD Operations**: Create, read, update, delete budgets
- **Change History System**: Complete audit trail with timezone support
- **Budget Status Management**: Finish and reopen budgets
- **Timezone Support**: User-selectable timezones with live preview
- **Last Finished Tracking**: Shows most recent finish date even if budget was reopened
- **Action History Display**: Clear action names like "Finished Budget", "Reopened Budget"
- **Responsive UI**: Clean interface with Tailwind CSS styling
- **Real-time Updates**: Change history refreshes instantly after actions

### Partially Implemented 🚧
- **Category System**: Database tables exist, UI needs completion
- **Expense Tracking**: Basic structure in place, needs full implementation
- **Settings Page**: Timezone settings complete, other settings needed

### Not Yet Implemented ❌
- **Data Visualization**: Charts and graphs for budget analysis
- **Reporting Features**: Monthly/yearly reports
- **Data Export/Import**: CSV, PDF export capabilities
- **Budget Templates**: Reusable budget templates
- **Recurring Expenses**: Automated recurring expense handling

## Current Limitations

### Known Issues
- Budget categories system not fully implemented in UI
- Expense tracking needs completion
- No data export/import functionality
- Limited error handling in some areas

### Missing Features
- Budget templates
- Recurring expenses
- Data visualization (charts/graphs)
- Multi-currency support
- Data backup/restore
- Comprehensive search functionality

## Future Considerations

### Planned Enhancements
1. **Complete Category System**: Full CRUD operations for budget categories
2. **Expense Management**: Add, edit, delete expenses with receipt tracking
3. **Reporting Dashboard**: Monthly/yearly financial reports and analytics
4. **Data Export**: CSV, PDF export capabilities
5. **Advanced Theming**: Dark/light mode toggle with custom themes
6. **Budget Templates**: Save and reuse common budget structures

### Technical Improvements
1. **Testing Suite**: Unit and integration tests
2. **Error Handling**: Comprehensive error boundaries and user feedback
3. **Accessibility**: WCAG compliance improvements
4. **Performance**: Database indexing, query optimization, lazy loading
5. **Security**: Enhanced input validation, SQL injection prevention
6. **Offline Support**: Better handling of offline states

### Scalability Considerations
- Database migration system for schema updates
- Plugin architecture for third-party extensions
- Multi-user support (future consideration)
- Cloud synchronization capabilities
- Multi-device support

## Technical Architecture Details

### Change History System
The change history system is a core feature that logs every modification:

**Logging Mechanism:**
- Automatic logging on budget finish/unfinish operations
- Manual logging for title changes and other modifications
- UTC timestamp storage with frontend timezone conversion

**Data Flow:**
1. User performs action (finish budget, edit title, etc.)
2. Backend command executes database change
3. `log_budget_change` function records the change
4. Frontend refreshes change history with new data
5. Timezone context converts UTC times to user's timezone

### Timezone Handling
The application uses a sophisticated timezone system:

**Architecture:**
- `TimezoneContext` provides global timezone state
- UTC storage in database for consistency
- Frontend conversion to user's selected timezone
- Real-time timezone switching with immediate UI updates

**Supported Timezones:**
- 19 common world timezones
- Automatic daylight saving time handling
- Live preview of current time in selected timezone

---

## Development Notes

### Current Status (September 2025)
- ✅ Core budget CRUD operations with change history
- ✅ Advanced timezone support with user selection
- ✅ Comprehensive change history with meaningful action names
- ✅ Budget finish/unfinish workflow with proper tracking
- ✅ Last finished date display in both list and detail views
- 🚧 Category and expense management (database ready, UI incomplete)
- ❌ Data visualization and reporting
- ❌ Advanced features (templates, recurring expenses)

### Technical Debt
- Need comprehensive error handling throughout application
- Database queries could benefit from indexing optimization
- Component prop types need refinement and consistency
- Missing test coverage for critical business logic
- Need better TypeScript strict mode compliance

### Recent Improvements (Latest Development Session)
- Fixed timezone conversion issues with UTC database timestamps
- Implemented proper "Last Finished" date tracking across all views
- Enhanced change history with clear action names without icons
- Added real-time refresh mechanism for change history
- Improved user experience with instant updates after actions

This document serves as the current state specification for the ExpensesManager application. It should be updated as new features are implemented and the architecture evolves.