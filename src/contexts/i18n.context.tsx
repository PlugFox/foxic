import { ParentComponent, createContext, onMount, useContext } from 'solid-js'
import type { Locales } from '../i18n/i18n-types'
import { LL, changeLocale, initLocale, locale } from '../i18n/i18n-util'
import { analyticsService } from '../services/analytics.service'

interface I18nContextType {
  LL: typeof LL
  locale: typeof locale
  changeLocale: (newLocale: Locales) => Promise<void>
  availableLocales: Locales[]
}

const I18nContext = createContext<I18nContextType>()

export const I18nProvider: ParentComponent = (props) => {
  const availableLocales: Locales[] = ['en', 'es', 'fr', 'de', 'pt', 'ru']

  const handleChangeLocale = async (newLocale: Locales) => {
    const oldLocale = locale()

    try {
      await changeLocale(newLocale)

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
      await initLocale()
    } catch (error) {
      console.error('Failed to initialize locale:', error)
    }
  })

  const contextValue: I18nContextType = {
    LL,
    locale,
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