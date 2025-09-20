import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function convertSvgToPng() {
    const publicDir = path.join(__dirname, '../public');
    const srcDir = path.join(__dirname, '../src/assets'); // SVG источники

    const icons = [
        { input: 'icon-180.svg', output: 'icon-180.png', size: 180 },
        { input: 'icon-192.svg', output: 'icon-192.png', size: 192 },
        { input: 'icon-512.svg', output: 'icon-512.png', size: 512 }
    ];

    console.log('🖼️  Конвертируем SVG иконки в PNG...');

    for (const icon of icons) {
        // Попробуем найти SVG в src/assets, затем в public
        let inputPath = path.join(srcDir, icon.input);
        if (!fs.existsSync(inputPath)) {
            inputPath = path.join(publicDir, icon.input);
        }

        const outputPath = path.join(publicDir, icon.output);

        if (!fs.existsSync(inputPath)) {
            console.warn(`⚠️  Файл ${icon.input} не найден ни в src/assets, ни в public`);
            continue;
        }

        try {
            await sharp(inputPath)
                .resize(icon.size, icon.size)
                .png({
                    quality: 90,
                    compressionLevel: 9,
                    progressive: true
                })
                .toFile(outputPath);

            console.log(`✅ ${icon.input} → ${icon.output} (${icon.size}x${icon.size})`);
        } catch (error) {
            console.error(`❌ Ошибка конвертации ${icon.input}:`, error.message);
        }
    }

    // Создаём favicon.ico из 192px версии
    try {
        const faviconSizes = [16, 32, 48];
        const faviconPath = path.join(publicDir, 'favicon.ico');

        // Создаём 32px PNG для favicon
        const favicon32Path = path.join(publicDir, 'favicon-32.png');
        let iconSvgPath = path.join(srcDir, 'icon-192.svg');
        if (!fs.existsSync(iconSvgPath)) {
            iconSvgPath = path.join(publicDir, 'icon-192.svg');
        }

        await sharp(iconSvgPath)
            .resize(32, 32)
            .png()
            .toFile(favicon32Path);

        console.log('✅ favicon-32.png создан');

        // Пытаемся создать favicon.ico (может не сработать на всех системах)
        try {
            await sharp(favicon32Path)
                .resize(32, 32)
                .toFormat('png')
                .toFile(faviconPath.replace('.ico', '.png'));

            // Переименовываем в .ico (простое решение)
            fs.renameSync(faviconPath.replace('.ico', '.png'), faviconPath);
            console.log('✅ favicon.ico создан');
        } catch (icoError) {
            console.log('ℹ️  Используем PNG как favicon');
        }

    } catch (error) {
        console.error('❌ Ошибка создания favicon:', error.message);
    }

    console.log('🎉 Конвертация завершена!');
}

convertSvgToPng().catch(console.error);