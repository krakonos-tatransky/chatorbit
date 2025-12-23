# ChatOrbit Mobile i18n System

This directory contains the internationalization (i18n) system for the ChatOrbit mobile app, mirroring the implementation from the Next.js frontend.

## Features

- **Automatic Language Detection**: Detects device language on first launch
- **Persistent Preferences**: Saves language choice to AsyncStorage
- **Two Languages**: English (en) and Slovak (sk)
- **Type-Safe Translations**: Full TypeScript support with autocomplete
- **React Context**: Easy access to translations via `useLanguage()` hook
- **Language Switcher**: Pre-built UI component for changing languages

## Structure

```
mobile/src/i18n/
├── README.md              # This file
├── index.ts               # Public exports
├── translations.ts        # Translation definitions and types
├── LanguageProvider.tsx   # React Context provider
└── LanguageSwitcher.tsx   # UI component for language selection
```

## Quick Start

The i18n system is already set up! The app is wrapped with `LanguageProvider` in `App.tsx`.

### Using Translations in Components

```typescript
import { useLanguage } from '@/i18n';

function MyComponent() {
  const { translations, language } = useLanguage();

  return (
    <View>
      <Text>{translations.session.chat.sendButton}</Text>
      <Text>Current language: {language}</Text>
    </View>
  );
}
```

### Using the Language Switcher

```typescript
import { LanguageSwitcher } from '@/i18n';

function SettingsScreen() {
  return (
    <View>
      <LanguageSwitcher />
    </View>
  );
}
```

### Formatting Translations with Placeholders

Some translations contain placeholders like `{year}` or `{count}`:

```typescript
import { useLanguage, formatTranslation } from '@/i18n';

function CopyrightNotice() {
  const { translations } = useLanguage();

  const copyrightText = formatTranslation(
    translations.footer.copyright,
    { year: new Date().getFullYear() }
  );

  return <Text>{copyrightText}</Text>;
}
```

## Translation Structure

Translations are organized hierarchically:

```typescript
translations = {
  languageSwitcher: { ... },
  navigation: { ... },
  footer: { ... },
  home: { ... },
  joinCard: { ... },
  tokenCard: { ... },
  termsModal: { ... },
  session: {
    statusCard: { ... },
    call: { ... },
    chat: { ... },
    controls: { ... }
  }
}
```

## API Reference

### `useLanguage()` Hook

Returns an object with:

```typescript
{
  language: LanguageCode;              // Current language: 'en' | 'sk'
  setLanguage: (code: LanguageCode) => void;  // Change language
  definition: LanguageDefinition;      // Current language metadata
  translations: AppTranslation;        // All translations for current language
  availableLanguages: LanguageDefinition[];  // List of all languages
  isLoading: boolean;                  // True during initial language detection
}
```

### `formatTranslation(template, values)`

Helper for replacing placeholders in translation strings:

```typescript
formatTranslation('Hello {name}!', { name: 'Alice' })
// Returns: "Hello Alice!"
```

## Adding New Translations

1. **Open `translations.ts`**
2. **Add to `baseTranslation` (English)**:
   ```typescript
   const baseTranslation = {
     // ... existing translations
     myNewSection: {
       title: 'My Title',
       description: 'My description with {placeholder}'
     }
   };
   ```

3. **Add to Slovak translation**:
   ```typescript
   sk: {
     ...baseTranslation,
     // ... other Slovak translations
     myNewSection: {
       title: 'Môj názov',
       description: 'Môj popis s {placeholder}'
     }
   }
   ```

4. **Use in component**:
   ```typescript
   const { translations } = useLanguage();
   <Text>{translations.myNewSection.title}</Text>
   ```

## Adding a New Language

1. **Add language code to type** in `translations.ts`:
   ```typescript
   export type LanguageCode = 'en' | 'sk' | 'de';  // Added 'de' for German
   ```

2. **Add language definition**:
   ```typescript
   export const LANGUAGE_DEFINITIONS: Record<LanguageCode, LanguageDefinition> = {
     en: { code: 'en', label: 'English', nativeLabel: 'English', flagEmoji: '🇺🇸' },
     sk: { code: 'sk', label: 'Slovak', nativeLabel: 'Slovenčina', flagEmoji: '🇸🇰' },
     de: { code: 'de', label: 'German', nativeLabel: 'Deutsch', flagEmoji: '🇩🇪' }
   };
   ```

3. **Add translations**:
   ```typescript
   export const TRANSLATIONS: Record<LanguageCode, AppTranslation> = {
     en: baseTranslation,
     sk: { /* Slovak translations */ },
     de: { /* German translations */ }
   };
   ```

## Syncing with Frontend

The mobile i18n system mirrors the frontend implementation. To keep them in sync:

1. Check `frontend/lib/i18n/translations.tsx` for updates
2. Port new translation keys to mobile's `translations.ts`
3. Note: Frontend uses JSX in some translations (terms/privacy), mobile uses plain strings
4. Maintain identical translation key structure for consistency

## Migration Guide

To migrate existing components:

### Before (hardcoded strings):
```typescript
<Text>Send</Text>
<Text>No messages yet</Text>
```

### After (using i18n):
```typescript
import { useLanguage } from '@/i18n';

function ChatComponent() {
  const { translations } = useLanguage();

  return (
    <>
      <Text>{translations.session.chat.sendButton}</Text>
      <Text>{translations.session.chat.emptyState}</Text>
    </>
  );
}
```

## Dependencies

- `@react-native-async-storage/async-storage` - Persisting language preference
- `expo-localization` - Detecting device language

These are already installed and configured.

## Testing Different Languages

### In Development:
1. Tap the language switcher (flag icon + language name)
2. Select a different language
3. The app will update immediately

### On Device:
- Language preference persists across app restarts
- Stored in AsyncStorage with key: `chatOrbit.language`

## Troubleshooting

### Translations not updating?
- Ensure component is inside `<LanguageProvider>`
- Check that you're using `useLanguage()` hook
- Verify translation keys exist in both languages

### Language switcher not showing?
```typescript
import { LanguageSwitcher } from '@/i18n';  // Correct
import { LanguageSwitcher } from '../i18n'; // Also works with relative path
```

### AsyncStorage errors?
- Ensure `@react-native-async-storage/async-storage` is installed
- Run `npx expo install @react-native-async-storage/async-storage`

## Example: Migrating a Component

Here's a complete example of migrating the AcceptScreen component:

**Before:**
```typescript
export const AcceptScreen: React.FC<AcceptScreenProps> = ({ onAccept }) => {
  return (
    <View>
      <Text>Accept & Continue</Text>
    </View>
  );
};
```

**After:**
```typescript
import { useLanguage } from '../i18n';

export const AcceptScreen: React.FC<AcceptScreenProps> = ({ onAccept }) => {
  const { translations } = useLanguage();

  return (
    <View>
      <Text>{translations.termsModal.agree}</Text>
    </View>
  );
};
```

## Next Steps

1. **Audit components** for hardcoded strings
2. **Add missing translations** to `translations.ts`
3. **Update components** to use `useLanguage()` hook
4. **Test language switching** on different screens
5. **Keep in sync** with frontend translations

## Questions?

Check the frontend implementation at `frontend/lib/i18n/` for reference patterns.
