import { createSignal, Show } from 'solid-js';
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
  const [fontOptions, setFontOptions] = createSignal({
    familyName: '',
    version: '1.0.0',
    description: '',
    startUnicode: 0xE000 // Private Use Area
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

      {/* Font Options Dialog */}
      <Show when={showFontDialog()}>
        <div class="export-dialog-overlay" onClick={() => setShowFontDialog(false)}>
          <div class="export-dialog" onClick={(e) => e.stopPropagation()}>
            <div class="dialog-header">
              <h3>Настройки шрифта</h3>
              <button
                class="dialog-close"
                onClick={() => setShowFontDialog(false)}
              >
                ×
              </button>
            </div>

            <div class="dialog-content">
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

              <div class="form-group">
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

              <div class="form-group">
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
                  Рекомендуется E000-F8FF (Private Use Area).
                  Текущий: U+{fontOptions().startUnicode.toString(16).toUpperCase()}
                </small>
              </div>
            </div>

            <div class="dialog-actions">
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
                Создать шрифт
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}