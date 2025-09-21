import { createSignal, Show } from 'solid-js';
import { IconData, iconsService } from '../services/icons.service';

interface AddIconCardProps {
  onIconsAdd: (icons: IconData[]) => void;
  disabled?: boolean;
}

export default function AddIconCard(props: AddIconCardProps) {
  const [isDragOver, setIsDragOver] = createSignal(false);
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  let fileInputRef: HTMLInputElement | undefined;

  const handleFileSelect = () => {
    if (props.disabled) return;
    fileInputRef?.click();
  };

  const handleFileChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    await processFiles(input.files);
    // Очищаем input для возможности повторного выбора тех же файлов
    input.value = '';
  };

  const processFiles = async (files: FileList) => {
    if (props.disabled) return;

    setIsProcessing(true);
    setError(null);

    try {
      const icons = await iconsService.readSvgFiles(files);

      if (icons.length === 0) {
        setError('Не найдено валидных SVG файлов');
        return;
      }

      props.onIconsAdd(icons);

      // Показываем успешное сообщение
      const successMessage = icons.length === 1
        ? `Добавлена 1 иконка`
        : `Добавлено ${icons.length} иконок`;

      // Временно показываем успех (можно заменить на toast notification)
      console.log(successMessage);

    } catch (err) {
      console.error('Ошибка обработки файлов:', err);
      setError(err instanceof Error ? err.message : 'Ошибка обработки файлов');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (props.disabled) return;

    // Проверяем, что перетаскиваются файлы
    if (e.dataTransfer?.types.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Проверяем, что курсор действительно покинул элемент
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (props.disabled) return;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    await processFiles(files);
  };

  const getCardClass = () => {
    const baseClass = 'add-icon-card';
    const classes = [baseClass];

    if (isDragOver()) classes.push('drag-over');
    if (isProcessing()) classes.push('processing');
    if (props.disabled) classes.push('disabled');
    if (error()) classes.push('error');

    return classes.join(' ');
  };

  return (
    <div
      class={getCardClass()}
      onClick={handleFileSelect}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".svg,image/svg+xml"
        style="display: none"
        onChange={handleFileChange}
      />

      <div class="add-icon-content">
        <Show
          when={!isProcessing()}
          fallback={
            <div class="processing-state">
              <div class="loading-spinner"></div>
              <div class="processing-text">Обработка файлов...</div>
            </div>
          }
        >
          <Show
            when={!error()}
            fallback={
              <div class="error-state">
                <div class="error-icon">⚠️</div>
                <div class="error-text">{error()}</div>
                <button
                  class="retry-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setError(null);
                  }}
                >
                  Попробовать снова
                </button>
              </div>
            }
          >
            <Show
              when={!isDragOver()}
              fallback={
                <div class="drag-state">
                  <div class="drag-icon">📥</div>
                  <div class="drag-text">
                    Отпустите для добавления<br/>
                    <small>SVG файлов</small>
                  </div>
                </div>
              }
            >
              <div class="default-state">
                <div class="add-icon">+</div>
                <div class="add-text">
                  Добавить иконки<br/>
                  <small>SVG файлы</small>
                </div>
              </div>
            </Show>
          </Show>
        </Show>
      </div>

      {/* Инструкции по использованию */}
      <Show when={!isDragOver() && !isProcessing() && !error()}>
        <div class="add-icon-instructions">
          <div class="instruction-item">
            <span class="instruction-icon">🖱️</span>
            Клик для выбора
          </div>
          <div class="instruction-item">
            <span class="instruction-icon">🗂️</span>
            Drag & Drop
          </div>
        </div>
      </Show>
    </div>
  );
}