import { createSignal, Show } from 'solid-js';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export default function ConfirmDialog(props: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = createSignal(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await props.onConfirm();
    } catch (error) {
      console.error('Ошибка выполнения действия:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading()) {
      props.onCancel();
    }
  };

  return (
    <Show when={props.isOpen}>
      <div class="dialog-overlay" onClick={handleCancel}>
        <div class="dialog dialog--confirm" onClick={(e) => e.stopPropagation()}>
          <div class="dialog-header">
            <h2>{props.title}</h2>
          </div>

          <div class="dialog-content">
            <p class="confirm-message">{props.message}</p>
          </div>

          <div class="dialog-actions">
            <button
              type="button"
              class="btn btn-secondary"
              onClick={handleCancel}
              disabled={isLoading()}
            >
              {props.cancelText || 'Отмена'}
            </button>
            <button
              type="button"
              class={`btn ${props.isDestructive ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleConfirm}
              disabled={isLoading()}
            >
              {isLoading() ? 'Выполнение...' : (props.confirmText || 'Подтвердить')}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}