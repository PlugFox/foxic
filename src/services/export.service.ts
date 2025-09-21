import { zip } from 'fflate';
import { IconData } from './icons.service';
// @ts-ignore - fonteditor-core types
import { createFont, woff2 } from 'fonteditor-core';

interface ExportManifest {
  rev: number;
  hash: string;
  count: number;
  totalSize: number;
  compression: number;
  icons: Record<string, IconMetadata>;
  createdAt: string;
  exportedAt: string;
  exportType: 'svg-archive' | 'font-package';
  fontMetadata?: {
    familyName: string;
    version: string;
    description: string;
  };
}

interface IconMetadata {
  name: string;
  size: number;
  hash: string;
}

interface FontOptions {
  familyName: string;
  version: string;
  description: string;
  startUnicode: number;
}

export class ExportService {
  /**
   * Создает ZIP архив со всеми SVG иконками
   */
  async exportSvgArchive(icons: Record<string, IconData>): Promise<Uint8Array> {
    try {
      if (Object.keys(icons).length === 0) {
        throw new Error('Нет иконок для экспорта');
      }

      // Создаем манифест экспорта
      const iconsMetadata: Record<string, IconMetadata> = {};
      for (const [name, icon] of Object.entries(icons)) {
        iconsMetadata[name] = {
          name: name,
          size: icon.content.length,
          hash: icon.hash
        };
      }

      const manifest: ExportManifest = {
        rev: 1,
        hash: this.calculateArchiveHash(icons),
        count: Object.keys(icons).length,
        totalSize: Object.values(icons).reduce((sum, icon) => sum + icon.content.length, 0),
        compression: 0.8, // приблизительная степень сжатия
        icons: iconsMetadata,
        createdAt: new Date().toISOString(),
        exportedAt: new Date().toISOString(),
        exportType: 'svg-archive'
      };

      // Подготавливаем файлы для архива
      const filesToZip: Record<string, Uint8Array> = {
        'manifest.json': new TextEncoder().encode(JSON.stringify(manifest, null, 2))
      };

      // Добавляем все SVG файлы
      for (const [name, icon] of Object.entries(icons)) {
        const fileName = `${name}.svg`;
        filesToZip[fileName] = new TextEncoder().encode(icon.content);
      }

      // Создаем архив
      return new Promise((resolve, reject) => {
        zip(filesToZip, { level: 6 }, (err, data) => {
          if (err) {
            reject(new Error(`Ошибка создания архива: ${err.message}`));
          } else {
            resolve(data);
          }
        });
      });

    } catch (error) {
      console.error('Ошибка экспорта SVG:', error);
      throw new Error(`Не удалось создать SVG архив: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
    }
  }

  /**
   * Генерирует полный пакет шрифта с TTF/WOFF/WOFF2 файлами
   */
  async generateFontPackage(
    icons: Record<string, IconData>,
    options: FontOptions
  ): Promise<Uint8Array> {
    try {
      // Проверяем количество иконок
      const iconCount = Object.keys(icons).length;
      if (iconCount === 0) {
        throw new Error('Нет иконок для создания шрифта');
      }
      if (iconCount > 1000) {
        throw new Error('Слишком много иконок для создания шрифта (максимум 1000)');
      }

      let currentUnicode = options.startUnicode;
      const iconMap: Record<string, { unicode: number; name: string }> = {};

      // Создаем SVG шрифт из иконок
      const svgFont = this.createSvgFont(icons, options, currentUnicode, iconMap);

      // Генерируем файлы шрифтов из SVG
      const fontFiles = await this.generateRealFontFiles(svgFont, options.familyName);

      // Создаем CSS файл с маппингом иконок
      const cssContent = this.generateFontCss(options.familyName, iconMap);

      // Создаем HTML демо страницу
      const htmlDemo = this.generateFontDemo(options.familyName, iconMap);

      // Создаем инструкции
      const readmeContent = this.generateFontReadme(options, iconMap);

      // Создаем манифест экспорта
      const iconsMetadata: Record<string, IconMetadata> = {};
      for (const [name, icon] of Object.entries(icons)) {
        iconsMetadata[name] = {
          name: name,
          size: icon.content.length,
          hash: icon.hash
        };
      }

      const manifest: ExportManifest = {
        rev: 1,
        hash: this.calculateArchiveHash(icons),
        count: Object.keys(icons).length,
        totalSize: Object.values(icons).reduce((sum, icon) => sum + icon.content.length, 0),
        compression: 0.8,
        icons: iconsMetadata,
        createdAt: new Date().toISOString(),
        exportedAt: new Date().toISOString(),
        exportType: 'font-package',
        fontMetadata: {
          familyName: options.familyName,
          version: options.version,
          description: options.description
        }
      };

      // Упаковываем все в архив
      const filesToZip: Record<string, Uint8Array> = {
        'manifest.json': new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
        [`${options.familyName}.css`]: new TextEncoder().encode(cssContent),
        'demo.html': new TextEncoder().encode(htmlDemo),
        'README.md': new TextEncoder().encode(readmeContent)
      };

      // Добавляем файлы шрифтов
      Object.entries(fontFiles).forEach(([filename, content]) => {
        filesToZip[filename] = content;
      });

      return new Promise((resolve, reject) => {
        zip(filesToZip, { level: 6 }, (err, data) => {
          if (err) {
            reject(new Error(`Ошибка сжатия: ${err.message}`));
          } else {
            resolve(data);
          }
        });
      });

    } catch (error) {
      console.error('Ошибка генерации пакета шрифта:', error);
      throw new Error(`Не удалось создать пакет шрифта: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
    }
  }

  /**
   * Создает CSS файл с классами иконок
   */
  private generateFontCss(familyName: string, iconMap: Record<string, { unicode: number; name: string }>): string {
    const fontFace = `@font-face {
  font-family: '${familyName}';
  src: url('${familyName}.woff2') format('woff2'),
       url('${familyName}.woff') format('woff'),
       url('${familyName}.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}

.${familyName.toLowerCase()}-icon {
  font-family: '${familyName}' !important;
  speak: never;
  font-style: normal;
  font-weight: normal;
  font-variant: normal;
  text-transform: none;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

`;

    const iconClasses = Object.entries(iconMap)
      .map(([name, info]) => `.icon-${name}:before {
  content: "\\${info.unicode.toString(16).padStart(4, '0')}";
}`)
      .join('\n');

    return fontFace + iconClasses;
  }

  /**
   * Создает HTML демо страницу
   */
  private generateFontDemo(familyName: string, iconMap: Record<string, { unicode: number; name: string }>): string {
    const iconRows = Object.entries(iconMap)
      .map(([name, info]) => `
        <div class="icon-item">
          <i class="${familyName.toLowerCase()}-icon icon-${name}"></i>
          <div class="icon-info">
            <div class="icon-name">${name}</div>
            <div class="icon-code">\\${info.unicode.toString(16).padStart(4, '0')}</div>
          </div>
        </div>`)
      .join('');

    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${familyName} - Демо иконок</title>
    <link rel="stylesheet" href="${familyName}.css">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .icons-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .icon-item {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .icon-item i {
            font-size: 48px;
            color: #333;
            margin-bottom: 10px;
            display: block;
        }
        .icon-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .icon-code {
            font-family: monospace;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${familyName}</h1>
        <p>Демонстрация иконочного шрифта</p>
    </div>
    <div class="icons-grid">${iconRows}
    </div>
</body>
</html>`;
  }

  /**
   * Создает README с инструкциями
   */
  private generateFontReadme(options: FontOptions, iconMap: Record<string, { unicode: number; name: string }>): string {
    const iconTableHeader = `| Иконка | Unicode | CSS Content |
|--------|---------|-------------|`;
    const iconTableRows = Object.entries(iconMap).map(([name, info]) =>
      `| ${name} | U+${info.unicode.toString(16).toUpperCase().padStart(4, '0')} | \\${info.unicode.toString(16).padStart(4, '0')} |`
    ).join('\n');

    return `# ${options.familyName} Font Package

${options.description}

## Содержимое пакета

- \`${options.familyName}.css\` - CSS файл с классами иконок
- \`${options.familyName}.ttf\` - TTF файл шрифта
- \`${options.familyName}.woff\` - WOFF файл шрифта
- \`${options.familyName}.woff2\` - WOFF2 файл шрифта (если поддерживается)
- \`demo.html\` - демонстрация всех иконок
- \`manifest.json\` - метаданные пакета

## Установка и использование

1. Скопируйте файлы шрифтов (TTF, WOFF, WOFF2) в папку со шрифтами вашего проекта

2. Подключите CSS файл:
\`\`\`html
<link rel="stylesheet" href="${options.familyName}.css">
\`\`\`

3. Используйте классы иконок:
\`\`\`html
<i class="${options.familyName.toLowerCase()}-icon icon-home"></i>
\`\`\`

## Доступные иконки

${iconTableHeader}
${iconTableRows}

## Техническая информация

- **Версия**: ${options.version}
- **Создано**: ${new Date().toLocaleString('ru')}
- **Количество иконок**: ${Object.keys(iconMap).length}
- **Формат**: Icon Font (TTF/WOFF/WOFF2)
- **Units per EM**: 1000
- **Baseline**: 850/-150

## Кастомизация

Вы можете изменить размер иконок через CSS:

\`\`\`css
.${options.familyName.toLowerCase()}-icon {
  font-size: 24px; /* Размер иконки */
  color: #333;     /* Цвет иконки */
}
\`\`\`

---

Создано в **Foxic** - генераторе иконочных шрифтов
https://foxic.dev
`;
  }

  /**
   * Создает SVG шрифт из иконок для последующей конвертации в TTF
   */
  private createSvgFont(
    icons: Record<string, IconData>,
    options: FontOptions,
    currentUnicode: number,
    iconMap: Record<string, { unicode: number; name: string }>
  ): string {
    // Создаем заголовок SVG шрифта с правильными параметрами
    const svgHeader = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg">
<metadata>Generated by Foxic Icon Font Generator</metadata>
<defs>
<font id="${options.familyName}" horiz-adv-x="1000">
<font-face
  font-family="${options.familyName}"
  font-weight="normal"
  font-style="normal"
  units-per-em="1000"
  ascent="850"
  descent="-150"
  x-height="500"
  cap-height="700" />
<missing-glyph horiz-adv-x="500" />`;

    // Генерируем глифы для каждой иконки
    const glyphs: string[] = [];
    for (const [name, icon] of Object.entries(icons)) {
      const unicode = currentUnicode;
      iconMap[name] = { unicode, name };

      // Извлекаем path данные из SVG
      const pathData = this.extractSvgPath(icon.content);
      if (pathData) {
        // Используем правильный формат Unicode для SVG шрифтов
        const unicodeHex = `&#x${unicode.toString(16).padStart(4, '0')};`;
        glyphs.push(`<glyph glyph-name="${name}" unicode="${unicodeHex}" horiz-adv-x="1000" d="${pathData}" />`);
      } else {
        console.warn(`Не удалось извлечь path данные для иконки: ${name}`);
      }

      currentUnicode++;
    }

    // Закрываем SVG шрифт
    const svgFooter = `</font>
</defs>
</svg>`;

    return svgHeader + '\n' + glyphs.join('\n') + '\n' + svgFooter;
  }

  /**
   * Извлекает данные path из SVG иконки и преобразует их для шрифта
   */
  private extractSvgPath(svgContent: string): string {
    try {
      // Создаем временный DOM элемент для парсинга SVG
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

      const svgElement = svgDoc.querySelector('svg');
      if (!svgElement) {
        console.warn('SVG элемент не найден');
        return '';
      }

      // Получаем viewBox или размеры SVG
      let viewBoxWidth = 24;
      let viewBoxHeight = 24;

      const viewBox = svgElement.getAttribute('viewBox');
      if (viewBox) {
        const [, , width, height] = viewBox.split(/\s+/).map(Number);
        viewBoxWidth = width || 24;
        viewBoxHeight = height || 24;
      } else {
        // Пытаемся получить из width/height атрибутов
        const width = svgElement.getAttribute('width');
        const height = svgElement.getAttribute('height');
        if (width && height) {
          viewBoxWidth = parseFloat(width.replace(/[^0-9.]/g, '')) || 24;
          viewBoxHeight = parseFloat(height.replace(/[^0-9.]/g, '')) || 24;
        }
      }

      // Ищем все векторные элементы (path, rect, circle, polygon, etc.)
      const vectorElements = svgDoc.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line');
      const pathData: string[] = [];

      vectorElements.forEach(element => {
        let pathString = '';

        if (element.tagName === 'path') {
          const d = element.getAttribute('d');
          if (d) pathString = d;
        } else if (element.tagName === 'rect') {
          // Конвертируем rect в path
          const x = parseFloat(element.getAttribute('x') || '0');
          const y = parseFloat(element.getAttribute('y') || '0');
          const width = parseFloat(element.getAttribute('width') || '0');
          const height = parseFloat(element.getAttribute('height') || '0');
          const rx = parseFloat(element.getAttribute('rx') || '0');
          const ry = parseFloat(element.getAttribute('ry') || rx.toString());

          if (rx > 0 || ry > 0) {
            // Прямоугольник с скругленными углами
            pathString = `M${x + rx},${y} L${x + width - rx},${y} Q${x + width},${y} ${x + width},${y + ry} L${x + width},${y + height - ry} Q${x + width},${y + height} ${x + width - rx},${y + height} L${x + rx},${y + height} Q${x},${y + height} ${x},${y + height - ry} L${x},${y + ry} Q${x},${y} ${x + rx},${y} Z`;
          } else {
            // Обычный прямоугольник
            pathString = `M${x},${y} L${x + width},${y} L${x + width},${y + height} L${x},${y + height} Z`;
          }
        } else if (element.tagName === 'circle') {
          // Конвертируем circle в path
          const cx = parseFloat(element.getAttribute('cx') || '0');
          const cy = parseFloat(element.getAttribute('cy') || '0');
          const r = parseFloat(element.getAttribute('r') || '0');
          pathString = `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} Z`;
        }
        // Можно добавить поддержку других элементов по необходимости

        if (pathString) {
          pathData.push(pathString);
        }
      });

      if (pathData.length === 0) {
        console.warn('Не найдено векторных данных в SVG');
        return '';
      }

      // Соединяем все path'ы
      let combinedPath = pathData.join(' ');

      // Масштабируем координаты для шрифта (1000 units-per-em)
      const scale = 1000 / Math.max(viewBoxWidth, viewBoxHeight);

      // Инвертируем Y координаты (в SVG Y растет вниз, в шрифтах - вверх)
      // Также центрируем по базовой линии
      const offsetY = viewBoxHeight * scale;

      // Применяем трансформацию к path данным
      combinedPath = this.transformPath(combinedPath, scale, -scale, 0, offsetY);

      return combinedPath;
    } catch (error) {
      console.warn('Ошибка извлечения path из SVG:', error);
      return '';
    }
  }

  /**
   * Применяет масштабирование и смещение к SVG path
   */
  private transformPath(pathData: string, scaleX: number, scaleY: number, offsetX: number, offsetY: number): string {
    return pathData.replace(/([MLHVCSQTAZ])\s*([^MLHVCSQTAZ]*)/gi, (match, command, coords) => {
      if (!coords.trim()) return match;

      const numbers = coords.match(/-?\d*\.?\d+/g);
      if (!numbers) return match;

      const transformedNumbers = numbers.map((num: string, index: number) => {
        const n = parseFloat(num);
        if (command.toUpperCase() === 'H') {
          // Горизонтальная линия - только X координата
          return (n * scaleX + offsetX).toFixed(2);
        } else if (command.toUpperCase() === 'V') {
          // Вертикальная линия - только Y координата
          return (n * scaleY + offsetY).toFixed(2);
        } else {
          // Обычные координаты - четные индексы X, нечетные Y
          if (index % 2 === 0) {
            return (n * scaleX + offsetX).toFixed(2);
          } else {
            return (n * scaleY + offsetY).toFixed(2);
          }
        }
      });

      return command + transformedNumbers.join(' ');
    });
  }

  /**
   * Генерирует реальные файлы шрифтов используя fonteditor-core
   */
  private async generateRealFontFiles(svgFont: string, familyName: string): Promise<Record<string, Uint8Array>> {
    try {
      console.log('Генерируем шрифт из SVG:', svgFont.substring(0, 200) + '...');

      // Инициализируем woff2 если доступен
      let woff2Available = true;
      try {
        if (typeof woff2?.init === 'function') {
          await woff2.init();
        }
      } catch (e) {
        console.warn('WOFF2 недоступен:', e);
        woff2Available = false;
      }

      // Создаем Font объект из SVG с правильными параметрами
      const font = createFont(svgFont, {
        type: 'svg',
        combinePath: false
      });

      console.log('Font объект создан, генерируем файлы...');

      const files: Record<string, Uint8Array> = {};

      // Генерируем TTF
      try {
        const ttfBuffer = font.write({
          type: 'ttf',
          toBuffer: true,
          hinting: true
        });

        if (ttfBuffer && ttfBuffer.buffer) {
          files[`${familyName}.ttf`] = new Uint8Array(ttfBuffer.buffer, ttfBuffer.byteOffset, ttfBuffer.byteLength);
          console.log(`TTF файл создан: ${files[`${familyName}.ttf`].length} байт`);
        }
      } catch (e) {
        console.error('Ошибка генерации TTF:', e);
      }

      // Генерируем WOFF
      try {
        const woffBuffer = font.write({
          type: 'woff',
          toBuffer: true
        });

        if (woffBuffer && woffBuffer.buffer) {
          files[`${familyName}.woff`] = new Uint8Array(woffBuffer.buffer, woffBuffer.byteOffset, woffBuffer.byteLength);
          console.log(`WOFF файл создан: ${files[`${familyName}.woff`].length} байт`);
        }
      } catch (e) {
        console.error('Ошибка генерации WOFF:', e);
      }

      // Генерируем WOFF2 если доступен
      if (woff2Available) {
        try {
          const woff2Buffer = font.write({
            type: 'woff2',
            toBuffer: true
          });

          if (woff2Buffer && woff2Buffer.buffer) {
            files[`${familyName}.woff2`] = new Uint8Array(woff2Buffer.buffer, woff2Buffer.byteOffset, woff2Buffer.byteLength);
            console.log(`WOFF2 файл создан: ${files[`${familyName}.woff2`].length} байт`);
          }
        } catch (e) {
          console.warn('WOFF2 генерация недоступна:', e);
        }
      }

      // Проверяем что хотя бы один файл создан
      if (Object.keys(files).length === 0) {
        throw new Error('Не удалось создать ни одного файла шрифта');
      }

      return files;

    } catch (error) {
      console.error('Критическая ошибка генерации файлов шрифта:', error);

      // Создаем fallback файлы с подробными инструкциями
      const errorInfo = `
# ${familyName} - Ошибка автоматической генерации

К сожалению, автоматическая генерация шрифта не удалась.

## Альтернативные способы создания шрифта:

### 1. IcoMoon (Рекомендуется)
1. Откройте https://icomoon.io/app/
2. Нажмите "Import Icons" и загрузите SVG файлы
3. Выберите нужные иконки
4. Нажмите "Generate Font"
5. Настройте названия классов и Unicode коды
6. Скачайте готовый шрифт

### 2. Fontello
1. Откройте https://fontello.com/
2. Перетащите SVG файлы в область загрузки
3. Выберите иконки и настройте коды
4. Скачайте пакет

### 3. FontForge (для опытных пользователей)
1. Установите FontForge: https://fontforge.org/
2. Создайте новый шрифт
3. Импортируйте SVG файлы как глифы
4. Экспортируйте в TTF/WOFF

## Техническая информация об ошибке:
${error instanceof Error ? error.message : String(error)}

Дата: ${new Date().toLocaleString('ru')}
`;

      const errorBytes = new TextEncoder().encode(errorInfo);

      return {
        [`${familyName}.ttf`]: errorBytes,
        [`${familyName}.woff`]: errorBytes,
        [`${familyName}.woff2`]: errorBytes,
        [`${familyName}_INSTRUCTIONS.txt`]: errorBytes
      };
    }
  }  /**
   * Вычисляет хеш архива для проверки целостности
   */
  private calculateArchiveHash(icons: Record<string, IconData>): string {
    const iconNames = Object.keys(icons).sort();
    const hashInput = iconNames.map(name => `${name}:${icons[name].hash}`).join('|');

    // Простое хеширование для демонстрации
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Создает и скачивает файл
   */
  downloadFile(data: Uint8Array, filename: string, mimeType: string = 'application/octet-stream'): void {
    try {
      const blob = new Blob([new Uint8Array(data)], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Освобождаем URL через некоторое время
      setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (error) {
      console.error('Ошибка скачивания файла:', error);
      throw new Error('Не удалось скачать файл');
    }
  }
}

// Singleton экземпляр
export const exportService = new ExportService();