import { For, Show } from 'solid-js';
import { IconData } from '../services/icons.service';
import AddIconCard from './AddIconCard';
import IconCard from './IconCard';

interface IconsGridProps {
  icons: Record<string, IconData>;
  onIconsAdd: (icons: IconData[]) => void;
  onIconRename: (oldName: string, newName: string) => void;
  onIconDelete: (name: string) => void;
  onIconTagsChange: (name: string, tags: string[]) => void;
  disabled?: boolean;
}

export default function IconsGrid(props: IconsGridProps) {
  // Преобразуем объект иконок в массив для отображения
  const iconsList = () => Object.values(props.icons);

  return (
    <div class="icons-grid-container">
      <div class="icons-grid">
        {/* Отображаем существующие иконки */}
        <For each={iconsList()}>
          {(icon) => (
            <div class="grid-item">
              <IconCard
                icon={icon}
                onRename={props.onIconRename}
                onDelete={props.onIconDelete}
                onTagsChange={props.onIconTagsChange}
              />
            </div>
          )}
        </For>

        {/* Карточка добавления иконок всегда последняя */}
        <div class="grid-item add-item">
          <AddIconCard
            onIconsAdd={props.onIconsAdd}
            disabled={props.disabled}
          />
        </div>
      </div>

      {/* Информация о проекте */}
      <Show when={iconsList().length > 0}>
        <div class="grid-info">
          <div class="info-item">
            <span class="info-label">Иконок:</span>
            <span class="info-value">{iconsList().length}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Общий размер:</span>
            <span class="info-value">
              {(() => {
                const totalSize = iconsList().reduce((sum, icon) => sum + icon.size, 0);
                if (totalSize < 1024) return `${totalSize} Б`;
                if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(1)} КБ`;
                return `${(totalSize / (1024 * 1024)).toFixed(1)} МБ`;
              })()}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Тегов:</span>
            <span class="info-value">
              {(() => {
                const allTags = new Set();
                iconsList().forEach(icon => {
                  icon.tags.forEach(tag => allTags.add(tag));
                });
                return allTags.size;
              })()}
            </span>
          </div>
        </div>
      </Show>

      {/* Пустое состояние */}
      <Show when={iconsList().length === 0}>
        <div class="empty-state">
          <div class="empty-icon">🎨</div>
          <h3 class="empty-title">Пока нет иконок</h3>
          <p class="empty-description">
            Добавьте SVG файлы, чтобы начать создание иконочного шрифта
          </p>
          <div class="empty-features">
            <div class="feature">
              <span class="feature-icon">📁</span>
              <span>Поддержка множественного выбора</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🖱️</span>
              <span>Drag & Drop из проводника</span>
            </div>
            <div class="feature">
              <span class="feature-icon">✏️</span>
              <span>Переименование и теги</span>
            </div>
            <div class="feature">
              <span class="feature-icon">💾</span>
              <span>Автоматическое сжатие</span>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}