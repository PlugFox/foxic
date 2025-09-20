# Foxic AI Coding Guide

## Architecture Overview

**Foxic** is a SolidJS + TypeScript icon font generator with Firebase backend. The app enforces authentication-first architecture - all routes except `/login` require authentication.

### Key Architectural Patterns

**Service Layer Pattern**: Business logic is isolated in `src/services/` with singleton instances (e.g., `authService`). Services handle Firebase interactions and provide typed interfaces.

**Context + Routes**: Authentication state flows through `AuthProvider` context, with `ProtectedRoute` and `PublicRoute` components handling automatic redirects. All routing logic is centralized in `src/components/routes.tsx`.

**Firebase Integration**: Environment variables use `VITE_FIREBASE_*` prefix. Config includes debug logging for missing env vars. All Firebase instances are exported from `src/config/firebase.ts`.

## Development Workflow

### Running the App
```bash
npm run dev          # Development server on port 5173
npm run build        # Production build to dist/
./deploy.sh staging  # Deploy to Firebase staging channel
./deploy.sh production # Deploy to production (with confirmation)
```

### VS Code Tasks
- `server:start` - Already running development server
- `types:check` - TypeScript type checking without emit
- `lint:fix` - ESLint with auto-fix

### Firebase Commands
```bash
npm run firebase:serve    # Local hosting emulator
firebase emulators:start  # Full Firebase emulation suite
```

## Code Conventions

### Component Structure
- Use function components with PascalCase: `export default function HomePage()`
- Props destructuring at component level: `const { user, loading } = useAuth()`
- Russian text for UI, English for code/comments
- Error boundaries use SolidJS `Show` component with fallbacks

### State Management
- Prefer SolidJS signals: `const [loading, setLoading] = createSignal(false)`
- Context for global state (auth, themes): `useAuth()` hook pattern
- Services return typed interfaces, not raw Firebase objects

### Styling Approach
- CSS custom properties in `:root` for theming
- Component-scoped classes: `.login-container`, `.home-container`
- Utility classes: `.btn`, `.container`, `.loading`
- Modern CSS features: flexbox, grid, CSS variables

### Firebase Patterns
```typescript
// Service pattern with typed interfaces
class AuthService {
  private mapUser(user: User): AuthUser {
    return { uid: user.uid, email: user.email, ... };
  }
}

// Environment variable validation with debug output
console.log('🔥 Firebase Environment Variables:', {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Loaded' : '❌ Missing'
});
```

## File Organization

### Key Directories
- `src/contexts/` - SolidJS contexts (auth, future theme/app state)
- `src/services/` - Business logic, Firebase interactions, API clients
- `src/components/` - Reusable UI components and route guards
- `src/pages/` - Route-level components
- `functions/` - Firebase Cloud Functions (TypeScript, Node 22)

### Configuration Files
- `vite.config.ts` - Development server, build settings, GitHub Pages support
- `firebase.json` - Hosting, emulators, caching headers, SPA rewrites
- `deploy.sh` - Production deployment with staging preview channels

## Integration Points

### Firebase Services Used
- **Authentication**: Google OAuth only (no email/password implemented)
- **Firestore**: Ready for data persistence (user projects, icon libraries)
- **Hosting**: SPA configuration with proper caching headers
- **Functions**: TypeScript setup for future backend processing

### External Dependencies
- `@solidjs/router` - Client-side routing with guards
- `firebase` v12+ - Modern Firebase SDK
- `solid-devtools` - Development debugging tools

## Debugging & Development

### Built-in Debug Features
- Firebase env validation logging on app start
- `handleTestDebug()` function in HomePage with debugger statement
- SolidJS DevTools enabled in development
- Source maps enabled for production builds

### Common Development Patterns
- Use VS Code tasks instead of direct terminal commands
- Firebase emulators for local development (port 5000)
- Staging channel deployments for preview testing
- TypeScript strict mode enabled

## Future Development Context

This is early-stage development. The authentication and routing foundation is complete. Next features will likely include:
- SVG file upload and processing
- Font generation pipeline
- User project management in Firestore
- Icon preview and customization UI

When adding new features, follow the established service layer pattern and maintain the authentication-first architecture.