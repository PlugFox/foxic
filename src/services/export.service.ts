import { zip } from 'fflate';
import { IconData } from './icons.service';

// Типы для fonteditor-core
interface FontEditorCore {
  createFont: (svgFont: string, options?: any) => any;
  woff2?: any; // Используем any для упрощения типизации
}

// Ленивый импорт fonteditor-core
let fontEditorCore: FontEditorCore | null = null;

async function loadFontEditorCore(): Promise<FontEditorCore> {
  if (!fontEditorCore) {
    try {
      // @ts-ignore - fonteditor-core types
      const { createFont, woff2 } = await import('fonteditor-core');
      fontEditorCore = { createFont, woff2 };
      console.log('FontEditor Core загружен');
    } catch (error) {
      console.error('Ошибка загрузки FontEditor Core:', error);
      throw new Error('Не удалось загрузить библиотеку генерации шрифтов');
    }
  }
  return fontEditorCore!; // Используем ! так как проверили выше
}

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
    // Создаем заголовок SVG шрифта с улучшенными параметрами
    const svgHeader = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg">
<metadata>Generated by Foxic Icon Font Generator</metadata>
<defs>
<font id="${options.familyName.replace(/[^a-zA-Z0-9_-]/g, '')}" horiz-adv-x="1024">
<font-face
  font-family="${options.familyName}"
  font-weight="400"
  font-style="normal"
  units-per-em="1024"
  ascent="896"
  descent="-128"
  x-height="448"
  cap-height="768"
  bbox="0 -128 1024 896" />
