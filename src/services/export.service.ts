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

      // Добавляем все SVG файлы в папку icons/
      for (const [name, icon] of Object.entries(icons)) {
        const fileName = `icons/${name}.svg`;
        filesToZip[fileName] = new TextEncoder().encode(icon.content);
      }

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
    return `# ${options.familyName} Font Package

${options.description}

## Содержимое пакета

- \`${options.familyName}.css\` - CSS файл с классами иконок
- \`${options.familyName}.ttf\` - placeholder файл TTF шрифта
- \`${options.familyName}.woff\` - placeholder файл WOFF шрифта
- \`${options.familyName}_instructions.txt\` - инструкции по генерации
- \`demo.html\` - демонстрация всех иконок
- \`icons/\` - исходные SVG файлы
- \`manifest.json\` - метаданные пакета

## Генерация настоящих шрифтов

⚠️ **Важно**: TTF и WOFF файлы в этом пакете являются placeholder'ами.

Для создания рабочих шрифтов используйте один из сервисов:

1. **IcoMoon** (https://icomoon.io/) - рекомендуется
   - Загрузите SVG файлы из папки \`icons/\`
   - Настройте Unicode коды согласно таблице ниже
   - Скачайте шрифт и замените CSS

2. **Fontello** (https://fontello.com/)
   - Импортируйте SVG иконки
   - Используйте предустановленные Unicode коды
   - Скачайте готовый пакет

3. **FontForge** (https://fontforge.org/) - для продвинутых пользователей

## Использование

1. Подключите CSS файл:
\`\`\`html
<link rel="stylesheet" href="${options.familyName}.css">
\`\`\`

2. Используйте классы иконок:
\`\`\`html
<i class="${options.familyName.toLowerCase()}-icon icon-home"></i>
\`\`\`

## Unicode коды

${Object.entries(iconMap).map(([name, info]) =>
  `| ${name} | U+${info.unicode.toString(16).toUpperCase().padStart(4, '0')} | \\\\\${info.unicode.toString(16).padStart(4, '0')} |`
).join('\n')}

## Версия

- Версия: ${options.version}
- Создано: ${new Date().toLocaleString('ru')}
- Количество иконок: ${Object.keys(iconMap).length}

---

Создано в Foxic - генераторе иконочных шрифтов
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
    // Создаем заголовок SVG шрифта
    const svgHeader = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg">
<metadata>Generated by Foxic</metadata>
<defs>
<font id="${options.familyName}" horiz-adv-x="1000">
<font-face
  font-family="${options.familyName}"
  font-weight="400"
  units-per-em="1000"
  ascent="800"
  descent="-200" />
<missing-glyph horiz-adv-x="1000" />`;

    // Генерируем глифы для каждой иконки
    const glyphs: string[] = [];
    for (const [name, icon] of Object.entries(icons)) {
      const unicode = currentUnicode;
      iconMap[name] = { unicode, name };

      // Извлекаем path данные из SVG
      const pathData = this.extractSvgPath(icon.content);
      if (pathData) {
        const unicodeChar = String.fromCharCode(unicode);
        glyphs.push(`<glyph glyph-name="${name}" unicode="${unicodeChar}" horiz-adv-x="1000" d="${pathData}" />`);
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
   * Извлекает данные path из SVG иконки
   */
  private extractSvgPath(svgContent: string): string {
    try {
      // Создаем временный DOM элемент для парсинга SVG
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

      // Ищем все path элементы
      const paths = svgDoc.querySelectorAll('path');
      const pathData: string[] = [];

      paths.forEach(path => {
        const d = path.getAttribute('d');
        if (d) {
          pathData.push(d);
        }
      });

      // Соединяем все path'ы в один
      return pathData.join(' ');
    } catch (error) {
      console.warn('Ошибка извлечения path из SVG:', error);
      return '';
    }
  }

  /**
   * Генерирует реальные файлы шрифтов используя fonteditor-core
   */
  private async generateRealFontFiles(svgFont: string, familyName: string): Promise<Record<string, Uint8Array>> {
    try {
      // Инициализируем woff2 если доступен
      try {
        await woff2.init();
      } catch (e) {
        console.warn('WOFF2 недоступен:', e);
      }

      // Создаем Font объект из SVG
      const font = createFont(svgFont, {
        type: 'svg',
        combinePath: false
      });

      // Генерируем TTF
      const ttfBuffer = font.write({
        type: 'ttf',
        toBuffer: true
      });

      // Генерируем WOFF
      const woffBuffer = font.write({
        type: 'woff',
        toBuffer: true
      });

      const files: Record<string, Uint8Array> = {
        [`${familyName}.ttf`]: new Uint8Array(ttfBuffer.buffer, ttfBuffer.byteOffset, ttfBuffer.byteLength),
        [`${familyName}.woff`]: new Uint8Array(woffBuffer.buffer, woffBuffer.byteOffset, woffBuffer.byteLength)
      };

      // Добавляем WOFF2 если доступен
      try {
        const woff2Buffer = font.write({
          type: 'woff2',
          toBuffer: true
        });
        files[`${familyName}.woff2`] = new Uint8Array(woff2Buffer.buffer, woff2Buffer.byteOffset, woff2Buffer.byteLength);
      } catch (e) {
        console.warn('WOFF2 генерация недоступна:', e);
      }

      return files;
    } catch (error) {
      console.error('Ошибка генерации файлов шрифта:', error);

      // Fallback: создаем инструкции если генерация не удалась
      const instructions = new TextEncoder().encode(`
# ${familyName} Font Generation Failed

Автоматическая генерация шрифта не удалась. Используйте SVG файлы для создания шрифта вручную:

1. Загрузите SVG файлы из папки icons/ в IcoMoon (https://icomoon.io/)
2. Настройте Unicode коды согласно таблице в CSS файле
3. Скачайте готовый шрифт

Ошибка: ${error instanceof Error ? error.message : 'неизвестная ошибка'}
      `.trim());

      return {
        [`${familyName}.ttf`]: instructions,
        [`${familyName}.woff`]: instructions,
        [`${familyName}_error.txt`]: instructions
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