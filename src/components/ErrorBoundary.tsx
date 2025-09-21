import { ErrorBoundary, ParentComponent } from 'solid-js';
import { analyticsService } from '../services/analytics.service';
import { ErrorIcon, RefreshIcon } from './Icon';

interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

const ErrorFallback = (props: ErrorFallbackProps) => {
  const handleReset = () => {
    // Track error recovery attempt
    analyticsService.track('error_occurred', {
      error_type: 'recovery_attempt',
      error_message: props.error.message,
      context: 'error_boundary_reset'
    });

    props.reset();
  };

  return (
    <div class="error-boundary" role="alert" aria-live="assertive">
      <div class="error-boundary-content">
        <ErrorIcon size={48} class="error-boundary-icon" />
        <h2 class="error-boundary-title">Что-то пошло не так</h2>
        <p class="error-boundary-message">
          Произошла непредвиденная ошибка. Попробуйте обновить страницу или повторить действие.
        </p>

        {import.meta.env.DEV && (
          <details class="error-boundary-details">
            <summary>Детали ошибки (только в режиме разработки)</summary>
            <pre class="error-boundary-stack">
              {props.error.name}: {props.error.message}
              {props.error.stack && '\n' + props.error.stack}
            </pre>
          </details>
        )}

        <div class="error-boundary-actions">
          <button
            class="btn btn-primary"
            onClick={handleReset}
            aria-label="Попробовать снова"
          >
            <RefreshIcon size={18} aria-hidden="true" />
            Попробовать снова
          </button>

          <button
            class="btn btn-secondary"
            onClick={() => window.location.reload()}
            aria-label="Перезагрузить страницу"
          >
            Перезагрузить страницу
          </button>
        </div>
      </div>
    </div>
  );
};

export interface AppErrorBoundaryProps {
  fallback?: (error: Error, reset: () => void) => any;
  onError?: (error: Error, errorInfo: any) => void;
}

export const AppErrorBoundary: ParentComponent<AppErrorBoundaryProps> = (props) => {
  const handleError = (error: Error, errorInfo: any) => {
    // Log error to console
    console.error('Error caught by boundary:', error, errorInfo);

    // Track error in analytics
    analyticsService.track('error_occurred', {
      error_type: 'unhandled_exception',
      error_message: error.message,
      context: 'error_boundary'
    });

    // Call custom error handler if provided
    props.onError?.(error, errorInfo);
  };

  return (
    <ErrorBoundary
      fallback={(error, reset) => {
        handleError(error, {});
        return props.fallback ? props.fallback(error, reset) : <ErrorFallback error={error} reset={reset} />;
      }}
    >
      {props.children}
    </ErrorBoundary>
  );
};

export default AppErrorBoundary;