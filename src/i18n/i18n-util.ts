import { createMemo, createSignal } from 'solid-js'
import en from './en'
import type { Locales, Translation } from './i18n-types'

const [currentLocale, setCurrentLocale] = createSignal<Locales>('en')
const [translations, setTranslations] = createSignal<Translation>(en)

export const locale = currentLocale
export const LL = createMemo(() => translations())

// Lazy loading function for locales
export const loadLocale = async (newLocale: Locales): Promise<Translation> => {
  switch (newLocale) {
    case 'en':
      return en
    case 'ru':
      return (await import('./ru')).default
    case 'es':
      return (await import('./es')).default
    case 'fr':
      return (await import('./fr')).default
    case 'de':
      return (await import('./de')).default
    case 'pt':
      return (await import('./pt')).default
    default:
      return en
  }
}

// Detect browser locale
export const detectLocale = (): Locales => {
  const browserLang = navigator.language.toLowerCase()

  if (browserLang.startsWith('ru')) return 'ru'
  if (browserLang.startsWith('es')) return 'es'
  if (browserLang.startsWith('fr')) return 'fr'
  if (browserLang.startsWith('de')) return 'de'
  if (browserLang.startsWith('pt')) return 'pt'

  return 'en' // default fallback
}

// Set locale with lazy loading
export const changeLocale = async (newLocale: Locales): Promise<void> => {
  try {
    const translation = await loadLocale(newLocale)
    setCurrentLocale(newLocale)
    setTranslations(translation)

    // Store in localStorage
    localStorage.setItem('foxic-locale', newLocale)

    // Update HTML lang attribute
    document.documentElement.lang = newLocale

    console.log(`🌐 Locale changed to: ${newLocale}`)
  } catch (error) {
    console.error('Error loading locale:', error)
  }
}

// Initialize locale
export const initLocale = async (): Promise<void> => {
  // Try to get from localStorage first
  const savedLocale = localStorage.getItem('foxic-locale') as Locales
  const initialLocale = savedLocale || detectLocale()

  await changeLocale(initialLocale)
}