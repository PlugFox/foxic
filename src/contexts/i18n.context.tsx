import { ParentComponent, createContext, createSignal, onMount, useContext } from 'solid-js'
import type { Locales, TranslationFunctions } from '../i18n/i18n-types'
import { baseLocale, detectLocale, i18nObject } from '../i18n/i18n-util'
import { loadLocaleAsync } from '../i18n/i18n-util.async'
import { analyticsService } from '../services/analytics.service'

interface I18nContextType {
  LL: () => TranslationFunctions
  locale: () => Locales
  changeLocale: (newLocale: Locales) => Promise<void>
  resetLocale: () => Promise<void>
  availableLocales: Locales[]
}

const I18nContext = createContext<I18nContextType>()

export const I18nProvider: ParentComponent = (props) => {
  const availableLocales: Locales[] = ['en', 'es', 'fr', 'de', 'pt', 'ru']
  const [currentLocale, setCurrentLocale] = createSignal<Locales>(baseLocale)
  const [translations, setTranslations] = createSignal<TranslationFunctions>(i18nObject(baseLocale))

  const handleChangeLocale = async (newLocale: Locales) => {
    // Validate that the new locale is supported
    if (!availableLocales.includes(newLocale)) {
      console.warn(`🌐 Locale '${newLocale}' is not supported. Available locales:`, availableLocales)
      return
    }

    const oldLocale = currentLocale()
    console.log(`🌐 Changing locale from '${oldLocale}' to '${newLocale}'`)

    try {
      await loadLocaleAsync(newLocale)
      setCurrentLocale(newLocale)
      setTranslations(i18nObject(newLocale))

      // Store in localStorage only if successfully loaded
      localStorage.setItem('preferred-locale', newLocale)
      console.log(`🌐 Locale '${newLocale}' loaded and saved to localStorage`)

      // Track language change
      analyticsService.track('language_changed', {
        from_locale: oldLocale,
        to_locale: newLocale
      })
    } catch (error) {
      console.error('🌐 Failed to change locale:', error)
      // Don't store invalid locale in localStorage
    }
  }

  const handleResetLocale = async () => {
    // Clear saved locale and reset to browser/default locale
    localStorage.removeItem('preferred-locale')
    const resetLocale = getInitialLocale()
    await handleChangeLocale(resetLocale)
  }

  // Helper function to validate and get initial locale
  const getInitialLocale = (): Locales => {
    // Try to get saved locale from localStorage
    const savedLocale = localStorage.getItem('preferred-locale')
    if (savedLocale && availableLocales.includes(savedLocale as Locales)) {
      console.log('🌐 Using saved locale:', savedLocale)
      return savedLocale as Locales
    }

    // Try to detect browser locale
    const detectedLocale = detectLocale()
    if (availableLocales.includes(detectedLocale)) {
      console.log('🌐 Using detected browser locale:', detectedLocale)
      return detectedLocale
    }

    // Fallback to English if base locale is not in available locales
    const fallbackLocale = availableLocales.includes(baseLocale) ? baseLocale : 'en'
    console.log('🌐 Using fallback locale:', fallbackLocale, '(savedLocale:', savedLocale, ', detectedLocale:', detectedLocale, ')')
    return fallbackLocale
  }

  // Initialize locale on mount
  onMount(async () => {
    console.log('🌐 I18n initialization started. Available locales:', availableLocales)

    try {
      const initialLocale = getInitialLocale()

      await loadLocaleAsync(initialLocale)
      setCurrentLocale(initialLocale)
      setTranslations(i18nObject(initialLocale))

      console.log('🌐 I18n initialized successfully with locale:', initialLocale)
    } catch (error) {
      console.error('Failed to initialize locale:', error)
      // Fallback to English
      try {
        await loadLocaleAsync('en')
        setCurrentLocale('en')
        setTranslations(i18nObject('en'))
        console.log('🌐 Fallback to English locale completed')
      } catch (fallbackError) {
        console.error('Failed to load fallback locale:', fallbackError)
      }
    }
  })

  const contextValue: I18nContextType = {
    LL: translations,
    locale: currentLocale,
    changeLocale: handleChangeLocale,
    resetLocale: handleResetLocale,
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