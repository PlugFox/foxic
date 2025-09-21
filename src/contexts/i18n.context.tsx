import { ParentComponent, createContext, createSignal, onMount, useContext } from 'solid-js'
import type { Locales, TranslationFunctions } from '../i18n/i18n-types'
import { baseLocale, detectLocale, i18nObject } from '../i18n/i18n-util'
import { loadLocaleAsync } from '../i18n/i18n-util.async'
import { analyticsService } from '../services/analytics.service'

interface I18nContextType {
  LL: () => TranslationFunctions
  locale: () => Locales
  changeLocale: (newLocale: Locales) => Promise<void>
  availableLocales: Locales[]
}

const I18nContext = createContext<I18nContextType>()

export const I18nProvider: ParentComponent = (props) => {
  const availableLocales: Locales[] = ['en', 'es', 'fr', 'de', 'pt', 'ru']
  const [currentLocale, setCurrentLocale] = createSignal<Locales>(baseLocale)

  const handleChangeLocale = async (newLocale: Locales) => {
    const oldLocale = currentLocale()

    try {
      await loadLocaleAsync(newLocale)
      setCurrentLocale(newLocale)

      // Store in localStorage
      localStorage.setItem('preferred-locale', newLocale)

      // Track language change
      analyticsService.track('language_changed', {
        from_locale: oldLocale,
        to_locale: newLocale
      })
    } catch (error) {
      console.error('Failed to change locale:', error)
    }
  }

  // Initialize locale on mount
  onMount(async () => {
    try {
      // Try to get saved locale or detect browser locale
      const savedLocale = localStorage.getItem('preferred-locale') as Locales
      const detectedLocale = detectLocale()
      const initialLocale = savedLocale || detectedLocale || baseLocale

      await loadLocaleAsync(initialLocale)
      setCurrentLocale(initialLocale)
    } catch (error) {
      console.error('Failed to initialize locale:', error)
      // Fallback to base locale
      await loadLocaleAsync(baseLocale)
      setCurrentLocale(baseLocale)
    }
  })

  const contextValue: I18nContextType = {
    LL: () => i18nObject(currentLocale()),
    locale: currentLocale,
    changeLocale: handleChangeLocale,
    availableLocales,
  }

  return (
    <I18nContext.Provider value={contextValue}>
      {props.children}
    </I18nContext.Provider>
  )
}

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export const useTranslation = () => {
  const { LL } = useI18n()
  return LL()
}