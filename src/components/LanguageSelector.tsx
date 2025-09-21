import { createSignal, For, Show } from 'solid-js'
import { useI18n } from '../contexts/i18n.context'
import type { Locales } from '../i18n/i18n-types'
import { LanguageIcon } from './Icon'

const LANGUAGE_NAMES: Record<Locales, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  ru: 'Русский',
}

export default function LanguageSelector() {
  const { locale, changeLocale, availableLocales } = useI18n()
  const [isOpen, setIsOpen] = createSignal(false)

  const handleLanguageChange = async (newLocale: Locales) => {
    try {
      console.log('🌐 Language selector: Changing locale to', newLocale)
      await changeLocale(newLocale)
      setIsOpen(false)
      console.log('🌐 Language selector: Locale changed successfully')
    } catch (error) {
      console.error('🌐 Language selector: Failed to change locale:', error)
    }
  }

  const getLanguageName = (loc: Locales): string => {
    return LANGUAGE_NAMES[loc] || loc.toUpperCase()
  }

  const getCurrentLanguageName = () => getLanguageName(locale())

  return (
    <div class="language-selector">
      <button
        class="language-selector-trigger"
        onClick={() => setIsOpen(!isOpen())}
        aria-label={`Language: ${getCurrentLanguageName()}`}
        aria-expanded={isOpen()}
        aria-haspopup="menu"
      >
        <LanguageIcon size={18} aria-hidden="true" />
        <span class="language-selector-current">{getCurrentLanguageName()}</span>
        <span class="language-selector-arrow" aria-hidden="true">
          {isOpen() ? '▲' : '▼'}
        </span>
      </button>

      <Show when={isOpen()}>
        <div
          class="language-selector-dropdown"
          role="menu"
          aria-label="Select Language"
        >
          <For each={availableLocales}>
            {(loc) => (
              <button
                class={`language-selector-option ${locale() === loc ? 'language-selector-option--active' : ''}`}
                role="menuitem"
                onClick={() => handleLanguageChange(loc)}
                aria-label={getLanguageName(loc)}
                aria-current={locale() === loc ? 'true' : 'false'}
              >
                <span class="language-selector-option-code">{loc.toUpperCase()}</span>
                <span class="language-selector-option-name">{getLanguageName(loc)}</span>
                <Show when={locale() === loc}>
                  <span class="language-selector-option-check" aria-hidden="true">✓</span>
                </Show>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}