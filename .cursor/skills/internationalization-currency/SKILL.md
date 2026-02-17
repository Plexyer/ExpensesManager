# Skill: Internationalization & Currency

## Purpose
How to scaffold internationalization (i18n) and currency support for EN/DE/HU and locale-aware currencies (CHF/EUR/HUF).

## When to Use
- Adding i18n support to UI
- Formatting currency (CHF/EUR/HUF)
- Adding new languages/currencies
- Extending the existing 3-language setup (EN/DE/HU)

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
├── hu.json
└── index.ts
```

### Step 3: Configure i18next
```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import de from './de.json';
import hu from './hu.json';

export type SupportedLanguage = 'en' | 'de' | 'hu';

export const SUPPORTED_LANGUAGES: ReadonlyArray<{ code: SupportedLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'hu', label: 'Magyar' },
];

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      hu: { translation: hu },
    },
    lng: getStoredLanguage(), // persisted in localStorage
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
  currency: 'CHF' | 'EUR' | 'HUF',
  locale: 'en' | 'de' | 'hu' = 'en'
): string => {
  const localeMap: Record<string, string> = {
    en: 'en-US',
    de: 'de-CH', // Swiss German for CHF, de-DE for EUR
    hu: 'hu-HU', // Hungarian
  };
  
  return new Intl.NumberFormat(localeMap[locale], {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'HUF' ? 0 : 2,
    maximumFractionDigits: currency === 'HUF' ? 0 : 2,
  }).format(amount);
};

// Usage
formatCurrency(150.50, 'CHF', 'en'); // "CHF 150.50"
formatCurrency(150.50, 'EUR', 'de'); // "150,50 €"
formatCurrency(5000, 'HUF', 'hu');   // "5 000 Ft"
```

### Currency Display Component
```typescript
interface CurrencyDisplayProps {
  amount: number;
  currency: 'CHF' | 'EUR' | 'HUF';
}

function CurrencyDisplay({ amount, currency }: CurrencyDisplayProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language as 'en' | 'de' | 'hu';
  
  return <span>{formatCurrency(amount, currency, locale)}</span>;
}
```

## Language Switching

### Language Selector Component
```typescript
import { SUPPORTED_LANGUAGES, persistLanguage, type SupportedLanguage } from '@/i18n';

function LanguageSelector() {
  const { i18n } = useTranslation();
  
  const handleChangeLanguage = (lng: SupportedLanguage) => {
    i18n.changeLanguage(lng);
    persistLanguage(lng);
  };
  
  return (
    <select
      value={i18n.language}
      onChange={(e) => handleChangeLanguage(e.target.value as SupportedLanguage)}
    >
      {SUPPORTED_LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
}
```

### Persist Language Preference
Language persistence is handled via `localStorage` in `src/i18n/index.ts`:
- `getStoredLanguage()` reads on app start
- `persistLanguage(lang)` saves after user selection
- Storage key: `expenses-manager-language`

## Date Formatting

### Format Dates by Locale
```typescript
export const formatDate = (date: Date, locale: 'en' | 'de' | 'hu' = 'en'): string => {
  const localeMap: Record<string, string> = {
    en: 'en-US',
    de: 'de-CH',
    hu: 'hu-HU',
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
formatDate(new Date('2025-03-15'), 'hu'); // "2025. március 15."
```

## Architecture for Adding More Languages

### Current Structure
```
src/i18n/
├── en.json    (English)
├── de.json    (German)
├── hu.json    (Hungarian)
├── fr.json    (future)
└── index.ts   (config, SupportedLanguage type, SUPPORTED_LANGUAGES array)
```

### Adding New Language
1. Create translation file (e.g., `fr.json`) copying structure from `en.json`
2. Import in `src/i18n/index.ts` and add to `resources`
3. Add to `SupportedLanguage` type union
4. Add to `SUPPORTED_LANGUAGES` array
5. Add locale mapping in `formatCurrency` and `formatDate` helpers
6. Test translations and currency/date formatting

## Currency Per Category

### Storage
- Store currency in `global_categories` table or finance file metadata
- Default currency can be set per dataset

### Display
- Show currency symbol in PeriodGrid cells
- Format amounts based on category currency
- Handle mixed currencies in same period (if supported)

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
