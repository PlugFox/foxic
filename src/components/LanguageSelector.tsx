import { createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { useI18n } from '../contexts/i18n.context'
import type { Locales } from '../i18n/i18n-types'
import { LanguageIcon } from './Icon'

export default function LanguageSelector() {
  const { locale, changeLocale, availableLocales, getLanguageName } = useI18n()
  const [isOpen, setIsOpen] = createSignal(false)
  const [triggerRef, setTriggerRef] = createSignal<HTMLButtonElement>()
  const [dropdownRef, setDropdownRef] = createSignal<HTMLDivElement>()

  const handleLanguageChange = (newLocale: Locales) => {
    console.log('🌐 Language selector: Changing locale to', newLocale)
    const success = changeLocale(newLocale)
    if (success) {
      setIsOpen(false)
      console.log('🌐 Language selector: Locale changed successfully')
    } else {
      console.error('🌐 Language selector: Failed to change locale')
    }
  }

  const getCurrentLanguageName = () => getLanguageName(locale())

  const updateDropdownPosition = () => {
    const trigger = triggerRef()
    const dropdown = dropdownRef()

    if (!trigger || !dropdown) {
      // Don't warn if dropdown is simply not open yet
      return
    }

    const triggerRect = trigger.getBoundingClientRect()
    const dropdownRect = dropdown.getBoundingClientRect()

    console.log('LanguageSelector: Updating position', {
      triggerRect,
      dropdownRect,
      scrollY: window.scrollY,
      scrollX: window.scrollX
    })

    // Position dropdown below trigger
    let top = triggerRect.bottom + 4
    let left = triggerRect.right - dropdownRect.width

    // Keep dropdown within viewport
    if (left < 8) {
      left = triggerRect.left
    }

    if (top + dropdownRect.height > window.innerHeight - 8) {
      top = triggerRect.top - dropdownRect.height - 4
    }

    console.log('LanguageSelector: Setting position', { top, left })

    dropdown.style.top = `${top}px`
    dropdown.style.left = `${left}px`
  }

  const handleClickOutside = (event: MouseEvent) => {
    const trigger = triggerRef()
    const dropdown = dropdownRef()

    if (!trigger || !dropdown) return

    if (!trigger.contains(event.target as Node) && !dropdown.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside)
    window.addEventListener('scroll', updateDropdownPosition, { passive: true })
    window.addEventListener('resize', updateDropdownPosition, { passive: true })
  })

  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside)
    window.removeEventListener('scroll', updateDropdownPosition)
    window.removeEventListener('resize', updateDropdownPosition)
  })

  return (
    <div class="language-selector">
      <button
        ref={setTriggerRef}
        class="language-selector-trigger"
        onClick={() => {
          const newState = !isOpen()
          setIsOpen(newState)
          if (newState) {
            // Schedule position update after render
            requestAnimationFrame(() => {
              updateDropdownPosition()
            })
          }
        }}
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
        <Portal>
          <div
            ref={(el) => {
              setDropdownRef(el)
              if (el) {
                // Обновляем позицию сразу после установки ref
                requestAnimationFrame(() => updateDropdownPosition())
              }
            }}
            class="language-selector-dropdown language-selector-dropdown--portal"
            role="menu"
            aria-label="Select Language"
            style={{ position: 'fixed', top: '0px', left: '0px' }}
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
        </Portal>
      </Show>
    </div>
  )
}