<missing-glyph horiz-adv-x="512" d="M64 0v768h896v-768h-896zM128 64h768v640h-768v-640z" />`;

    // Генерируем глифы для каждой иконки
    const glyphs: string[] = [];
    for (const [name, icon] of Object.entries(icons)) {
      const unicode = currentUnicode;
      iconMap[name] = { unicode, name };

      // Извлекаем и обрабатываем path данные из SVG
      const pathData = this.extractSvgPath(icon.content);
      if (pathData) {
        // Очищаем имя глифа для корректности
        const glyphName = name.replace(/[^a-zA-Z0-9_-]/g, '');
        const unicodeChar = String.fromCharCode(unicode);

        glyphs.push(`<glyph glyph-name="${glyphName}" unicode="${unicodeChar}" horiz-adv-x="1024" d="${pathData}" />`);
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

      // Проверяем на ошибки парсинга
      const parseError = svgDoc.querySelector('parsererror');
      if (parseError) {
        console.warn('Ошибка парсинга SVG:', parseError.textContent);
        return '';
      }

      const svgElement = svgDoc.querySelector('svg');
      if (!svgElement) {
        console.warn('SVG элемент не найден');
        return '';
      }

      // Получаем viewBox или размеры SVG с улучшенной обработкой
      let viewBoxWidth = 24;
      let viewBoxHeight = 24;
      let viewBoxX = 0;
      let viewBoxY = 0;

      const viewBox = svgElement.getAttribute('viewBox');
      if (viewBox) {
        const viewBoxValues = viewBox.trim().split(/[\s,]+/).map(Number);
        if (viewBoxValues.length === 4) {
          [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = viewBoxValues;
        }
      } else {
        // Пытаемся получить из width/height атрибутов
        const width = svgElement.getAttribute('width');
        const height = svgElement.getAttribute('height');
        if (width && height) {
          viewBoxWidth = parseFloat(width.replace(/[^0-9.-]/g, '')) || 24;
          viewBoxHeight = parseFloat(height.replace(/[^0-9.-]/g, '')) || 24;
        }
      }

      // Ищем все векторные элементы
      const vectorElements = svgDoc.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line');
      const pathData: string[] = [];

      vectorElements.forEach(element => {
        let pathString = '';

        if (element.tagName === 'path') {
          const d = element.getAttribute('d');
          if (d) pathString = d.trim();
        } else if (element.tagName === 'rect') {
          pathString = this.rectToPath(element);
        } else if (element.tagName === 'circle') {
          pathString = this.circleToPath(element);
        } else if (element.tagName === 'ellipse') {
          pathString = this.ellipseToPath(element);
        } else if (element.tagName === 'polygon' || element.tagName === 'polyline') {
          pathString = this.polygonToPath(element);
        } else if (element.tagName === 'line') {
          pathString = this.lineToPath(element);
        }

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

      // Нормализуем путь для шрифта
      combinedPath = this.normalizeSvgPathForFont(
        combinedPath,
        viewBoxX,
        viewBoxY,
        viewBoxWidth,
        viewBoxHeight
      );

      return combinedPath;
    } catch (error) {
      console.warn('Ошибка извлечения path из SVG:', error);
      return '';
    }
  }

  /**
   * Конвертирует rect элемент в path
   */
  private rectToPath(element: Element): string {
    const x = parseFloat(element.getAttribute('x') || '0');
    const y = parseFloat(element.getAttribute('y') || '0');
    const width = parseFloat(element.getAttribute('width') || '0');
    const height = parseFloat(element.getAttribute('height') || '0');
    const rx = parseFloat(element.getAttribute('rx') || '0');
    const ry = parseFloat(element.getAttribute('ry') || rx.toString());

    if (rx > 0 || ry > 0) {
      // Прямоугольник с скругленными углами
      const actualRx = Math.min(rx, width / 2);
      const actualRy = Math.min(ry, height / 2);
      return `M${x + actualRx},${y} L${x + width - actualRx},${y} Q${x + width},${y} ${x + width},${y + actualRy} L${x + width},${y + height - actualRy} Q${x + width},${y + height} ${x + width - actualRx},${y + height} L${x + actualRx},${y + height} Q${x},${y + height} ${x},${y + height - actualRy} L${x},${y + actualRy} Q${x},${y} ${x + actualRx},${y} Z`;
    } else {
      // Обычный прямоугольник
      return `M${x},${y} L${x + width},${y} L${x + width},${y + height} L${x},${y + height} Z`;
    }
  }

  /**
   * Конвертирует circle элемент в path
   */
  private circleToPath(element: Element): string {
    const cx = parseFloat(element.getAttribute('cx') || '0');
    const cy = parseFloat(element.getAttribute('cy') || '0');
    const r = parseFloat(element.getAttribute('r') || '0');

    if (r <= 0) return '';

    return `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} Z`;
  }

  /**
   * Конвертирует ellipse элемент в path
   */
  private ellipseToPath(element: Element): string {
    const cx = parseFloat(element.getAttribute('cx') || '0');
    const cy = parseFloat(element.getAttribute('cy') || '0');
    const rx = parseFloat(element.getAttribute('rx') || '0');
    const ry = parseFloat(element.getAttribute('ry') || '0');

    if (rx <= 0 || ry <= 0) return '';

    return `M${cx - rx},${cy} A${rx},${ry} 0 1,0 ${cx + rx},${cy} A${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`;
  }

  /**
   * Конвертирует polygon/polyline элемент в path
   */
  private polygonToPath(element: Element): string {
    const points = element.getAttribute('points');
    if (!points) return '';

    const coordinates = points.trim().split(/[\s,]+/).map(Number);
    if (coordinates.length < 4) return '';

    let pathString = `M${coordinates[0]},${coordinates[1]}`;
    for (let i = 2; i < coordinates.length; i += 2) {
      if (i + 1 < coordinates.length) {
        pathString += ` L${coordinates[i]},${coordinates[i + 1]}`;
      }
    }

    // Закрываем путь для polygon
    if (element.tagName === 'polygon') {
      pathString += ' Z';
    }

    return pathString;
  }

  /**
   * Конвертирует line элемент в path
   */
  private lineToPath(element: Element): string {
    const x1 = parseFloat(element.getAttribute('x1') || '0');
    const y1 = parseFloat(element.getAttribute('y1') || '0');
    const x2 = parseFloat(element.getAttribute('x2') || '0');
    const y2 = parseFloat(element.getAttribute('y2') || '0');

    return `M${x1},${y1} L${x2},${y2}`;
  }

  /**
   * Нормализует SVG path для использования в шрифте
   */
  private normalizeSvgPathForFont(
    pathData: string,
    viewBoxX: number,
    viewBoxY: number,
    viewBoxWidth: number,
    viewBoxHeight: number
  ): string {
    // Определяем масштаб для приведения к units-per-em (1024)
    const maxDimension = Math.max(viewBoxWidth, viewBoxHeight);
    const scale = 1024 / maxDimension;

    // Вычисляем смещения для центрирования
    const scaledWidth = viewBoxWidth * scale;
    const scaledHeight = viewBoxHeight * scale;
    const offsetX = (1024 - scaledWidth) / 2 - (viewBoxX * scale);
    const offsetY = 896 - (viewBoxY * scale); // 896 = ascent, инвертируем Y

    // Применяем трансформацию
    return this.transformPath(pathData, scale, -scale, offsetX, offsetY);
  }

  /**
   * Применяет масштабирование и смещение к SVG path с учетом типов команд
   */
  private transformPath(pathData: string, scaleX: number, scaleY: number, offsetX: number, offsetY: number): string {
    // Нормализуем pathData, убираем лишние пробелы
    const normalizedPath = pathData.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

    return normalizedPath.replace(/([MLHVCSQTAZ])\s*([^MLHVCSQTAZ]*)/gi, (match, command, coords) => {
      if (!coords.trim()) return command;

      const numbers = coords.trim().match(/-?\d*\.?\d+(?:[eE][+-]?\d+)?/g);
      if (!numbers) return command;

      const cmd = command.toUpperCase();
      const isRelative = command !== cmd;

      let transformedNumbers: string[] = [];

      switch (cmd) {
        case 'H': // Горизонтальная линия
          transformedNumbers = numbers.map((num: string) => {
            const n = parseFloat(num);
            return (isRelative ? n * scaleX : n * scaleX + offsetX).toFixed(1);
          });
          break;

        case 'V': // Вертикальная линия
          transformedNumbers = numbers.map((num: string) => {
            const n = parseFloat(num);
            return (isRelative ? n * scaleY : n * scaleY + offsetY).toFixed(1);
          });
          break;

        case 'M': // Move to
        case 'L': // Line to
        case 'T': // Smooth quadratic bezier
          transformedNumbers = numbers.map((num: string, index: number) => {
            const n = parseFloat(num);
            if (index % 2 === 0) { // X координата
              return (isRelative ? n * scaleX : n * scaleX + offsetX).toFixed(1);
            } else { // Y координата
              return (isRelative ? n * scaleY : n * scaleY + offsetY).toFixed(1);
            }
          });
          break;

        case 'C': // Cubic bezier
          transformedNumbers = numbers.map((num: string, index: number) => {
            const n = parseFloat(num);
            if (index % 2 === 0) { // X координата
              return (isRelative ? n * scaleX : n * scaleX + offsetX).toFixed(1);
            } else { // Y координата
              return (isRelative ? n * scaleY : n * scaleY + offsetY).toFixed(1);
            }
          });
          break;

        case 'S': // Smooth cubic bezier
        case 'Q': // Quadratic bezier
          transformedNumbers = numbers.map((num: string, index: number) => {
            const n = parseFloat(num);
            if (index % 2 === 0) { // X координата
              return (isRelative ? n * scaleX : n * scaleX + offsetX).toFixed(1);
            } else { // Y координата
              return (isRelative ? n * scaleY : n * scaleY + offsetY).toFixed(1);
            }
          });
          break;

        case 'A': // Arc
          // rx ry x-axis-rotation large-arc-flag sweep-flag x y
          transformedNumbers = numbers.map((num: string, index: number) => {
            const n = parseFloat(num);
            const paramIndex = index % 7;

            if (paramIndex === 0) { // rx
              return (n * Math.abs(scaleX)).toFixed(1);
            } else if (paramIndex === 1) { // ry
              return (n * Math.abs(scaleY)).toFixed(1);
            } else if (paramIndex === 2) { // x-axis-rotation
              return n.toString();
            } else if (paramIndex === 3 || paramIndex === 4) { // flags
              return Math.round(n).toString();
            } else if (paramIndex === 5) { // x
              return (isRelative ? n * scaleX : n * scaleX + offsetX).toFixed(1);
            } else { // y
              return (isRelative ? n * scaleY : n * scaleY + offsetY).toFixed(1);
            }
          });
          break;

        case 'Z': // Close path
          return command;

        default:
          // Для неизвестных команд применяем стандартную трансформацию
          transformedNumbers = numbers.map((num: string, index: number) => {
            const n = parseFloat(num);
            if (index % 2 === 0) {
              return (isRelative ? n * scaleX : n * scaleX + offsetX).toFixed(1);
            } else {
              return (isRelative ? n * scaleY : n * scaleY + offsetY).toFixed(1);
            }
          });
      }

      return command + transformedNumbers.join(' ');
    });
  }

  /**
   * Валидирует созданный шрифт на корректность
   */
  private validateFont(font: any): boolean {
    try {
      // Проверяем основные свойства шрифта
      if (!font || typeof font !== 'object') {
        console.warn('Шрифт не является объектом');
        return false;
      }

      // Проверяем наличие глифов
      const glyf = font.get().glyf;
      if (!glyf || typeof glyf !== 'object') {
        console.warn('Глифы не найдены в шрифте');
        return false;
      }

      const glyphCount = Object.keys(glyf).length;
      if (glyphCount < 2) { // минимум missing glyph + хотя бы один символ
        console.warn(`Недостаточно глифов в шрифте: ${glyphCount}`);
        return false;
      }

      // Проверяем метрики шрифта
      const head = font.get().head;
      if (!head) {
        console.warn('Отсутствует таблица head');
        return false;
      }

      const hhea = font.get().hhea;
      if (!hhea) {
        console.warn('Отсутствует таблица hhea');
        return false;
      }

      // Проверяем корректность units per em
      if (!head.unitsPerEm || head.unitsPerEm < 16 || head.unitsPerEm > 16384) {
        console.warn(`Некорректный unitsPerEm: ${head.unitsPerEm}`);
        return false;
      }

      console.log(`Шрифт прошел валидацию: ${glyphCount} глифов, unitsPerEm: ${head.unitsPerEm}`);
      return true;

    } catch (error) {
      console.warn('Ошибка валидации шрифта:', error);
      return false;
    }
  }

  /**
   * Генерирует реальные файлы шрифтов используя fonteditor-core
   */
  private async generateRealFontFiles(svgFont: string, familyName: string): Promise<Record<string, Uint8Array>> {
    try {
      console.log('Генерируем шрифт из SVG:', svgFont.substring(0, 200) + '...');

      // Загружаем fonteditor-core
      const { createFont, woff2 } = await loadFontEditorCore();

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
        combinePath: false,
        inflate: null, // Отключаем автоматическую коррекцию
        saveContours: true // Сохраняем оригинальные контуры
      });

      console.log('Font объект создан, генерируем файлы...');

      // Валидируем созданный шрифт
      if (!this.validateFont(font)) {
        throw new Error('Созданный шрифт не прошел валидацию');
      }

      const files: Record<string, Uint8Array> = {};

      // Генерируем TTF с улучшенной обработкой ошибок
      try {
        console.log('Начинаем генерацию TTF...');
        const ttfBuffer = font.write({
          type: 'ttf',
          toBuffer: true,
          hinting: true,
          kerning: true,
          support: { head: {}, hhea: {}, maxp: {}, post: {} }
        });

        if (ttfBuffer && (ttfBuffer.buffer || ttfBuffer instanceof ArrayBuffer)) {
          const buffer = ttfBuffer.buffer || ttfBuffer;
          files[`${familyName}.ttf`] = new Uint8Array(buffer);
          console.log(`✅ TTF файл создан: ${files[`${familyName}.ttf`].length} байт`);
        } else {
          console.warn('TTF buffer пустой или некорректный');
        }
      } catch (e) {
        console.error('❌ Ошибка генерации TTF:', e);
      }

      // Генерируем WOFF с улучшенной обработкой
      try {
        console.log('Начинаем генерацию WOFF...');
        const woffBuffer = font.write({
          type: 'woff',
          toBuffer: true,
          metadata: `<metadata><description>${familyName} Icon Font</description></metadata>`
        });

        if (woffBuffer && (woffBuffer.buffer || woffBuffer instanceof ArrayBuffer)) {
          const buffer = woffBuffer.buffer || woffBuffer;
          files[`${familyName}.woff`] = new Uint8Array(buffer);
          console.log(`✅ WOFF файл создан: ${files[`${familyName}.woff`].length} байт`);
        } else {
          console.warn('WOFF buffer пустой или некорректный');
        }
      } catch (e) {
        console.error('❌ Ошибка генерации WOFF:', e);
      }

      // Генерируем WOFF2 если доступен
      if (woff2Available) {
        try {
          console.log('Начинаем генерацию WOFF2...');
          const woff2Buffer = font.write({
            type: 'woff2',
            toBuffer: true
          });

          if (woff2Buffer && (woff2Buffer.buffer || woff2Buffer instanceof ArrayBuffer)) {
            const buffer = woff2Buffer.buffer || woff2Buffer;
            files[`${familyName}.woff2`] = new Uint8Array(buffer);
            console.log(`✅ WOFF2 файл создан: ${files[`${familyName}.woff2`].length} байт`);
          } else {
            console.warn('WOFF2 buffer пустой или некорректный');
          }
        } catch (e) {
          console.warn('⚠️ WOFF2 генерация недоступна:', e);
        }
      } else {
        console.log('⚠️ WOFF2 недоступен, пропускаем');
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