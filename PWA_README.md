# PWA Implementation - Foxic

## Реализованные функции

### 1. Web App Manifest (`/public/manifest.json`)
- **Название**: Foxic - Icons Generator
- **Короткое название**: Foxic
- **Режим отображения**: standalone (полноэкранное приложение)
- **Тема**: #2563eb (синий)
- **Иконки**: PNG иконки 180x180, 192x192, 512x512 (только PNG для максимальной совместимости)
- **Язык**: русский
- **Категории**: productivity, utilities

### 2. Service Worker (`/public/sw.js`)
**Стратегии кэширования:**
- **Статические ресурсы** (CSS, JS, изображения): Cache First с фоновым обновлением
- **API запросы**: Network First с fallback на кэш
- **HTML страницы**: Network First с fallback на главную страницу (SPA)

**Особенности:**
- Автоматическая очистка старых кэшей
- Обнаружение и уведомление об обновлениях
- Offline поддержка для статического контента
- Надежное кэширование без блокировки обновлений

### 3. PWA Meta Tags (`/index.html`)
- Поддержка iOS (apple-mobile-web-app-*)
- Поддержка Microsoft (msapplication-*)
- Оптимизация для мобильных устройств
- **Иконки**: PNG основные + SVG резервные для современных браузеров
- **Favicon**: ICO 32x32 для максимальной совместимости
- Правильные цвета темы

### 4. PWA Service (`/src/services/pwa.service.ts`)
- Управление регистрацией Service Worker
- Обработка обновлений приложения
- Проверка статуса PWA и установки
- Утилиты для разработки (очистка кэша)

### 5. Интеграция в приложение
- Автоматическая регистрация SW в production
- Индикатор PWA статуса на главной странице
- Адаптивные стили для standalone режима

## Как использовать

### Разработка
```bash
# Обычная разработка (без SW)
npm run dev

# Разработка с PWA (установить VITE_PWA_DEV=true в .env)
VITE_PWA_DEV=true npm run dev

# Конвертация иконок вручную
npm run icons:convert
```

### Production
```bash
# Сборка с PWA
npm run build

# Локальный preview
npm run serve
```

### Тестирование PWA
1. Соберите приложение: `npm run build`
2. Запустите preview: `npm run serve`
3. Откройте в браузере: `http://localhost:4173`
4. Нажмите кнопку "PWA" внизу справа для проверки статуса
5. В Chrome DevTools → Application → Manifest/Service Workers

### Установка PWA
1. В Chrome/Edge: кнопка "Установить" в адресной строке
2. На мобильном: "Добавить на главный экран"
3. Проверьте режим standalone: кнопка PWA станет зеленой

## Файловая структура PWA

```
public/
├── manifest.json          # Web App Manifest
├── sw.js                 # Service Worker
├── browserconfig.xml     # Microsoft Edge/IE конфигурация
├── favicon.ico           # Основной favicon
├── favicon-32.png        # PNG favicon
├── icon-180.png         # PNG иконка для iOS
├── icon-192.png         # PNG стандартная иконка
└── icon-512.png         # PNG большая иконка

src/assets/
├── icon-180.svg         # Исходный SVG (для генерации PNG)
├── icon-192.svg         # Исходный SVG (для генерации PNG)
└── icon-512.svg         # Исходный SVG (для генерации PNG)

src/
├── services/
│   └── pwa.service.ts   # PWA управление
└── index.tsx            # Регистрация SW
```

## Проверка PWA

### Chrome DevTools
1. F12 → Application tab
2. **Manifest**: проверка манифеста
3. **Service Workers**: статус SW
4. **Storage → Cache**: содержимое кэша

### Lighthouse
1. F12 → Lighthouse tab
2. Progressive Web App audit
3. Должно показать высокие баллы по PWA критериям

### Offline тестирование
1. DevTools → Network → Offline
2. Обновите страницу - приложение должно работать
3. Статические ресурсы загружаются из кэша

## Автоматическая генерация иконок

### Скрипт конвертации (`scripts/convert-icons.js`)
- Автоматически генерирует PNG из SVG при сборке
- Создает favicon.ico из иконки 192px
- Оптимизирует размер и качество PNG
- Поддерживает ES модули (современный Node.js)

### Размеры иконок
- **180x180**: Apple Touch Icon (iOS)
- **192x192**: Стандартная PWA иконка
- **512x512**: Большая PWA иконка (splash screen)
- **32x32**: Favicon PNG
- **ICO**: Традиционный favicon

## Мониторинг

- Service Worker логи в консоли (префикс `[SW]`)
- PWA статус через кнопку в приложении
- Cache API в DevTools для проверки кэша
- Автоматическая конвертация иконок при каждой сборке

## Обновления

Service Worker автоматически:
- Обнаруживает обновления
- Показывает диалог пользователю
- Применяет обновления с перезагрузкой

Для принудительного обновления:
```javascript
// В консоли браузера
pwaService.applyUpdate();
```