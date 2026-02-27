# Internationalization (i18n) Guide

This directory contains the internationalization configuration and translation files for the Agri-Civic Intelligence Platform.

## Overview

The application supports 10 languages:
- English (en)
- Hindi (hi)
- Bengali (bn)
- Telugu (te)
- Tamil (ta)
- Marathi (mr)
- Gujarati (gu)
- Kannada (kn)
- Malayalam (ml)
- Punjabi (pa)

## File Structure

```
i18n/
├── config.js           # i18next configuration
├── languages.js        # Language constants and utilities
├── locales/           # Translation files
│   ├── en.json        # English translations
│   ├── hi.json        # Hindi translations
│   ├── bn.json        # Bengali translations
│   ├── te.json        # Telugu translations
│   ├── ta.json        # Tamil translations
│   ├── mr.json        # Marathi translations
│   ├── gu.json        # Gujarati translations
│   ├── kn.json        # Kannada translations
│   ├── ml.json        # Malayalam translations
│   └── pa.json        # Punjabi translations
└── README.md          # This file
```

## Usage in Components

### Basic Translation

```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.appName')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### Translation with Interpolation

```jsx
import { useTranslation } from 'react-i18next';

function WelcomeMessage({ userName }) {
  const { t } = useTranslation();
  
  return (
    <h1>{t('dashboard.welcomeMessage', { name: userName })}</h1>
  );
}
```

### Using the Language Hook

```jsx
import { useLanguage } from '../hooks/useLanguage';

function LanguageSettings() {
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();
  
  return (
    <select 
      value={currentLanguage} 
      onChange={(e) => changeLanguage(e.target.value)}
    >
      {availableLanguages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.nativeName}
        </option>
      ))}
    </select>
  );
}
```

### Using the Language Selector Component

```jsx
import LanguageSelector from '../components/common/LanguageSelector';

function Header() {
  return (
    <header>
      <LanguageSelector />
    </header>
  );
}
```

## Translation Keys Structure

Translation keys are organized by feature/domain:

- `common.*` - Common UI elements (buttons, labels, etc.)
- `auth.*` - Authentication related strings
- `profile.*` - User profile strings
- `navigation.*` - Navigation menu items
- `dashboard.*` - Dashboard specific strings
- `chat.*` - Chat interface strings
- `disease.*` - Disease detection strings
- `weather.*` - Weather information strings
- `market.*` - Market intelligence strings
- `schemes.*` - Government schemes strings
- `notifications.*` - Notification strings
- `admin.*` - Admin panel strings
- `errors.*` - Error messages
- `validation.*` - Form validation messages

## Adding New Translations

1. Add the key to `locales/en.json` (English is the base language)
2. Add corresponding translations to all other language files
3. Use the key in your component with `t('your.new.key')`

Example:

```json
// locales/en.json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is my feature"
  }
}
```

```jsx
// In your component
const { t } = useTranslation();
<h1>{t('myFeature.title')}</h1>
```

## Language Persistence

The selected language is automatically persisted to `localStorage` and restored on app reload.

## Testing Translations

To test translations:

1. Use the language selector in the header
2. Switch between languages
3. Verify all UI strings are translated correctly
4. Check for missing translations (they will display the key path)

## Best Practices

1. Always use translation keys instead of hardcoded strings
2. Keep translation keys descriptive and organized
3. Use interpolation for dynamic content
4. Test all languages before deploying
5. Keep translation files in sync across all languages
6. Use consistent naming conventions for keys
7. Group related translations together

## Fallback Behavior

If a translation key is missing:
- The app will fall back to English (en)
- If English is also missing, the key path will be displayed
- Check browser console for missing translation warnings

## Adding a New Language

To add a new language:

1. Create a new JSON file in `locales/` (e.g., `locales/ur.json`)
2. Copy the structure from `locales/en.json`
3. Translate all strings to the new language
4. Add the language to `languages.js`:
   ```js
   { code: 'ur', name: 'Urdu', nativeName: 'اردو' }
   ```
5. Import and add to resources in `config.js`

## Common Issues

### Translations not updating
- Clear browser cache and localStorage
- Restart the development server
- Check that the language code matches exactly

### Missing translations
- Verify the key exists in the translation file
- Check for typos in the key path
- Ensure the translation file is properly imported in config.js

### Language not persisting
- Check localStorage is enabled in the browser
- Verify the language code is valid
- Check browser console for errors
