import { createSignal, Show } from 'solid-js';
import { CreateProjectData } from '../services/projects.service';

interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (projectData: CreateProjectData) => Promise<void>;
}

export default function NewProjectDialog(props: NewProjectDialogProps) {
  const [name, setName] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [visibility, setVisibility] = createSignal<'private' | 'link' | 'public'>('private');
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!name().trim()) {
      setError('Введите название проекта');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await props.onConfirm({
        name: name().trim(),
        description: description().trim(),
        visibility: visibility(),
        tags: []
      });

      // Сброс формы
      setName('');
      setDescription('');
      setVisibility('private');
      props.onClose();
    } catch (err) {
      console.error('Ошибка создания проекта:', err);
      setError('Ошибка создания проекта. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading()) {
      setName('');
      setDescription('');
      setVisibility('private');
      setError('');
      props.onClose();
    }
  };

  return (
    <Show when={props.isOpen}>
      <div class="dialog-overlay" onClick={handleClose}>
        <div class="dialog" onClick={(e) => e.stopPropagation()}>
          <div class="dialog-header">
            <h2>Создать новый проект</h2>
            <button
              class="dialog-close-btn"
              onClick={handleClose}
              disabled={isLoading()}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} class="dialog-content">
            <div class="form-group">
              <label for="project-name" class="form-label">
                Название проекта *
              </label>
              <input
                id="project-name"
                type="text"
                class="form-input"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                placeholder="Введите название проекта"
                disabled={isLoading()}
                maxLength={100}
                required
              />
            </div>

            <div class="form-group">
              <label for="project-description" class="form-label">
                Описание (необязательно)
              </label>
              <textarea
                id="project-description"
                class="form-textarea"
                value={description()}
                onInput={(e) => setDescription(e.currentTarget.value)}
                placeholder="Краткое описание проекта"
                disabled={isLoading()}
                maxLength={500}
                rows={3}
              />
            </div>

            <div class="form-group">
              <label for="project-visibility" class="form-label">
                Видимость проекта
              </label>
              <select
                id="project-visibility"
                class="form-select"
                value={visibility()}
                onChange={(e) => setVisibility(e.currentTarget.value as any)}
                disabled={isLoading()}
              >
                <option value="private">Приватный - только участники</option>
                <option value="link">По ссылке - доступ по прямой ссылке</option>
                <option value="public">Публичный - виден всем</option>
              </select>
            </div>

            <Show when={error()}>
              <div class="form-error">
                {error()}
              </div>
            </Show>

            <div class="dialog-actions">
              <button
                type="button"
                class="btn btn-secondary"
                onClick={handleClose}
                disabled={isLoading()}
              >
                Отмена
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                disabled={isLoading() || !name().trim()}
              >
                {isLoading() ? 'Создание...' : 'Создать проект'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
}