import { createSignal, Show } from 'solid-js';
import { IconData } from '../services/icons.service';

interface IconCardProps {
  icon: IconData;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
  onTagsChange: (name: string, tags: string[]) => void;
}

export default function IconCard(props: IconCardProps) {
  const [isEditing, setIsEditing] = createSignal(false);
  const [editingName, setEditingName] = createSignal('');
  const [isEditingTags, setIsEditingTags] = createSignal(false);
  const [editingTags, setEditingTags] = createSignal('');
  const [showContextMenu, setShowContextMenu] = createSignal(false);

  const handleNameEdit = () => {
    setEditingName(props.icon.name);
    setIsEditing(true);
  };

  const handleNameSave = () => {
    const newName = editingName().trim();
    if (newName && newName !== props.icon.name && newName.length > 0) {
      // Проверяем на валидные символы для имени файла
      const validName = newName.replace(/[<>:"/\\|?*]/g, '');
      if (validName !== newName) {
        alert('Имя содержит недопустимые символы. Используйте только буквы, цифры, дефисы и подчеркивания.');
        return;
      }
      props.onRename(props.icon.name, validName);
    }
    setIsEditing(false);
  };

  const handleNameCancel = () => {
    setEditingName('');
    setIsEditing(false);
  };

  const handleTagsEdit = () => {
    setEditingTags(props.icon.tags.join(', '));
    setIsEditingTags(true);
  };

  const handleTagsSave = () => {
    const newTags = editingTags()
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    props.onTagsChange(props.icon.name, newTags);
    setIsEditingTags(false);
  };

  const handleTagsCancel = () => {
    setEditingTags('');
    setIsEditingTags(false);
  };

  const handleKeyDown = (e: KeyboardEvent, action: 'name' | 'tags') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (action === 'name') {
        handleNameSave();
      } else {
        handleTagsSave();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (action === 'name') {
        handleNameCancel();
      } else {
        handleTagsCancel();
      }
    }
  };

  const handleDelete = () => {
    if (confirm(`Удалить иконку "${props.icon.name}"?`)) {
      props.onDelete(props.icon.name);
    }
    setShowContextMenu(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  return (
    <div
      class="icon-card"
      onContextMenu={(e) => {
        e.preventDefault();
        setShowContextMenu(!showContextMenu());
      }}
    >
      {/* SVG Preview */}
      <div class="icon-preview">
        <div
          class="icon-svg"
          innerHTML={props.icon.content}
        />

        {/* Кнопки действий */}
        <div class="icon-actions">
          <button
            class="icon-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleNameEdit();
            }}
            title="Переименовать"
          >
            ✏️
          </button>
          <button
            class="icon-action-btn delete"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            title="Удалить"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Icon Info */}
      <div class="icon-info">
        {/* Name */}
        <div class="icon-name-section">
          <Show
            when={!isEditing()}
            fallback={
              <input
                type="text"
                class="icon-name-input"
                value={editingName()}
                placeholder="Введите имя иконки"
                onInput={(e) => setEditingName(e.currentTarget.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => handleKeyDown(e, 'name')}
                ref={(el) => {
                  setTimeout(() => {
                    el.focus();
                    el.select();
                  }, 0);
                }}
              />
            }
          >
            <button
              class="icon-name-button"
              onClick={handleNameEdit}
              title="Клик для переименования"
            >
              {props.icon.name}
            </button>
          </Show>
        </div>        {/* Tags */}
        <div class="icon-tags-section">
          <Show
            when={!isEditingTags()}
            fallback={
              <textarea
                class="icon-tags-input"
                value={editingTags()}
                placeholder="Теги через запятую"
                rows="2"
                onInput={(e) => setEditingTags(e.currentTarget.value)}
                onBlur={handleTagsSave}
                onKeyDown={(e) => handleKeyDown(e, 'tags')}
                ref={(el) => {
                  setTimeout(() => {
                    el.focus();
                    el.select();
                  }, 0);
                }}
              />
            }
          >
            <button
              class="icon-tags-button"
              onClick={handleTagsEdit}
              title="Клик для добавления/редактирования тегов"
            >
              <Show
                when={props.icon.tags.length > 0}
                fallback={<span class="no-tags">+ добавить теги</span>}
              >
                {props.icon.tags.map(tag => `#${tag}`).join(' ')}
              </Show>
            </button>
          </Show>
        </div>

        {/* File Size */}
        <div class="icon-size">
          {formatFileSize(props.icon.size)}
        </div>
      </div>

      {/* Context Menu */}
      <Show when={showContextMenu()}>
        <div class="icon-context-menu">
          <button
            class="context-menu-item"
            onClick={handleNameEdit}
          >
            ✏️ Переименовать
          </button>
          <button
            class="context-menu-item"
            onClick={handleTagsEdit}
          >
            🏷️ Редактировать теги
          </button>
          <button
            class="context-menu-item delete"
            onClick={handleDelete}
          >
            🗑️ Удалить
          </button>
        </div>
      </Show>

      {/* Click outside to close context menu */}
      <Show when={showContextMenu()}>
        <div
          class="context-menu-overlay"
          onClick={() => setShowContextMenu(false)}
        />
      </Show>
    </div>
  );
}