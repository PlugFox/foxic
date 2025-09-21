import { createEffect, createSignal, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { exportService } from '../services/export.service';
import { IconData } from '../services/icons.service';

interface ExportButtonsProps {
  icons: Record<string, IconData>;
  projectName: string;
  disabled?: boolean;
}

export default function ExportButtons(props: ExportButtonsProps) {
  const [isExporting, setIsExporting] = createSignal(false);
  const [showFontDialog, setShowFontDialog] = createSignal(false);

  // Нормализация названия проекта в PascalCase
  const normalizeProjectName = (name: string): string => {
    return name
      .replace(/[^a-zA-Z0-9\s-_]/g, '') // Убираем все кроме букв, цифр, пробелов, дефисов и подчеркиваний
      .replace(/[\s-_]+/g, ' ') // Заменяем множественные разделители на один пробел
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  };

  const [fontOptions, setFontOptions] = createSignal({
    familyName: normalizeProjectName(props.projectName) || 'MyIconFont',
    version: '1.0.0',
    description: `Иконочный шрифт проекта ${props.projectName}`,
    startUnicode: 0xE000 // Private Use Area
  });

  // Обновляем название шрифта при изменении названия проекта
  createEffect(() => {
    const normalized = normalizeProjectName(props.projectName);
    if (normalized) {
      setFontOptions(prev => ({
        ...prev,
        familyName: normalized,
        description: `Иконочный шрифт проекта ${props.projectName}`
      }));
    }
  });

  const hasIcons = () => Object.keys(props.icons).length > 0;

  const handleSvgExport = async () => {
    if (!hasIcons() || props.disabled) return;

    try {
      setIsExporting(true);
      const data = await exportService.exportSvgArchive(props.icons);
      exportService.downloadFile(data, `${props.projectName}-icons.zip`, 'application/zip');
    } catch (error) {
      console.error('Ошибка экспорта SVG:', error);
      alert('Ошибка экспорта: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFontExport = async () => {
    if (!hasIcons() || props.disabled) return;
    setShowFontDialog(true);
  };

  const handleFontGenerate = async () => {
    const options = fontOptions();

    if (!options.familyName.trim()) {
      alert('Укажите имя семейства шрифта');
      return;
    }

    try {
      setIsExporting(true);
      setShowFontDialog(false);

      const data = await exportService.generateFontPackage(props.icons, options);
      exportService.downloadFile(data, `${options.familyName}-font.zip`, 'application/zip');
    } catch (error) {
      console.error('Ошибка создания шрифта:', error);
      alert('Ошибка создания шрифта: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const getIconCount = () => Object.keys(props.icons).length;

  return (
    <div class="export-buttons">
      <div class="export-header">
        <h3>Экспорт</h3>
        <Show when={hasIcons()}>
          <span class="export-count">{getIconCount()} иконок</span>
        </Show>
      </div>

      <div class="export-actions">
        {/* SVG Archive Export */}
        <button
          class="btn btn-secondary export-btn"
          onClick={handleSvgExport}
          disabled={!hasIcons() || props.disabled || isExporting()}
          title={!hasIcons() ? 'Нет иконок для экспорта' : 'Скачать ZIP архив с SVG иконками'}
        >
          <span class="btn-icon">📦</span>
          <div class="btn-content">
            <span class="btn-title">SVG архив</span>
            <small class="btn-description">ZIP с иконками и манифестом</small>
          </div>
        </button>

        {/* Font Export */}
        <button
          class="btn btn-primary export-btn"
          onClick={handleFontExport}
          disabled={!hasIcons() || props.disabled || isExporting()}
          title={!hasIcons() ? 'Нет иконок для создания шрифта' : 'Создать иконочный шрифт'}
        >
          <span class="btn-icon">🔤</span>
          <div class="btn-content">
            <span class="btn-title">Иконочный шрифт</span>
            <small class="btn-description">TTF, WOFF, WOFF2 + CSS</small>
          </div>
        </button>
      </div>

      <Show when={isExporting()}>
        <div class="export-loading">
          <div class="loading-spinner"></div>
          <span>Создание архива...</span>
        </div>
      </Show>

      {/* Font Options Bottom Sheet */}
      <Show when={showFontDialog()}>
        <Portal>
          <div class="bottom-sheet-overlay" onClick={() => setShowFontDialog(false)}>
            <div class="bottom-sheet" onClick={(e) => e.stopPropagation()}>
              {/* Handle bar */}
              <div class="bottom-sheet-handle"></div>

              <div class="bottom-sheet-header">
                <h3>Настройки шрифта</h3>
                <button
                  class="bottom-sheet-close"
                  onClick={() => setShowFontDialog(false)}
                  title="Закрыть"
                >
                  ×
                </button>
              </div>

              <div class="bottom-sheet-content">
                <div class="form-group">
                  <label for="font-family">Имя семейства шрифта:</label>
                  <input
                    id="font-family"
                    type="text"
                    class="form-input"
                    value={fontOptions().familyName}
                    placeholder="MyIconFont"
                    onInput={(e) => setFontOptions(prev => ({
                      ...prev,
                      familyName: e.currentTarget.value
                    }))}
                  />
                  <small class="form-hint">Используйте только буквы, цифры и дефисы</small>
                </div>

                <div class="form-row">
                  <div class="form-group form-group-half">
                    <label for="font-version">Версия:</label>
                    <input
                      id="font-version"
                      type="text"
                      class="form-input"
                      value={fontOptions().version}
                      placeholder="1.0.0"
                      onInput={(e) => setFontOptions(prev => ({
                        ...prev,
                        version: e.currentTarget.value
                      }))}
                    />
                  </div>

                  <div class="form-group form-group-half">
                    <label for="start-unicode">Начальный Unicode (hex):</label>
                    <input
                      id="start-unicode"
                      type="text"
                      class="form-input"
                      value={fontOptions().startUnicode.toString(16).toUpperCase()}
                      placeholder="E000"
                      onInput={(e) => {
                        const hex = e.currentTarget.value.replace(/[^0-9A-Fa-f]/g, '');
                        const unicode = parseInt(hex, 16) || 0xE000;
                        setFontOptions(prev => ({ ...prev, startUnicode: unicode }));
                      }}
                    />
                    <small class="form-hint">
                      Рекомендуется E000-F8FF (Private Use Area).<br/>
                      Текущий: U+{fontOptions().startUnicode.toString(16).toUpperCase()}
                    </small>
                  </div>
                </div>

                <div class="form-group">
                  <label for="font-description">Описание:</label>
                  <textarea
                    id="font-description"
                    class="form-input"
                    rows="3"
                    value={fontOptions().description}
                    placeholder="Описание иконочного шрифта"
                    onInput={(e) => setFontOptions(prev => ({
                      ...prev,
                      description: e.currentTarget.value
                    }))}
                  />
                </div>

                <div class="font-preview">
                  <div class="preview-info">
                    <strong>Предпросмотр:</strong>
                  </div>
                  <div class="preview-details">
                    <div class="preview-item">
                      <span class="preview-label">Семейство:</span>
                      <code>{fontOptions().familyName || 'MyIconFont'}</code>
                    </div>
                    <div class="preview-item">
                      <span class="preview-label">Иконок:</span>
                      <span>{getIconCount()}</span>
                    </div>
                    <div class="preview-item">
                      <span class="preview-label">Unicode диапазон:</span>
                      <code>
                        U+{fontOptions().startUnicode.toString(16).toUpperCase()} -
                        U+{(fontOptions().startUnicode + getIconCount() - 1).toString(16).toUpperCase()}
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bottom-sheet-actions">
                <button
                  class="btn btn-secondary"
                  onClick={() => setShowFontDialog(false)}
                >
                  Отмена
                </button>
                <button
                  class="btn btn-primary"
                  onClick={handleFontGenerate}
                  disabled={!fontOptions().familyName.trim()}
                >
                  <span class="btn-icon">🔤</span>
                  Создать шрифт
                </button>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  );
}