import type { BaseTranslation } from 'typesafe-i18n'

const ru = {
  // App
  app: {
    title: 'Foxic',
    description: 'Генератор шрифтов иконок',
  },

  // Navigation
  nav: {
    home: 'Главная',
    projects: 'Проекты',
    logout: 'Выйти',
    userMenu: 'Меню пользователя',
  },

  // Authentication
  auth: {
    loginWithGoogle: 'Войти через Google',
    logout: 'Выйти',
    currentUser: 'Текущий пользователь: {user}',
    signOut: 'Выйти из аккаунта',
  },

  // Projects
  projects: {
    title: 'Мои проекты',
    count: '{count} {count|проект|проекта|проектов}',
    empty: {
      title: 'У вас пока нет проектов',
      description: 'Создайте свой первый проект для работы с иконками',
      createFirst: 'Создать первый проект',
    },
    loading: 'Загрузка проектов...',
    create: 'Создать проект',
    open: 'Открыть проект',
    pin: 'Закрепить',
    unpin: 'Открепить',
    pinned: 'Проект закреплен',
    delete: 'Удалить проект',
    leave: 'Покинуть проект',
    menu: 'Меню проекта',
    role: {
      owner: 'Владелец',
      admin: 'Администратор',
      editor: 'Редактор',
      viewer: 'Наблюдатель',
    },
    notifications: '{count} непрочитанных уведомлений',
  },

  // Project actions
  actions: {
    delete: {
      title: 'Удалить проект',
      message: 'Вы уверены, что хотите удалить проект "{name}"? Это действие нельзя отменить.',
      confirm: 'Удалить',
    },
    leave: {
      title: 'Покинуть проект',
      message: 'Вы уверены, что хотите покинуть проект "{name}"? Вы потеряете доступ к проекту.',
      confirm: 'Покинуть',
    },
    cancel: 'Отмена',
  },

  // Forms
  forms: {
    projectName: 'Название проекта',
    projectDescription: 'Описание проекта',
    visibility: 'Видимость',
    tags: 'Теги',
    create: 'Создать',
    save: 'Сохранить',
    cancel: 'Отмена',
  },

  // Icons
  icons: {
    upload: 'Загрузить иконки',
    delete: 'Удалить иконку',
    edit: 'Редактировать иконку',
    download: 'Скачать',
    share: 'Поделиться',
    copy: 'Копировать',
  },

  // Export
  export: {
    title: 'Экспорт',
    formats: 'Форматы экспорта',
    download: 'Скачать',
  },

  // Languages
  languages: {
    en: 'Английский',
    es: 'Испанский',
    fr: 'Французский',
    de: 'Немецкий',
    pt: 'Португальский',
    ru: 'Русский',
  },

  // Common
  common: {
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успешно',
    warning: 'Предупреждение',
    info: 'Информация',
    close: 'Закрыть',
    back: 'Назад',
    next: 'Далее',
    search: 'Поиск',
    filter: 'Фильтр',
    sort: 'Сортировка',
    settings: 'Настройки',
    help: 'Помощь',
    more: 'Ещё',
  },

  // PWA
  pwa: {
    info: 'Показать информацию о Progressive Web App',
    status: 'Статус PWA',
    installed: 'PWA установлено',
    serviceWorker: 'Service Worker',
    online: 'Онлайн',
    cache: 'Кэш',
  },

  // Tooltips
  tooltips: {
    // User actions
    userAvatar: 'Профиль пользователя',
    signOut: 'Выйти из аккаунта',

    // Project actions
    createProject: 'Создать новый проект',
    openProject: 'Открыть проект',
    pinProject: 'Закрепить проект',
    unpinProject: 'Открепить проект',
    deleteProject: 'Удалить проект',
    leaveProject: 'Покинуть проект',
    projectMenu: 'Меню проекта',

    // Icon actions
    uploadIcons: 'Загрузить новые иконки',
    deleteIcon: 'Удалить иконку',
    editIcon: 'Редактировать иконку',
    downloadIcon: 'Скачать иконку',
    copyIcon: 'Копировать иконку',

    // Export actions
    exportProject: 'Экспортировать проект',
    downloadFont: 'Скачать шрифт',
    copyCSS: 'Копировать CSS код',

    // Navigation
    goHome: 'Перейти на главную страницу',
    goBack: 'Вернуться назад',
    openSettings: 'Открыть настройки',
    toggleTheme: 'Переключить тему',

    // Common UI
    search: 'Поиск по проектам и иконкам',
    filter: 'Фильтр результатов',
    sort: 'Сортировка',
    close: 'Закрыть',
    help: 'Справка и помощь',
    more: 'Дополнительные действия',
  },

  // Accessibility
  a11y: {
    skipToContent: 'Перейти к содержимому',
    mainContent: 'Основное содержимое',
    navigation: 'Навигация',
    applicationLandmark: 'Foxic - Генератор шрифтов иконок',
    projectGrid: 'Сетка проектов',
    projectRole: 'Ваша роль в проекте: {role}',
    loadingProjects: 'Загрузка проектов',
    emptyProjects: 'Нет доступных проектов',
    menuExpanded: 'Меню развернуто',
    menuCollapsed: 'Меню свернуто',
  },

  // Errors
  errors: {
    generic: 'Произошла ошибка',
    network: 'Ошибка сети',
    unauthorized: 'Не авторизован',
    notFound: 'Не найдено',
    projectNotFound: 'Проект не найден',
    insufficientPermissions: 'Недостаточно прав',
    onlyOwnerCanDelete: 'Только владелец может удалить проект',
  },
} satisfies BaseTranslation

export default ru