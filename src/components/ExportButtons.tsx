import { createEffect, createSignal, onMount, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { exportService } from '../services/export.service';
import { IconData } from '../services/icons.service';

// Интерфейсы для сохранения настроек
interface FontExportSettings {
  familyName: string;
  version: string;
  description: string;
  startUnicode: number;
}

interface FlutterExportSettings {
  packageName: string;
  fontName: string;
  className: string;
  version: string;
  description: string;
  author: string;
  homepage: string;
  repository: string;
  sdkConstraint: string;
  flutterConstraint: string;
  startUnicode: number;
  materialDesign: boolean;
  workspace: boolean;
}

interface ProjectExportSettings {
  font?: FontExportSettings;
  flutter?: FlutterExportSettings;
}

interface ExportButtonsProps {
  icons: Record<string, IconData>;
  projectName: string;
  projectId?: string; // Добавляем ID проекта для сохранения настроек
  disabled?: boolean;
}

// Функции для работы с localStorage
const getStorageKey = (projectId: string, type: 'font' | 'flutter') =>
  `foxic_export_${type}_${projectId}`;

const saveExportSettings = (projectId: string, type: 'font' | 'flutter', settings: any) => {
  try {
    localStorage.setItem(getStorageKey(projectId, type), JSON.stringify(settings));
  } catch (error) {
    console.warn('Не удалось сохранить настройки экспорта:', error);
  }
};

const loadExportSettings = (projectId: string, type: 'font' | 'flutter') => {
  try {
    const saved = localStorage.getItem(getStorageKey(projectId, type));
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Не удалось загрузить настройки экспорта:', error);
    return null;
  }
};

export default function ExportButtons(props: ExportButtonsProps) {
  const [isExporting, setIsExporting] = createSignal(false);
  const [showFontDialog, setShowFontDialog] = createSignal(false);
  const [showFlutterDialog, setShowFlutterDialog] = createSignal(false);

  // ID проекта для сохранения настроек (используем projectName как fallback)
  const getProjectId = () => props.projectId || props.projectName || 'default';

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

  // Нормализация названия пакета в snake_case
  const normalizePackageName = (name: string): string => {
    return name
      .replace(/[^a-zA-Z0-9\s-_]/g, '') // Убираем все кроме букв, цифр, пробелов, дефисов и подчеркиваний
      .replace(/[\s-]+/g, '_') // Заменяем пробелы и дефисы на подчеркивания
      .toLowerCase()
      .replace(/^(\d)/, '_$1') // Добавляем подчеркивание, если начинается с цифры
      .replace(/_{2,}/g, '_') // Убираем множественные подчеркивания
      .replace(/^_|_$/g, ''); // Убираем подчеркивания в начале и конце
  };

  const [flutterOptions, setFlutterOptions] = createSignal({
    packageName: normalizePackageName(props.projectName) || 'custom_icons',
    fontName: normalizeProjectName(props.projectName) || 'CustomIcons',
    className: normalizeProjectName(props.projectName) + 'Icons' || 'CustomIcons',
    version: '0.1.0',
    description: `Flutter пакет иконок проекта ${props.projectName}`,
    author: '',
    homepage: '',
    repository: '',
    sdkConstraint: '>=3.0.0 <4.0.0',
    flutterConstraint: '>=3.10.0',
    startUnicode: 0xE000,
    materialDesign: false,
    workspace: false
  });

  // Загружаем сохраненные настройки при монтировании
  onMount(() => {
    const projectId = getProjectId();

    // Загружаем настройки шрифта
    const savedFontSettings = loadExportSettings(projectId, 'font');
    if (savedFontSettings) {
      setFontOptions(prev => ({
        ...prev,
        ...savedFontSettings,
        // Обновляем только если имя проекта не изменилось
        familyName: savedFontSettings.familyName || prev.familyName,
        description: savedFontSettings.description || prev.description
      }));
    }

    // Загружаем настройки Flutter
    const savedFlutterSettings = loadExportSettings(projectId, 'flutter');
    if (savedFlutterSettings) {
      setFlutterOptions(prev => ({
        ...prev,
        ...savedFlutterSettings,
        // Обновляем только если имя проекта не изменилось
        packageName: savedFlutterSettings.packageName || prev.packageName,
        fontName: savedFlutterSettings.fontName || prev.fontName,
        className: savedFlutterSettings.className || prev.className,
        description: savedFlutterSettings.description || prev.description
      }));
    }
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

  // Обновляем Flutter настройки при изменении названия проекта
  createEffect(() => {
    const normalizedPackage = normalizePackageName(props.projectName);
    const normalizedClass = normalizeProjectName(props.projectName);
    if (normalizedPackage && normalizedClass) {
      setFlutterOptions(prev => ({
        ...prev,
        packageName: normalizedPackage,
        fontName: normalizedClass,
        className: normalizedClass + 'Icons',
        description: `Flutter пакет иконок проекта ${props.projectName}`
      }));
    }
  });

  // Автосохранение отключено - теперь сохраняем только при экспорте с нормализованными значениями
  // createEffect(() => {
  //   const settings = fontOptions();
  //   const projectId = getProjectId();
  //   if (projectId && projectId !== 'default') {
  //     saveExportSettings(projectId, 'font', settings);
  //   }
  // });

  // createEffect(() => {
  //   const settings = flutterOptions();
  //   const projectId = getProjectId();
  //   if (projectId && projectId !== 'default') {
  //     saveExportSettings(projectId, 'flutter', settings);
  //   }
  // });

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

      // Нормализуем опции перед экспортом
      const normalizedOptions = normalizeFontOptionsLocal(options);

      // Сохраняем нормализованные опции в localStorage
      const projectId = getProjectId();
      if (projectId && projectId !== 'default') {
        saveExportSettings(projectId, 'font', normalizedOptions);
      }

      const data = await exportService.generateFontPackage(props.icons, options);
      exportService.downloadFile(data, `${normalizedOptions.familyName}-font.zip`, 'application/zip');
    } catch (error) {
      console.error('Ошибка создания шрифта:', error);
      alert('Ошибка создания шрифта: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFlutterExport = async () => {
    if (!hasIcons() || props.disabled) return;
    setShowFlutterDialog(true);
  };

  const generateFlutterFilename = (packageName: string): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${packageName}_${year}-${month}-${day}_${hours}-${minutes}.zip`;
  };

  // Нормализует Flutter опции аналогично логике в export.service.ts
  const normalizeFlutterOptionsLocal = (options: any): any => {
    // Нормализуем packageName: только a-z и _
    let normalizedPackageName = options.packageName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^(\d)/, '_$1') // Не может начинаться с цифры
      .replace(/_+/g, '_') // Убираем множественные подчеркивания
      .replace(/^_|_$/g, ''); // Убираем подчеркивания в начале и конце

    if (!normalizedPackageName) {
      normalizedPackageName = normalizePackageName(props.projectName) || 'custom_icons';
    }

    // Нормализуем fontName: только A-Za-z0-9
    let normalizedFontName = options.fontName.replace(/[^A-Za-z0-9]/g, '');
    if (!normalizedFontName) {
      normalizedFontName = normalizeProjectName(props.projectName) || 'CustomIcons';
    }

    // Нормализуем className: только A-Za-z0-9, остальное заменяем на $
    let normalizedClassName = options.className.replace(/[^A-Za-z0-9]/g, '$');
    if (!normalizedClassName) {
      normalizedClassName = normalizeProjectName(props.projectName) + 'Icons' || 'CustomIcons';
    }

    // Используем версию по умолчанию если пустая
    const normalizedVersion = options.version.trim() || '0.0.1';

    // Используем SDK constraints по умолчанию если пустые
    const normalizedSdkConstraint = options.sdkConstraint.trim() || '>=3.7.0 <4.0.0';
    const normalizedFlutterConstraint = options.flutterConstraint.trim() || '>=3.35.1';

    return {
      ...options,
      packageName: normalizedPackageName,
      fontName: normalizedFontName,
      className: normalizedClassName,
      version: normalizedVersion,
      sdkConstraint: normalizedSdkConstraint,
      flutterConstraint: normalizedFlutterConstraint,
      // Убираем пустые опциональные поля
      description: options.description.trim() || `Flutter пакет иконок ${normalizedFontName}`,
      author: options.author?.trim() || undefined,
      homepage: options.homepage?.trim() || undefined,
      repository: options.repository?.trim() || undefined,
    };
  };

  // Нормализует Font опции
  const normalizeFontOptionsLocal = (options: any): any => {
    // Нормализуем familyName: только буквы, цифры и дефисы
    let normalizedFamilyName = options.familyName.replace(/[^a-zA-Z0-9-]/g, '');
    if (!normalizedFamilyName) {
      normalizedFamilyName = normalizeProjectName(props.projectName) || 'MyIconFont';
    }

    // Используем версию по умолчанию если пустая
    const normalizedVersion = options.version.trim() || '1.0.0';

    return {
      ...options,
      familyName: normalizedFamilyName,
      version: normalizedVersion,
      description: options.description.trim() || `Иконочный шрифт проекта ${props.projectName}`,
    };
  };

  const handleFlutterGenerate = async () => {
    const options = flutterOptions();

    if (!options.packageName.trim()) {
      alert('Укажите название пакета');
      return;
    }

    if (!options.fontName.trim()) {
      alert('Укажите название шрифта');
      return;
    }

    if (!options.className.trim()) {
      alert('Укажите название класса');
      return;
    }

    try {
      setIsExporting(true);
      setShowFlutterDialog(false);

      // Нормализуем опции перед экспортом
      const normalizedOptions = normalizeFlutterOptionsLocal(options);

      // Сохраняем нормализованные опции в localStorage
      const projectId = getProjectId();
      if (projectId && projectId !== 'default') {
        saveExportSettings(projectId, 'flutter', normalizedOptions);
      }

      const data = await exportService.generateFlutterPackage(props.icons, options);
      const filename = generateFlutterFilename(normalizedOptions.packageName);
      exportService.downloadFile(data, filename, 'application/zip');
    } catch (error) {
      console.error('Ошибка создания Flutter пакета:', error);
      alert('Ошибка создания Flutter пакета: ' + (error instanceof Error ? error.message : 'Unknown error'));
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

        {/* Flutter Package Export */}
        <button
          class="btn btn-success export-btn"
          onClick={handleFlutterExport}
          disabled={!hasIcons() || props.disabled || isExporting()}
          title={!hasIcons() ? 'Нет иконок для создания Flutter пакета' : 'Создать Flutter пакет'}
        >
          <span class="btn-icon">📱</span>
          <div class="btn-content">
            <span class="btn-title">Flutter пакет</span>
            <small class="btn-description">TTF шрифт + Dart код</small>
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

      {/* Flutter Options Bottom Sheet */}
      <Show when={showFlutterDialog()}>
        <Portal>
          <div class="bottom-sheet-overlay" onClick={() => setShowFlutterDialog(false)}>
            <div class="bottom-sheet" onClick={(e) => e.stopPropagation()}>
              {/* Handle bar */}
              <div class="bottom-sheet-handle"></div>

              <div class="bottom-sheet-header">
                <h3>Настройки Flutter пакета</h3>
                <button
                  class="bottom-sheet-close"
                  onClick={() => setShowFlutterDialog(false)}
                  title="Закрыть"
                >
                  ×
                </button>
              </div>

              <div class="bottom-sheet-content">
                <div class="form-group">
                  <label for="flutter-package-name">Название пакета:</label>
                  <input
                    id="flutter-package-name"
                    type="text"
                    class="form-input"
                    value={flutterOptions().packageName}
                    placeholder="custom_icons"
                    onInput={(e) => setFlutterOptions(prev => ({
                      ...prev,
                      packageName: e.currentTarget.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                    }))}
                  />
                  <small class="form-hint">Только строчные буквы, цифры и подчеркивания</small>
                </div>

                <div class="form-row">
                  <div class="form-group form-group-half">
                    <label for="flutter-font-name">Название шрифта:</label>
                    <input
                      id="flutter-font-name"
                      type="text"
                      class="form-input"
                      value={flutterOptions().fontName}
                      placeholder="CustomIcons"
                      onInput={(e) => setFlutterOptions(prev => ({
                        ...prev,
                        fontName: e.currentTarget.value
                      }))}
                    />
                  </div>

                  <div class="form-group form-group-half">
                    <label for="flutter-class-name">Название класса:</label>
                    <input
                      id="flutter-class-name"
                      type="text"
                      class="form-input"
                      value={flutterOptions().className}
                      placeholder="CustomIcons"
                      onInput={(e) => setFlutterOptions(prev => ({
                        ...prev,
                        className: e.currentTarget.value
                      }))}
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label for="flutter-description">Описание пакета:</label>
                  <textarea
                    id="flutter-description"
                    class="form-input"
                    rows="2"
                    value={flutterOptions().description}
                    placeholder="Flutter пакет с кастомными иконками"
                    onInput={(e) => setFlutterOptions(prev => ({
                      ...prev,
                      description: e.currentTarget.value
                    }))}
                  />
                </div>

                <div class="form-row">
                  <div class="form-group form-group-half">
                    <label for="flutter-version">Версия пакета:</label>
                    <input
                      id="flutter-version"
                      type="text"
                      class="form-input"
                      value={flutterOptions().version}
                      placeholder="0.1.0"
                      onInput={(e) => setFlutterOptions(prev => ({
                        ...prev,
                        version: e.currentTarget.value
                      }))}
                    />
                  </div>

                  <div class="form-group form-group-half">
                    <label for="flutter-start-unicode">Начальный Unicode (hex):</label>
                    <input
                      id="flutter-start-unicode"
                      type="text"
                      class="form-input"
                      value={flutterOptions().startUnicode.toString(16).toUpperCase()}
                      placeholder="E000"
                      onInput={(e) => {
                        const hex = e.currentTarget.value.replace(/[^0-9A-Fa-f]/g, '');
                        const unicode = parseInt(hex, 16) || 0xE000;
                        setFlutterOptions(prev => ({ ...prev, startUnicode: unicode }));
                      }}
                    />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group form-group-half">
                    <label for="flutter-sdk-constraint">Dart SDK:</label>
                    <select
                      id="flutter-sdk-constraint"
                      class="form-input"
                      value={flutterOptions().sdkConstraint}
                      onChange={(e) => setFlutterOptions(prev => ({
                        ...prev,
                        sdkConstraint: e.currentTarget.value
                      }))}
                    >
                      <option value=">=3.0.0 <4.0.0">Dart 3.0+</option>
                      <option value=">=2.19.0 <4.0.0">Dart 2.19+</option>
                      <option value=">=2.17.0 <4.0.0">Dart 2.17+</option>
                    </select>
                  </div>

                  <div class="form-group form-group-half">
                    <label for="flutter-constraint">Flutter:</label>
                    <select
                      id="flutter-constraint"
                      class="form-input"
                      value={flutterOptions().flutterConstraint}
                      onChange={(e) => setFlutterOptions(prev => ({
                        ...prev,
                        flutterConstraint: e.currentTarget.value
                      }))}
                    >
                      <option value=">=3.10.0">Flutter 3.10+</option>
                      <option value=">=3.7.0">Flutter 3.7+</option>
                      <option value=">=3.0.0">Flutter 3.0+</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group form-group-half">
                    <label for="flutter-author">Автор (опционально):</label>
                    <input
                      id="flutter-author"
                      type="text"
                      class="form-input"
                      value={flutterOptions().author}
                      placeholder="Ваше имя"
                      onInput={(e) => setFlutterOptions(prev => ({
                        ...prev,
                        author: e.currentTarget.value
                      }))}
                    />
                  </div>

                  <div class="form-group form-group-half">
                    <label for="flutter-homepage">Homepage (опционально):</label>
                    <input
                      id="flutter-homepage"
                      type="url"
                      class="form-input"
                      value={flutterOptions().homepage}
                      placeholder="https://example.com"
                      onInput={(e) => setFlutterOptions(prev => ({
                        ...prev,
                        homepage: e.currentTarget.value
                      }))}
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label for="flutter-repository">Repository (опционально):</label>
                  <input
                    id="flutter-repository"
                    type="url"
                    class="form-input"
                    value={flutterOptions().repository}
                    placeholder="https://github.com/username/repo"
                    onInput={(e) => setFlutterOptions(prev => ({
                      ...prev,
                      repository: e.currentTarget.value
                    }))}
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Дополнительные опции:</label>

                  <div class="checkbox-group">
                    <label class="checkbox-item">
                      <input
                        type="checkbox"
                        checked={flutterOptions().materialDesign}
                        onChange={(e) => setFlutterOptions(prev => ({
                          ...prev,
                          materialDesign: e.currentTarget.checked
                        }))}
                      />
                      <div class="checkbox-content">
                        <div class="checkbox-text">Material Design</div>
                        <div class="checkbox-hint">uses-material-design: true в pubspec.yaml</div>
                      </div>
                    </label>

                    <label class="checkbox-item">
                      <input
                        type="checkbox"
                        checked={flutterOptions().workspace}
                        onChange={(e) => setFlutterOptions(prev => ({
                          ...prev,
                          workspace: e.currentTarget.checked
                        }))}
                      />
                      <div class="checkbox-content">
                        <div class="checkbox-text">analysis_options.yaml</div>
                        <div class="checkbox-hint">Добавить файл конфигурации анализатора</div>
                      </div>
                    </label>

                    <label class="checkbox-item">
                      <input
                        type="checkbox"
                        checked={flutterOptions().workspace}
                        onChange={(e) => setFlutterOptions(prev => ({
                          ...prev,
                          workspace: e.currentTarget.checked
                        }))}
                      />
                      <div class="checkbox-content">
                        <div class="checkbox-text">.gitignore</div>
                        <div class="checkbox-hint">Файл исключений для Git</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div class="flutter-preview">
                  <div class="preview-info">
                    <strong>Предпросмотр:</strong>
                  </div>
                  <div class="preview-details">
                    <div class="preview-item">
                      <span class="preview-label">Пакет:</span>
                      <code>{flutterOptions().packageName || 'custom_icons'}</code>
                    </div>
                    <div class="preview-item">
                      <span class="preview-label">Класс:</span>
                      <code>{flutterOptions().className || 'CustomIcons'}</code>
                    </div>
                    <div class="preview-item">
                      <span class="preview-label">Иконок:</span>
                      <span>{getIconCount()}</span>
                    </div>
                    <div class="preview-item">
                      <span class="preview-label">Использование:</span>
                      <code>Icon({flutterOptions().className || 'CustomIcons'}.{Object.keys(props.icons)[0]?.replace(/[^a-zA-Z0-9_]/g, '_') || 'home'})</code>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bottom-sheet-actions">
                <button
                  class="btn btn-secondary"
                  onClick={() => setShowFlutterDialog(false)}
                >
                  Отмена
                </button>
                <button
                  class="btn btn-success"
                  onClick={handleFlutterGenerate}
                  disabled={!flutterOptions().packageName.trim() || !flutterOptions().fontName.trim()}
                >
                  <span class="btn-icon">📱</span>
                  Создать Flutter пакет
                </button>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  );
}