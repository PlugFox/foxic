import { Component, For, Show } from 'solid-js';
import { Toast, toastService, ToastType } from '../services/toast.service';
import { HapticButton } from './HapticComponents';
import { CheckIcon, CloseIcon, ErrorIcon, InfoIcon, WarningIcon } from './Icon';

const ToastIcon: Component<{ type: ToastType }> = (props) => {
  switch (props.type) {
    case 'success':
      return <CheckIcon size={20} class="toast-icon toast-icon--success" />;
    case 'error':
      return <ErrorIcon size={20} class="toast-icon toast-icon--error" />;
    case 'warning':
      return <WarningIcon size={20} class="toast-icon toast-icon--warning" />;
    case 'info':
      return <InfoIcon size={20} class="toast-icon toast-icon--info" />;
    default:
      return <InfoIcon size={20} class="toast-icon" />;
  }
};

const ToastComponent: Component<{ toast: Toast }> = (props) => {
  const handleDismiss = () => {
    toastService.dismiss(props.toast.id);
  };

  const handleAction = (handler: () => void) => {
    handler();
    // Optionally dismiss after action
    if (!props.toast.persistent) {
      handleDismiss();
    }
  };

  return (
    <div
      class={`toast toast--${props.toast.type}`}
      role="alert"
      aria-live="polite"
      data-toast-id={props.toast.id}
    >
      <div class="toast-content">
        <div class="toast-header">
          <ToastIcon type={props.toast.type} />
          <h4 class="toast-title">{props.toast.title}</h4>
          <HapticButton
            class="toast-close"
            onClick={handleDismiss}
            haptic="light"
            aria-label="Закрыть уведомление"
          >
            <CloseIcon size={16} />
          </HapticButton>
        </div>

        <Show when={props.toast.message}>
          <p class="toast-message">{props.toast.message}</p>
        </Show>

        <Show when={props.toast.actions && props.toast.actions.length > 0}>
          <div class="toast-actions">
            <For each={props.toast.actions}>
              {(action) => (
                <HapticButton
                  class={`toast-action toast-action--${action.style || 'secondary'}`}
                  onClick={() => handleAction(action.handler)}
                  haptic="medium"
                >
                  {action.label}
                </HapticButton>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Progress bar for auto-dismiss */}
      <Show when={!props.toast.persistent && props.toast.duration && props.toast.duration > 0}>
        <div
          class="toast-progress"
          style={{
            'animation-duration': `${props.toast.duration}ms`
          }}
        />
      </Show>
    </div>
  );
};

export const ToastContainer: Component = () => {
  const toasts = toastService.getToasts;

  return (
    <div
      class="toast-container"
      role="region"
      aria-label="Уведомления"
      aria-live="polite"
    >
      <For each={toasts()}>
        {(toast) => <ToastComponent toast={toast} />}
      </For>
    </div>
  );
};

export default ToastContainer;