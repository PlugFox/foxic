import { createMemo, createSignal } from 'solid-js'
import type { Locales } from '../i18n/i18n-types'
import ruTranslations from '../i18n/ru/index'

export const AVAILABLE_LOCALES: Locales[] = ['ru']

export const LANGUAGE_NAMES: Record<string, string> = {
  ru: 'Русский',
}

// Helper function to convert string values to functions
function createTranslationProxy(obj: any): any {
  if (typeof obj === 'string') {
    return (params?: any) => {
      if (params && typeof params === 'object') {
        // Simple string interpolation for parameters like {name}, {count}, etc.
        return obj.replace(/\{(\w+)\}/g, (match, key) => params[key] || match)
      }
      return obj
    }
  }

  if (typeof obj === 'object' && obj !== null) {
    const proxy: any = {}
    for (const [key, value] of Object.entries(obj)) {
      proxy[key] = createTranslationProxy(value)
    }
    return proxy
  }

  return obj
}

class I18nService {
  private currentLocale: () => Locales
  private setCurrentLocale: (value: Locales) => Locales
  private translationProxy: any

  constructor() {
    const [locale, setLocale] = createSignal<Locales>('ru')

    this.currentLocale = locale
    this.setCurrentLocale = setLocale
    this.translationProxy = createTranslationProxy(ruTranslations)

    console.log('🌐 I18n Service: Initialized with Russian locale')
  }

  // Public getters (reactive)
  get locale() {
    return this.currentLocale
  }

  get t() {
    return createMemo(() => this.translationProxy)
  }

  get availableLocales() {
    return AVAILABLE_LOCALES
  }

  get languageNames() {
    return LANGUAGE_NAMES
  }

  // Change locale method (currently does nothing, always Russian)
  changeLocale = (newLocale: Locales) => {
    console.log(`🌐 I18n Service: Locale change requested to '${newLocale}', but staying on Russian`)
    return true
  }

  // Reset to default locale
  resetLocale = () => {
    console.log('🌐 I18n Service: Locale reset requested, staying on Russian')
    return true
  }

  // Get language name for locale
  getLanguageName = (locale: string): string => {
    return LANGUAGE_NAMES[locale] || locale.toUpperCase()
  }

  // Check if service is ready (always ready)
  get isReady() {
    return createMemo(() => true)
  }
}

// Create singleton instance
export const i18nService = new I18nService()

console.log('🌐 I18n Service: Service created and ready')