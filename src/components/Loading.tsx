import { Component, JSX } from 'solid-js';

export interface LoadingSpinnerProps {
  size?: number | string;
  color?: string;
  class?: string;
  'aria-label'?: string;
}

export const LoadingSpinner: Component<LoadingSpinnerProps> = (props) => {
  const size = () => typeof props.size === 'number' ? `${props.size}px` : (props.size || '24px');

  return (
    <div
      class={`loading-spinner ${props.class || ''}`}
      style={{
        width: size(),
        height: size(),
        'border-color': props.color ? `${props.color}20` : undefined,
        'border-top-color': props.color || undefined,
      }}
      role="status"
      aria-label={props['aria-label'] || 'Загрузка...'}
      aria-live="polite"
    />
  );
};

export interface LoadingOverlayProps {
  show: boolean;
  children?: JSX.Element;
  message?: string;
  class?: string;
}

export const LoadingOverlay: Component<LoadingOverlayProps> = (props) => {
  if (!props.show) return null;

  return (
    <div class={`loading-overlay ${props.class || ''}`} role="status" aria-live="polite">
      <div class="loading-overlay-content">
        <LoadingSpinner size={40} aria-label="Загрузка контента" />
        {props.message && (
          <p class="loading-overlay-message" aria-live="polite">
            {props.message}
          </p>
        )}
        {props.children}
      </div>
    </div>
  );
};

export interface LoadingButtonProps {
  loading: boolean;
  disabled?: boolean;
  children: JSX.Element;
  loadingText?: string;
  class?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
}

export const LoadingButton: Component<LoadingButtonProps> = (props) => {
  const isDisabled = () => props.loading || props.disabled;

  return (
    <button
      type={props.type || 'button'}
      class={`btn loading-button ${props.class || ''} ${props.loading ? 'loading-button--loading' : ''}`}
      disabled={isDisabled()}
      onClick={() => !isDisabled() && props.onClick?.()}
      aria-label={props['aria-label']}
      aria-busy={props.loading}
    >
      <span class={`loading-button-content ${props.loading ? 'loading-button-content--hidden' : ''}`}>
        {props.children}
      </span>

      {props.loading && (
        <span class="loading-button-spinner" aria-hidden="true">
          <LoadingSpinner size={16} />
          {props.loadingText && (
            <span class="loading-button-text">{props.loadingText}</span>
          )}
        </span>
      )}
    </button>
  );
};

export interface LoadingCardProps {
  loading: boolean;
  children: JSX.Element;
  rows?: number;
  class?: string;
}

export const LoadingCard: Component<LoadingCardProps> = (props) => {
  if (!props.loading) {
    return <>{props.children}</>;
  }

  const rows = props.rows || 3;

  return (
    <div class={`loading-card ${props.class || ''}`} role="status" aria-label="Загрузка данных">
      <div class="loading-card-content">
        {Array.from({ length: rows }, (_, i) => (
          <div class={`loading-skeleton loading-skeleton--${i % 3 === 0 ? 'title' : i % 3 === 1 ? 'text' : 'short'}`} />
        ))}
      </div>
    </div>
  );
};

export interface LoadingStateProps {
  loading: boolean;
  error?: Error | string | null;
  empty?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  retryLabel?: string;
  onRetry?: () => void;
  children: JSX.Element;
  loadingComponent?: JSX.Element;
  class?: string;
}

export const LoadingState: Component<LoadingStateProps> = (props) => {
  if (props.loading) {
    return props.loadingComponent || <LoadingOverlay show={true} message="Загрузка..." />;
  }

  if (props.error) {
    const errorMessage = typeof props.error === 'string'
      ? props.error
      : props.errorMessage || 'Произошла ошибка при загрузке данных';

    return (
      <div class={`loading-state-error ${props.class || ''}`} role="alert">
        <p class="loading-state-error-message">{errorMessage}</p>
        {props.onRetry && (
          <LoadingButton
            loading={false}
            onClick={props.onRetry}
            class="btn-secondary"
            aria-label={props.retryLabel || 'Попробовать снова'}
          >
            {props.retryLabel || 'Попробовать снова'}
          </LoadingButton>
        )}
      </div>
    );
  }

  if (props.empty) {
    return (
      <div class={`loading-state-empty ${props.class || ''}`} role="status">
        <p class="loading-state-empty-message">
          {props.emptyMessage || 'Нет данных для отображения'}
        </p>
      </div>
    );
  }

  return <>{props.children}</>;
};

export default LoadingSpinner;