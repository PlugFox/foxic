import { useNavigate, useParams } from '@solidjs/router';
import { createEffect, createSignal, Show } from 'solid-js';
import ExportButtons from '../components/ExportButtons';
import IconsGrid from '../components/IconsGrid';
import { useAuth } from '../contexts/auth.context';
import { IconData, iconsService } from '../services/icons.service';
import { Project, projectsService } from '../services/projects.service';

export default function ProjectPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = createSignal<Project | null>(null);
  const [icons, setIcons] = createSignal<Record<string, IconData>>({});
  const [originalHash, setOriginalHash] = createSignal<string>('');
  const [isLoading, setIsLoading] = createSignal(true);
  const [isSaving, setIsSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Загружаем данные проекта и иконки
  createEffect(async () => {
    const projectId = params.id;
    if (!projectId) {
      navigate('/');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Загружаем данные проекта
      const projectData = await projectsService.getProject(projectId);

      if (!projectData) {
        setError('Проект не найден');
        return;
      }

      // Проверяем права доступа к проекту
      const currentUser = user();
      if (!currentUser || !projectData.members[currentUser.uid]) {
        setError('У вас нет доступа к этому проекту');
        return;
      }

      setProject(projectData);

      // Загружаем архив иконок
      try {
        const archiveContents = await iconsService.loadProjectIcons(projectId);

        if (archiveContents) {
          // Преобразуем загруженные иконки в нужный формат
          const iconsData: Record<string, IconData> = {};

          Object.entries(archiveContents.icons).forEach(([name, content]) => {
            const iconData = iconsService.createIconData(
              name,
              content,
              archiveContents.manifest.icons[name]?.tags || []
            );
            iconsData[name] = iconData;
          });

          setIcons(iconsData);
          setOriginalHash(archiveContents.manifest.hash);
        }
      } catch (iconsError) {
        console.warn('Не удалось загрузить иконки:', iconsError);
        // Не показываем ошибку пользователю, просто работаем с пустым набором
      }
    } catch (err) {
      console.error('Ошибка загрузки проекта:', err);
      setError('Ошибка загрузки проекта');
    } finally {
      setIsLoading(false);
    }
  });

  const handleBackToHome = () => {
    navigate('/');
  };

  // Проверяем, есть ли несохраненные изменения
  const hasUnsavedChanges = () => {
    const currentIcons = icons();
    if (Object.keys(currentIcons).length === 0 && originalHash() === '') {
      return false; // Нет иконок и не было ранее
    }

    const currentHash = iconsService.getIconsHash(currentIcons);
    return currentHash !== originalHash();
  };

  // Получаем роль пользователя в проекте
  const getUserRole = () => {
    const currentUser = user();
    const currentProject = project();
    if (!currentUser || !currentProject) return null;

    return currentProject.members[currentUser.uid]?.role;
  };

  // Проверяем, может ли пользователь редактировать проект
  const canEdit = () => {
    const role = getUserRole();
    return role === 'owner' || role === 'admin' || role === 'editor';
  };

  // Обработчик добавления иконок
  const handleIconsAdd = (newIcons: IconData[]) => {
    if (!canEdit()) return;

    setIcons(prev => {
      const updated = { ...prev };

      newIcons.forEach(iconData => {
        // Проверяем на дублирование имен
        let finalName = iconData.name;
        let counter = 1;

        while (updated[finalName]) {
          finalName = `${iconData.name}_${counter}`;
          counter++;
        }

        // Если имя изменилось, обновляем данные иконки
        if (finalName !== iconData.name) {
          updated[finalName] = { ...iconData, name: finalName };
        } else {
          updated[finalName] = iconData;
        }
      });

      return updated;
    });
  };

  // Обработчик переименования иконки
  const handleIconRename = (oldName: string, newName: string) => {
    if (!canEdit()) return;

    setIcons(prev => {
      const updated = { ...prev };

      // Проверяем, что новое имя не занято
      if (updated[newName] && newName !== oldName) {
        alert(`Иконка с именем "${newName}" уже существует`);
        return prev;
      }

      // Переименовываем
      if (updated[oldName]) {
        // Обновляем иконку с новым именем и пересчитываем её хеш
        const iconData = { ...updated[oldName] };
        iconData.name = newName;
        // Хеш остается тот же, так как содержимое SVG не изменилось
        // Но общий хеш набора пересчитается автоматически через hasUnsavedChanges

        updated[newName] = iconData;
        delete updated[oldName];
      }

      return updated;
    });
  };

  // Обработчик удаления иконки
  const handleIconDelete = (name: string) => {
    if (!canEdit()) return;

    setIcons(prev => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  };

  // Обработчик изменения тегов иконки
  const handleIconTagsChange = (name: string, tags: string[]) => {
    if (!canEdit()) return;

    setIcons(prev => {
      const updated = { ...prev };
      if (updated[name]) {
        // Обновляем теги - это не влияет на хеш отдельной иконки,
        // но изменяет общий хеш набора для корректного отображения кнопки сохранения
        updated[name] = { ...updated[name], tags: [...tags] };
      }
      return updated;
    });
  };

  // Обработчик сохранения изменений
  const handleSave = async () => {
    const currentUser = user();
    const projectId = params.id;

    if (!currentUser || !projectId || !canEdit()) return;

    try {
      setIsSaving(true);

      const currentIcons = icons();

      // Предварительная проверка размера (необязательно, но улучшает UX)
      const iconCount = Object.keys(currentIcons).length;
      console.log(`Сохранение ${iconCount} иконок...`);

      await iconsService.saveProjectIcons(projectId, currentIcons, currentUser.uid);

      // Обновляем сохраненный хеш
      setOriginalHash(iconsService.getIconsHash(currentIcons));

      // Можно добавить уведомление об успешном сохранении
      console.log('Проект успешно сохранен');

    } catch (err) {
      console.error('Ошибка сохранения проекта:', err);

      let errorMessage = 'Неизвестная ошибка';
      if (err instanceof Error) {
        errorMessage = err.message;
        // Дополнительная информация для отладки
        console.error('Детали ошибки:', err.stack);
      }

      alert('Ошибка сохранения проекта: ' + errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div class="project-page">
      <header class="project-header">
        <div class="project-header-content">
          <button
            class="btn btn-secondary btn-back"
            onClick={handleBackToHome}
          >
            ← Назад к проектам
          </button>

          {project() && (
            <div class="project-title-section">
              <h1>{project()?.name}</h1>
              {project()?.description && (
                <p class="project-description">{project()?.description || ''}</p>
              )}

              {/* Кнопка сохранения, если есть изменения */}
              <Show when={hasUnsavedChanges() && canEdit()}>
                <button
                  class="btn btn-primary save-button"
                  onClick={handleSave}
                  disabled={isSaving()}
                >
                  {isSaving() ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </Show>
            </div>
          )}
        </div>
      </header>

      <main class="project-content">
        {isLoading() && (
          <div class="project-loading">
            <div class="loading-spinner"></div>
            <p>Загрузка проекта...</p>
          </div>
        )}

        {error() && (
          <div class="project-error">
            <div class="error-icon">⚠️</div>
            <h2>Ошибка</h2>
            <p>{error()}</p>
            <button
              class="btn btn-primary"
              onClick={handleBackToHome}
            >
              Вернуться к проектам
            </button>
          </div>
        )}

        {!isLoading() && !error() && project() && (
          <div class="project-workspace">
            {/* Информация о проекте */}
            <div class="project-meta">
              <div class="project-meta-item">
                <strong>Владелец:</strong> {project()?.owner || 'Неизвестно'}
              </div>
              <div class="project-meta-item">
                <strong>Ваша роль:</strong> {(() => {
                  const role = getUserRole();
                  return role === 'owner' ? 'Владелец' :
                         role === 'admin' ? 'Администратор' :
                         role === 'editor' ? 'Редактор' : 'Наблюдатель';
                })()}
              </div>
              <div class="project-meta-item">
                <strong>Видимость:</strong> {(() => {
                  const visibility = project()?.visibility || 'private';
                  return visibility === 'private' ? 'Приватный' :
                         visibility === 'link' ? 'По ссылке' : 'Публичный';
                })()}
              </div>
              <div class="project-meta-item">
                <strong>Участников:</strong> {Object.keys(project()?.members || {}).length}
              </div>
            </div>

            {/* Сетка иконок */}
            <IconsGrid
              icons={icons()}
              onIconsAdd={handleIconsAdd}
              onIconRename={handleIconRename}
              onIconDelete={handleIconDelete}
              onIconTagsChange={handleIconTagsChange}
              disabled={!canEdit()}
            />

            {/* Кнопки экспорта */}
            <ExportButtons
              icons={icons()}
              projectName={project()?.name || 'Проект'}
              disabled={isSaving()}
            />
          </div>
        )}
      </main>
    </div>
  );
}