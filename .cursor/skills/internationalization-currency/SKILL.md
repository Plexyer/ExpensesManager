# Skill: Internationalization & Currency

## Purpose
How to scaffold internationalization (i18n) and currency support for EN/DE and CHF/EUR.

## When to Use
- Adding i18n support to UI
- Formatting currency (CHF/EUR)
- Adding new languages/currencies

## Library Choice

### Recommended: react-i18next
```bash
npm install react-i18next i18next
```

**Why**:
- ✅ Popular and well-maintained
- ✅ React integration
- ✅ TypeScript support
- ✅ Pluggable (can add more languages later)

## Setup

### Step 1: Install Dependencies
```bash
npm install react-i18next i18next
```

### Step 2: Create Translation Files
```
src/i18n/
├── en.json
├── de.json
└── index.ts
```

### Step 3: Configure i18next
```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import de from './de.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
```

### Step 4: Initialize in App
```typescript
// src/main.tsx
import './i18n';

// ... rest of app
```

## Translation Files

### English (en.json)
```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit"
  },
  "budget": {
    "create": "Create Budget",
    "period": "Period",
    "envelope": "Envelope"
  },
  "currency": {
    "chf": "CHF",
    "eur": "EUR"
  }
}
```

### German (de.json)
```json
{
  "common": {
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Löschen",
    "edit": "Bearbeiten"
  },
  "budget": {
    "create": "Budget erstellen",
    "period": "Zeitraum",
    "envelope": "Umschlag"
  },
  "currency": {
    "chf": "CHF",
    "eur": "EUR"
  }
}
```

## Usage in Components

### Basic Translation
```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return <button>{t('common.save')}</button>;
}
```

### With Interpolation
```typescript
const { t } = useTranslation();
const message = t('budget.created', { period: 'March 2025' });
// "Budget created for March 2025"
```

## Currency Formatting

### Format Currency Function
```typescript
// src/utils/currency.ts
export const formatCurrency = (
  amount: number,
  currency: 'CHF' | 'EUR',
  locale: 'en' | 'de' = 'en'
): string => {
  const localeMap = {
    en: 'en-US',
    de: 'de-CH', // Swiss German for CHF, de-DE for EUR
  };
  
  return new Intl.NumberFormat(localeMap[locale], {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Usage
formatCurrency(150.50, 'CHF', 'en'); // "CHF 150.50"
formatCurrency(150.50, 'EUR', 'de'); // "150,50 €"
```

### Currency Display Component
```typescript
interface CurrencyDisplayProps {
  amount: number;
  currency: 'CHF' | 'EUR';
}

function CurrencyDisplay({ amount, currency }: CurrencyDisplayProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language as 'en' | 'de';
  
  return <span>{formatCurrency(amount, currency, locale)}</span>;
}
```

## Language Switching

### Language Selector Component
```typescript
function LanguageSelector() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lng: 'en' | 'de') => {
    i18n.changeLanguage(lng);
    // Optionally save to localStorage
    localStorage.setItem('language', lng);
  };
  
  return (
    <select value={i18n.language} onChange={(e) => changeLanguage(e.target.value as 'en' | 'de')}>
      <option value="en">English</option>
      <option value="de">Deutsch</option>
    </select>
  );
}
```

### Persist Language Preference
```typescript
// Load saved language on app start
const savedLanguage = localStorage.getItem('language') || 'en';
i18n.changeLanguage(savedLanguage);
```

## Date Formatting

### Format Dates by Locale
```typescript
export const formatDate = (date: Date, locale: 'en' | 'de' = 'en'): string => {
  const localeMap = {
    en: 'en-US',
    de: 'de-CH',
  };
  
  return new Intl.DateTimeFormat(localeMap[locale], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

// Usage
formatDate(new Date('2025-03-15'), 'en'); // "March 15, 2025"
formatDate(new Date('2025-03-15'), 'de'); // "15. März 2025"
```

## Architecture for Adding More Languages

### Structure
```
src/i18n/
├── en.json
├── de.json
├── fr.json (future)
└── index.ts
```

### Adding New Language
1. Create translation file (e.g., `fr.json`)
2. Add to i18next config
3. Add option to language selector
4. Test translations

## Currency Per Envelope

### Storage
- Store currency in `envelopes` table: `currency TEXT NOT NULL DEFAULT 'CHF'`
- Or store default currency in finance file metadata

### Display
- Show currency symbol in grid cells
- Format amounts based on envelope currency
- Handle mixed currencies in same period

## Testing

### Test Cases
1. Switch language → UI updates
2. Format currency → correct format for locale
3. Format dates → correct format for locale
4. Persist language → saved preference loads on restart

## References
- **react-i18next**: https://react.i18next.com/
- **Intl.NumberFormat**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
- **Intl.DateTimeFormat**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat

## Output
Set up i18n infrastructure following this pattern.
