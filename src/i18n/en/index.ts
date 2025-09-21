import type { BaseTranslation } from 'typesafe-i18n'

const en = {
  // App
  app: {
    title: 'Foxic',
    description: 'Icon font generator',
  },

  // Navigation
  nav: {
    home: 'Home',
    projects: 'Projects',
    logout: 'Logout',
    userMenu: 'User menu',
  },

  // Authentication
  auth: {
    loginWithGoogle: 'Sign in with Google',
    logout: 'Sign out',
    currentUser: 'Current user: {user:string}',
    signOut: 'Sign out from account',
  },

  // Projects
  projects: {
    title: 'My Projects',
    count: '{count:number} {count|project|projects}',
    empty: {
      title: 'You don\'t have any projects yet',
      description: 'Create your first project to work with icons',
      createFirst: 'Create first project',
    },
    loading: 'Loading projects...',
    create: 'Create project',
    open: 'Open project',
    pin: 'Pin',
    unpin: 'Unpin',
    pinned: 'Project pinned',
    delete: 'Delete project',
    leave: 'Leave project',
    menu: 'Project menu',
    role: {
      owner: 'Owner',
      admin: 'Administrator',
      editor: 'Editor',
      viewer: 'Viewer',
    },
    notifications: '{count:number} unread notifications',
  },

  // Project actions
  actions: {
    delete: {
      title: 'Delete project',
      message: 'Are you sure you want to delete the project "{name:string}"? This action cannot be undone.',
      confirm: 'Delete',
    },
    leave: {
      title: 'Leave project',
      message: 'Are you sure you want to leave the project "{name:string}"? You will lose access to the project.',
      confirm: 'Leave',
    },
    cancel: 'Cancel',
  },

  // Forms
  forms: {
    projectName: 'Project name',
    projectDescription: 'Project description',
    visibility: 'Visibility',
    tags: 'Tags',
    create: 'Create',
    save: 'Save',
    cancel: 'Cancel',
  },

  // Icons
  icons: {
    upload: 'Upload icons',
    delete: 'Delete icon',
    edit: 'Edit icon',
    download: 'Download',
    share: 'Share',
    copy: 'Copy',
  },

  // Export
  export: {
    title: 'Export',
    formats: 'Export formats',
    download: 'Download',
  },

  // Languages
  languages: {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    pt: 'Portuguese',
    ru: 'Russian',
  },

  // Common
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    settings: 'Settings',
    help: 'Help',
    more: 'More',
  },

  // PWA
  pwa: {
    info: 'Show Progressive Web App information',
    status: 'PWA Status',
    installed: 'PWA installed',
    serviceWorker: 'Service Worker',
    online: 'Online',
    cache: 'Cache',
  },

  // Accessibility
  a11y: {
    skipToContent: 'Skip to content',
    mainContent: 'Main content',
    navigation: 'Navigation',
    applicationLandmark: 'Foxic - Icon font generator',
    projectGrid: 'Projects grid',
    projectRole: 'Your role in project: {role:string}',
    loadingProjects: 'Loading projects',
    emptyProjects: 'No projects available',
    menuExpanded: 'Menu expanded',
    menuCollapsed: 'Menu collapsed',
  },

  // Errors
  errors: {
    generic: 'An error occurred',
    network: 'Network error',
    unauthorized: 'Unauthorized',
    notFound: 'Not found',
    projectNotFound: 'Project not found',
    insufficientPermissions: 'Insufficient permissions',
    onlyOwnerCanDelete: 'Only the owner can delete the project',
  },
} satisfies BaseTranslation

export default en